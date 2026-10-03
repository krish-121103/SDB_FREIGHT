import type { Product } from '../../types';
import productsData from '../../data/products.json';

const allProducts = productsData as Product[];

// Build lookup maps for fast matching
const exactMap = new Map<string, Product>();
const lowerMap = new Map<string, Product>();
const cleanMap = new Map<string, Product>();

for (const p of allProducts) {
  if (!p.sku) continue;
  exactMap.set(p.sku, p);
  lowerMap.set(p.sku.toLowerCase(), p);
  // Normalized: lowercase alphanumeric only
  const clean = p.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean && !cleanMap.has(clean)) {
    cleanMap.set(clean, p);
  }
}

/**
 * Normalizes SKU by removing special separator symbols
 */
export function normalizeSkuKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds a matching product in catalog by SKU
 */
export function findProductInCatalog(rawSku: string): Product | null {
  const trimmed = rawSku.trim();
  if (!trimmed) return null;

  // 1. Exact match
  if (exactMap.has(trimmed)) {
    return exactMap.get(trimmed)!;
  }

  // 2. Case-insensitive match
  const lower = trimmed.toLowerCase();
  if (lowerMap.has(lower)) {
    return lowerMap.get(lower)!;
  }

  // 3. Normalized alphanumeric match
  const clean = normalizeSkuKey(trimmed);
  if (clean && cleanMap.has(clean)) {
    return cleanMap.get(clean)!;
  }

  return null;
}

/**
 * Checks if a given string token matches a known catalog SKU
 */
export function isKnownCatalogSku(token: string): boolean {
  return findProductInCatalog(token) !== null;
}

/**
 * Scans tokens in a line of text to identify any token that matches a catalog SKU
 */
export function findCatalogSkusInText(text: string): Array<{ sku: string; product: Product; index: number }> {
  const matches: Array<{ sku: string; product: Product; index: number }> = [];
  // Tokenize by spaces and punctuation boundaries
  const tokens = text.match(/\b[A-Za-z0-9][A-Za-z0-9_\-\.\/]{1,25}\b/g) || [];

  for (const token of tokens) {
    const product = findProductInCatalog(token);
    if (product) {
      const idx = text.indexOf(token);
      // Avoid duplicates if same token appears
      if (!matches.some((m) => m.product.id === product.id)) {
        matches.push({ sku: product.sku, product, index: idx });
      }
    }
  }

  return matches;
}

/**
 * Gets all catalog SKUs for autocomplete / suggestions
 */
export function getAllCatalogProducts(): Product[] {
  return allProducts;
}
