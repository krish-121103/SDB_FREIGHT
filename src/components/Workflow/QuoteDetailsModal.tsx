import React from 'react';
import {
  X,
  FileText,
  Printer,
  RotateCcw,
  MapPin,
  Scale,
  Maximize2,
  Info,
} from 'lucide-react';
import type { StoredSessionQuote } from '../../services/sessionStore';

interface QuoteDetailsModalProps {
  quote: StoredSessionQuote | null;
  onClose: () => void;
  onReloadToWorkflow: (quote: StoredSessionQuote) => void;
}

export const QuoteDetailsModal: React.FC<QuoteDetailsModalProps> = ({
  quote,
  onClose,
  onReloadToWorkflow,
}) => {
  if (!quote) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Quote Audit: {quote.id}</h3>
                <span className="quote-id-badge mono">{quote.date} {quote.timestamp}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {quote.customerName} • Order #{quote.orderNumber}
              </p>
            </div>
          </div>

          <button className="btn-close" onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Facts Strip */}
          <div className="voucher-details-grid" style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
            <div className="voucher-field">
              <div className="voucher-label">
                <MapPin size={13} /> Destination
              </div>
              <div className="voucher-val">
                {quote.postcode} {quote.suburb ? `(${quote.suburb}, ${quote.state})` : ''} — <strong>{quote.zoneLabel}</strong>
              </div>
            </div>

            <div className="voucher-field">
              <div className="voucher-label">Order Value (Ex GST)</div>
              <div className="voucher-val mono">${quote.orderValueExGst.toFixed(2)}</div>
            </div>

            <div className="voucher-field">
              <div className="voucher-label">
                <Scale size={13} /> Total Weight
              </div>
              <div className="voucher-val mono">{quote.totalWeightKg.toFixed(2)} kg</div>
            </div>

            <div className="voucher-field">
              <div className="voucher-label">
                <Maximize2 size={13} /> Total Volume
              </div>
              <div className="voucher-val mono">{quote.totalVolumeM3.toFixed(3)} m³</div>
            </div>

            <div className="voucher-field">
              <div className="voucher-label">Shipment Classification</div>
              <div className="voucher-val">
                <span className={`table-class-pill ${quote.classification.toLowerCase()}`}>
                  {quote.classificationLabel}
                </span>
              </div>
            </div>

            <div className="voucher-field">
              <div className="voucher-label">Packaging Units</div>
              <div className="voucher-val">
                {quote.palletRequired ? `${quote.palletsRequired} Pallet(s)` : `${quote.totalUnits} Cartons`}
              </div>
            </div>
          </div>

          {/* Pricing Highlight */}
          <div className="modal-price-box">
            <div className="modal-price-left">
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Freight Rate
              </div>
              <div className="hero-price-val" style={{ fontSize: '1.8rem', marginTop: '2px' }}>
                {quote.isRemoteCarrierRate
                  ? 'CARRIER QUOTE REQUIRED'
                  : quote.freightExGst === 0 && quote.totalUnits > 0
                  ? 'FREE ($0.00)'
                  : `$${quote.freightExGst?.toFixed(2)}`}
              </div>
              {!quote.isRemoteCarrierRate && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  GST: <strong>${quote.gstAmount?.toFixed(2)}</strong> | Total Inc GST:{' '}
                  <strong style={{ color: '#0284c7' }}>${quote.freightIncGst?.toFixed(2)}</strong>
                </div>
              )}
            </div>

            <div className="modal-price-right">
              <div style={{ fontSize: '0.76rem', color: '#0369a1', fontWeight: 600 }}>
                ⚡ Temporary JavaScript Session Record
              </div>
              <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>
                Cleared automatically on browser refresh
              </div>
            </div>
          </div>

          {/* Line by line rate calculation */}
          <div>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Itemized Freight Rate Breakdown
            </h4>
            <div className="calc-lines-box">
              {quote.calculationLines.map((line, idx) => (
                <div key={idx} className="calc-line-item">
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div>
                      <span className="calc-code-tag">{line.code}</span>
                      <span style={{ fontWeight: 600 }}>{line.description}</span>
                    </div>
                    {line.notes && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {line.notes}
                      </div>
                    )}
                  </div>
                  <div className="mono" style={{ fontWeight: 700 }}>
                    {line.isCarrierRate ? 'Quote Req.' : `$${line.totalExGst.toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Explanations */}
          {quote.ruleExplanations.length > 0 && (
            <div className="explain-card">
              <div className="explain-title">
                <Info size={15} color="#0284c7" />
                Policy Application Reasons
              </div>
              <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                {quote.ruleExplanations.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Consignment Products snapshot */}
          <div>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Consignment Products ({quote.orderLines.length} SKU lines)
            </h4>
            <div className="voucher-lines-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {quote.orderLines.map((line, idx) => (
                <div key={idx} className="voucher-line-row">
                  <div className="voucher-line-left">
                    <span className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>
                      {line.product.sku}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {line.product.type || 'Standard Product'}
                    </span>
                    {line.isBulkyDesignated && <span className="bulky-badge-tiny">BULKY</span>}
                  </div>
                  <div className="voucher-line-right mono">
                    <strong>Qty: {line.quantity}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      ({(line.lineWeightKg ?? 0).toFixed(1)} kg | {(line.lineVolumeM3 ?? 0).toFixed(3)} m³)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print Quote</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => {
              onReloadToWorkflow(quote);
              onClose();
            }}
          >
            <RotateCcw size={15} />
            <span>Reload Order into Workflow</span>
          </button>
        </div>
      </div>
    </div>
  );
};
