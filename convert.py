"""
convert.py
----------
Reads inventory/Inventory.xlsx and generates products.json

Usage:
    python convert.py

Requirements:
    pip install openpyxl
"""

import json
import os
import openpyxl
from datetime import datetime

# ── Config ──
EXCEL_PATH   = os.path.join(os.getcwd(), 'inventory', 'Inventory.xlsx')
OUTPUT_PATH  = os.path.join(os.getcwd(), 'products.json')

# These sheet names map to series values in JSON
# Bundles sheet handled separately
SINGLE_SHEETS = [
    'Hot Wheels Mainline',
    'Hot Wheels Premium',
    'Hot Wheels Treasure Hunt',
    'Hot Wheels 5 Packs',
    'Matchbox Card',
    'Matchbox Box',
    'Matchbox Moving Parts',
    'MiniGT',
]

BUNDLE_SHEET = 'Bundles'

# Column positions (0-indexed)
COL_CODE           = 0
COL_BRAND          = 1
COL_BUNDLE_NAME    = 2
COL_NAME           = 3
COL_SERIES         = 4
COL_YEAR           = 5
COL_COST_PRICE     = 6
COL_ORIGINAL_PRICE = 7
COL_SELLING_PRICE  = 8
COL_STATUS         = 9


def clean(val):
    """Strip whitespace from a cell value, return empty string if None."""
    if val is None:
        return ''
    return str(val).strip()


def parse_year(val):
    """Convert Excel serial date or plain year to int. Return None if invalid."""
    if val is None:
        return None
    try:
        v = int(float(str(val)))
        # Excel serial dates are > 40000, convert to year
        if v > 40000:
            # Excel epoch is 1900-01-01 (serial 1)
            from datetime import date, timedelta
            excel_epoch = date(1899, 12, 30)
            actual_date = excel_epoch + timedelta(days=v)
            return actual_date.year
        return v
    except:
        return None


def parse_price(val):
    """Convert price cell to int. Return None if N/A or invalid."""
    s = clean(val)
    if s.upper() in ('N/A', '', 'NONE', '-'):
        return None
    try:
        return int(float(s))
    except:
        return None


def process_sheet(ws, is_bundle=False):
    """Process a worksheet and return list of product dicts."""
    products = []
    rows = list(ws.iter_rows(values_only=True))

    if len(rows) < 2:
        return products  # Empty or header-only sheet

    # Skip header row
    for row in rows[1:]:
        if not row or not row[COL_CODE]:
            continue  # Skip empty rows

        code   = clean(row[COL_CODE])
        brand  = clean(row[COL_BRAND])
        name   = clean(row[COL_NAME])
        series = clean(row[COL_SERIES])
        status = clean(row[COL_STATUS])

        if not code or not name:
            continue

        # Skip SOLD items
        selling_price = parse_price(row[COL_SELLING_PRICE])
        if status.upper() == 'SOLD' or selling_price == 0 or selling_price is None:
            print(f"  ⏭️  Skipping SOLD/zero: {code} - {name}")
            continue

        year           = parse_year(row[COL_YEAR])
        bundle_name    = clean(row[COL_BUNDLE_NAME])
        original_price = parse_price(row[COL_ORIGINAL_PRICE])

        product = {
            "code":           code,
            "brand":          brand,
            "name":           name,
            "bundle_name":    bundle_name if (is_bundle and bundle_name and bundle_name.upper() != 'N/A') else None,
            "series":         series,
            "year":           year,
            "price":          selling_price,
            "original_price": original_price,
            "status":         "Available",
            "type":           "bundle" if is_bundle else "single",
            "image":          f"images/{code}.jpg"
        }
        products.append(product)

    return products


def main():
    print(f"\n📂 Reading: {EXCEL_PATH}")

    if not os.path.exists(EXCEL_PATH):
        print(f"❌ ERROR: File not found at {EXCEL_PATH}")
        print("   Make sure Inventory.xlsx is in the inventory/ folder.")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    all_products = []
    idx = 1

    # Process single product sheets
    for sheet_name in SINGLE_SHEETS:
        if sheet_name not in wb.sheetnames:
            print(f"  ⚠️  Sheet not found, skipping: {sheet_name}")
            continue

        ws = wb[sheet_name]
        products = process_sheet(ws, is_bundle=False)

        if not products:
            print(f"  📭 Empty sheet: {sheet_name}")
            continue

        print(f"  ✅ {sheet_name}: {len(products)} products")
        for p in products:
            p['id'] = idx
            idx += 1
            all_products.append(p)

    # Process Bundles sheet
    if BUNDLE_SHEET in wb.sheetnames:
        ws = wb[BUNDLE_SHEET]
        bundles = process_sheet(ws, is_bundle=True)
        print(f"  ✅ {BUNDLE_SHEET}: {len(bundles)} bundles")
        for p in bundles:
            p['id'] = idx
            idx += 1
            all_products.append(p)
    else:
        print(f"  ⚠️  Sheet not found, skipping: {BUNDLE_SHEET}")

    # Write products.json
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! {len(all_products)} products written to products.json")
    print(f"   Last ID: {idx - 1}")
    print(f"   Output: {OUTPUT_PATH}\n")


if __name__ == '__main__':
    main()
