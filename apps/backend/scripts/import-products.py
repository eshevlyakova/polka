"""Bounded OFF sample: three searches, at most 300 source records, no photos.
Merge complete Russian nutrition records without replacing the existing sample.
For larger imports use OFF bulk exports instead of expanding this crawler.
"""
import datetime,hashlib,html,json,math,pathlib,time,urllib.parse,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]/'data'
target=ROOT/'products.openfoodfacts.json'
products={p['barcode']:p for p in json.loads(target.read_text())}
before=len(products);rejected=0;requests=[]
for index,category in enumerate(['dairies','cereals-and-their-products','fruits-and-vegetables-based-foods']):
    if index:time.sleep(7)
    params={'action':'process','tagtype_0':'countries','tag_contains_0':'contains','tag_0':'russia','tagtype_1':'categories','tag_contains_1':'contains','tag_1':category,'page_size':100,'page':1,'sort_by':'unique_scans_n','json':1,'fields':'code,product_name,product_name_ru,brands,nutriments,quantity,categories_tags,countries_tags,last_modified_t'}
    url='https://world.openfoodfacts.org/cgi/search.pl?'+urllib.parse.urlencode(params)
    cache=pathlib.Path('/private/tmp/polka-catalog-import')/hashlib.sha256(url.encode()).hexdigest()
    cache.parent.mkdir(exist_ok=True)
    if cache.exists():raw=cache.read_bytes()
    else:
        request=urllib.request.Request(url,headers={'User-Agent':'PolkaPrototype/0.1 (https://github.com/eshevlyakova/polka)'})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request,timeout=45) as response:raw=response.read()
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429,500,502,503,504) or attempt == 2:raise
                print(f'{category}: service {error.code}, retrying with backoff',flush=True)
                time.sleep(8 * (attempt + 1))
        cache.write_bytes(raw)
    data=json.loads(raw);requests.append({'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'returned':len(data.get('products',[]))})
    for p in data.get('products',[]):
        import re
        name=html.unescape(p.get('product_name_ru') or p.get('product_name') or '').strip();code=p.get('code','');n=p.get('nutriments',{})
        values={k:n.get(v) for k,v in {'kcal':'energy-kcal_100g','protein':'proteins_100g','fat':'fat_100g','carbs':'carbohydrates_100g'}.items()}
        if not re.search('[А-Яа-яЁё]',name) or not re.fullmatch(r'\d{8,14}',code) or any(not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v) or v<0 or v>(950 if k=='kcal' else 100) for k,v in values.items()) or sum(values[k] for k in ['protein','fat','carbs'])>105:
            rejected+=1;continue
        if code not in products:products[code]={'id':'off-'+code,'barcode':code,'name':name,'brand':html.unescape(p.get('brands','')),'quantityLabel':p.get('quantity',''),'per100':values,'basis':'per100g-or-100ml-as-labelled','categories':p.get('categories_tags',[]),'source':{'name':'Open Food Facts','url':'https://world.openfoodfacts.org/product/'+code,'license':'ODbL-1.0','retrievedAt':datetime.date.today().isoformat(),'lastModified':p.get('last_modified_t')},'verification':'community-unverified'}
    print(f'{category}: {len(products)-before} new complete products',flush=True)
temp=target.with_suffix('.tmp');temp.write_text(json.dumps(list(products.values()),ensure_ascii=False,indent=2)+'\n');temp.replace(target)
(ROOT/'nutrition-import-report.json').write_text(json.dumps({'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'before':before,'total':len(products),'added':len(products)-before,'rejected':rejected,'requests':requests,'license':'ODbL-1.0','scope':'Three bounded Russian-market category samples; not a complete assortment'},ensure_ascii=False,indent=2)+'\n')
print(f'Nutrition catalog: {len(products)}; added {len(products)-before}.',flush=True)
