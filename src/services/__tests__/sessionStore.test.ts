import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveQuoteToSession,
  getAllSessionQuotes,
  deleteSessionQuote,
  clearAllSessionQuotes,
  getSessionStats,
} from '../sessionStore';
import { calculateFreight } from '../freightCalculator';
import { buildOrderLine } from '../productCalculator';
import { DEFAULT_CONFIG } from '../../rules/defaultConfig';
import type { Product } from '../../types';

const mockProduct: Product = {
  id: 'prod_1',
  rowNumber: 1,
  type: 'Outdoor Gas Heating',
  sku: 'OMTGC',
  upc: null,
  lengthMm: 500,
  widthMm: 500,
  heightMm: 500,
  weightKg: 10,
  unitVolumeM3: 0.125,
  isPhysicalDataComplete: true,
  missingFields: [],
  isDuplicateSku: false,
  duplicateCount: 1,
};

describe('sessionStore (In-Memory JS Storage)', () => {
  beforeEach(() => {
    clearAllSessionQuotes();
  });

  it('starts with an empty session storage', () => {
    expect(getAllSessionQuotes()).toEqual([]);
  });

  it('saves a quote into in-memory session storage and assigns an executive quote ID', () => {
    const line = buildOrderLine(mockProduct, 2, DEFAULT_CONFIG, false);
    const result = calculateFreight([line], 400, 'METRO', false, DEFAULT_CONFIG);

    const quote = saveQuoteToSession(
      'Acme Hardware',
      'PO-1001',
      'Call upon arrival',
      '3000',
      'Melbourne',
      'VIC',
      result,
      [line]
    );

    expect(quote.id).toMatch(/^QT-\d{4}-\d{3}$/);
    expect(quote.customerName).toBe('Acme Hardware');
    expect(quote.orderNumber).toBe('PO-1001');
    expect(quote.postcode).toBe('3000');
    expect(quote.freightExGst).toBe(35);
    expect(quote.zone).toBe('METRO');

    const all = getAllSessionQuotes();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(quote.id);
  });

  it('computes session stats across saved quotes', () => {
    const line = buildOrderLine(mockProduct, 2, DEFAULT_CONFIG, false);
    const result1 = calculateFreight([line], 500, 'METRO', false, DEFAULT_CONFIG); // $35
    const result2 = calculateFreight([line], 800, 'METRO', false, DEFAULT_CONFIG); // $0 (Free)

    saveQuoteToSession('Client 1', 'PO-1', '', '3000', 'Melbourne', 'VIC', result1, [line]);
    saveQuoteToSession('Client 2', 'PO-2', '', '3000', 'Melbourne', 'VIC', result2, [line]);

    const stats = getSessionStats();
    expect(stats.totalQuotes).toBe(2);
    expect(stats.totalFreightExGst).toBe(35);
    expect(stats.totalOrderValueExGst).toBe(1300);
    expect(stats.freeFreightCount).toBe(1);
  });

  it('deletes a quote by ID and clears all quotes', () => {
    const line = buildOrderLine(mockProduct, 1, DEFAULT_CONFIG, false);
    const result = calculateFreight([line], 300, 'METRO', false, DEFAULT_CONFIG);

    const q1 = saveQuoteToSession('Cust A', 'PO-A', '', '3000', 'Melbourne', 'VIC', result, [line]);
    const q2 = saveQuoteToSession('Cust B', 'PO-B', '', '3000', 'Melbourne', 'VIC', result, [line]);

    expect(getAllSessionQuotes().length).toBe(2);

    deleteSessionQuote(q1.id);
    expect(getAllSessionQuotes().length).toBe(1);
    expect(getAllSessionQuotes()[0].id).toBe(q2.id);

    clearAllSessionQuotes();
    expect(getAllSessionQuotes().length).toBe(0);
  });
});
