import type { OrderLine, Product, AppConfig } from '../../types';
import type { ParsedOrderResult, ParsedItem } from './types';
import { findProductInCatalog } from './productCatalogMatcher';
import { buildOrderLine } from '../productCalculator';

export interface ConvertedFreightOrder {
  orderLines: OrderLine[];
  detectedPostcode: string | null;
  calculatedOrderValueExGst: number | null;
  customerSummary: {
    customer: string;
    orderNumber: string;
    deliveryAddress: string;
    contact: string;
  };
}

/**
 * Extracts a 4-digit Australian postcode from delivery address text
 */
export function extractPostcodeFromAddress(address: string): string | null {
  if (!address) return null;

  // 1. Look for standard State + Postcode (e.g. "NSW 2565", "VIC 3000")
  const statePostcodeMatch = address.match(/\b(?:NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s+([0-9]{4})\b/i);
  if (statePostcodeMatch) {
    return statePostcodeMatch[1];
  }

  // 2. Look for Suburb + Postcode (e.g. "INGLEBURN 2565")
  const suburbPostcodeMatch = address.match(/\b[A-Za-z]{3,}\s+([0-9]{4})\b/);
  if (suburbPostcodeMatch) {
    return suburbPostcodeMatch[1];
  }

  // 3. Fallback: Any 4-digit number that isn't preceded by street number markers like "No."
  const fourDigitMatches = address.match(/\b([0-9]{4})\b/g);
  if (fourDigitMatches && fourDigitMatches.length > 0) {
    return fourDigitMatches[fourDigitMatches.length - 1]; // usually postcode is near the end
  }

  return null;
}

/**
 * Converts a parsed item into an existing calculator OrderLine
 */
export function convertParsedItemToOrderLine(
  item: ParsedItem,
  config: AppConfig
): OrderLine {
  const catalogProduct = findProductInCatalog(item.sku);

  let product: Product;

  if (catalogProduct) {
    product = catalogProduct;
  } else {
    // Construct a placeholder product for unknown SKU so freight safety checks work
    product = {
      id: `IMPORTED_${item.sku}_${Date.now()}`,
      rowNumber: 0,
      type: item.description || 'Imported SKU',
      sku: item.sku,
      upc: null,
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
  }

  return buildOrderLine(product, item.quantity, config);
}

/**
 * Pure adapter to convert the confirmed parsed order into the exact format
 * consumed by the existing Freight Calculator.
 */
export function convertOrderToFreightCalculator(
  parsedOrder: ParsedOrderResult,
  config: AppConfig
): ConvertedFreightOrder {
  const orderLines: OrderLine[] = parsedOrder.items.map((item) =>
    convertParsedItemToOrderLine(item, config)
  );

  const detectedPostcode = extractPostcodeFromAddress(parsedOrder.order.deliveryAddress);

  // Calculate order value if any prices were extracted
  let totalCalculatedValue = 0;
  let hasPrice = false;

  for (const item of parsedOrder.items) {
    if (item.totalPrice !== null && item.totalPrice > 0) {
      totalCalculatedValue += item.totalPrice;
      hasPrice = true;
    } else if (item.unitPrice !== null && item.unitPrice > 0) {
      totalCalculatedValue += item.unitPrice * item.quantity;
      hasPrice = true;
    }
  }

  return {
    orderLines,
    detectedPostcode,
    calculatedOrderValueExGst: hasPrice ? Number(totalCalculatedValue.toFixed(2)) : null,
    customerSummary: {
      customer: parsedOrder.order.customer,
      orderNumber: parsedOrder.order.orderNumber,
      deliveryAddress: parsedOrder.order.deliveryAddress,
      contact: parsedOrder.order.contact,
    },
  };
}
