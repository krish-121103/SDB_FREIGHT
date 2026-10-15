import React from 'react';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Scale,
  Maximize2,
  Package,
  AlertTriangle,
  Edit2,
} from 'lucide-react';
import type { OrderLine, AppConfig } from '../../types';
import { OrderBuilder } from '../OrderBuilder';

interface Step2ItemsProps {
  orderLines: OrderLine[];
  onAddLine: (line: OrderLine) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onToggleBulky: (id: string) => void;
  onRemoveLine: (id: string) => void;
  onOpenOrderImport: () => void;
  config: AppConfig;
  destinationSummary: {
    postcode: string;
    zoneLabel: string;
    orderValueExGst: number;
    customerName?: string;
  };
  onPrevStep: () => void;
  onNextStep: () => void;
}

export const Step2Items: React.FC<Step2ItemsProps> = ({
  orderLines,
  onAddLine,
  onUpdateQuantity,
  onToggleBulky,
  onRemoveLine,
  onOpenOrderImport,
  config,
  destinationSummary,
  onPrevStep,
  onNextStep,
}) => {
  // Aggregate Cargo Metrics
  let totalUnits = 0;
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;
  let bulkyCount = 0;
  let hasIncompleteData = false;

  orderLines.forEach((line) => {
    totalUnits += line.quantity;
    if (line.lineWeightKg !== null) totalWeightKg += line.lineWeightKg;
    if (line.lineVolumeM3 !== null) totalVolumeM3 += line.lineVolumeM3;
    if (line.isBulkyDesignated) bulkyCount += line.quantity;
    if (line.hasDataError) hasIncompleteData = true;
  });

  const canProceed = orderLines.length > 0;

  return (
    <div className="workflow-step-container">
      {/* Destination Context Strip */}
      <div className="destination-context-strip">
        <div className="context-left">
          <div className="context-pill">
            <MapPin size={14} color="#0284c7" />
            <span>
              Destination: <strong>{destinationSummary.postcode}</strong> ({destinationSummary.zoneLabel})
            </span>
          </div>

          <div className="context-pill">
            <span>
              Order Value: <strong>${destinationSummary.orderValueExGst.toFixed(2)}</strong> ex GST
            </span>
          </div>

          {destinationSummary.customerName && (
            <div className="context-pill customer">
              <span>Account: <strong>{destinationSummary.customerName}</strong></span>
            </div>
          )}
        </div>

        <button
          className="btn-link-edit"
          onClick={onPrevStep}
          title="Return to Step 1 to change destination or order value"
        >
          <Edit2 size={13} />
          <span>Edit Destination / Value</span>
        </button>
      </div>

      {/* Step Header */}
      <div className="step-header-box">
        <div className="step-header-left">
          <div className="step-badge-round">2</div>
          <div>
            <h2 className="step-main-title">Order Items & Cargo Specifications</h2>
            <p className="step-main-sub">
              Select products from the 411-SKU master catalog. Dimensions, unit volume, and unit weight are automatically retrieved from the physical specs database.
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Live Cargo Summary Strip */}
      <div className="cargo-summary-strip">
        <div className="cargo-metric-card">
          <div className="cargo-metric-icon">
            <Layers size={18} color="#0284c7" />
          </div>
          <div>
            <div className="cargo-metric-val mono">{orderLines.length}</div>
            <div className="cargo-metric-label">Line Items ({totalUnits} total units)</div>
          </div>
        </div>

        <div className="cargo-metric-card">
          <div className="cargo-metric-icon">
            <Scale size={18} color="#059669" />
          </div>
          <div>
            <div className="cargo-metric-val mono">{totalWeightKg.toFixed(2)} kg</div>
            <div className="cargo-metric-label">Total Gross Weight</div>
          </div>
        </div>

        <div className="cargo-metric-card">
          <div className="cargo-metric-icon">
            <Maximize2 size={18} color="#7c3aed" />
          </div>
          <div>
            <div className="cargo-metric-val mono">{totalVolumeM3.toFixed(3)} m³</div>
            <div className="cargo-metric-label">Total Shipment Volume</div>
          </div>
        </div>

        <div className="cargo-metric-card">
          <div className="cargo-metric-icon">
            <Package size={18} color={bulkyCount > 0 ? '#d97706' : '#64748b'} />
          </div>
          <div>
            <div className="cargo-metric-val mono" style={{ color: bulkyCount > 0 ? '#d97706' : 'inherit' }}>
              {bulkyCount}
            </div>
            <div className="cargo-metric-label">Designated Bulky Items</div>
          </div>
        </div>
      </div>

      {/* Order Builder Component */}
      <div className="step-builder-wrapper">
        <OrderBuilder
          orderLines={orderLines}
          onAddLine={onAddLine}
          onUpdateQuantity={onUpdateQuantity}
          onToggleBulky={onToggleBulky}
          onRemoveLine={onRemoveLine}
          onOpenOrderImport={onOpenOrderImport}
          config={config}
        />
      </div>

      {/* Navigation Footer */}
      <div className="step-actions-footer">
        <button className="btn-secondary-step" onClick={onPrevStep}>
          <ArrowLeft size={16} />
          <span>Back to Delivery</span>
        </button>

        <div style={{ fontSize: '0.82rem' }}>
          {!canProceed ? (
            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={15} /> Please add at least 1 product line to continue
            </span>
          ) : hasIncompleteData ? (
            <span style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={15} /> Warning: Incomplete physical data on some items
            </span>
          ) : (
            <span style={{ color: '#059669' }}>
              ✓ {orderLines.length} product line{orderLines.length !== 1 ? 's' : ''} ready for packaging assessment
            </span>
          )}
        </div>

        <button
          className="btn-primary-step"
          onClick={onNextStep}
          disabled={!canProceed}
        >
          <span>Continue to Step 3: Packaging & Pallet Review</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
