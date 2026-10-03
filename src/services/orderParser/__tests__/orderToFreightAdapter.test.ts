import { describe, it, expect } from 'vitest';
import { parseOrderText } from '../textParser';
import { convertOrderToFreightCalculator, extractPostcodeFromAddress } from '../orderToFreightAdapter';
import { DEFAULT_CONFIG } from '../../../rules/defaultConfig';

describe('Order to Freight Calculator Adapter', () => {
  it('extracts Australian postcode from address', () => {
    expect(extractPostcodeFromAddress('18/79 Williamson Rd INGLEBURN 2565')).toBe('2565');
    expect(extractPostcodeFromAddress('100 Queen St, Melbourne VIC 3000')).toBe('3000');
    expect(extractPostcodeFromAddress('No postcode here')).toBeNull();
  });

  it('converts parsed Sydney BBQs order to existing Freight Calculator format', () => {
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

    const parsed = parseOrderText(rawText, 'TEXT');
    const converted = convertOrderToFreightCalculator(parsed, DEFAULT_CONFIG);

    expect(converted.detectedPostcode).toBe('2565');
    expect(converted.customerSummary.customer).toBe('SYDNEY BBQS');
    expect(converted.customerSummary.orderNumber).toBe('Erik');

    // 4 lines
    expect(converted.orderLines).toHaveLength(4);

    // Line 1: OM2017-1B
    expect(converted.orderLines[0].product.sku).toBe('OM2017-1B');
    expect(converted.orderLines[0].quantity).toBe(2);
    expect(converted.orderLines[0].product.isPhysicalDataComplete).toBe(true);

    // Line 2: OM2017-8JD
    expect(converted.orderLines[1].product.sku).toBe('OM2017-8JD');
    expect(converted.orderLines[1].quantity).toBe(2);

    // Line 3: SBFL
    expect(converted.orderLines[2].product.sku).toBe('SBFL');
    expect(converted.orderLines[2].quantity).toBe(60);

    // Line 4: JETGAS
    expect(converted.orderLines[3].product.sku).toBe('JETGAS');
    expect(converted.orderLines[3].quantity).toBe(36);
  });

  it('computes total order value if prices are present', () => {
    const rawText = `
PO #1234
2 X OM2017-1B @ $150.00
10 X SBFL @ $25.00
    `.trim();

    const parsed = parseOrderText(rawText, 'TEXT');
    const converted = convertOrderToFreightCalculator(parsed, DEFAULT_CONFIG);

    // (2 * 150) + (10 * 25) = 300 + 250 = 550
    expect(converted.calculatedOrderValueExGst).toBe(550);
  });
});
