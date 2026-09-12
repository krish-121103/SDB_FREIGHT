import React from 'react';
import { MapPin, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeliveryZone } from '../types';
import type { ZoneDetectionResult } from '../services/zoneCalculator';

interface DeliveryDetailsProps {
  postcode: string;
  onPostcodeChange: (val: string) => void;
  zoneResult: ZoneDetectionResult;
  manualZoneOverride: DeliveryZone | null;
  onManualZoneChange: (zone: DeliveryZone | null) => void;
  orderValueExGst: number;
  onOrderValueChange: (val: number) => void;
  freeThresholdExGst: number;
  gstRate: number;
}

export const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  postcode,
  onPostcodeChange,
  zoneResult,
  manualZoneOverride,
  onManualZoneChange,
  orderValueExGst,
  onOrderValueChange,
  freeThresholdExGst,
  gstRate,
}) => {
  const orderGst = Number((orderValueExGst * gstRate).toFixed(2));
  const orderIncGst = Number((orderValueExGst + orderGst).toFixed(2));
  const differenceToFree = Math.max(0, freeThresholdExGst - orderValueExGst);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <MapPin size={18} color="#38bdf8" />
          Delivery & Order Details
        </h2>
        <span className="pending-badge">Pending SDB approval</span>
      </div>

      <div className="delivery-form-grid">
        {/* Postcode Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="delivery-postcode">
            <span>Delivery Postcode</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              AU 4-digit code
            </span>
          </label>
          <div className="input-container">
            <MapPin size={16} className="input-icon" />
            <input
              id="delivery-postcode"
              type="text"
              className="text-input mono"
              value={postcode}
              onChange={(e) => onPostcodeChange(e.target.value)}
              placeholder="e.g. 3000, 2300, 0870"
              maxLength={4}
            />
          </div>
          <div className="zone-detected-badge">
            <span className="dot" />
            <span>
              Detected: <strong>{zoneResult.zoneLabel}</strong>
              {zoneResult.suburb ? ` (${zoneResult.suburb}, ${zoneResult.state})` : ''}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {zoneResult.sourceDescription}
          </div>
        </div>

        {/* Manual Zone Override */}
        <div className="form-group">
          <label className="form-label" htmlFor="manual-zone-select">
            <span>Manual Zone Override</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Testing / Fallback
            </span>
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
            <option value="METRO">Metro ($35 / FREE $700+)</option>
            <option value="MAJOR_REGIONAL">Major Regional ($75 standard)</option>
            <option value="OTHER_REGIONAL">Other Regional ($120 standard)</option>
            <option value="REMOTE">Remote (Carrier Rate applies)</option>
          </select>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {manualZoneOverride
              ? 'Active override: Freight calculation will use this selected zone.'
              : 'Postcode mapping is a demo configuration and is pending SDB approval.'}
          </div>
        </div>
      </div>

      {/* Order Value Section */}
      <div style={{ marginTop: '20px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="order-value-input">
            <span>Order Value (Ex GST)</span>
            <span style={{ fontSize: '0.74rem', color: '#60a5fa', fontWeight: 600 }}>
              Free metro delivery threshold: ${freeThresholdExGst} ex GST
            </span>
          </label>
          <div className="input-container">
            <DollarSign size={16} className="input-icon" />
            <input
              id="order-value-input"
              type="number"
              min="0"
              step="10"
              className="text-input mono"
              value={orderValueExGst || ''}
              onChange={(e) => onOrderValueChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Order Value Tax Summary */}
        <div className="order-value-box">
          <div className="order-value-row">
            <span>Order Value (ex GST):</span>
            <span className="mono">${orderValueExGst.toFixed(2)}</span>
          </div>
          <div className="order-value-row">
            <span>GST ({Number((gstRate * 100).toFixed(0))}%):</span>
            <span className="mono">${orderGst.toFixed(2)}</span>
          </div>
          <div className="order-value-row highlight">
            <span>Order Value (inc GST):</span>
            <span className="mono">${orderIncGst.toFixed(2)}</span>
          </div>

          {/* Policy threshold visual feedback */}
          {zoneResult.detectedZone === 'METRO' ? (
            orderValueExGst >= freeThresholdExGst ? (
              <div className="threshold-indicator threshold-met">
                <CheckCircle2 size={15} />
                <span>
                  <strong>Threshold Reached:</strong> Order qualifies for FREE Standard Metro delivery ($700+ ex GST).
                </span>
              </div>
            ) : (
              <div className="threshold-indicator threshold-not-met">
                <AlertCircle size={15} />
                <span>
                  <strong>Standard Rate ($35):</strong> Add ${differenceToFree.toFixed(2)} ex GST to qualify for free standard metro delivery.
                </span>
              </div>
            )
          ) : (
            <div className="threshold-indicator" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <AlertCircle size={15} />
              <span>
                <strong>Regional Zone Notice:</strong> The $700 free freight threshold applies to Metro only. Regional orders follow published consignment rates.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
