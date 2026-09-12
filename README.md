# SDB Freight Calculator

A production-grade, interactive demo web application developed for **S & D Berg Trading Pty Ltd (SDB)** to calculate delivery/freight charges based on the company's proposed delivery policy and product physical dimensions/weights.

---

## 📦 Overview & Objectives

The application enables SDB customer service and warehouse staff to enter customer orders, select SKUs and quantities, set delivery postcodes/zones and order values, and receive an instant, transparent freight calculation breakdown.

### Conceptual Workflow
```
Customer / Sales Order
    ↓
Delivery Postcode (Auto-detected Zone + Manual Override)
    ↓
Select Products & Quantities (Product Master: 411 SKUs)
    ↓
Look up Product Dimensions & Weight (XLSX Master)
    ↓
Calculate Total Weight (kg) and Total Volume (m³)
    ↓
Determine Shipment Classification (Standard / Bulky / Pallet / Remote)
    ↓
Apply Policy Rates & Exclude Double Charging
    ↓
Display Transparent Itemized Breakdown & Policy Audit Reason
    ↓
Final Freight Ex GST, GST (10%), and Total Inc GST
```

---

## 📋 Source Policy Rules & Pricing

All prices are **Ex GST**:

| Delivery Classification | Qualification Rule | Freight Code | Published Rate (Ex GST) |
| :--- | :--- | :--- | :--- |
| **Standard Metro** | Order value < $700 ex GST | `MET-STD` | **$35.00** per consignment |
| **Standard Metro (Free)** | Order value $\ge$ $700$ ex GST | `MET-FREE` | **FREE ($0.00)** |
| **Major Regional Standard** | Any order value | `REG1-STD` | **$75.00** per consignment |
| **Other Regional Standard** | Any order value | `REG2-STD` | **$120.00** per consignment |
| **Bulky Non-Pallet** | Any order value | `BULKY-UNIT` | **$30.00** per designated bulky item |
| **Metro Pallet** | Volume/weight threshold met | `MET-PAL` | **$150.00** per pallet |
| **Major Regional Pallet** | Volume/weight threshold met | `REG1-PAL` | **$250.00** per pallet |
| **Other Regional Pallet** | Volume/weight threshold met | `REG2-PAL` | **$350.00** per pallet |
| **Remote Location** | Outside published zones | `REMOTE` | **Carrier freight quote required** |

### Critical Guardrails & Rules
1. **No Double-Charging Rule**: When an order is consolidated onto a pallet, bulky-item contributions ($30/item) are waived—only the pallet rate applies.
2. **Warehouse Review Flag**: If 3 or more bulky items are placed on an order, an operational warning alerts: *"Warehouse review recommended: 3+ bulky items. Determine whether pallet delivery is safer or more economical."*
3. **Remote Locations**: Does not display fake prices; clearly designates that carrier quotation is required.
4. **Pending SDB Approval Configuration**: All unfinalised policy parameters (postcode mappings, carton limits, pallet capacity, bulky product list) are editable in the admin configuration panel and marked with amber badges.

---

## 🔍 Master Product Dataset & Data Quality Inspector

Extracted from `Weights and Dimensions 10.8.26.xlsx` (411 rows):
- **Volume Calculation**: $\text{Volume } (m^3) = \frac{\text{Length (mm)} \times \text{Width (mm)} \times \text{Height (mm)}}{1,000,000,000}$
- **Data Quality Inspector**:
  - Detects **2 Duplicate SKUs**: `OMV5998` and `OMV6231`.
  - Detects **5 Incomplete Items**: `6FLAPVC`, `PSC1818`, `2525SP`, `PROF18`, and `PFWDCART` (missing physical dimensions or weights).
  - Halts calculation and highlights missing fields (`Insufficient product data for freight calculation: Missing dimensions/weight`) to prevent erroneous charges.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Vanilla CSS (Executive Light / White B2B theme)
- **Icons**: Lucide React
- **Testing**: Vitest (Automated test suite covering all policy scenarios)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5200/](http://localhost:5200/) in your browser.

### 3. Run Automated Tests
```bash
npx vitest run
```

### 4. Build for Production
```bash
npm run build
```
