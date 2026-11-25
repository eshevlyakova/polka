"""Validate a captured factual retailer dataset. Never downloads or bypasses site access.

python3 apps/backend/scripts/import-retailer-products.py --input apps/backend/data/imports/5ka-nutrition-2026-11-24.json
Only this retailer supplement is rebuilt; OFF and private user data are untouched.
"""
import argparse
import hashlib
import json
import math
import pathlib
import re
from urllib.parse import urlparse


def normalize(value):
    return re.sub(r"\s+", " ", value.lower().replace("ё", "е")).strip()


def food_name(value):
    return re.sub(r"\s+(?:\d+\s*[xх×]\s*)?\d+(?:[.,]\d+)?\s*(?:кг|гр|г|мл|л|шт)\.?$", "", value.strip(), flags=re.IGNORECASE).strip()


def validate(row):
    if not isinstance(row, dict):
        return "invalid record"
    for key in ("sourceId", "url", "name", "brand", "packageLabel"):
        if not isinstance(row.get(key), str) or not row[key].strip() or len(row[key]) > 500:
            return "missing or invalid " + key
    if urlparse(row["url"]).scheme != "https" or urlparse(row["url"]).hostname != "5ka.ru":
        return "unexpected source URL"
    if row.get("basis") != "per100g":
        return "requires an explicit per-100-gram basis; ml is not silently converted"
    n = row.get("per100", {})
    if not isinstance(n, dict):
        return "missing nutrient panel"
    for key in ("kcal", "protein", "fat", "carbs"):
        value = n.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= (950 if key == "kcal" else 100):
            return "invalid nutrient " + key
    if n["protein"] + n["fat"] + n["carbs"] > 105:
        return "macronutrients exceed 100 g tolerance"
    # Sanity check, not a substitute for checking the physical label. Fibre/polyols
    # may justify a discrepancy; flag for review rather than invent corrections.
    calculated = 4 * n["protein"] + 9 * n["fat"] + 4 * n["carbs"]
    if abs(calculated - n["kcal"]) > max(35, n["kcal"] * 0.25):
        return "energy and macronutrients disagree; check the label"
    return None


def convert(data):
    products, seen, rejected = [], {}, []
    for row in data["records"]:
        error = validate(row)
        if error:
            rejected.append({"sourceId": row.get("sourceId"), "url": row.get("url"), "reason": error})
            continue
        # Weight and pack count do not identify the underlying food. Keep fat
        # percentage in the name; differing nutrient panels remain separate.
        name = food_name(row["name"])
        identity = (normalize(name), normalize(row["brand"]), tuple(row["per100"][k] for k in ("kcal", "protein", "fat", "carbs")))
        package = {"sourceId": row["sourceId"], "label": row["packageLabel"], "url": row["url"]}
        if identity in seen:
            product = seen[identity]
            if package not in product["packages"]:
                product["packages"].append(package)
            continue
        digest = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()[:20]
        product = {"id": "retail-5ka-" + digest, "barcode": "", "name": name, "brand": row["brand"],
                   "quantityLabel": row["packageLabel"], "per100": row["per100"], "basis": "per100g", "categories": [],
                   "packages": [package],
                   "source": {"name": "Пятёрочка", "url": row["url"], "license": "Not specified; factual product identifiers and nutrient values only", "retrievedAt": data["retrievedAt"]},
                   "verification": "retailer-page; sanity-checked; physical label not verified"}
        products.append(product)
        seen[identity] = product
    return products, {"retrievedAt": data["retrievedAt"], "inputRecords": len(data["records"]), "acceptedProducts": len(products),
                      "acceptedPackages": sum(len(p["packages"]) for p in products), "rejected": rejected,
                      "scope": "Bounded sample, not a complete assortment. No photos or marketing text copied."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=pathlib.Path, required=True)
    parser.add_argument("--output-dir", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    products, report = convert(json.loads(args.input.read_text()))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, value in (("products.retail.json", products), ("retailer-import-report.json", report)):
        target = args.output_dir / name
        temporary = target.with_suffix(".tmp")
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(target)
    print(json.dumps({"products": len(products), "packages": report["acceptedPackages"], "rejected": len(report["rejected"])}))


if __name__ == "__main__":
    main()
