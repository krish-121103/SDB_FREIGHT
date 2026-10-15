import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Printer,
  History,
  Building2,
  MapPin,
  Scale,
  Maximize2,
  Boxes,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import type { FreightResult, OrderLine, AppConfig } from '../../types';
import { FreightResultCard } from '../FreightResult';
import type { StoredSessionQuote } from '../../services/sessionStore';

interface Step4QuoteProps {
  result: FreightResult;
  config: AppConfig;
  orderLines: OrderLine[];
  customerName: string;
  orderNumber: string;
  orderNotes: string;
  postcode: string;
  suburb?: string;
  state?: string;
  onPrevStep: () => void;
  onSaveQuote: () => StoredSessionQuote;
  onViewSessionLog: () => void;
  onStartNewOrder: () => void;
}

export const Step4Quote: React.FC<Step4QuoteProps> = ({
  result,
  config,
  orderLines,
  customerName,
  orderNumber,
  orderNotes,
  postcode,
  suburb,
  state,
  onPrevStep,
  onSaveQuote,
  onViewSessionLog,
  onStartNewOrder,
}) => {
  const [justSavedQuote, setJustSavedQuote] = useState<StoredSessionQuote | null>(null);

  const handleSave = () => {
    const saved = onSaveQuote();
    setJustSavedQuote(saved);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="workflow-step-container">
      {/* Step Header */}
      <div className="step-header-box">
        <div className="step-header-left">
          <div className="step-badge-round">4</div>
          <div>
            <h2 className="step-main-title">Freight Quote & Policy Audit Finalization</h2>
            <p className="step-main-sub">
              Review published rates, applicable policy guardrails, GST breakdown, and record the freight calculation into temporary session storage.
            </p>
          </div>
        </div>

        <div className="step-header-actions">
          <button className="btn-secondary" onClick={handlePrint} title="Print freight quote summary">
            <Printer size={15} />
            <span>Print Quote</span>
          </button>
        </div>
      </div>

      {/* Just Saved Notification Banner */}
      {justSavedQuote && (
        <div className="quote-saved-success-card">
          <div className="success-card-left">
            <div className="success-icon-badge">
              <CheckCircle2 size={24} color="#059669" />
            </div>
            <div>
              <div className="success-title">
                Quote {justSavedQuote.id} Recorded to JS Temporary Storage!
              </div>
              <div className="success-desc">
                Calculated at {justSavedQuote.timestamp} • Customer: {justSavedQuote.customerName} ({justSavedQuote.orderNumber}) • Destination: {postcode} ({result.zoneLabel})
              </div>
              <div className="success-sub">
                ⚡ Stored in JavaScript memory for the current session. Refreshing the browser will automatically clear all temporary results as specified.
              </div>
            </div>
          </div>

          <div className="success-card-actions">
            <button className="btn-secondary" onClick={onViewSessionLog}>
              <History size={15} />
              <span>View Session Orders</span>
            </button>
            <button className="btn-primary" onClick={onStartNewOrder}>
              <PlusCircle size={15} />
              <span>Start New Order</span>
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Final Review Layout */}
      <div className="quote-step-grid">
        {/* Left Column: Order Ticket Summary */}
        <div className="quote-ticket-col">
          <div className="form-card">
            <div className="form-card-title">
              <FileCheck size={16} color="#0284c7" />
              <span>Consignment Summary Voucher</span>
            </div>

            <div className="form-card-body" style={{ padding: '20px' }}>
              <div className="voucher-details-grid">
                <div className="voucher-field">
                  <div className="voucher-label">
                    <Building2 size={13} /> Customer / Account
                  </div>
                  <div className="voucher-val">{customerName || 'General Customer'}</div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">PO / Sales Order #</div>
                  <div className="voucher-val mono">{orderNumber || 'N/A'}</div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">
                    <MapPin size={13} /> Destination
                  </div>
                  <div className="voucher-val">
                    {postcode} {suburb ? `(${suburb}, ${state})` : ''} — <strong>{result.zoneLabel}</strong>
                  </div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">Order Value (Ex GST)</div>
                  <div className="voucher-val mono">${result.orderValueExGst.toFixed(2)}</div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">
                    <Scale size={13} /> Total Weight
                  </div>
                  <div className="voucher-val mono">{result.totalWeightKg.toFixed(2)} kg</div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">
                    <Maximize2 size={13} /> Total Volume
                  </div>
                  <div className="voucher-val mono">{result.totalVolumeM3.toFixed(3)} m³</div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">
                    <Boxes size={13} /> Packaging Required
                  </div>
                  <div className="voucher-val">
                    {result.palletRequired || config.forcePalletDelivery ? (
                      <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                        {result.palletsRequired} Pallet(s)
                      </span>
                    ) : result.bulkyItemCount > 0 ? (
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        {result.bulkyItemCount} Bulky Carton(s) + {result.standardItemCount} Std
                      </span>
                    ) : (
                      <span>{result.totalItemCount} Standard Carton(s)</span>
                    )}
                  </div>
                </div>

                <div className="voucher-field">
                  <div className="voucher-label">Classification</div>
                  <div className="voucher-val">{result.classificationLabel}</div>
                </div>
              </div>

              {orderNotes && (
                <div className="voucher-notes-box">
                  <strong>Notes:</strong> {orderNotes}
                </div>
              )}

              {/* Order Lines Itemized Mini-List */}
              <div className="voucher-lines-section">
                <div className="voucher-lines-title">
                  Included Order Items ({orderLines.length} SKU{orderLines.length !== 1 ? 's' : ''}, {result.totalItemCount} units)
                </div>
                <div className="voucher-lines-list">
                  {orderLines.map((line, idx) => (
                    <div key={idx} className="voucher-line-row">
                      <div className="voucher-line-left">
                        <span className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>
                          {line.product.sku}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {line.product.type || 'Standard Item'}
                        </span>
                        {line.isBulkyDesignated && (
                          <span className="bulky-badge-tiny">BULKY</span>
                        )}
                      </div>
                      <div className="voucher-line-right mono">
                        <strong>× {line.quantity}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                          ({(line.lineWeightKg ?? 0).toFixed(1)} kg)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action: Save to Temporary Session Storage */}
              <div className="voucher-save-action">
                <button
                  className="btn-save-session"
                  onClick={handleSave}
                  title="Record and store this quote calculation in temporary JS session memory"
                >
                  <Save size={18} />
                  <span>
                    {justSavedQuote
                      ? 'Re-Save / Update Quote in Session'
                      : 'Approve & Save Quote to Temporary Session'}
                  </span>
                </button>
                <div className="save-help-text">
                  ⚡ Stored in JavaScript memory. Will be retained during navigation and cleared automatically when you refresh the browser page.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Freight Result Card */}
        <div className="quote-calc-col">
          <FreightResultCard result={result} config={config} />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="step-actions-footer">
        <button className="btn-secondary-step" onClick={onPrevStep}>
          <ArrowLeft size={16} />
          <span>Back to Packaging Review</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn-secondary" onClick={onViewSessionLog}>
            <History size={15} />
            <span>View Session Orders Log</span>
          </button>

          <button className="btn-primary-step" onClick={onStartNewOrder}>
            <PlusCircle size={16} />
            <span>Start Next Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
