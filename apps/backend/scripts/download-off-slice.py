"""Bounded, resumable extraction from the official OFF Parquet dataset viewer.

python download-off-slice.py --cache /private/tmp/polka-off-hf-pages --target 5000
Only catalogue fields are cached; no photos, editors, user IDs or credentials.
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

FIELDS = ['code', 'product_name', 'brands', 'nutriments', 'nutrition_data_per', 'product_quantity_unit', 'quantity', 'categories_tags', 'countries_tags', 'stores_tags', 'last_modified_t', 'unique_scans_n']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    parser.add_argument('--target', type=int, default=5000)
    parser.add_argument('--max-rows', type=int, default=43400)
    parser.add_argument('--start-offset', type=int, default=0)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('off_import', pathlib.Path(__file__).with_name('import-off-bulk.py'))
    importer = importlib.util.module_from_spec(spec); spec.loader.exec_module(importer)
    existing = json.loads((importer.ROOT / 'products.openfoodfacts.json').read_text())

    def get(offset):
        target = args.cache / (str(offset) + '.json')
        if target.exists():
            return
        params = {'dataset': 'openfoodfacts/product-database', 'config': 'default', 'split': 'food', 'where': '"lang"=\'ru\'', 'offset': offset, 'length': 100}
        url = 'https://datasets-server.huggingface.co/filter?' + urllib.parse.urlencode(params)
        for attempt in range(4):
            try:
                request = urllib.request.Request(url, headers={'User-Agent': 'PolkaPrototype/0.1 (https://github.com/eshevlyakova/polka)'})
                raw = urllib.request.urlopen(request, timeout=60).read()
                data = json.loads(raw)
                projected = {'num_rows_total': data.get('num_rows_total'), 'rows': [{k: v['row'].get(k) for k in FIELDS} for v in data['rows']], 'sourceUrl': url, 'sourceSha256': hashlib.sha256(raw).hexdigest()}
                temp = target.with_suffix('.tmp'); temp.write_text(json.dumps(projected, ensure_ascii=False)); temp.replace(target)
                return
            except urllib.error.HTTPError as error:
                if error.code not in [429, 500, 502, 503, 504] or attempt == 3:
                    raise
                wait = min(60, max(5, int(error.headers.get('Retry-After', '10'))))
                print(f'Retry {offset}: HTTP {error.code}, waiting {wait}s', flush=True); time.sleep(wait)
            except (TimeoutError, urllib.error.URLError):
                if attempt == 3:
                    raise
                time.sleep(5 * (attempt + 1))

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for start in range(args.start_offset, args.max_rows, 400):
            list(pool.map(get, [start + n * 100 for n in range(4) if start + n * 100 < args.max_rows]))
            if (start + 400) % 800 == 0 or start + 400 >= args.max_rows:
                products, report = importer.collect(args.cache, existing, args.target)
                print(json.dumps({'cachedThrough': start + 400, 'eligibleProducts': len(products), 'examined': report['examined']}, ensure_ascii=False), flush=True)
                if len(products) >= args.target:
                    print('Target reached. Run import-off-bulk.py to publish the checked catalogue.', flush=True)
                    break
            time.sleep(.5)


if __name__ == '__main__':
    main()
