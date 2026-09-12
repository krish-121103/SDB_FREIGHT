import type {
  OrderLine,
  DeliveryZone,
  ShipmentClassification,
  FreightResult,
  FreightBreakdownLine,
  AppConfig,
} from '../types';
import { getZoneLabel } from './zoneCalculator';

export function calculateFreight(
  orderLines: OrderLine[],
  orderValueExGst: number,
  zone: DeliveryZone,
  isZoneOverridden: boolean,
  config: AppConfig
): FreightResult {
  const safeOrderValueExGst = Math.max(0, Number(orderValueExGst) || 0);
  const orderValueGst = Number((safeOrderValueExGst * config.gstRate).toFixed(2));
  const orderValueIncGst = Number((safeOrderValueExGst + orderValueGst).toFixed(2));

  const warnings: string[] = [];
  const demoAssumptionsApplied: string[] = [];
  const ruleExplanations: string[] = [];
  const calculationLines: FreightBreakdownLine[] = [];
  const dataErrorMessages: string[] = [];

  // 1. Data Quality & Validation Checks
  let hasDataErrors = false;
  let totalItemCount = 0;
  let standardItemCount = 0;
  let bulkyItemCount = 0;
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;

  for (const line of orderLines) {
    if (line.quantity <= 0) continue;

    totalItemCount += line.quantity;

    if (line.hasDataError) {
      hasDataErrors = true;
      if (line.errorMessage && !dataErrorMessages.includes(line.errorMessage)) {
        dataErrorMessages.push(`${line.product.sku}: ${line.errorMessage}`);
      }
    }

    if (line.product.isDuplicateSku) {
      warnings.push(
        `Notice: SKU ${line.product.sku} has duplicate records in master spreadsheet (Row ${line.product.rowNumber}). Verify selected specifications.`
      );
    }

    if (line.lineWeightKg !== null) {
      totalWeightKg += line.lineWeightKg;
    }
    if (line.lineVolumeM3 !== null) {
      totalVolumeM3 += line.lineVolumeM3;
    }

    if (line.isBulkyDesignated) {
      bulkyItemCount += line.quantity;
    } else {
      standardItemCount += line.quantity;
    }
  }

  totalWeightKg = Number(totalWeightKg.toFixed(2));
  totalVolumeM3 = Number(totalVolumeM3.toFixed(6));

  // If order is empty
  if (totalItemCount === 0) {
    return {
      zone,
      zoneLabel: getZoneLabel(zone),
      isZoneOverridden,
      orderValueExGst: safeOrderValueExGst,
      orderValueGst,
      orderValueIncGst,
      totalWeightKg: 0,
      totalVolumeM3: 0,
      totalItemCount: 0,
      standardItemCount: 0,
      bulkyItemCount: 0,
      palletRequired: false,
      palletsRequired: 0,
      palletReason: null,
      classification: 'STANDARD',
      classificationLabel: 'Standard Delivery',
      freightExGst: 0,
      gstAmount: 0,
      freightIncGst: 0,
      isRemoteCarrierRate: false,
      calculationLines: [],
      ruleExplanations: ['No products in order.'],
      warnings: [],
      demoAssumptionsApplied: [],
      hasDataErrors: false,
      dataErrorMessages: [],
    };
  }

  // 2. Data Error Halt
  if (hasDataErrors) {
    return {
      zone,
      zoneLabel: getZoneLabel(zone),
      isZoneOverridden,
      orderValueExGst: safeOrderValueExGst,
      orderValueGst,
      orderValueIncGst,
      totalWeightKg,
      totalVolumeM3,
      totalItemCount,
      standardItemCount,
      bulkyItemCount,
      palletRequired: false,
      palletsRequired: 0,
      palletReason: null,
      classification: 'STANDARD',
      classificationLabel: 'Data Error',
      freightExGst: null,
      gstAmount: null,
      freightIncGst: null,
      isRemoteCarrierRate: false,
      calculationLines: [],
      ruleExplanations: ['Calculation suspended due to missing product physical dimensions or weight.'],
      warnings: ['Product data validation failed. Review order line specifications.'],
      demoAssumptionsApplied: [],
      hasDataErrors: true,
      dataErrorMessages,
    };
  }

  // 3. Palletisation Logic (Demo assumptions pending SDB approval)
  let palletsByVolume = 0;
  let palletsByWeight = 0;
  let palletRequired = false;
  let palletsRequired = 0;
  let palletReason: string | null = null;

  if (config.palletVolumeCapacityM3 > 0) {
    palletsByVolume = Math.ceil(totalVolumeM3 / config.palletVolumeCapacityM3);
  }
  if (config.maxPalletWeightKg > 0) {
    palletsByWeight = Math.ceil(totalWeightKg / config.maxPalletWeightKg);
  }

  const thresholdExceeded = totalVolumeM3 > config.palletVolumeCapacityM3 || totalWeightKg > config.maxPalletWeightKg;

  if (config.forcePalletDelivery || thresholdExceeded) {
    palletRequired = true;
    palletsRequired = Math.max(1, palletsByVolume, palletsByWeight);
    const reasons: string[] = [];
    if (config.forcePalletDelivery) reasons.push('Manual Staff Pallet Override');
    if (totalVolumeM3 > config.palletVolumeCapacityM3)
      reasons.push(`Total volume (${totalVolumeM3} m³) exceeds pallet capacity (${config.palletVolumeCapacityM3} m³)`);
    if (totalWeightKg > config.maxPalletWeightKg)
      reasons.push(`Total weight (${totalWeightKg} kg) exceeds pallet max weight (${config.maxPalletWeightKg} kg)`);

    palletReason = reasons.join('; ');
    demoAssumptionsApplied.push('Pallet loading calculated using demo volume/weight thresholds (Pending SDB approval)');
  }

  // 4. Warehouse Review for 3+ bulky items
  if (bulkyItemCount >= config.bulkyReviewThreshold) {
    warnings.push(
      `Warehouse review recommended: ${bulkyItemCount} bulky items on this order. Policy mandates warehouse review to determine if pallet delivery is safer or more economical.`
    );
  }

  // 5. Determine Shipment Classification
  let classification: ShipmentClassification = 'STANDARD';
  let classificationLabel = 'Standard Delivery';

  if (zone === 'REMOTE') {
    classification = 'REMOTE';
    classificationLabel = 'Remote Delivery';
  } else if (palletRequired) {
    classification = 'PALLET';
    classificationLabel = 'Pallet Delivery';
  } else if (bulkyItemCount > 0) {
    classification = 'BULKY_NON_PALLET';
    classificationLabel = 'Bulky Non-Pallet Delivery';
  }

  // 6. Freight Price Calculation
  let freightExGst: number | null = 0;
  let isRemoteCarrierRate = false;

  if (zone === 'REMOTE') {
    isRemoteCarrierRate = true;
    freightExGst = null;

    calculationLines.push({
      code: 'REMOTE',
      description: 'Remote Delivery Freight',
      unitPriceExGst: 0,
      quantity: 1,
      totalExGst: 0,
      isCarrierRate: true,
      notes: 'Carrier freight rate applies. Not covered by published rate card.',
    });

    ruleExplanations.push(
      'Delivery destination is outside published Metro and Regional zones. Carrier rate must be quoted individually.'
    );
  } else if (palletRequired) {
    // CRITICAL: Pallet Pricing - NO DOUBLE CHARGING
    // Bulky fees and standard consignment charges are REMOVED!
    let unitPalletRate = config.metroPallet;
    let palletCode = 'MET-PAL';

    if (zone === 'MAJOR_REGIONAL') {
      unitPalletRate = config.majorRegionalPallet;
      palletCode = 'REG1-PAL';
    } else if (zone === 'OTHER_REGIONAL') {
      unitPalletRate = config.otherRegionalPallet;
      palletCode = 'REG2-PAL';
    }

    const palletTotalExGst = palletsRequired * unitPalletRate;
    freightExGst = palletTotalExGst;

    calculationLines.push({
      code: palletCode,
      description: `${getZoneLabel(zone)} Pallet Delivery (${palletsRequired} pallet${palletsRequired > 1 ? 's' : ''} @ $${unitPalletRate}/pallet)`,
      unitPriceExGst: unitPalletRate,
      quantity: palletsRequired,
      totalExGst: palletTotalExGst,
      notes: palletReason || undefined,
    });

    ruleExplanations.push(
      `Pallet rate of $${unitPalletRate} ex GST applied for ${palletsRequired} pallet(s) to ${getZoneLabel(zone)}.`
    );

    if (bulkyItemCount > 0) {
      ruleExplanations.push(
        `NO DOUBLE-CHARGING ENFORCED: Order contains ${bulkyItemCount} designated bulky items, but bulky-item fees ($30/item) are waived because the order is palletised.`
      );
    }
  } else {
    // Non-pallet order (Standard and/or Bulky non-pallet)
    let standardFreight = 0;

    if (zone === 'METRO') {
      if (safeOrderValueExGst >= config.freeThresholdExGst) {
        standardFreight = config.standardMetro700Plus; // $0
        calculationLines.push({
          code: 'MET-FREE',
          description: `Standard Metro Delivery - Order value $${safeOrderValueExGst.toFixed(2)} ex GST meets $${config.freeThresholdExGst} threshold`,
          unitPriceExGst: 0,
          quantity: 1,
          totalExGst: 0,
        });
        ruleExplanations.push(
          `Standard Metro portion qualifies for FREE delivery (Order value $${safeOrderValueExGst.toFixed(2)} >= $${config.freeThresholdExGst} ex GST).`
        );
      } else {
        standardFreight = config.standardMetroUnder700; // $35
        calculationLines.push({
          code: 'MET-STD',
          description: `Standard Metro Delivery - Order value $${safeOrderValueExGst.toFixed(2)} ex GST is below $${config.freeThresholdExGst} threshold`,
          unitPriceExGst: config.standardMetroUnder700,
          quantity: 1,
          totalExGst: config.standardMetroUnder700,
        });
        ruleExplanations.push(
          `Standard Metro fee of $${config.standardMetroUnder700} ex GST applied (Order value $${safeOrderValueExGst.toFixed(2)} < $${config.freeThresholdExGst} ex GST).`
        );
      }
    } else if (zone === 'MAJOR_REGIONAL') {
      standardFreight = config.majorRegionalStandard; // $75
      calculationLines.push({
        code: 'REG1-STD',
        description: `Major Regional Standard Delivery ($${config.majorRegionalStandard} per consignment)`,
        unitPriceExGst: config.majorRegionalStandard,
        quantity: 1,
        totalExGst: config.majorRegionalStandard,
      });
      ruleExplanations.push(
        `Major Regional standard rate of $${config.majorRegionalStandard} ex GST applied per consignment.`
      );
    } else if (zone === 'OTHER_REGIONAL') {
      standardFreight = config.otherRegionalStandard; // $120
      calculationLines.push({
        code: 'REG2-STD',
        description: `Other Regional Standard Delivery ($${config.otherRegionalStandard} per consignment)`,
        unitPriceExGst: config.otherRegionalStandard,
        quantity: 1,
        totalExGst: config.otherRegionalStandard,
      });
      ruleExplanations.push(
        `Other Regional standard rate of $${config.otherRegionalStandard} ex GST applied per consignment.`
      );
    }

    let bulkyFreight = 0;
    if (bulkyItemCount > 0) {
      bulkyFreight = bulkyItemCount * config.bulkyItemFee;
      calculationLines.push({
        code: 'BULKY-UNIT',
        description: `Designated Bulky Non-Pallet Item Contribution (${bulkyItemCount} item${bulkyItemCount > 1 ? 's' : ''} × $${config.bulkyItemFee})`,
        unitPriceExGst: config.bulkyItemFee,
        quantity: bulkyItemCount,
        totalExGst: bulkyFreight,
        notes: 'Mandatory $30 per designated bulky item; excluded from free delivery.',
      });
      ruleExplanations.push(
        `Bulky item contribution: $${config.bulkyItemFee} per bulky item × ${bulkyItemCount} item(s) = $${bulkyFreight} ex GST. Applies regardless of order value.`
      );
    }

    freightExGst = standardFreight + bulkyFreight;
  }

  // 7. Calculate GST
  let gstAmount: number | null = null;
  let freightIncGst: number | null = null;

  if (freightExGst !== null) {
    gstAmount = Number((freightExGst * config.gstRate).toFixed(2));
    freightIncGst = Number((freightExGst + gstAmount).toFixed(2));
  }

  return {
    zone,
    zoneLabel: getZoneLabel(zone),
    isZoneOverridden,
    orderValueExGst: safeOrderValueExGst,
    orderValueGst,
    orderValueIncGst,
    totalWeightKg,
    totalVolumeM3,
    totalItemCount,
    standardItemCount,
    bulkyItemCount,
    palletRequired,
    palletsRequired,
    palletReason,
    classification,
    classificationLabel,
    freightExGst,
    gstAmount,
    freightIncGst,
    isRemoteCarrierRate,
    calculationLines,
    ruleExplanations,
    warnings,
    demoAssumptionsApplied,
    hasDataErrors,
    dataErrorMessages,
  };
}
