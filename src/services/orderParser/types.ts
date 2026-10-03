export interface OrderHeader {
  orderNumber: string;
  orderDate: string;
  customer: string;
  contact: string;
  deliveryAddress: string;
  billingAddress: string;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ParsedItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  attributes: Record<string, string>;
  confidence: ConfidenceLevel;
  warnings: string[];
  rawLine?: string;
  matchedCatalogSku?: string;
}

export interface ParsingWarning {
  id: string;
  lineIndex?: number;
  itemSku?: string;
  severity: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  rawText?: string;
}

export interface ParsedOrderResult {
  order: OrderHeader;
  items: ParsedItem[];
  parsingWarnings: ParsingWarning[];
  rawSourceText: string;
  sourceType: 'PDF' | 'TEXT';
  ocrUsed: boolean;
  extractedAt: string;
  fileName?: string;
  pageCount?: number;
}

export interface ProductCatalogInfo {
  sku: string;
  type: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightKg: number | null;
  isPhysicalDataComplete: boolean;
}
