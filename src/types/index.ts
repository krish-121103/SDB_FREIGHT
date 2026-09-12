export type DeliveryZone = 'METRO' | 'MAJOR_REGIONAL' | 'OTHER_REGIONAL' | 'REMOTE';

export type ShipmentClassification = 'STANDARD' | 'BULKY_NON_PALLET' | 'PALLET' | 'REMOTE';

export interface Product {
  id: string;
  rowNumber: number;
  type: string | null;
  sku: string;
  upc: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightKg: number | null;
  unitVolumeM3: number | null;
  isPhysicalDataComplete: boolean;
  missingFields: string[];
  isDuplicateSku: boolean;
  duplicateCount: number;
}

export interface OrderLine {
  id: string;
  product: Product;
  quantity: number;
  isBulkyDesignated?: boolean;
  lineWeightKg: number | null;
  lineVolumeM3: number | null;
  hasDataError: boolean;
  errorMessage?: string;
}

export interface FreightBreakdownLine {
  code: string;
  description: string;
  unitPriceExGst: number;
  quantity: number;
  totalExGst: number;
  isCarrierRate?: boolean;
  notes?: string;
}

export interface FreightResult {
  zone: DeliveryZone;
  zoneLabel: string;
  isZoneOverridden: boolean;
  orderValueExGst: number;
  orderValueGst: number;
  orderValueIncGst: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  totalItemCount: number;
  standardItemCount: number;
  bulkyItemCount: number;
  palletRequired: boolean;
  palletsRequired: number;
  palletReason: string | null;
  classification: ShipmentClassification;
  classificationLabel: string;
  freightExGst: number | null;
  gstAmount: number | null;
  freightIncGst: number | null;
  isRemoteCarrierRate: boolean;
  calculationLines: FreightBreakdownLine[];
  ruleExplanations: string[];
  warnings: string[];
  demoAssumptionsApplied: string[];
  hasDataErrors: boolean;
  dataErrorMessages: string[];
}

export interface AppConfig {
  // Official Policy Draft Rates (Ex GST)
  standardMetroUnder700: number; // $35
  standardMetro700Plus: number;  // $0 (FREE)
  majorRegionalStandard: number; // $75
  otherRegionalStandard: number; // $120
  bulkyItemFee: number;          // $30
  metroPallet: number;           // $150
  majorRegionalPallet: number;   // $250
  otherRegionalPallet: number;   // $350
  freeThresholdExGst: number;    // $700
  gstRate: number;               // 0.10 (10%)

  // Demo Rules & Assumptions (Pending SDB Approval)
  palletVolumeCapacityM3: number;  // e.g. 1.8 m³
  maxPalletWeightKg: number;       // e.g. 1000 kg
  bulkyReviewThreshold: number;    // 3 items
  standardMaxCartonLengthMm: number; // e.g. 1200 mm
  standardMaxCartonWidthMm: number;  // e.g. 800 mm
  standardMaxCartonHeightMm: number; // e.g. 800 mm
  standardMaxCartonWeightKg: number; // e.g. 25 kg
  designatedBulkySkus: string[];     // User-configured or loaded bulky SKUs
  designatedBulkyTypes: string[];    // Product types treated as bulky by demo assumption
  forcePalletDelivery: boolean;      // Staff toggle to simulate forced palletisation
}

export interface PostcodeEntry {
  postcode: string;
  suburb: string;
  state: string;
  zone: DeliveryZone;
}

export interface DataQualityReport {
  totalRowsScanned: number;
  uniqueSkus: number;
  duplicateSkusCount: number;
  duplicateSkus: Array<{
    sku: string;
    rowNumbers: number[];
    count: number;
  }>;
  missingPhysicalDataCount: number;
  missingPhysicalData: Array<{
    rowNumber: number;
    sku: string;
    missingFields: string[];
  }>;
  missingTypeCount: number;
  missingUpcCount: number;
}
