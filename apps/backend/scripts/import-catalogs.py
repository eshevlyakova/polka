"""Explicit, repeatable import of public source data. Never runs at application startup.

python3 apps/backend/scripts/import-catalogs.py
Downloads recipe texts only (no photos), and at most 300 OFF products per run.
This legacy 100-source reference import is separate from the 501-recipe RU UI library:
python3 apps/backend/scripts/import-recipe-library.py
No credentials, scraping protection bypass or writes to upstream services.
"""
import concurrent.futures
import datetime
import hashlib
import html
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'data'
ROOT.mkdir(parents=True, exist_ok=True)
TODAY = datetime.date.today().isoformat()
UA = 'PolkaPrototype/0.1 (https://github.com/eshevlyakova/polka)'

def get(url):
    cache = pathlib.Path('/private/tmp/polka-catalog-import')
    cache.mkdir(exist_ok=True)
    target = cache / hashlib.sha256(url.encode()).hexdigest()
    if target.exists() and time.time() - target.stat().st_mtime < 86400:
        return target.read_bytes()
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as response:
                data = response.read()
                target.write_bytes(data)
                return data
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            time.sleep(8 * (attempt + 1))

def save(name, value):
    target = ROOT / name
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(target)

# Deliberately selected everyday dishes, not the first 100 alphabetical files.
SLUGS = '''aglio-e-olio air-fryer-zucchini apple-pie apple-strudel autumn-soup
babas-feta-pasta baked-pasta-with-broccoli baked-rice baked-salmon baked-trout
banana-bread banana-oatmeal-cookies banana-pancakes basic-meatballs basic-waffles
bean-salad beef-and-broccoli beef-goulash beef-liver-and-onions beef-stew
blueberry-muffins blueberry-smoothie bolognese-sauce breakfast-wrap breton-crepes
caesar-salad cannellini-bean-salad carbonara cheddar-crusted-chicken cheesy-ham-and-potato-bake
cheesy-meatballs cheesy-pasta-bake chicken-paprikash chicken-parmesan chicken-pasta-casserole
chicken-soup chicken-tacos chicken-tomato-spinach-curry chicken-wings chili-con-carne
coleslaw corn-polenta couscous creamy-mashed-potatoes croque-monsieur
easy-chicken-and-rice-casserole eggroll-in-a-bowl egyptian-lentils fall-vegetable-and-chickpea-curry farci-tomatoes
finnish-salmon-soup fish-curry french-crepes french-onion-soup french-toast
fried-potatoes frittata garlic-toast ginger-garlic-broccoli gnocchi
granola greek-salad guacamole hearty-breakfast-oatmeal honey-garlic-chicken
hummus lasagna lebanese-lentil-soup lemon-and-oregano-chicken-traybake lentil-placeholder
lithuanian-cold-borscht meatloaf menemen merchants-buckwheat modern-borscht
mushroom-risotto mushroom-sauce mushroom-stragonov oatmeal-cookies oatmeal-pancakes
okroshka omelet overnight-oats pancake pasta-alla-norma
pasta-arrabbiata pasta-navy-style pilaf potato-leek-soup pozharskiye-cutlets
quesadilla quiche ratatouille red-lentil-dahl rice-pudding
roasted-chicken-breast shakshouka spanish-tortilla stroganoff tuna-salad'''.split()
SLUGS = ['lenten-lentil-curry' if s == 'lentil-placeholder' else s for s in SLUGS]
assert len(SLUGS) == len(set(SLUGS)) == 100

def recipe(slug):
    url = f'https://raw.githubusercontent.com/LukeSmithxyz/based.cooking/master/content/{slug}.md'
    raw = get(url).decode('utf8')
    sections = re.split(r'^#{2,4} +', raw, flags=re.M)
    ingredients = next((s for s in sections if s.lower().startswith('ingredients')), '')
    directions = next((s for s in sections if s.lower().startswith(('directions', 'instructions', 'preparation'))), '')
    def lines(section):
        return [re.sub(r'^(?:[-*]|\d+\.)\s*', '', line).strip() for line in section.splitlines()[1:] if re.match(r'^(?:[-*]|\d+\.)\s', line)]
    title = re.search(r'^title:\s*[\"\']?(.*?)[\"\']?\s*$', raw, re.M)
    if not lines(ingredients) or not lines(directions):
        print(f'Skipping recipe without structured sections: {slug}', flush=True)
        return None
    return {'id': 'bc-' + slug, 'name': title.group(1) if title else slug.replace('-', ' '),
            'language': 'en', 'ingredientsText': lines(ingredients), 'steps': lines(directions),
            'source': {'url': f'https://based.cooking/{slug}/', 'rawUrl': url,
                       'license': 'Unlicense', 'retrievedAt': TODAY,
                       'sha256': hashlib.sha256(raw.encode()).hexdigest()},
            'originalMarkdown': raw}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        recipes = [r for r in pool.map(recipe, SLUGS) if r]
    for slug in ['ukrainian-borscht', 'ukrainian-vareniki', 'turkish-red-lentil-soup', 'sweet-potato-fries', 'tabouleh', 'schnitzel']:
        if len(recipes) == 100:
            break
        candidate = recipe(slug)
        if candidate:
            recipes.append(candidate)
    assert len(recipes) == 100, f'Only {len(recipes)} recipes parsed; refusing partial replacement'
    names_path = ROOT / 'recipe-names.ru.json'
    if names_path.exists():
        names = json.loads(names_path.read_text())
        for item in recipes:
            if item['id'] in names:
                item['nameRu'] = names[item['id']]
    save('recipes.json', recipes)
    (ROOT / 'sources' / 'based-cooking-LICENSE.txt').write_bytes(get('https://raw.githubusercontent.com/LukeSmithxyz/based.cooking/master/LICENSE.md'))
    print(f'Recipes: {len(recipes)}', flush=True)

    products_path = ROOT / 'products.openfoodfacts.json'
    products = {p['barcode']: p for p in json.loads(products_path.read_text())} if products_path.exists() else {}
    rejected = 0
    for page in range(1, 4):
        query = urllib.parse.urlencode({'action': 'process', 'tagtype_0': 'countries',
            'tag_contains_0': 'contains', 'tag_0': 'russia', 'page_size': 100, 'page': page, 'json': 1,
            'fields': 'code,product_name,product_name_ru,brands,nutriments,quantity,categories_tags,countries_tags,last_modified_t'})
        url = 'https://world.openfoodfacts.org/cgi/search.pl?' + query
        data = json.loads(get(url))
        for item in data.get('products', []):
            nutrients = item.get('nutriments', {})
            keys = {'kcal': 'energy-kcal_100g', 'protein': 'proteins_100g', 'fat': 'fat_100g', 'carbs': 'carbohydrates_100g'}
            values = {k: nutrients.get(v) for k, v in keys.items()}
            name = item.get('product_name_ru') or item.get('product_name') or ''
            code = item.get('code', '')
            if not re.search('[А-Яа-яЁё]', name) or not re.fullmatch(r'\d{8,14}', code) or any(not isinstance(v, (int, float)) or not 0 <= v <= (950 if k == 'kcal' else 100) for k, v in values.items()) or sum(values[k] for k in ['protein','fat','carbs']) > 105:
                rejected += 1
                continue
            products[code] = {'id': 'off-' + code, 'barcode': code, 'name': html.unescape(name.strip()),
                'brand': html.unescape(item.get('brands', '')), 'quantityLabel': item.get('quantity', ''),
                'per100': values, 'basis': 'per100g-or-100ml-as-labelled',
                'categories': item.get('categories_tags', []),
                'source': {'name': 'Open Food Facts', 'url': 'https://world.openfoodfacts.org/product/' + code,
                    'license': 'ODbL-1.0', 'retrievedAt': TODAY, 'lastModified': item.get('last_modified_t')},
                'verification': 'community-unverified'}
        print(f'Products page {page}: {len(products)} valid so far', flush=True)
        time.sleep(7)  # Below OFF search limit; import a small initial sample, not a bulk crawl.
    save('products.openfoodfacts.json', list(products.values()))
    save('import-report.json', {'importedAt': TODAY, 'recipes': len(recipes), 'products': len(products),
        'rejectedProducts': rejected, 'scope': 'Initial Russian-language sample; not the full Russian assortment',
        'recipeSource': 'https://github.com/LukeSmithxyz/based.cooking',
        'productSource': 'https://openfoodfacts.github.io/openfoodfacts-server/api/'})
