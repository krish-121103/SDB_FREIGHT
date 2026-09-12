import { describe, it, expect } from 'vitest';
import { calculateFreight } from '../freightCalculator';
import { DEFAULT_CONFIG } from '../../rules/defaultConfig';
import type { Product, OrderLine } from '../../types';

// Mock products for testing
const mockStandardProduct: Product = {
  id: 'ROW_2_OMTGC',
  rowNumber: 2,
  type: 'BBQ Accessories',
  sku: 'OMTGC',
  upc: '9325086015139',
  lengthMm: 65,
  widthMm: 55,
  heightMm: 90,
  weightKg: 0.05,
  unitVolumeM3: 0.000322,
  isPhysicalDataComplete: true,
  missingFields: [],
  isDuplicateSku: false,
  duplicateCount: 1,
};

const mockBulkyProduct: Product = {
  id: 'ROW_200_OFW1881AT',
  rowNumber: 200,
  type: 'Wood Carriers',
  sku: 'OFW1881AT',
  upc: '9325086013449',
  lengthMm: 420,
  widthMm: 85,
  heightMm: 1050,
  weightKg: 8.25,
  unitVolumeM3: 0.037485,
  isPhysicalDataComplete: true,
  missingFields: [],
  isDuplicateSku: false,
  duplicateCount: 1,
};

const mockIncompleteProduct: Product = {
  id: 'ROW_77_6FLAPVC',
  rowNumber: 77,
  type: 'Flue Brushes',
  sku: '6FLAPVC',
  upc: '9325086011111',
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  weightKg: null,
  unitVolumeM3: null,
  isPhysicalDataComplete: false,
  missingFields: ['lengthMm', 'widthMm', 'heightMm', 'weightKg'],
  isDuplicateSku: false,
  duplicateCount: 1,
};

function createLine(product: Product, quantity: number, isBulky: boolean = false): OrderLine {
  const lineWeight = product.weightKg !== null ? product.weightKg * quantity : null;
  const lineVolume = product.unitVolumeM3 !== null ? product.unitVolumeM3 * quantity : null;
  return {
    id: `line_${product.sku}`,
    product,
    quantity,
    isBulkyDesignated: isBulky,
    lineWeightKg: lineWeight,
    lineVolumeM3: lineVolume,
    hasDataError: !product.isPhysicalDataComplete,
    errorMessage: !product.isPhysicalDataComplete ? 'Missing dimensions/weight' : undefined,
  };
}

describe('SDB Freight Calculator Engine - Policy Scenarios', () => {
  // TEST 1: Metro standard under $700 -> $35 ex GST
  it('TEST 1: Metro standard under $700 should charge $35 ex GST', () => {
    const lines = [createLine(mockStandardProduct, 5, false)];
    const result = calculateFreight(lines, 500, 'METRO', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('STANDARD');
    expect(result.freightExGst).toBe(35);
    expect(result.gstAmount).toBe(3.5);
    expect(result.freightIncGst).toBe(38.5);
    expect(result.calculationLines.some((l) => l.code === 'MET-STD')).toBe(true);
  });

  // TEST 2: Metro standard $700+ -> FREE ($0)
  it('TEST 2: Metro standard $700 or more should be FREE ($0 ex GST)', () => {
    const lines = [createLine(mockStandardProduct, 10, false)];
    const result = calculateFreight(lines, 800, 'METRO', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('STANDARD');
    expect(result.freightExGst).toBe(0);
    expect(result.gstAmount).toBe(0);
    expect(result.freightIncGst).toBe(0);
    expect(result.calculationLines.some((l) => l.code === 'MET-FREE')).toBe(true);
  });

  // TEST 3: Metro $800 + 1 bulky -> $30 ex GST
  it('TEST 3: Metro $800 with 1 bulky item should charge $30 ex GST ($0 standard + $30 bulky)', () => {
    const lines = [
      createLine(mockStandardProduct, 5, false),
      createLine(mockBulkyProduct, 1, true),
    ];
    const result = calculateFreight(lines, 800, 'METRO', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('BULKY_NON_PALLET');
    expect(result.freightExGst).toBe(30);
    expect(result.gstAmount).toBe(3.0);
    expect(result.freightIncGst).toBe(33.0);
    expect(result.calculationLines.some((l) => l.code === 'MET-FREE')).toBe(true);
    expect(result.calculationLines.some((l) => l.code === 'BULKY-UNIT')).toBe(true);
  });

  // TEST 4: Metro $800 + 2 bulky -> $60 ex GST
  it('TEST 4: Metro $800 with 2 bulky items should charge $60 ex GST', () => {
    const lines = [
      createLine(mockStandardProduct, 5, false),
      createLine(mockBulkyProduct, 2, true),
    ];
    const result = calculateFreight(lines, 800, 'METRO', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('BULKY_NON_PALLET');
    expect(result.freightExGst).toBe(60);
    expect(result.gstAmount).toBe(6.0);
    expect(result.freightIncGst).toBe(66.0);
  });

  // TEST 5: Major Regional standard -> $75 ex GST
  it('TEST 5: Major Regional standard should charge $75 ex GST', () => {
    const lines = [createLine(mockStandardProduct, 5, false)];
    const result = calculateFreight(lines, 500, 'MAJOR_REGIONAL', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('STANDARD');
    expect(result.freightExGst).toBe(75);
    expect(result.gstAmount).toBe(7.5);
    expect(result.freightIncGst).toBe(82.5);
    expect(result.calculationLines.some((l) => l.code === 'REG1-STD')).toBe(true);
  });

  // TEST 6: Other Regional standard -> $120 ex GST
  it('TEST 6: Other Regional standard should charge $120 ex GST', () => {
    const lines = [createLine(mockStandardProduct, 5, false)];
    const result = calculateFreight(lines, 500, 'OTHER_REGIONAL', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('STANDARD');
    expect(result.freightExGst).toBe(120);
    expect(result.gstAmount).toBe(12.0);
    expect(result.freightIncGst).toBe(132.0);
    expect(result.calculationLines.some((l) => l.code === 'REG2-STD')).toBe(true);
  });

  // TEST 7: Metro pallet -> $150 per pallet, NO bulky fee double charging
  it('TEST 7: Metro pallet should charge $150 per pallet and waive bulky item fee', () => {
    const lines = [
      createLine(mockStandardProduct, 10, false),
      createLine(mockBulkyProduct, 2, true),
    ];
    // Force pallet delivery or trigger threshold
    const config = { ...DEFAULT_CONFIG, forcePalletDelivery: true };
    const result = calculateFreight(lines, 800, 'METRO', false, config);

    expect(result.classification).toBe('PALLET');
    expect(result.palletRequired).toBe(true);
    expect(result.freightExGst).toBe(150); // 1 pallet @ $150
    expect(result.gstAmount).toBe(15.0);
    expect(result.freightIncGst).toBe(165.0);
    expect(result.calculationLines.some((l) => l.code === 'MET-PAL')).toBe(true);
    // CRITICAL: Bulky fee must NOT be charged!
    expect(result.calculationLines.some((l) => l.code === 'BULKY-UNIT')).toBe(false);
  });

  // TEST 8: Major Regional pallet -> $250 per pallet
  it('TEST 8: Major Regional pallet should charge $250 per pallet', () => {
    const lines = [createLine(mockStandardProduct, 10, false)];
    const config = { ...DEFAULT_CONFIG, forcePalletDelivery: true };
    const result = calculateFreight(lines, 800, 'MAJOR_REGIONAL', false, config);

    expect(result.classification).toBe('PALLET');
    expect(result.freightExGst).toBe(250);
    expect(result.calculationLines.some((l) => l.code === 'REG1-PAL')).toBe(true);
  });

  // TEST 9: Other Regional pallet -> $350 per pallet
  it('TEST 9: Other Regional pallet should charge $350 per pallet', () => {
    const lines = [createLine(mockStandardProduct, 10, false)];
    const config = { ...DEFAULT_CONFIG, forcePalletDelivery: true };
    const result = calculateFreight(lines, 800, 'OTHER_REGIONAL', false, config);

    expect(result.classification).toBe('PALLET');
    expect(result.freightExGst).toBe(350);
    expect(result.calculationLines.some((l) => l.code === 'REG2-PAL')).toBe(true);
  });

  // TEST 10: 3+ bulky items -> Warehouse review recommended
  it('TEST 10: 3 or more bulky items should trigger warehouse review warning', () => {
    const lines = [createLine(mockBulkyProduct, 3, true)];
    const result = calculateFreight(lines, 800, 'METRO', false, DEFAULT_CONFIG);

    expect(result.bulkyItemCount).toBe(3);
    expect(result.warnings.some((w) => w.includes('Warehouse review recommended'))).toBe(true);
    expect(result.freightExGst).toBe(90); // 3 * $30
  });

  // Remote Delivery Test
  it('Remote location should require carrier freight and not show invented rate', () => {
    const lines = [createLine(mockStandardProduct, 5, false)];
    const result = calculateFreight(lines, 500, 'REMOTE', false, DEFAULT_CONFIG);

    expect(result.classification).toBe('REMOTE');
    expect(result.isRemoteCarrierRate).toBe(true);
    expect(result.freightExGst).toBeNull();
    expect(result.freightIncGst).toBeNull();
    expect(result.calculationLines.some((l) => l.code === 'REMOTE')).toBe(true);
  });

  // Data Quality / Incomplete Product Test
  it('Should halt calculation and flag missing dimensions/weight when incomplete product is added', () => {
    const lines = [createLine(mockIncompleteProduct, 1, false)];
    const result = calculateFreight(lines, 500, 'METRO', false, DEFAULT_CONFIG);

    expect(result.hasDataErrors).toBe(true);
    expect(result.freightExGst).toBeNull();
    expect(result.dataErrorMessages.length).toBeGreaterThan(0);
  });

  // Multi-Pallet Calculation by Volume Test
  it('Should correctly calculate multiple pallets when volume exceeds single pallet capacity', () => {
    // 1 unit = 0.037485 m³. 50 units = ~1.874 m³ > 1.8 m³ (triggers 2 pallets)
    const lines = [createLine(mockBulkyProduct, 50, false)];
    const result = calculateFreight(lines, 2000, 'METRO', false, DEFAULT_CONFIG);

    expect(result.palletRequired).toBe(true);
    expect(result.palletsRequired).toBe(2);
    expect(result.freightExGst).toBe(300); // 2 * $150
  });
});
