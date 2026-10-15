import type { OrderLine, DeliveryZone, ShipmentClassification, FreightBreakdownLine, FreightResult } from '../types';

export interface StoredSessionQuote {
  id: string; // e.g. "QT-2026-001"
  timestamp: string; // e.g. "12:15:20 PM"
  date: string; // e.g. "15 Oct 2026"
  createdAt: number;
  customerName: string;
  orderNumber: string;
  notes?: string;
  postcode: string;
  suburb?: string;
  state?: string;
  zone: DeliveryZone;
  zoneLabel: string;
  isZoneOverridden: boolean;
  orderValueExGst: number;
  orderValueIncGst: number;
  linesCount: number;
  totalUnits: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  bulkyItemCount: number;
  palletRequired: boolean;
  palletsRequired: number;
  classification: ShipmentClassification;
  classificationLabel: string;
  freightExGst: number | null;
  gstAmount: number | null;
  freightIncGst: number | null;
  isRemoteCarrierRate: boolean;
  calculationLines: FreightBreakdownLine[];
  ruleExplanations: string[];
  warnings: string[];
  orderLines: OrderLine[];
}

// In-Memory JavaScript storage for temporary session data.
// This is strictly kept in JS runtime memory, so upon ANY page refresh,
// it is completely wiped and reset to an empty state as requested.
let inMemoryQuotes: StoredSessionQuote[] = [];
let quoteCounter = 1;

/**
 * Generates an executive Quote Reference ID
 */
export function generateQuoteId(): string {
  const padded = String(quoteCounter).padStart(3, '0');
  const year = new Date().getFullYear();
  return `QT-${year}-${padded}`;
}

/**
 * Saves a new quote to the in-memory JavaScript storage.
 */
export function saveQuoteToSession(
  customerName: string,
  orderNumber: string,
  notes: string,
  postcode: string,
  suburb: string | undefined,
  state: string | undefined,
  freightResult: FreightResult,
  orderLines: OrderLine[]
): StoredSessionQuote {
  const now = new Date();
  const id = generateQuoteId();
  quoteCounter += 1;

  const quote: StoredSessionQuote = {
    id,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
    createdAt: now.getTime(),
    customerName: customerName.trim() || 'General Customer',
    orderNumber: orderNumber.trim() || `SO-${Math.floor(100000 + Math.random() * 900000)}`,
    notes: notes.trim() || undefined,
    postcode,
    suburb,
    state,
    zone: freightResult.zone,
    zoneLabel: freightResult.zoneLabel,
    isZoneOverridden: freightResult.isZoneOverridden,
    orderValueExGst: freightResult.orderValueExGst,
    orderValueIncGst: freightResult.orderValueIncGst,
    linesCount: orderLines.length,
    totalUnits: freightResult.totalItemCount,
    totalWeightKg: freightResult.totalWeightKg,
    totalVolumeM3: freightResult.totalVolumeM3,
    bulkyItemCount: freightResult.bulkyItemCount,
    palletRequired: freightResult.palletRequired,
    palletsRequired: freightResult.palletsRequired,
    classification: freightResult.classification,
    classificationLabel: freightResult.classificationLabel,
    freightExGst: freightResult.freightExGst,
    gstAmount: freightResult.gstAmount,
    freightIncGst: freightResult.freightIncGst,
    isRemoteCarrierRate: freightResult.isRemoteCarrierRate,
    calculationLines: [...freightResult.calculationLines],
    ruleExplanations: [...freightResult.ruleExplanations],
    warnings: [...freightResult.warnings],
    orderLines: JSON.parse(JSON.stringify(orderLines)),
  };

  // Prepend so latest appears first
  inMemoryQuotes = [quote, ...inMemoryQuotes];
  return quote;
}

/**
 * Retrieves all stored quotes in the current JavaScript memory session.
 */
export function getAllSessionQuotes(): StoredSessionQuote[] {
  return [...inMemoryQuotes];
}

/**
 * Deletes a quote from the session by ID.
 */
export function deleteSessionQuote(id: string): StoredSessionQuote[] {
  inMemoryQuotes = inMemoryQuotes.filter((q) => q.id !== id);
  return [...inMemoryQuotes];
}

/**
 * Clears all stored session quotes.
 */
export function clearAllSessionQuotes(): void {
  inMemoryQuotes = [];
}

/**
 * Returns summary statistics for all quotes calculated in this session.
 */
export function getSessionStats() {
  const totalQuotes = inMemoryQuotes.length;
  let totalOrderValueExGst = 0;
  let totalFreightExGst = 0;
  let carrierQuoteCount = 0;
  let palletOrdersCount = 0;
  let freeFreightCount = 0;

  for (const q of inMemoryQuotes) {
    totalOrderValueExGst += q.orderValueExGst;
    if (q.isRemoteCarrierRate) {
      carrierQuoteCount += 1;
    } else if (q.freightExGst !== null) {
      totalFreightExGst += q.freightExGst;
      if (q.freightExGst === 0 && q.totalUnits > 0) {
        freeFreightCount += 1;
      }
    }
    if (q.palletRequired || q.classification === 'PALLET') {
      palletOrdersCount += 1;
    }
  }

  const averageFreight = totalQuotes > carrierQuoteCount 
    ? totalFreightExGst / (totalQuotes - carrierQuoteCount) 
    : 0;

  return {
    totalQuotes,
    totalOrderValueExGst: Number(totalOrderValueExGst.toFixed(2)),
    totalFreightExGst: Number(totalFreightExGst.toFixed(2)),
    averageFreight: Number(averageFreight.toFixed(2)),
    carrierQuoteCount,
    palletOrdersCount,
    freeFreightCount,
  };
}
