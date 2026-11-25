"""Offline import of a bounded official OFF/Hugging Face export slice.

python import-off-bulk.py --input-dir /path/projected-pages --target 5000
Reads cached projected /filter pages, never crawls retailer websites. Run --check
to inspect completeness without changing any project data.
"""
import argparse
import collections
import hashlib
import html
import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'data'
SOURCE = 'https://huggingface.co/datasets/openfoodfacts/product-database'


def valid_barcode(code):
    if not re.fullmatch(r'(?:\d{8}|\d{12}|\d{13}|\d{14})', code):
        return False
    checksum = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(code[:-1])))
    return (checksum + int(code[-1])) % 10 == 0


def norm(s):
    s = html.unescape(s).lower().replace('ё', 'е')
    s = re.sub(r'\b\d+(?:[.,]\d+)?\s*(?:кг|гр|г|мл|л|шт)\b\.?', ' ', s)
    s = re.sub(r'[^\w%.,]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def convert_row(r):
    if 'en:russia' not in (r.get('countries_tags') or []):
        return None, 'not_marked_sold_in_russia'
    names = r.get('product_name') or []
    if not isinstance(names, list):
        return None, 'name_format'
    name = next((p.get('text') for lang in ['ru', 'main'] for p in names if p.get('lang') == lang and re.search('[А-Яа-яЁё]', p.get('text') or '')), '')
    name = re.sub(r'\s+', ' ', html.unescape(name)).strip()
    if not name or len(name) > 160:
        return None, 'missing_russian_name'
    code = r.get('code') or ''
    if not valid_barcode(code):
        return None, 'barcode'
    brand = html.unescape(r.get('brands') or '').strip()
    if not brand:
        return None, 'missing_brand'
    if len(name + ' · ' + brand) > 160:
        return None, 'name_and_brand_too_long'
    if r.get('nutrition_data_per') != '100g' or r.get('product_quantity_unit') in ['ml', 'l', 'мл', 'л']:
        return None, 'volume_or_unknown_basis'
    nutrients = {n['name']: n.get('100g') for n in r.get('nutriments') or []}
    values = {k: nutrients.get(v) for k, v in [('kcal', 'energy-kcal'), ('protein', 'proteins'), ('fat', 'fat'), ('carbs', 'carbohydrates')]}
    if values['kcal'] is None and isinstance(nutrients.get('energy-kj'), (int, float)):
        values['kcal'] = nutrients['energy-kj'] / 4.184
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 <= v <= (950 if k == 'kcal' else 100) for k, v in values.items()):
        return None, 'missing_or_invalid_nutrition'
    if sum(values[k] for k in ['protein', 'fat', 'carbs']) > 105:
        return None, 'macronutrient_sum'
    energy = values['protein'] * 4 + values['fat'] * 9 + values['carbs'] * 4
    if abs(energy - values['kcal']) > max(35, values['kcal'] * .25):
        return None, 'energy_conflict'
    values = {k: round(v, 3) for k, v in values.items()}
    url = 'https://world.openfoodfacts.org/product/' + code
    return {'id': 'off-' + code, 'barcode': code, 'name': name, 'brand': brand,
            'quantityLabel': r.get('quantity') or '', 'per100': values, 'basis': 'per100g',
            'categories': r.get('categories_tags') or [], 'stores': r.get('stores_tags') or [],
            'source': {'name': 'Open Food Facts', 'url': url, 'license': 'ODbL-1.0',
                       'retrievedAt': '2026-11-24', 'lastModified': r.get('last_modified_t')},
            'verification': 'community-unverified'}, None


def collect(directory, existing, target):
    products = {p['barcode']: dict(p) for p in existing}
    aliases = {p['barcode']: p['barcode'] for p in existing}
    identity = {(norm(p['name']), norm(p['brand']), tuple(round(p['per100'][k], 3) for k in ['kcal', 'protein', 'fat', 'carbs'])): p['barcode'] for p in existing}
    rejected = collections.Counter()
    examined = 0
    sources = []
    merged = 0
    for path in sorted(directory.glob('*.json'), key=lambda p: int(p.stem)):
        data = json.loads(path.read_text())
        sources.append({'url': data['sourceUrl'], 'sha256': data['sourceSha256']})
        for row in data['rows']:
            examined += 1
            p, error = convert_row(row)
            if error:
                rejected[error] += 1; continue
            if p['barcode'] in aliases:
                continue
            key = (norm(p['name']), norm(p['brand']), tuple(round(p['per100'][k], 3) for k in ['kcal', 'protein', 'fat', 'carbs']))
            if key in identity:
                original = products[identity[key]]
                original['barcodes'] = sorted(set(original.get('barcodes', [original['barcode']]) + [p['barcode']]))
                original['packages'] = original.get('packages', [{'sourceId': original['barcode'], 'label': original['quantityLabel'], 'url': original['source']['url']}]) + [{'sourceId': p['barcode'], 'label': p['quantityLabel'], 'url': p['source']['url']}]
                aliases[p['barcode']] = original['barcode']; merged += 1
                continue
            identity[key] = p['barcode']; aliases[p['barcode']] = p['barcode']; products[p['barcode']] = p
            if len(products) >= target:
                break
        if len(products) >= target:
            break
    result = list(products.values())
    return result, {'examined': examined, 'preserved': len(existing), 'total': len(result), 'added': len(result) - len(existing),
        'mergedPackageVariants': merged, 'rejected': dict(rejected), 'sourcePages': sources, 'sourceDataset': SOURCE,
        'license': 'ODbL-1.0', 'importedAt': '2026-11-24',
        'scope': 'Russian-language named branded products explicitly marked sold in Russia, explicit mass basis, plausible complete nutrition. Legacy entries retained. No physical label verification. Not a full assortment of any retailer.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input-dir', type=pathlib.Path, required=True)
    p.add_argument('--target', type=int, default=5000)
    p.add_argument('--check', action='store_true')
    args = p.parse_args()
    existing = json.loads((ROOT / 'products.openfoodfacts.json').read_text())
    products, report = collect(args.input_dir, existing, args.target)
    if args.check:
        print(json.dumps({k: v for k, v in report.items() if k != 'sourcePages'}, ensure_ascii=False)); return
    if len(products) < args.target:
        raise ValueError(f'Only {len(products)} eligible products: not replacing the catalogue yet')
    for name, data in [('products.openfoodfacts.json', products), ('off-bulk-import-report.json', report)]:
        target = ROOT / name; temp = target.with_suffix('.tmp')
        temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n'); temp.replace(target)
    print(json.dumps({'products': len(products), 'added': report['added'], 'mergedPacks': report['mergedPackageVariants']}))


if __name__ == '__main__':
    main()
