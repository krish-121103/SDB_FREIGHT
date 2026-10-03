import { describe, it, expect } from 'vitest';
import { parseOrderText } from '../textParser';
import { convertOrderToFreightCalculator } from '../orderToFreightAdapter';
import { calculateFreight } from '../../freightCalculator';
import { determineDeliveryZone } from '../../zoneCalculator';
import { DEFAULT_CONFIG } from '../../../rules/defaultConfig';

describe('Order Import to Freight Calculation End-to-End Pipeline', () => {
  it('successfully executes complete flow for Sydney BBQs order without altering freight logic', () => {
    // 1. Raw Text input (e.g. from email/WhatsApp/PDF)
    const rawOrderText = `
SYDNEY BBQS
18/79 Williamson Rd
INGLEBURN 2565

O/No: Erik

2 X OM2017-1B
2 X OM2017-8JD
60 X SBFL
36 X JETGAS
    `.trim();

    // 2. Parse text into structured order
    const parsedResult = parseOrderText(rawOrderText, 'TEXT');

    expect(parsedResult.order.customer).toBe('SYDNEY BBQS');
    expect(parsedResult.order.orderNumber).toBe('Erik');
    expect(parsedResult.items).toHaveLength(4);

    // 3. Convert into Freight Calculator data format
    const converted = convertOrderToFreightCalculator(parsedResult, DEFAULT_CONFIG);

    expect(converted.detectedPostcode).toBe('2565');
    expect(converted.orderLines).toHaveLength(4);

    // 4. Resolve delivery zone for detected postcode 2565
    const zoneResult = determineDeliveryZone(converted.detectedPostcode!);
    expect(zoneResult.detectedZone).toBe('OTHER_REGIONAL');

    // 5. Calculate Freight using the untouched calculation engine
    const orderValueExGst = converted.calculatedOrderValueExGst ?? 500;
    const freightResult = calculateFreight(
      converted.orderLines,
      orderValueExGst,
      zoneResult.detectedZone,
      false,
      DEFAULT_CONFIG
    );

    // Check freight result characteristics
    expect(freightResult.zone).toBe('OTHER_REGIONAL');
    expect(freightResult.totalItemCount).toBe(2 + 2 + 60 + 36); // 100 items
    expect(freightResult.totalWeightKg).toBeGreaterThan(0);
    expect(freightResult.totalVolumeM3).toBeGreaterThan(0);

    // Product counts
    expect(freightResult.totalItemCount).toBe(100);
    expect(freightResult.standardItemCount).toBe(100);
    expect(freightResult.bulkyItemCount).toBe(0);
    expect(freightResult.freightExGst).toBeGreaterThan(0);
    expect(freightResult.gstAmount).toBe(Number((freightResult.freightExGst! * 0.1).toFixed(2)));
    expect(freightResult.freightIncGst).toBe(
      Number((freightResult.freightExGst! + freightResult.gstAmount!).toFixed(2))
    );
  });
});
