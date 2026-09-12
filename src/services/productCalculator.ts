import type { Product, OrderLine, AppConfig } from '../types';

export function calculateUnitVolumeM3(lengthMm: number | null, widthMm: number | null, heightMm: number | null): number | null {
  if (lengthMm === null || widthMm === null || heightMm === null) {
    return null;
  }
  if (lengthMm <= 0 || widthMm <= 0 || heightMm <= 0) {
    return null;
  }
  return Number(((lengthMm * widthMm * heightMm) / 1_000_000_000).toFixed(6));
}

export function validateProductForFreight(product: Product): { isValid: boolean; errorMessage?: string } {
  if (!product.isPhysicalDataComplete) {
    const missing = product.missingFields
      .filter((f) => ['lengthMm', 'widthMm', 'heightMm', 'weightKg'].includes(f))
      .map((f) => {
        if (f === 'lengthMm') return 'Length';
        if (f === 'widthMm') return 'Width';
        if (f === 'heightMm') return 'Height';
        if (f === 'weightKg') return 'Weight';
        return f;
      })
      .join(', ');

    return {
      isValid: false,
      errorMessage: `Insufficient product data for freight calculation: Missing ${missing || 'dimensions/weight'}`,
    };
  }

  return { isValid: true };
}

export function isProductBulky(product: Product, config: AppConfig, lineOverride?: boolean): boolean {
  if (lineOverride !== undefined) {
    return lineOverride;
  }

  // Check SKU against configured designated bulky SKUs
  if (config.designatedBulkySkus.includes(product.sku)) {
    return true;
  }

  // Check Product Type against configured designated bulky types
  if (product.type && config.designatedBulkyTypes.includes(product.type)) {
    return true;
  }

  // Check against carton demo limits (Pending SDB approval)
  if (product.weightKg !== null && product.weightKg > config.standardMaxCartonWeightKg) {
    return true;
  }

  if (
    (product.lengthMm !== null && product.lengthMm > config.standardMaxCartonLengthMm) ||
    (product.widthMm !== null && product.widthMm > config.standardMaxCartonWidthMm) ||
    (product.heightMm !== null && product.heightMm > config.standardMaxCartonHeightMm)
  ) {
    return true;
  }

  return false;
}

export function buildOrderLine(
  product: Product,
  quantity: number,
  config: AppConfig,
  isBulkyDesignated?: boolean
): OrderLine {
  const validation = validateProductForFreight(product);
  const bulky = isProductBulky(product, config, isBulkyDesignated);

  const unitVol = product.unitVolumeM3 ?? calculateUnitVolumeM3(product.lengthMm, product.widthMm, product.heightMm);
  const lineWeight = product.weightKg !== null && quantity > 0 ? Number((product.weightKg * quantity).toFixed(2)) : null;
  const lineVolume = unitVol !== null && quantity > 0 ? Number((unitVol * quantity).toFixed(6)) : null;

  return {
    id: `${product.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    product,
    quantity: Math.max(0, quantity),
    isBulkyDesignated: bulky,
    lineWeightKg: lineWeight,
    lineVolumeM3: lineVolume,
    hasDataError: !validation.isValid,
    errorMessage: validation.errorMessage,
  };
}
