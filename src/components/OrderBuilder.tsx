import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Search,
  Trash2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Product, OrderLine, AppConfig } from '../types';
import { buildOrderLine } from '../services/productCalculator';
import productsData from '../data/products.json';

const allProducts = productsData as Product[];

interface OrderBuilderProps {
  orderLines: OrderLine[];
  onAddLine: (line: OrderLine) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onToggleBulky: (id: string) => void;
  onRemoveLine: (id: string) => void;
  config: AppConfig;
}

export const OrderBuilder: React.FC<OrderBuilderProps> = ({
  orderLines,
  onAddLine,
  onUpdateQuantity,
  onToggleBulky,
  onRemoveLine,
  config,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Extract unique product types for filtering
  const productTypes = useMemo(() => {
    const typesSet = new Set<string>();
    allProducts.forEach((p) => {
      if (p.type) typesSet.add(p.type);
    });
    return Array.from(typesSet).sort();
  }, []);

  // Filter products by search term and selected category
  const filteredProducts = useMemo(() => {
    if (!searchTerm && selectedType === 'ALL') {
      return allProducts.slice(0, 15);
    }
    const term = searchTerm.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const matchesType = selectedType === 'ALL' || p.type === selectedType;
        const matchesSearch =
          !term ||
          p.sku.toLowerCase().includes(term) ||
          (p.type && p.type.toLowerCase().includes(term)) ||
          (p.upc && p.upc.toLowerCase().includes(term));
        return matchesType && matchesSearch;
      })
      .slice(0, 25);
  }, [searchTerm, selectedType]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.sku);
    setIsDropdownOpen(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const line = buildOrderLine(selectedProduct, quantityInput, config);
    onAddLine(line);
    // Reset selection
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantityInput(1);
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <Layers size={18} color="#38bdf8" />
          Order Builder & Product Lines
        </h2>
        <span className="panel-badge">
          {orderLines.length} line{orderLines.length !== 1 ? 's' : ''} added
        </span>
      </div>

      {/* Add Product Search Toolbar */}
      <div style={{ position: 'relative', marginBottom: '18px' }}>
        <div className="builder-search-bar">
          {/* Search Box */}
          <div className="input-container" style={{ position: 'relative' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="text-input mono"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
                setSelectedProduct(null);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search SKU, name, or barcode..."
            />
          </div>

          {/* Type Filter */}
          <select
            className="select-input"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {productTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Quantity Input */}
          <input
            type="number"
            min="1"
            max="1000"
            className="text-input mono"
            value={quantityInput}
            onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value) || 1))}
            title="Line Quantity"
          />

          {/* Add Button */}
          <button
            className="btn-primary"
            onClick={handleAddProduct}
            disabled={!selectedProduct}
            style={{
              opacity: selectedProduct ? 1 : 0.5,
              cursor: selectedProduct ? 'pointer' : 'not-allowed',
            }}
          >
            <PackagePlus size={16} />
            Add
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && filteredProducts.length > 0 && (
          <div className="autocomplete-dropdown">
            {filteredProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectProduct(p)}
                >
                  <div>
                    <span className="sku-text">{p.sku}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {p.type || 'Uncategorised'}
                    </span>
                    {p.isDuplicateSku && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.7rem',
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        Duplicate SKU
                      </span>
                    )}
                    {!p.isPhysicalDataComplete && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.7rem',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        Missing Data
                      </span>
                    )}
                  </div>
                  <div className="sku-meta mono">
                    {p.isPhysicalDataComplete ? (
                      <>
                        {p.lengthMm}×{p.widthMm}×{p.heightMm} mm | {p.weightKg} kg
                      </>
                    ) : (
                      <span style={{ color: '#e11d48' }}>Missing dimensions/weight</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected product preview info if selected */}
      {selectedProduct && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Ready to add:</strong> <span className="mono">{selectedProduct.sku}</span> (
            {selectedProduct.type || 'No Type'}) &bull; Dimensions:{' '}
            {selectedProduct.isPhysicalDataComplete
              ? `${selectedProduct.lengthMm} × ${selectedProduct.widthMm} × ${selectedProduct.heightMm} mm, ${selectedProduct.weightKg} kg`
              : 'INCOMPLETE DATA'}
          </div>
          <button
            onClick={() => setSelectedProduct(null)}
            style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Order Lines Table */}
      {orderLines.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            background: '#f8fafc',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
          }}
        >
          <Sparkles size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
          <div>No products in the order yet.</div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Search for a SKU above or click one of the <strong>Predefined Demo Scenarios</strong> to load a test order.
          </div>
        </div>
      ) : (
        <div className="order-table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>SKU / Product</th>
                <th>Qty</th>
                <th>Dimensions (L×W×H)</th>
                <th>Unit Wt / Vol</th>
                <th>Line Wt / Vol</th>
                <th>Classification</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orderLines.map((line) => {
                const p = line.product;
                const isBulky = line.isBulkyDesignated;

                return (
                  <tr key={line.id} className={line.hasDataError ? 'line-error-row' : ''}>
                    {/* SKU / Product */}
                    <td>
                      <div className="sku-text">{p.sku}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {p.type || 'General'}
                        {p.upc ? ` • ${p.upc}` : ''}
                      </div>
                      {line.hasDataError && (
                        <div
                          style={{
                            color: '#f43f5e',
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}
                        >
                          <AlertTriangle size={12} />
                          {line.errorMessage}
                        </div>
                      )}
                      {p.isDuplicateSku && (
                        <div
                          style={{
                            color: '#f59e0b',
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}
                        >
                          <Info size={12} />
                          Duplicate SKU record (Row {p.rowNumber})
                        </div>
                      )}
                    </td>

                    {/* Quantity input */}
                    <td style={{ width: '85px' }}>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className="text-input mono"
                        style={{ padding: '6px 8px', width: '70px', fontSize: '0.86rem' }}
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(line.id, Math.max(1, parseInt(e.target.value) || 1))
                        }
                      />
                    </td>

                    {/* Dimensions */}
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {p.isPhysicalDataComplete ? (
                        `${p.lengthMm} × ${p.widthMm} × ${p.heightMm} mm`
                      ) : (
                        <span style={{ color: '#f87171' }}>Missing</span>
                      )}
                    </td>

                    {/* Unit Weight & Volume */}
                    <td className="mono" style={{ fontSize: '0.78rem' }}>
                      <div>{p.weightKg !== null ? `${p.weightKg} kg` : '-'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {p.unitVolumeM3 !== null ? `${p.unitVolumeM3} m³` : '-'}
                      </div>
                    </td>

                    {/* Line Weight & Volume */}
                    <td className="mono" style={{ fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {line.lineWeightKg !== null ? `${line.lineWeightKg} kg` : '-'}
                      </div>
                      <div style={{ color: '#0284c7', fontWeight: 500 }}>
                        {line.lineVolumeM3 !== null ? `${line.lineVolumeM3} m³` : '-'}
                      </div>
                    </td>

                    {/* Bulky Toggle / Classification */}
                    <td>
                      <button
                        className={`bulky-toggle-badge ${isBulky ? 'active' : 'inactive'}`}
                        onClick={() => onToggleBulky(line.id)}
                        title={
                          isBulky
                            ? 'Bulky non-pallet product ($30 fee applies)'
                            : 'Standard carton product'
                        }
                      >
                        {isBulky ? 'BULKY ($30)' : 'STANDARD'}
                      </button>
                    </td>

                    {/* Remove Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-remove"
                        onClick={() => onRemoveLine(line.id)}
                        title="Remove product from order"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
