"""
Missing image checker for the MMW catalogue (read-only: changes nothing).

Run from the diecast-catalogue repo root (where products.json and images/ are):
    python check_images.py

Output: prints a summary and writes missing_images.csv next to the script.
"""
import csv
import json
import os
import sys

root = os.getcwd()
json_path = os.path.join(root, "products.json")
if not os.path.exists(json_path):
    sys.exit("products.json not found. Run this from the repo root.")

with open(json_path, encoding="utf-8") as f:
    products = json.load(f)

# Real file names on disk, exact and lowercase (GitHub Pages is case-sensitive)
exact = set()
lower = {}
for dirpath, _, files in os.walk(os.path.join(root, "images")):
    for name in files:
        rel = os.path.relpath(os.path.join(dirpath, name), root).replace(os.sep, "/")
        exact.add(rel)
        lower[rel.lower()] = rel

seen = set()
rows = []  # series, code, name, image, issue
for p in products:
    img = p.get("image") or ""
    key = (p["series"], p["code"])
    if key in seen:  # inventory has duplicate rows for the same code
        continue
    seen.add(key)
    if not img:
        rows.append((p["series"], p["code"], p["name"], "", "No image field in JSON"))
    elif img in exact:
        continue
    elif img.lower() in lower:
        rows.append((p["series"], p["code"], p["name"], img,
                     "Case mismatch - on disk as " + lower[img.lower()] + " (breaks on GitHub Pages)"))
    else:
        rows.append((p["series"], p["code"], p["name"], img, "File missing"))

rows.sort(key=lambda r: (r[0], r[1]))
out = os.path.join(root, "missing_images.csv")
with open(out, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Series", "Code", "Name", "Expected image", "Issue"])
    w.writerows(rows)

print(f"Unique products checked: {len(seen)}")
print(f"Problems found: {len(rows)}")
cur = None
for s, code, name, img, issue in rows:
    if s != cur:
        cur = s
        print(f"\n== {s} ==")
    print(f"  {code}  {name}  [{issue}]")
print(f"\nSaved: {out}")
