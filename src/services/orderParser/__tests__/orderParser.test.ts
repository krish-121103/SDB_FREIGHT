import { describe, it, expect } from 'vitest';
import { parseOrderText } from '../textParser';

describe('Order Parser - Core Unified Pipeline', () => {
  it('correctly parses the Sydney BBQs example from requirements', () => {
    const rawText = `
SYDNEY BBQS
18/79 Williamson Rd
INGLEBURN 2565

O/No: Erik

2 X OM2017-1B
2 X OM2017-8JD
60 X SBFL
36 X JETGAS
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');

    // Verify order header
    expect(result.order.customer).toBe('SYDNEY BBQS');
    expect(result.order.orderNumber).toBe('Erik');
    expect(result.order.deliveryAddress).toContain('18/79 Williamson Rd');
    expect(result.order.deliveryAddress).toContain('INGLEBURN 2565');

    // Verify extracted items
    expect(result.items).toHaveLength(4);

    expect(result.items[0].sku).toBe('OM2017-1B');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].matchedCatalogSku).toBe('OM2017-1B');
    expect(result.items[0].confidence).toBe('HIGH');

    expect(result.items[1].sku).toBe('OM2017-8JD');
    expect(result.items[1].quantity).toBe(2);
    expect(result.items[1].matchedCatalogSku).toBe('OM2017-8JD');
    expect(result.items[1].confidence).toBe('HIGH');

    expect(result.items[2].sku).toBe('SBFL');
    expect(result.items[2].quantity).toBe(60);
    expect(result.items[2].matchedCatalogSku).toBe('SBFL');
    expect(result.items[2].confidence).toBe('HIGH');

    expect(result.items[3].sku).toBe('JETGAS');
    expect(result.items[3].quantity).toBe(36);
    expect(result.items[3].matchedCatalogSku).toBe('JETGAS');
    expect(result.items[3].confidence).toBe('HIGH');

    // Check raw source retention
    expect(result.rawSourceText).toBe(rawText);
  });

  it('parses orders with unit prices and total prices', () => {
    const rawText = `
Purchase Order: PO-2026-99
Date: 12/10/2026
Customer: Metro BBQ Supplies
Deliver To: 45 Industrial Drive, Richmond VIC 3121

OM2017-1B   1 Burner Portable BBQ   2   $150.00   $300.00
SBFL        Flame Safe Light         10  $25.00    $250.00
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');

    expect(result.order.orderNumber).toBe('PO-2026-99');
    expect(result.order.orderDate).toBe('12/10/2026');
    expect(result.order.customer).toBe('Metro BBQ Supplies');
    expect(result.order.deliveryAddress).toContain('45 Industrial Drive');

    expect(result.items).toHaveLength(2);
    expect(result.items[0].sku).toBe('OM2017-1B');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].unitPrice).toBe(150);
    expect(result.items[0].totalPrice).toBe(300);

    expect(result.items[1].sku).toBe('SBFL');
    expect(result.items[1].quantity).toBe(10);
    expect(result.items[1].unitPrice).toBe(25);
    expect(result.items[1].totalPrice).toBe(250);
  });

  it('detects unknown SKUs and flags them for review', () => {
    const rawText = `
PO #1002
3 X CUSTOM-BBQ-UNKNOWN
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sku).toBe('CUSTOM-BBQ-UNKNOWN');
    expect(result.items[0].quantity).toBe(3);
    expect(result.items[0].matchedCatalogSku).toBeUndefined();
    expect(result.items[0].confidence).toBe('MEDIUM');
    expect(result.items[0].warnings.some((w) => w.includes('not found in product catalog'))).toBe(true);
  });

  it('detects suspicious OCR characters and flags with LOW confidence', () => {
    const rawText = `
PO #9090
2 X OM2017-8JD~
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].confidence).toBe('LOW');
    expect(result.items[0].warnings.some((w) => w.includes('OCR'))).toBe(true);
  });

  it('extracts product attributes like size, color, and pack size', () => {
    const rawText = `
PO #4040
10 X SBFL Black Large Pack of 12
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items[0].attributes.colour).toBe('Black');
    expect(result.items[0].attributes.size).toBe('Large');
    expect(result.items[0].attributes.packSize).toBe('12');
  });

  it('handles case-insensitive and dash-normalized SKUs', () => {
    const rawText = `
PO #CASE-TEST
4 x om2017-1b
10 x sbfl
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].matchedCatalogSku).toBe('OM2017-1B');
    expect(result.items[1].matchedCatalogSku).toBe('SBFL');
  });

  it('calculates total price when only unit price with @ or ea is given', () => {
    const rawText = `
PO #9911
5 X JETGAS @ $12.50 ea
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items[0].unitPrice).toBe(12.5);
    expect(result.items[0].totalPrice).toBe(62.5);
  });

  it('flags items where quantity is missing or zero', () => {
    const rawText = `
PO #ZERO-QTY
0 X OM2017-1B
    `.trim();

    const result = parseOrderText(rawText, 'TEXT');
    expect(result.items[0].confidence).toBe('LOW');
    expect(result.items[0].warnings.some((w) => w.includes('Quantity'))).toBe(true);
  });
});
