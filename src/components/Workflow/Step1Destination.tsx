import React from 'react';
import {
  MapPin,
  Building2,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  FileUp,
} from 'lucide-react';
import type { DeliveryZone } from '../../types';
import type { ZoneDetectionResult } from '../../services/zoneCalculator';

interface Step1DestinationProps {
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  orderNumber: string;
  onOrderNumberChange: (val: string) => void;
  orderNotes: string;
  onOrderNotesChange: (val: string) => void;
  postcode: string;
  onPostcodeChange: (val: string) => void;
  zoneResult: ZoneDetectionResult;
  manualZoneOverride: DeliveryZone | null;
  onManualZoneChange: (zone: DeliveryZone | null) => void;
  orderValueExGst: number;
  onOrderValueChange: (val: number) => void;
  freeThresholdExGst: number;
  gstRate: number;
  onNextStep: () => void;
  onOpenOrderImport: () => void;
}

export const Step1Destination: React.FC<Step1DestinationProps> = ({
  customerName,
  onCustomerNameChange,
  orderNumber,
  onOrderNumberChange,
  orderNotes,
  onOrderNotesChange,
  postcode,
  onPostcodeChange,
  zoneResult,
  manualZoneOverride,
  onManualZoneChange,
  orderValueExGst,
  onOrderValueChange,
  freeThresholdExGst,
  gstRate,
  onNextStep,
  onOpenOrderImport,
}) => {
  const orderGst = Number((orderValueExGst * gstRate).toFixed(2));
  const orderIncGst = Number((orderValueExGst + orderGst).toFixed(2));
  const differenceToFree = Math.max(0, freeThresholdExGst - orderValueExGst);
  const percentToFree = Math.min(100, Math.round((orderValueExGst / freeThresholdExGst) * 100));

  const quickPostcodes = [
    { code: '3000', label: 'Melbourne (Metro)' },
    { code: '2000', label: 'Sydney (Metro)' },
    { code: '2300', label: 'Newcastle (Maj. Reg)' },
    { code: '2350', label: 'Armidale (Oth. Reg)' },
    { code: '0870', label: 'Alice Springs (Remote)' },
  ];

  const isPostcodeValid = postcode.trim().length >= 3;

  return (
    <div className="workflow-step-container">
      {/* Step Header */}
      <div className="step-header-box">
        <div className="step-header-left">
          <div className="step-badge-round">1</div>
          <div>
            <h2 className="step-main-title">Delivery Destination & Order Value</h2>
            <p className="step-main-sub">
              Define the customer, delivery postcode for automated freight zone mapping, and the consignment order value.
            </p>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={onOpenOrderImport}
          style={{
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            borderColor: '#bae6fd',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            padding: '7px 12px',
          }}
          title="Import order details directly from PDF or text"
        >
          <FileUp size={15} />
          <span>Import from PDF / Email</span>
        </button>
      </div>

      <div className="step-form-grid">
        {/* Customer & Reference Card */}
        <div className="form-card">
          <div className="form-card-title">
            <Building2 size={16} color="#0284c7" />
            <span>Customer & Order Reference</span>
          </div>

          <div className="form-card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="customer-name-input">
                <span>Customer / Account Name</span>
                <span className="field-hint">Optional</span>
              </label>
              <input
                id="customer-name-input"
                type="text"
                className="text-input"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="e.g. Sydney BBQs & Heating, Bunnings Chatswood"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="order-number-input">
                  <span>PO / Sales Order #</span>
                  <span className="field-hint">Reference</span>
                </label>
                <input
                  id="order-number-input"
                  type="text"
                  className="text-input mono"
                  value={orderNumber}
                  onChange={(e) => onOrderNumberChange(e.target.value)}
                  placeholder="e.g. PO-84192"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="order-notes-input">
                  <span>Internal Notes / Dispatch Ref</span>
                </label>
                <input
                  id="order-notes-input"
                  type="text"
                  className="text-input"
                  value={orderNotes}
                  onChange={(e) => onOrderNotesChange(e.target.value)}
                  placeholder="e.g. Tailgate needed, Fragile delivery"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Postcode & Delivery Zone Card */}
        <div className="form-card">
          <div className="form-card-title">
            <MapPin size={16} color="#0284c7" />
            <span>Delivery Destination & Zone</span>
            <span className="pending-badge">Pending SDB approval</span>
          </div>

          <div className="form-card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="postcode-input">
                <span>Delivery Postcode (AU 4-Digit)</span>
                <span className="field-hint">Required</span>
              </label>
              <div className="input-container">
                <MapPin size={16} className="input-icon" />
                <input
                  id="postcode-input"
                  type="text"
                  className="text-input mono"
                  value={postcode}
                  onChange={(e) => onPostcodeChange(e.target.value)}
                  placeholder="e.g. 3000, 2300, 2350, 0870"
                  maxLength={4}
                />
              </div>

              {/* Quick Preset Postcode Chips */}
              <div className="quick-postcode-chips">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '4px' }}>Quick test:</span>
                {quickPostcodes.map((qp) => (
                  <button
                    key={qp.code}
                    type="button"
                    className={`chip-btn ${postcode === qp.code ? 'active' : ''}`}
                    onClick={() => {
                      onPostcodeChange(qp.code);
                      onManualZoneChange(null);
                    }}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone Detection Status Box */}
            <div className="zone-detected-callout">
              <div className="zone-detected-badge">
                <span className="dot" />
                <span>
                  Detected Delivery Zone: <strong>{zoneResult.zoneLabel}</strong>
                  {zoneResult.suburb ? ` (${zoneResult.suburb}, ${zoneResult.state})` : ''}
                </span>
              </div>
              <div className="zone-source-text">
                {zoneResult.sourceDescription}
              </div>
            </div>

            {/* Manual Zone Override */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" htmlFor="manual-zone-select">
                <span>Manual Zone Override</span>
                <span className="field-hint">Testing / Dispatch Fallback</span>
              </label>
              <select
                id="manual-zone-select"
                className="select-input"
                value={manualZoneOverride || ''}
                onChange={(e) => {
                  const val = e.target.value as DeliveryZone;
                  onManualZoneChange(val ? val : null);
                }}
              >
                <option value="">Auto-detect from Postcode</option>
                <option value="METRO">Metro ($35.00 / FREE on $700+ ex GST)</option>
                <option value="MAJOR_REGIONAL">Major Regional ($75.00 Standard)</option>
                <option value="OTHER_REGIONAL">Other Regional ($120.00 Standard)</option>
                <option value="REMOTE">Remote (Carrier Quote Required)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Value & Free Freight Meter Card */}
        <div className="form-card full-width">
          <div className="form-card-title">
            <DollarSign size={16} color="#059669" />
            <span>Order Value & Free Metro Freight Qualification</span>
          </div>

          <div className="form-card-body">
            <div className="order-value-flex">
              <div className="form-group" style={{ minWidth: '240px', flex: 1 }}>
                <label className="form-label" htmlFor="order-val-input">
                  <span>Order Value (Ex GST)</span>
                  <span className="field-hint">Threshold: ${freeThresholdExGst} ex GST</span>
                </label>
                <div className="input-container">
                  <span className="currency-prefix">$</span>
                  <input
                    id="order-val-input"
                    type="number"
                    min="0"
                    step="10"
                    className="text-input mono"
                    style={{ paddingLeft: '28px' }}
                    value={orderValueExGst === 0 ? '' : orderValueExGst}
                    onChange={(e) => onOrderValueChange(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 500.00"
                  />
                </div>
              </div>

              {/* Financial Tally Pill */}
              <div className="value-tally-pill">
                <div className="tally-item">
                  <span className="tally-label">Ex GST</span>
                  <span className="tally-val mono">${orderValueExGst.toFixed(2)}</span>
                </div>
                <div className="tally-divider">+</div>
                <div className="tally-item">
                  <span className="tally-label">GST ({Number((gstRate * 100).toFixed(0))}%)</span>
                  <span className="tally-val mono">${orderGst.toFixed(2)}</span>
                </div>
                <div className="tally-divider">=</div>
                <div className="tally-item highlight">
                  <span className="tally-label">Total Inc GST</span>
                  <span className="tally-val mono">${orderIncGst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Free Freight Progress Bar */}
            <div className="free-freight-meter">
              <div className="meter-label-row">
                <span className="meter-text">
                  {differenceToFree > 0 ? (
                    <>
                      Order Value is <strong>${orderValueExGst.toFixed(2)}</strong>. Add{' '}
                      <strong style={{ color: '#0284c7' }}>${differenceToFree.toFixed(2)}</strong> more to reach{' '}
                      <strong>${freeThresholdExGst}</strong> for Free Metro Delivery!
                    </>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={15} /> Qualified for FREE Standard Metro Delivery ($0.00)!
                    </span>
                  )}
                </span>
                <span className="meter-percentage mono">{percentToFree}%</span>
              </div>
              <div className="meter-bar-track">
                <div
                  className={`meter-bar-fill ${differenceToFree === 0 ? 'complete' : ''}`}
                  style={{ width: `${percentToFree}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="step-actions-footer">
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {isPostcodeValid ? (
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={14} /> Ready to select order items
            </span>
          ) : (
            <span style={{ color: '#d97706' }}>
              Please enter a valid 4-digit Australian postcode to proceed
            </span>
          )}
        </div>

        <button
          className="btn-primary-step"
          onClick={onNextStep}
          disabled={!isPostcodeValid}
        >
          <span>Continue to Step 2: Add Order Items</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
