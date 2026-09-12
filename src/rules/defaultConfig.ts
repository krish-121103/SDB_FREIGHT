import type { AppConfig } from '../types';

export const DEFAULT_CONFIG: AppConfig = {
  // Official Proposed Delivery Policy Rates (Ex GST)
  standardMetroUnder700: 35,
  standardMetro700Plus: 0,
  majorRegionalStandard: 75,
  otherRegionalStandard: 120,
  bulkyItemFee: 30,
  metroPallet: 150,
  majorRegionalPallet: 250,
  otherRegionalPallet: 350,
  freeThresholdExGst: 700,
  gstRate: 0.10,

  // Demo Rules & Assumptions (Pending SDB Approval)
  palletVolumeCapacityM3: 1.8,
  maxPalletWeightKg: 1000,
  bulkyReviewThreshold: 3,
  standardMaxCartonLengthMm: 1200,
  standardMaxCartonWidthMm: 800,
  standardMaxCartonHeightMm: 800,
  standardMaxCartonWeightKg: 25,
  designatedBulkySkus: ['OFW1881AT', 'PFWDCART', 'FGS4PBL', '2004B', '3501BL'],
  designatedBulkyTypes: ['Wood Carriers', 'Screen'],
  forcePalletDelivery: false,
};

export const FREIGHT_CODES = {
  MET_STD: { code: 'MET-STD', description: 'Standard Metro Delivery (Under $700 ex GST)', rate: 35 },
  MET_FREE: { code: 'MET-FREE', description: 'Standard Metro Delivery ($700+ ex GST Free Delivery)', rate: 0 },
  REG1_STD: { code: 'REG1-STD', description: 'Major Regional Standard Delivery', rate: 75 },
  REG2_STD: { code: 'REG2-STD', description: 'Other Regional Standard Delivery', rate: 120 },
  BULKY_UNIT: { code: 'BULKY-UNIT', description: 'Designated Bulky Non-Pallet Product Contribution', rate: 30 },
  MET_PAL: { code: 'MET-PAL', description: 'Metro Pallet Delivery', rate: 150 },
  REG1_PAL: { code: 'REG1-PAL', description: 'Major Regional Pallet Delivery', rate: 250 },
  REG2_PAL: { code: 'REG2-PAL', description: 'Other Regional Pallet Delivery', rate: 350 },
  REMOTE: { code: 'REMOTE', description: 'Remote Location (Carrier Rate Applies)', rate: 0 },
} as const;
