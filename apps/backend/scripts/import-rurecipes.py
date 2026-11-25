"""Offline import of RuRecipes-93k for the noncommercial prototype.

Run with a temporary Python environment containing duckdb:
python import-rurecipes.py --input /path/train.parquet --total 3000
Never downloads images, calls AI, or edits private accounts.
"""
import argparse
import collections
import hashlib
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'data'
DATASET = 'https://huggingface.co/datasets/epishchik/RuRecipes-93k'


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', s or ''))).strip()


def title_key(s):
    return re.sub(r'[^а-яa-z0-9]+', '', s.lower().replace('ё', 'е'))


def ingredient(line, index):
    line = clean(line)
    parts = re.split(r'\s+[-–—]\s*', line, maxsplit=1)
    name, amount = parts[0], parts[1] if len(parts) > 1 else ''
    if not name or len(name) > 160:
        return None
    result = {'id': 'rf-i-' + str(index), 'name': name, 'quantity': None, 'unit': 'unknown'}
    if not amount:
        return result
    if re.fullmatch(r'по вкусу|по желанию', amount, re.I):
        return {**result, 'unit': 'toTaste', 'note': amount}
    match = re.fullmatch(r'(\d+(?:[.,]\d+)?(?:\s+\d+/\d+)?|\d+/\d+)\s*(кг|г|гр\.?|мл|л|шт\.?|ст\.?\s*л(?:ожк[аи])?\.?|столов\w*\s+лож\w*|ч\.?\s*л(?:ожк[аи])?\.?|чайн\w*\s+лож\w*|стакан\w*|ст\.|зубчик\w*|зуб\.?|щепотк\w*|пуч\w*|веточк\w*)', amount, re.I)
    if not match:
        return {**result, 'rawAmount': amount}
    number, raw_unit = match.groups()
    try:
        quantity = 0
        for part in number.replace(',', '.').split():
            if '/' in part:
                a, b = part.split('/'); quantity += float(a) / float(b)
            else:
                quantity += float(part)
        if not 0 < quantity <= 100000:
            return None
    except (ValueError, ZeroDivisionError):
        return None
    raw_unit = raw_unit.lower().replace(' ', '')
    unit = ('kg' if raw_unit == 'кг' else 'g' if raw_unit.startswith('г') else
            'ml' if raw_unit == 'мл' else 'l' if raw_unit == 'л' else
            'piece' if raw_unit.startswith('шт') else 'tbsp' if raw_unit.startswith(('ст.л', 'стл', 'столов')) else
            'tsp' if raw_unit.startswith(('ч.л', 'чл', 'чайн')) else 'cup' if raw_unit.startswith(('стакан', 'ст.')) else
            'clove' if raw_unit.startswith('зуб') else 'pinch' if raw_unit.startswith('щеп') else
            'bunch' if raw_unit.startswith('пуч') else 'sprig')
    return {**result, 'quantity': quantity, 'unit': unit}


def category(name):
    for kind, pattern in [('soup', r'суп|борщ|рассольник|солянк|окрошк'),
                          ('salad', r'салат|винегрет'),
                          ('breakfast', r'омлет|сырник|яичниц|каша|завтрак|гренк'),
                          ('dessert', r'торт|кекс|печенье|морожен|пирожн|пудинг|желе'),
                          ('bread', r'хлеб|булоч|пирог|пирожк|лепешк|лепёшк'),
                          ('drink', r'смузи|коктейль|лимонад|компот|напиток'),
                          ('sauce', r'соус|заправка'), ('side', r'гарнир|пюре')]:
        if re.search(pattern, name, re.I):
            return kind
    return 'main'


def convert(rows, existing, total):
    seen = {title_key(r['name']) for r in existing}
    seen_urls = set()
    groups = collections.defaultdict(list)
    rejected = collections.Counter()
    for link, title, description, raw_ingredients, raw_steps in rows:
        name = clean(title)
        if not re.fullmatch(r'https://www\.russianfood\.com/recipes/recipe\.php\?rid=\d+', link or ''):
            rejected['source_url'] += 1; continue
        if not re.search('[А-Яа-яЁё]', name) or not 3 <= len(name) <= 100:
            rejected['name'] += 1; continue
        key = title_key(name)
        if key in seen or link in seen_urls:
            rejected['duplicate_title_or_url'] += 1; continue
        if re.search(r'наливка|настойка|самогон|лик[её]р', name, re.I):
            rejected['outside_initial_scope'] += 1; continue
        if not raw_ingredients or not 2 <= len(raw_ingredients) <= 25 or not raw_steps or not 2 <= len(raw_steps) <= 24:
            rejected['structure'] += 1; continue
        ingredients = [ingredient(i, n) for n, i in enumerate(raw_ingredients)]
        if any(i is None for i in ingredients) or sum(i['quantity'] is not None for i in ingredients) < max(2, len(ingredients) * 0.6):
            rejected['incomplete_amounts'] += 1; continue
        steps = [clean(s) for s in raw_steps if clean(s)]
        if len(steps) < 2 or any(len(s) > 1600 for s in steps) or sum(map(len, steps)) > 10000:
            rejected['steps'] += 1; continue
        seen.add(key); seen_urls.add(link)
        rid = link.rsplit('=', 1)[1]
        kind = category(name)
        groups[kind].append({'id': 'rf-' + rid, 'name': name[0].upper() + name[1:],
            'summary': clean(description)[:500], 'country': '', 'category': kind, 'diets': [],
            'servings': None, 'minutes': None, 'perServing': None,
            'ingredients': ingredients, 'steps': steps,
            'origin': {'label': 'RussianFood · RuRecipes-93k — Evgenii Pishchik', 'url': link,
                       'license': 'CC BY-NC 4.0 (датасет)', 'licenseUrl': 'https://creativecommons.org/licenses/by-nc/4.0/'}})
    for group in groups.values():
        group.sort(key=lambda r: hashlib.sha256(r['id'].encode()).hexdigest())
    # Prioritise everyday main meals; do not fill a third of the catalogue with
    # drinks and sauces just because their source sections are large.
    count = total - len(existing)
    weights = {'main': .40, 'salad': .16, 'soup': .14, 'breakfast': .12, 'bread': .08, 'dessert': .07, 'side': .02, 'sauce': .007, 'drink': .003}
    selected = []
    positions = collections.Counter()
    for kind, weight in weights.items():
        take = min(len(groups[kind]), int(count * weight))
        selected.extend(groups[kind][:take]); positions[kind] = take
    while len(selected) < total - len(existing):
        progressed = False
        for kind in weights:
            pos = positions[kind]
            if pos < len(groups[kind]) and len(selected) < total - len(existing):
                selected.append(groups[kind][pos]); positions[kind] += 1; progressed = True
        if not progressed:
            break
    return selected, {'examined': len(rows), 'eligibleBeforeSelection': sum(map(len, groups.values())),
        'selectedByCategory': dict(positions), 'rejected': dict(rejected)}


def main():
    import duckdb
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', type=pathlib.Path, required=True)
    p.add_argument('--total', type=int, default=3000)
    p.add_argument('--noncommercial', action='store_true', help='Confirm noncommercial use of the CC BY-NC dataset')
    p.add_argument('--output-dir', type=pathlib.Path, default=ROOT)
    args = p.parse_args()
    if not args.noncommercial:
        p.error('RuRecipes is CC BY-NC: pass --noncommercial only for a noncommercial project')
    current = json.loads((ROOT / 'recipe-library.json').read_text())
    original = [r for r in current if not r['id'].startswith('rf-')]
    rows = duckdb.connect().execute('SELECT link,title,description,ingredients,recipe FROM read_parquet(?)', [str(args.input)]).fetchall()
    selected, report = convert(rows, original, args.total)
    if len(original) + len(selected) != args.total:
        raise ValueError('Not enough eligible recipes; output was not replaced')
    report.update({'sourceUrl': DATASET, 'sourceFile': 'data/train-00000-of-00001.parquet',
        'sourceSha256': hashlib.sha256(args.input.read_bytes()).hexdigest(), 'importedAt': '2026-11-24',
        'total': args.total, 'preserved': len(original), 'added': len(selected), 'license': 'CC BY-NC 4.0',
        'usage': 'Noncommercial prototype only. Attribution and original links retained. No photographs.',
        'missingMetadata': 'Time, servings and nutrition are null; never guessed from steps. Categories are heuristic. Raw unclear amounts retained in rawAmount.'})
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, value in [('recipe-library.json', original + selected), ('rurecipes-import-report.json', report)]:
        target = args.output_dir / name
        temp = target.with_suffix('.tmp'); temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n'); temp.replace(target)
    print(json.dumps({'total': args.total, 'added': len(selected), 'eligible': report['eligibleBeforeSelection']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
