import type {
  OrderHeader,
  ParsedItem,
  ParsingWarning,
  ParsedOrderResult,
  ConfidenceLevel,
} from './types';
import { findProductInCatalog, findCatalogSkusInText } from './productCatalogMatcher';

/**
 * Common words to ignore when looking for customer name
 */
const DOCUMENT_HEADER_KEYWORDS = [
  'PURCHASE ORDER',
  'TAX INVOICE',
  'INVOICE',
  'ORDER CONFIRMATION',
  'SALES ORDER',
  'DELIVERY DOCKET',
  'PACKING SLIP',
  'QUOTATION',
  'QUOTE',
  'PAGE',
  'STATEMENT',
  'REMITTANCE',
];

/**
 * Parses header information (Customer, PO#, Date, Delivery/Billing Address, Contact)
 */
export function extractOrderHeader(lines: string[]): {
  header: OrderHeader;
  headerLineIndices: Set<number>;
} {
  const header: OrderHeader = {
    orderNumber: '',
    orderDate: '',
    customer: '',
    contact: '',
    deliveryAddress: '',
    billingAddress: '',
  };

  const headerLineIndices = new Set<number>();
  const addressLines: string[] = [];
  const billingAddressLines: string[] = [];

  let inDeliveryBlock = false;
  let inBillingBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // 1. Order Number / PO Number
    // Matches "O/No: Erik", "PO: 12345", "Purchase Order #: PO-987", "Order Ref: ABC"
    const poMatch = rawLine.match(
      /(?:P\.?O\.?\s*(?:#|Number|No|Num|\.)?|Purchase\s*Order\s*(?:#|No|Number|\.)?|O\/No\.?:?|Order\s*(?:#|No|Number|\.)?|Order\s*Ref\s*[:#\-]?)\s*[:#\-]?\s*([A-Za-z0-9\-_/]+(?:\s+[A-Za-z0-9\-_/]+)?)/i
    );
    if (poMatch && !header.orderNumber) {
      header.orderNumber = poMatch[1].trim();
      headerLineIndices.add(i);

      // If O/No is a person name (like "Erik"), also populate contact if empty
      if (
        !header.contact &&
        !/\d/.test(header.orderNumber) &&
        header.orderNumber.length < 25
      ) {
        header.contact = header.orderNumber;
      }
      continue;
    }

    // 2. Order Date
    const dateMatch = rawLine.match(
      /(?:Date|Order\s*Date|Dated|Invoice\s*Date)\s*[:#\-]?\s*(\d{1,2}[/\-.][A-Za-z0-9]+[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i
    );
    if (dateMatch && !header.orderDate) {
      header.orderDate = dateMatch[1].trim();
      headerLineIndices.add(i);
      continue;
    }

    // 3. Contact Person
    const contactMatch = rawLine.match(
      /(?:Contact|Attn|Attention|Contact\s*Person|Customer\s*Ref|Buyer|Requested\s*By)\s*[:#\-]?\s*([^\n\r,;:]{2,40})/i
    );
    if (contactMatch && (!header.contact || header.contact === header.orderNumber)) {
      header.contact = contactMatch[1].trim();
      headerLineIndices.add(i);
      continue;
    }

    // 4. Customer / Company explicitly labeled
    const customerMatch = rawLine.match(
      /(?:Customer|Company|Client|Sold\s*To|Bill\s*To|Account)\s*[:#\-]?\s*([^\n\r,;:]{2,50})/i
    );
    if (customerMatch && !header.customer) {
      const candidate = customerMatch[1].trim();
      if (!DOCUMENT_HEADER_KEYWORDS.some((kw) => candidate.toUpperCase().includes(kw))) {
        header.customer = candidate;
        headerLineIndices.add(i);
        continue;
      }
    }

    // 5. Section headers for Delivery / Billing address
    if (/^(?:Deliver\s*To|Ship\s*To|Delivery\s*Address|Destination|Site\s*Address)\s*[:#\-]?/i.test(rawLine)) {
      inDeliveryBlock = true;
      inBillingBlock = false;
      headerLineIndices.add(i);
      const remaining = rawLine.replace(/^(?:Deliver\s*To|Ship\s*To|Delivery\s*Address|Destination|Site\s*Address)\s*[:#\-]?/i, '').trim();
      if (remaining) {
        addressLines.push(remaining);
      }
      continue;
    }

    if (/^(?:Bill\s*To|Invoice\s*To|Billing\s*Address)\s*[:#\-]?/i.test(rawLine)) {
      inBillingBlock = true;
      inDeliveryBlock = false;
      headerLineIndices.add(i);
      const remaining = rawLine.replace(/^(?:Bill\s*To|Invoice\s*To|Billing\s*Address)\s*[:#\-]?/i, '').trim();
      if (remaining) {
        billingAddressLines.push(remaining);
      }
      continue;
    }

    // 6. Address line collection inside address blocks
    if (inDeliveryBlock) {
      // End delivery block if we hit empty line, line item, or new section
      if (isLineItemCandidate(rawLine) || poMatch || dateMatch) {
        inDeliveryBlock = false;
      } else {
        addressLines.push(rawLine);
        headerLineIndices.add(i);
        continue;
      }
    }

    if (inBillingBlock) {
      if (isLineItemCandidate(rawLine) || poMatch || dateMatch) {
        inBillingBlock = false;
      } else {
        billingAddressLines.push(rawLine);
        headerLineIndices.add(i);
        continue;
      }
    }

    // 7. Check for Australian address patterns without explicit section header
    // e.g. "18/79 Williamson Rd", "INGLEBURN 2565", "SYDNEY NSW 2000"
    const isStreetAddress = /\b(?:\d+[\/-])?\d+\s+[A-Za-z0-9\s]+(?:\s+(?:Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Ct|Court|Cres|Crescent|Pkwy|Parkway|Blvd|Boulevard|Hwy|Highway|Way|Lane|Pl|Place))\b/i.test(rawLine);
    const isSubPostcode = /\b[A-Za-z\s]{2,}\s+(?:NSW|VIC|QLD|SA|WA|TAS|ACT|NT)?\s*\b([0-9]{4})\b/i.test(rawLine) ||
                          /\b(?:NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s+([0-9]{4})\b/i.test(rawLine) ||
                          /\b([A-Z]{3,})\s+([0-9]{4})\b/.test(rawLine);

    if (isStreetAddress || isSubPostcode) {
      addressLines.push(rawLine);
      headerLineIndices.add(i);
      continue;
    }

    // 8. If customer is still empty, and this is line 0 or line 1 before any address or line items,
    // it is very likely the customer/company name (e.g. "SYDNEY BBQS")
    if (
      !header.customer &&
      i < 4 &&
      !isLineItemCandidate(rawLine) &&
      rawLine.length > 2 &&
      rawLine.length < 50 &&
      !DOCUMENT_HEADER_KEYWORDS.some((kw) => rawLine.toUpperCase().includes(kw)) &&
      !poMatch &&
      !dateMatch
    ) {
      header.customer = rawLine;
      headerLineIndices.add(i);
      continue;
    }
  }

  if (addressLines.length > 0) {
    header.deliveryAddress = addressLines.join(', ');
  }

  if (billingAddressLines.length > 0) {
    header.billingAddress = billingAddressLines.join(', ');
  }

  return { header, headerLineIndices };
}

/**
 * Quick heuristic to check if a line is likely an order item line
 */
export function isLineItemCandidate(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Pattern: "2 X OM2017-1B" or "2x OM2017" or "60 X SBFL"
  if (/^\d+\s*(?:[xX*]|pcs|units|qty|ea|@)\s+[A-Za-z0-9]/i.test(trimmed)) {
    return true;
  }

  // Pattern: "OM2017-1B x 2" or "OM2017-1B 2"
  if (/^[A-Za-z0-9][A-Za-z0-9_\-\.\/]+\s+(?:[xX*]|qty:?)?\s*\d+/i.test(trimmed)) {
    return true;
  }

  // Check if line contains any known catalog SKU
  const catalogMatches = findCatalogSkusInText(trimmed);
  if (catalogMatches.length > 0) {
    return true;
  }

  return false;
}

/**
 * Extracts product attributes (size, colour, pack size, etc.) from description/line
 */
export function extractProductAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Size patterns (e.g. 500ml, 1L, 20kg, 60cm, Small, Large)
  const sizeMatch = text.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|litre|litres|kg|g|mm|cm|m)\b|small|medium|large|xl|xxl)\b/i);
  if (sizeMatch) {
    attrs.size = sizeMatch[1].trim();
  }

  // Colour patterns
  const colourMatch = text.match(/\b(black|silver|red|blue|grey|gray|white|stainless(?:\s*steel)?|yellow|green|orange|brown)\b/i);
  if (colourMatch) {
    attrs.colour = colourMatch[1].trim();
  }

  // Pack size patterns
  const packMatch = text.match(/\b(?:pack|box|ctn|carton|set)\s*(?:of)?\s*(\d+)\b/i);
  if (packMatch) {
    attrs.packSize = packMatch[1].trim();
  }

  return attrs;
}

/**
 * Extracts prices from text (unit price, total price)
 */
function extractPrices(
  text: string,
  quantity: number
): { unitPrice: number | null; totalPrice: number | null } {
  // Find all dollar amounts or decimal numbers that look like prices
  // e.g. $150.00, $300, 150.00, 300.00
  const priceMatches = text.match(/\$?\b\d+\.\d{2}\b/g);

  if (priceMatches && priceMatches.length > 0) {
    const nums = priceMatches
      .map((p) => parseFloat(p.replace('$', '')))
      .filter((n) => !isNaN(n) && n > 0);

    if (nums.length >= 2) {
      // If two prices, typically smaller is unit price, larger is total price
      const sorted = [...nums].sort((a, b) => a - b);
      // Check if one looks like qty * unitPrice
      const maybeUnit = sorted[0];
      const maybeTotal = sorted[sorted.length - 1];

      if (Math.abs(maybeUnit * quantity - maybeTotal) < 0.1 || nums[0] <= nums[1]) {
        return { unitPrice: nums[0], totalPrice: nums[1] };
      }
      return { unitPrice: maybeUnit, totalPrice: maybeTotal };
    }

    if (nums.length === 1) {
      const singlePrice = nums[0];
      // Check if preceded by @ or ea or unit
      if (/@|\bea\b|\beach\b|\bunit\b/i.test(text)) {
        return {
          unitPrice: singlePrice,
          totalPrice: quantity > 0 ? Number((singlePrice * quantity).toFixed(2)) : singlePrice,
        };
      }
      if (/\btotal\b/i.test(text)) {
        return {
          unitPrice: quantity > 0 ? Number((singlePrice / quantity).toFixed(2)) : singlePrice,
          totalPrice: singlePrice,
        };
      }
      return {
        unitPrice: singlePrice,
        totalPrice: quantity > 0 ? Number((singlePrice * quantity).toFixed(2)) : singlePrice,
      };
    }
  }

  return { unitPrice: null, totalPrice: null };
}

/**
 * Checks if a string contains suspicious OCR characters or malformations
 */
function checkSuspiciousOcr(rawSku: string): { isSuspicious: boolean; reason?: string } {
  // Characters like ~ ^ { } [ ] \ | are typical OCR noise
  if (/[~^\{\}\[\]\\\|\?`<>]/g.test(rawSku)) {
    return {
      isSuspicious: true,
      reason: 'Low-confidence OCR extraction: contains noise characters (~, |, ^, etc.)',
    };
  }

  // Look for lowercase l instead of 1, or O instead of 0 in numeric suffixes
  if (/[a-zA-Z]{2,}\d+[oO][a-zA-Z0-9]*/.test(rawSku)) {
    return {
      isSuspicious: true,
      reason: 'Possible OCR character misread (letter O within number sequence)',
    };
  }

  return { isSuspicious: false };
}

/**
 * Main parser function to extract line items from text lines
 */
export function extractLineItems(
  lines: string[],
  headerLineIndices: Set<number>
): { items: ParsedItem[]; itemWarnings: ParsingWarning[] } {
  const items: ParsedItem[] = [];
  const itemWarnings: ParsingWarning[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Skip lines that were explicitly identified as document headers/addresses
    if (headerLineIndices.has(i)) continue;

    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip generic document lines or table headers
    if (
      /^(?:item|sku|code|part\s*#|description|product|qty|quantity|price|total|amount|uom|subtotal|gst|tax)\b/i.test(
        rawLine
      ) &&
      rawLine.split(/\s+/).length < 8
    ) {
      continue;
    }

    if (DOCUMENT_HEADER_KEYWORDS.some((kw) => rawLine.toUpperCase() === kw)) {
      continue;
    }

    let parsedItem: ParsedItem | null = null;

    // --- Strategy 1: Multiplier first (e.g. "2 X OM2017-1B", "60 X SBFL", "36 X JETGAS") ---
    const multiplierFirstMatch = rawLine.match(
      /^(\d+)\s*(?:[xX*]|pcs|units|qty|ea|@)?\s+([A-Za-z0-9][A-Za-z0-9_\-\.\/~^{}[\]|\\?`<>]{1,25})(?:\s+(.*))?$/
    );

    if (multiplierFirstMatch) {
      const qty = parseInt(multiplierFirstMatch[1], 10);
      const candidateSku = multiplierFirstMatch[2].trim();
      const rest = multiplierFirstMatch[3] ? multiplierFirstMatch[3].trim() : '';

      parsedItem = createParsedItem(candidateSku, qty, rest, rawLine, i);
    }

    // --- Strategy 2: Tabular / Multi-Column line (Tabs or 2+ spaces) ---
    // If line has multiple columns, tabular structure is highly reliable
    if (!parsedItem && (rawLine.includes('\t') || /\s{2,}/.test(rawLine))) {
      const columns = rawLine.split(/\t+|\s{2,}/).map((c) => c.trim()).filter(Boolean);
      if (columns.length >= 2) {
        let detectedSku: string | null = null;
        let detectedQty: number | null = null;
        let detectedDesc = '';

        for (const col of columns) {
          // Check if column is a price ($150.00)
          if (/^\$?\d+\.\d{2}$/.test(col)) {
            continue;
          }
          // Check if column is an integer quantity
          if (detectedQty === null && /^\d+$/.test(col) && parseInt(col, 10) < 10000) {
            detectedQty = parseInt(col, 10);
          } else if (detectedSku === null && (findProductInCatalog(col) || /^[A-Za-z0-9][A-Za-z0-9_\-\.\/~^{}[\]|\\?`<>]{2,25}$/.test(col))) {
            detectedSku = col;
          } else {
            detectedDesc += (detectedDesc ? ' ' : '') + col;
          }
        }

        if (detectedSku && detectedQty !== null) {
          parsedItem = createParsedItem(detectedSku, detectedQty, detectedDesc, rawLine, i);
        }
      }
    }

    // --- Strategy 3: SKU first with quantity (e.g. "OM2017-1B x 2", "OM2017-1B 2 ea", "OM2017-1B Qty: 2") ---
    if (!parsedItem) {
      const skuFirstMatch = rawLine.match(
        /^([A-Za-z0-9][A-Za-z0-9_\-\.\/~^{}[\]|\\?`<>]{1,25})\s*(?:[-–:]\s*)?(.*?)\s*(?:[xX*]|qty:?|quantity:?)\s*(\d+)(?:\s+(.*))?$/i
      );
      if (skuFirstMatch) {
        const candidateSku = skuFirstMatch[1].trim();
        const middleDesc = skuFirstMatch[2] ? skuFirstMatch[2].trim() : '';
        const qty = parseInt(skuFirstMatch[3], 10);
        const tailDesc = skuFirstMatch[4] ? skuFirstMatch[4].trim() : '';
        const combinedDesc = [middleDesc, tailDesc].filter(Boolean).join(' ');

        parsedItem = createParsedItem(candidateSku, qty, combinedDesc, rawLine, i);
      }
    }

    // --- Strategy 4: Catalog match anywhere in the line ---
    if (!parsedItem) {
      const catalogMatches = findCatalogSkusInText(rawLine);
      if (catalogMatches.length > 0) {
        const match = catalogMatches[0];
        const candidateSku = match.sku;

        // Strip prices and SKU before looking for quantity
        const withoutPrices = rawLine.replace(/\$?\b\d+\.\d{2}\b/g, '');
        const withoutSku = withoutPrices.replace(new RegExp(`\\b${escapeRegex(candidateSku)}\\b`, 'i'), '');

        let qty = 1;
        const qtyMatch = withoutSku.match(/(?:^|\s)(\d+)\s*(?:[xX*]|pcs|units|qty|ea|@)\b/i) ||
                         withoutSku.match(/(?:[xX*]|qty:?|quantity:?)\s*(\d+)\b/i) ||
                         withoutSku.match(/\b(\d+)\s*(?:ea|units|pcs)\b/i);

        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10);
        } else {
          // If a standalone number appears
          const standaloneNums = withoutSku.match(/\b(\d{1,4})\b/g);
          if (standaloneNums && standaloneNums.length > 0) {
            qty = parseInt(standaloneNums[0], 10);
          }
        }

        const desc = withoutPrices
          .replace(new RegExp(`\\b${escapeRegex(candidateSku)}\\b`, 'i'), '')
          .replace(new RegExp(`\\b${qty}\\s*(?:[xX*]|pcs|units|qty|ea|@)?\\b`, 'i'), '')
          .trim();

        parsedItem = createParsedItem(candidateSku, qty, desc, rawLine, i, match.product);
      }
    }

    if (parsedItem) {
      items.push(parsedItem);
      // Collect item warnings for global warning list
      for (const w of parsedItem.warnings) {
        itemWarnings.push({
          id: `WARN_${i}_${Math.random().toString(36).substring(2, 6)}`,
          lineIndex: i,
          itemSku: parsedItem.sku,
          severity: parsedItem.confidence === 'LOW' ? 'WARNING' : 'INFO',
          message: w,
          rawText: rawLine,
        });
      }
    }
  }

  return { items, itemWarnings };
}

/**
 * Creates and validates a ParsedItem instance with confidence score & warnings
 */
function createParsedItem(
  candidateSku: string,
  quantity: number,
  restOfLine: string,
  rawLine: string,
  lineIndex: number,
  prematchedProduct?: any
): ParsedItem {
  const warnings: string[] = [];
  let confidence: ConfidenceLevel = 'HIGH';

  // 1. Check for suspicious OCR characters
  const ocrCheck = checkSuspiciousOcr(candidateSku);
  if (ocrCheck.isSuspicious) {
    confidence = 'LOW';
    warnings.push(ocrCheck.reason || 'Low-confidence OCR extraction');
  }

  // 2. Quantity validation
  if (isNaN(quantity) || quantity <= 0) {
    confidence = 'LOW';
    warnings.push('Quantity cannot be determined or is 0');
  }

  // 3. Catalog matching
  const catalogProduct = prematchedProduct || findProductInCatalog(candidateSku);
  let matchedCatalogSku: string | undefined = undefined;
  let description = restOfLine;

  if (catalogProduct) {
    matchedCatalogSku = catalogProduct.sku;
    // If description from text is empty or very short, use catalog product type/sku
    if (!description || description.length < 3) {
      description = catalogProduct.type ? `${catalogProduct.type} (${catalogProduct.sku})` : catalogProduct.sku;
    }
  } else {
    // SKU not found in database
    if (confidence !== 'LOW') {
      confidence = 'MEDIUM';
    }
    warnings.push(`SKU '${candidateSku}' not found in product catalog`);
  }

  // 4. Prices - always check the entire rawLine to ensure prices in any column are captured
  const prices = extractPrices(rawLine, quantity);

  // 5. Attributes
  const attributes = extractProductAttributes(restOfLine || rawLine);

  return {
    id: `ITEM_${lineIndex}_${candidateSku}_${Math.random().toString(36).substring(2, 7)}`,
    sku: candidateSku,
    description: description.replace(/^[-\s–:]+/, '').trim(),
    quantity: Math.max(1, quantity || 1),
    unitPrice: prices.unitPrice,
    totalPrice: prices.totalPrice,
    attributes,
    confidence,
    warnings,
    rawLine,
    matchedCatalogSku,
  };
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main Unified Order Parser
 * Takes raw text (from manual input or PDF extraction) and returns structured order data
 */
export function parseOrderText(
  rawText: string,
  sourceType: 'PDF' | 'TEXT' = 'TEXT',
  ocrUsed = false,
  fileName?: string,
  pageCount?: number
): ParsedOrderResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const { header, headerLineIndices } = extractOrderHeader(lines);
  const { items, itemWarnings } = extractLineItems(lines, headerLineIndices);

  const parsingWarnings: ParsingWarning[] = [...itemWarnings];

  // Global document-level warnings
  if (items.length === 0) {
    parsingWarnings.unshift({
      id: `GLOBAL_${Date.now()}_NO_ITEMS`,
      severity: 'ERROR',
      message: 'No order items could be detected. Please verify the document or add lines manually.',
      rawText: rawText.slice(0, 100),
    });
  }

  if (!header.deliveryAddress && !header.customer) {
    parsingWarnings.push({
      id: `GLOBAL_${Date.now()}_NO_ADDR`,
      severity: 'WARNING',
      message: 'No delivery address or customer name detected in order header.',
    });
  }

  if (ocrUsed) {
    parsingWarnings.push({
      id: `GLOBAL_${Date.now()}_OCR`,
      severity: 'INFO',
      message: 'Document was processed using OCR text extraction.',
    });
  }

  return {
    order: header,
    items,
    parsingWarnings,
    rawSourceText: rawText,
    sourceType,
    ocrUsed,
    extractedAt: new Date().toISOString(),
    fileName,
    pageCount,
  };
}
