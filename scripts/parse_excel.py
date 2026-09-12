import openpyxl
import json
import os
from collections import defaultdict

wb = openpyxl.load_workbook("Weights and Dimensions 10.8.26.xlsx", data_only=True)
sheet = wb["Sheet1"]

rows = list(sheet.iter_rows(values_only=True))
data_rows = rows[1:]

raw_products = []
sku_occurrences = defaultdict(list)

for idx, r in enumerate(data_rows, start=2):
    row_vals = r[:7]
    if not any(row_vals):
        continue
    ptype, sku, upc, l, w, h, wt = row_vals
    sku_str = str(sku).strip() if sku is not None else ""
    raw_products.append({
        "rowNumber": idx,
        "type": str(ptype).strip() if ptype is not None else None,
        "sku": sku_str,
        "upc": str(upc).strip() if upc is not None else None,
        "rawL": l,
        "rawW": w,
        "rawH": h,
        "rawWt": wt,
    })
    if sku_str:
        sku_occurrences[sku_str].append(idx)

# Second pass: validate and enrich
processed_products = []
duplicate_skus_report = []
for sku_str, row_indices in sku_occurrences.items():
    if len(row_indices) > 1:
        duplicate_skus_report.append({
            "sku": sku_str,
            "rowNumbers": row_indices,
            "count": len(row_indices)
        })

missing_physical_report = []
missing_type_report = []
missing_upc_report = []

for item in raw_products:
    missing = []
    
    # Check L, W, H
    valid_dims = True
    for dim_name, val in [("lengthMm", item["rawL"]), ("widthMm", item["rawW"]), ("heightMm", item["rawH"])]:
        if val is None or not isinstance(val, (int, float)) or val <= 0:
            missing.append(dim_name)
            valid_dims = False
            
    # Check Weight
    valid_wt = True
    if item["rawWt"] is None or not isinstance(item["rawWt"], (int, float)) or item["rawWt"] <= 0:
        missing.append("weightKg")
        valid_wt = False
        
    row_label = f"Row {item['rowNumber']}"
    sku_label = item["sku"] or row_label

    if not item["type"]:
        missing.append("type")
        missing_type_report.append(sku_label)
        
    if not item["upc"]:
        missing.append("upc")
        missing_upc_report.append(sku_label)

    l_val = float(item["rawL"]) if (isinstance(item["rawL"], (int, float)) and item["rawL"] > 0) else None
    w_val = float(item["rawW"]) if (isinstance(item["rawW"], (int, float)) and item["rawW"] > 0) else None
    h_val = float(item["rawH"]) if (isinstance(item["rawH"], (int, float)) and item["rawH"] > 0) else None
    wt_val = float(item["rawWt"]) if (isinstance(item["rawWt"], (int, float)) and item["rawWt"] > 0) else None
    
    vol = None
    if l_val is not None and w_val is not None and h_val is not None:
        vol = round((l_val * w_val * h_val) / 1_000_000_000.0, 6)
        
    is_dup = len(sku_occurrences[item["sku"]]) > 1 if item["sku"] else False
    is_complete = valid_dims and valid_wt
    
    if not is_complete:
        missing_physical_report.append({
            "rowNumber": item["rowNumber"],
            "sku": item["sku"],
            "missingFields": [f for f in missing if f in ["lengthMm", "widthMm", "heightMm", "weightKg"]]
        })

    processed_products.append({
        "id": f"ROW_{item['rowNumber']}_{item['sku']}",
        "rowNumber": item["rowNumber"],
        "type": item["type"],
        "sku": item["sku"],
        "upc": item["upc"],
        "lengthMm": l_val,
        "widthMm": w_val,
        "heightMm": h_val,
        "weightKg": wt_val,
        "unitVolumeM3": vol,
        "isPhysicalDataComplete": is_complete,
        "missingFields": missing,
        "isDuplicateSku": is_dup,
        "duplicateCount": len(sku_occurrences[item["sku"]]) if is_dup else 1
    })

data_quality_report = {
    "totalRowsScanned": len(processed_products),
    "uniqueSkus": len(sku_occurrences),
    "duplicateSkusCount": len(duplicate_skus_report),
    "duplicateSkus": duplicate_skus_report,
    "missingPhysicalDataCount": len(missing_physical_report),
    "missingPhysicalData": missing_physical_report,
    "missingTypeCount": len(missing_type_report),
    "missingUpcCount": len(missing_upc_report)
}

os.makedirs("src/data", exist_ok=True)

with open("src/data/products.json", "w", encoding="utf-8") as f:
    json.dump(processed_products, f, indent=2)

with open("src/data/dataQualityReport.json", "w", encoding="utf-8") as f:
    json.dump(data_quality_report, f, indent=2)

print("Export complete:")
print(f"Products exported: {len(processed_products)}")
print(f"Data Quality: Duplicates: {len(duplicate_skus_report)}, Missing Physical: {len(missing_physical_report)}, Missing Type: {len(missing_type_report)}, Missing UPC: {len(missing_upc_report)}")
