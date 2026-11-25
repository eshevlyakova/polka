"""Import the author's open RU recipe dataset; never runs at app startup.

python3 apps/backend/scripts/import-recipe-library.py --input /path/to/download.json
Without --input downloads the official GitHub mirror. No photos or credentials.
"""
import argparse, datetime, hashlib, json, math, pathlib, urllib.request

URL = 'https://raw.githubusercontent.com/farcrak/unitools-recipes/main/unitools-recipes-v1.json'
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'data'
parser = argparse.ArgumentParser()
parser.add_argument('--input', type=pathlib.Path)
args = parser.parse_args()
raw = args.input.read_bytes() if args.input else urllib.request.urlopen(URL, timeout=60).read()
data = json.loads(raw)
assert data['license'] == 'CC BY-SA 4.0'
assert len(data['recipes']) >= 500
countries = {c['code']: c['name']['ru'] for c in data['countries']}
units = {'g','kg','ml','l','piece','tbsp','tsp','clove','toTaste','pinch','sprig','slice'}
def number(n): return isinstance(n, (int,float)) and not isinstance(n,bool) and math.isfinite(n) and n >= 0
result = []
for r in data['recipes']:
    assert r['name']['ru'].strip() and r['ingredients'] and r['steps']
    assert number(r['baseServings']) and r['baseServings'] > 0
    assert number(r['prepMinutes']) and number(r['cookMinutes'])
    assert all(number(r['nutritionPerServing'][k]) for k in ['calories','protein','fat','carbs'])
    ingredients=[]
    for i in r['ingredients']:
        assert i['name']['ru'].strip() and i['unit'] in units
        assert i['quantity'] is None or (number(i['quantity']) and i['quantity'] > 0)
        ingredients.append({'id':i['id'],'name':i['name']['ru'],'quantity':i['quantity'],'unit':i['unit'],'note':(i.get('note') or {}).get('ru')})
    assert all(s['text']['ru'].strip() for s in r['steps'])
    n=r['nutritionPerServing']
    result.append({'id':'ut-'+r['slug'],'name':r['name']['ru'],'summary':r['summary']['ru'],'country':countries[r['country']],
        'category':r['category'],'diets':r['diets'],'servings':r['baseServings'],'minutes':r['prepMinutes']+r['cookMinutes'],
        'perServing':{'kcal':n['calories'],'protein':n['protein'],'fat':n['fat'],'carbs':n['carbs']},
        'ingredients':ingredients,'steps':[s['text']['ru'] for s in r['steps']],
        'origin':{'label':'UniTools — theunitools.com','url':'https://theunitools.com/ru/data','license':'CC BY-SA 4.0','licenseUrl':data['licenseUrl']}})
assert len({r['id'] for r in result}) == len(result)
# Updating UniTools must not erase the independently imported noncommercial set.
current_path = ROOT/'recipe-library.json'
preserved = [r for r in json.loads(current_path.read_text()) if r['id'].startswith('rf-')] if current_path.exists() else []
result.extend(preserved)
def save(name, value):
    target=ROOT/name
    temp=target.with_suffix('.tmp')
    temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    temp.replace(target)
save('recipe-library.json',result)
save('recipe-library-import.json',{'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUrl':URL,
    'version':data['version'],'sourceSha256':hashlib.sha256(raw).hexdigest(),'recipes':len(data['recipes']),'preservedOtherRecipes':len(preserved),'language':'ru',
    'license':data['license'],'licenseUrl':data['licenseUrl'],'attribution':data['attribution'],
    'changes':'Selected Russian fields; renamed fields and calories to kcal; no photos imported. Original recipe quantities and nutrition preserved.'})
(ROOT/'sources'/'unitools-LICENSE.md').write_text('Recipe data: UniTools — theunitools.com\n\nhttps://theunitools.com/ru/data\n\nCC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/\n\nNormalized recipe-library.json is a derivative of the UniTools v2.0.0 dataset and is distributed under CC BY-SA 4.0. App source code and private user data are separate. No photographs are copied.\n')
print(f'Imported {len(result)} Russian recipes; no existing catalogs or user data replaced.')
