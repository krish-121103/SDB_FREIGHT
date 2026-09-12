import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';
import type { Product, DataQualityReport, OrderLine, AppConfig } from '../types';
import { buildOrderLine } from '../services/productCalculator';
import productsData from '../data/products.json';
import dataQualityReportRaw from '../data/dataQualityReport.json';

const allProducts = productsData as Product[];
const dataQualityReport = dataQualityReportRaw as DataQualityReport;

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProductToOrder: (line: OrderLine) => void;
  config: AppConfig;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  onAddProductToOrder,
  config,
}) => {
  const [filterTab, setFilterTab] = useState<
    'ALL' | 'MISSING_PHYSICAL' | 'DUPLICATES' | 'MISSING_TYPE' | 'MISSING_UPC'
  >('MISSING_PHYSICAL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      // Tab filter
      if (filterTab === 'MISSING_PHYSICAL' && p.isPhysicalDataComplete) return false;
      if (filterTab === 'DUPLICATES' && !p.isDuplicateSku) return false;
      if (filterTab === 'MISSING_TYPE' && p.type) return false;
      if (filterTab === 'MISSING_UPC' && p.upc) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesSku = p.sku.toLowerCase().includes(term);
        const matchesType = p.type ? p.type.toLowerCase().includes(term) : false;
        const matchesUpc = p.upc ? p.upc.toLowerCase().includes(term) : false;
        return matchesSku || matchesType || matchesUpc;
      }

      return true;
    });
  }, [filterTab, searchTerm]);

  const handleTestProduct = (product: Product) => {
    const line = buildOrderLine(product, 1, config);
    onAddProductToOrder(line);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '980px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={22} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Product Master & Data Quality Inspector
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Source: Weights and Dimensions 10.8.26.xlsx ({dataQualityReport.totalRowsScanned} total rows)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Stat Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div className="metric-tile" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="metric-label">Total Records</div>
              <div className="metric-val">{dataQualityReport.totalRowsScanned}</div>
              <div className="metric-sub">{dataQualityReport.uniqueSkus} unique SKUs</div>
            </div>

            <div
              className="metric-tile"
              style={{
                borderLeft: '4px solid #e11d48',
                background: dataQualityReport.missingPhysicalDataCount > 0 ? '#fff1f2' : undefined,
              }}
            >
              <div className="metric-label" style={{ color: '#be123c' }}>Missing Dims / Wt</div>
              <div className="metric-val" style={{ color: '#e11d48' }}>
                {dataQualityReport.missingPhysicalDataCount}
              </div>
              <div className="metric-sub">Halts calculation</div>
            </div>

            <div
              className="metric-tile"
              style={{
                borderLeft: '4px solid #d97706',
                background: dataQualityReport.duplicateSkusCount > 0 ? '#fffbeb' : undefined,
              }}
            >
              <div className="metric-label" style={{ color: '#b45309' }}>Duplicate SKUs</div>
              <div className="metric-val" style={{ color: '#d97706' }}>
                {dataQualityReport.duplicateSkusCount}
              </div>
              <div className="metric-sub">Conflicting rows in master</div>
            </div>

            <div className="metric-tile" style={{ borderLeft: '3px solid #64748b' }}>
              <div className="metric-label">Missing Type</div>
              <div className="metric-val">{dataQualityReport.missingTypeCount}</div>
              <div className="metric-sub">Non-fatal categorization</div>
            </div>

            <div className="metric-tile" style={{ borderLeft: '3px solid #64748b' }}>
              <div className="metric-label">Missing Barcode</div>
              <div className="metric-val">{dataQualityReport.missingUpcCount}</div>
              <div className="metric-sub">Non-fatal UPC field</div>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`scenario-pill ${filterTab === 'MISSING_PHYSICAL' ? 'active' : ''}`}
                onClick={() => setFilterTab('MISSING_PHYSICAL')}
              >
                Missing Dimensions / Wt ({dataQualityReport.missingPhysicalDataCount})
              </button>
              <button
                className={`scenario-pill ${filterTab === 'DUPLICATES' ? 'active' : ''}`}
                onClick={() => setFilterTab('DUPLICATES')}
              >
                Duplicate SKUs ({dataQualityReport.duplicateSkusCount * 2} rows)
              </button>
              <button
                className={`scenario-pill ${filterTab === 'MISSING_TYPE' ? 'active' : ''}`}
                onClick={() => setFilterTab('MISSING_TYPE')}
              >
                Missing Type ({dataQualityReport.missingTypeCount})
              </button>
              <button
                className={`scenario-pill ${filterTab === 'MISSING_UPC' ? 'active' : ''}`}
                onClick={() => setFilterTab('MISSING_UPC')}
              >
                Missing UPC ({dataQualityReport.missingUpcCount})
              </button>
              <button
                className={`scenario-pill ${filterTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterTab('ALL')}
              >
                All Products ({allProducts.length})
              </button>
            </div>

            <div className="input-container" style={{ width: '220px' }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                className="text-input"
                style={{ padding: '7px 10px 7px 32px', fontSize: '0.82rem' }}
                placeholder="Search filtered..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table of products */}
          <div className="order-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="order-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>UPC Barcode</th>
                  <th>L × W × H (mm)</th>
                  <th>Weight (kg)</th>
                  <th>Volume (m³)</th>
                  <th>Status / Issues</th>
                  <th style={{ textAlign: 'center' }}>Test in Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No products match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isError = !p.isPhysicalDataComplete;
                    return (
                      <tr key={p.id} className={isError ? 'line-error-row' : ''}>
                        <td className="mono" style={{ color: 'var(--text-muted)' }}>
                          {p.rowNumber}
                        </td>
                        <td className="sku-text">{p.sku}</td>
                        <td style={{ color: p.type ? 'var(--text-secondary)' : '#f87171' }}>
                          {p.type || 'None'}
                        </td>
                        <td className="mono" style={{ fontSize: '0.78rem', color: p.upc ? 'var(--text-muted)' : '#f87171' }}>
                          {p.upc || 'None'}
                        </td>
                        <td className="mono" style={{ fontSize: '0.78rem' }}>
                          {p.lengthMm !== null && p.widthMm !== null && p.heightMm !== null
                            ? `${p.lengthMm} × ${p.widthMm} × ${p.heightMm}`
                            : <span style={{ color: '#f43f5e' }}>Missing</span>}
                        </td>
                        <td className="mono" style={{ fontSize: '0.78rem' }}>
                          {p.weightKg !== null ? `${p.weightKg} kg` : <span style={{ color: '#f43f5e' }}>Missing</span>}
                        </td>
                        <td className="mono" style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                          {p.unitVolumeM3 !== null ? `${p.unitVolumeM3} m³` : '-'}
                        </td>
                        <td>
                          {isError && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <AlertTriangle size={12} />
                              Missing {p.missingFields.filter((f) => ['lengthMm', 'widthMm', 'heightMm', 'weightKg'].includes(f)).join(', ')}
                            </span>
                          )}
                          {p.isDuplicateSku && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                marginLeft: '4px',
                              }}
                            >
                              <AlertCircle size={12} />
                              Duplicate SKU
                            </span>
                          )}
                          {p.isPhysicalDataComplete && !p.isDuplicateSku && (
                            <span style={{ color: '#059669', fontSize: '0.72rem', fontWeight: 600 }}>
                              Complete
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            onClick={() => handleTestProduct(p)}
                            title="Add 1 unit to order builder to test engine behavior"
                          >
                            <PlusCircle size={12} />
                            Add to Order
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
