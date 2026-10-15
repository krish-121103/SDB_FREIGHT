import React from 'react';
import {
  Boxes,
  Package,
  Truck,
  AlertTriangle,
  Scale,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Info,
  Sliders,
} from 'lucide-react';
import type { FreightResult, AppConfig } from '../../types';

interface Step3PackagingProps {
  result: FreightResult;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export const Step3Packaging: React.FC<Step3PackagingProps> = ({
  result,
  config,
  onUpdateConfig,
  onPrevStep,
  onNextStep,
}) => {
  const volumePercentage = Math.min(
    100,
    Math.round((result.totalVolumeM3 / config.palletVolumeCapacityM3) * 100)
  );

  const weightPercentage = Math.min(
    100,
    Math.round((result.totalWeightKg / config.maxPalletWeightKg) * 100)
  );

  const handleToggleForcePallet = () => {
    onUpdateConfig({
      ...config,
      forcePalletDelivery: !config.forcePalletDelivery,
    });
  };

  const isPalletized = result.palletRequired || config.forcePalletDelivery;
  const hasBulkyReviewWarning = result.bulkyItemCount >= config.bulkyReviewThreshold;

  return (
    <div className="workflow-step-container">
      {/* Step Header */}
      <div className="step-header-box">
        <div className="step-header-left">
          <div className="step-badge-round">3</div>
          <div>
            <h2 className="step-main-title">Shipment Packaging & Pallet Assessment</h2>
            <p className="step-main-sub">
              Analyze physical cargo dimensions against SDB warehouse logistics thresholds, bulky handling rules, and pallet consolidation policies.
            </p>
          </div>
        </div>
      </div>

      <div className="packaging-grid">
        {/* Left Column: Physical Analysis & Pallet Capacity */}
        <div className="packaging-left-col">
          {/* Packaging Classification Card */}
          <div className="form-card">
            <div className="form-card-title">
              <Truck size={16} color="#0284c7" />
              <span>Assigned Shipment Classification</span>
            </div>

            <div className="form-card-body">
              <div className="classification-hero-box">
                <div className="classification-badge-large">
                  {result.classification === 'PALLET' && <Boxes size={22} />}
                  {result.classification === 'BULKY_NON_PALLET' && <Package size={22} />}
                  {result.classification === 'STANDARD' && <Truck size={22} />}
                  {result.classification === 'REMOTE' && <AlertTriangle size={22} />}
                  <span>{result.classificationLabel}</span>
                </div>

                <div className="classification-reason-text">
                  {result.palletReason ||
                    (result.classification === 'BULKY_NON_PALLET'
                      ? `${result.bulkyItemCount} bulky designated item(s) on standard consignment`
                      : result.classification === 'REMOTE'
                      ? 'Destination is outside published standard transport lanes'
                      : 'Standard loose carton consignment within volume & weight limits')}
                </div>
              </div>

              {/* Unit Breakdown Stats */}
              <div className="unit-breakdown-row">
                <div className="unit-pill">
                  <span className="unit-number mono">{result.standardItemCount}</span>
                  <span className="unit-label">Standard Cartons</span>
                </div>
                <div className="unit-pill">
                  <span className="unit-number mono" style={{ color: result.bulkyItemCount > 0 ? '#d97706' : 'inherit' }}>
                    {result.bulkyItemCount}
                  </span>
                  <span className="unit-label">Designated Bulky Units</span>
                </div>
                <div className="unit-pill highlight">
                  <span className="unit-number mono" style={{ color: isPalletized ? '#7c3aed' : 'inherit' }}>
                    {result.palletsRequired}
                  </span>
                  <span className="unit-label">Estimated Pallet(s)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pallet Capacity Gauges Card */}
          <div className="form-card">
            <div className="form-card-title">
              <Boxes size={16} color="#7c3aed" />
              <span>Pallet Capacity Utilization Gauges</span>
              <span className="pending-badge">Pending SDB approval</span>
            </div>

            <div className="form-card-body">
              {/* Volume Meter */}
              <div className="capacity-gauge-row">
                <div className="gauge-header">
                  <span className="gauge-name">
                    <Maximize2 size={14} color="#7c3aed" /> Total Volume Capacity
                  </span>
                  <span className="gauge-values mono">
                    <strong>{result.totalVolumeM3.toFixed(3)} m³</strong> / {config.palletVolumeCapacityM3} m³ max
                  </span>
                </div>
                <div className="gauge-track">
                  <div
                    className={`gauge-fill ${volumePercentage >= 100 ? 'overflow' : ''}`}
                    style={{ width: `${Math.min(100, volumePercentage)}%` }}
                  />
                </div>
                <div className="gauge-footer-note">
                  {volumePercentage >= 100
                    ? '⚠️ Volume exceeds 1 standard pallet capacity (multiple pallets required)'
                    : `${100 - volumePercentage}% pallet volume remaining`}
                </div>
              </div>

              {/* Weight Meter */}
              <div className="capacity-gauge-row" style={{ marginTop: '16px' }}>
                <div className="gauge-header">
                  <span className="gauge-name">
                    <Scale size={14} color="#059669" /> Total Weight Capacity
                  </span>
                  <span className="gauge-values mono">
                    <strong>{result.totalWeightKg.toFixed(2)} kg</strong> / {config.maxPalletWeightKg} kg max
                  </span>
                </div>
                <div className="gauge-track">
                  <div
                    className={`gauge-fill weight ${weightPercentage >= 100 ? 'overflow' : ''}`}
                    style={{ width: `${Math.min(100, weightPercentage)}%` }}
                  />
                </div>
                <div className="gauge-footer-note">
                  {weightPercentage >= 100
                    ? '⚠️ Consignment exceeds single pallet weight limit (1000 kg)'
                    : `${config.maxPalletWeightKg - result.totalWeightKg} kg pallet payload margin`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SDB Policy Guardrails & Staff Overrides */}
        <div className="packaging-right-col">
          {/* Policy Guardrail #1: No Double-Charging */}
          <div className="policy-rule-card active">
            <div className="rule-card-header">
              <ShieldCheck size={18} color="#059669" />
              <div className="rule-card-title">SDB Guardrail: No Double-Charging Rule</div>
            </div>
            <div className="rule-card-content">
              {isPalletized ? (
                <div className="rule-callout success">
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Bulky Surcharge Waived:</strong> Because this consignment is palletized, the individual $30 bulky-item fee is <strong>waived ($0.00)</strong>. Only the consolidated pallet transport rate applies.
                  </div>
                </div>
              ) : result.bulkyItemCount > 0 ? (
                <div className="rule-callout neutral">
                  <Info size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Bulky Surcharge Active:</strong> Order is shipped as loose cartons. Each bulky designated item incurs a <strong>$30.00 ex GST</strong> handling fee ({result.bulkyItemCount} × $30 = ${(result.bulkyItemCount * 30).toFixed(2)}).
                  </div>
                </div>
              ) : (
                <div className="rule-callout neutral">
                  <Info size={16} color="#64748b" style={{ flexShrink: 0 }} />
                  <div>
                    No bulky items on this consignment. Standard courier handling rates apply.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policy Guardrail #2: Warehouse Review Recommended */}
          {hasBulkyReviewWarning && (
            <div className="policy-rule-card warning">
              <div className="rule-card-header">
                <AlertTriangle size={18} color="#d97706" />
                <div className="rule-card-title">SDB Operational Guardrail: 3+ Bulky Items</div>
              </div>
              <div className="rule-card-content">
                <div className="rule-callout warning">
                  <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Warehouse Review Recommended:</strong> This order contains {result.bulkyItemCount} bulky items (threshold: {config.bulkyReviewThreshold}). Warehouse team must assess whether palletizing the shipment is safer, cheaper, or prevents courier damage.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Staff Manual Pallet Override Card */}
          <div className="form-card" style={{ marginTop: '16px' }}>
            <div className="form-card-title">
              <Sliders size={16} color="#0284c7" />
              <span>Staff Packaging Override</span>
            </div>

            <div className="form-card-body">
              <div className="override-toggle-box">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Force Pallet Consolidation
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Simulate sending this consignment on a pallet regardless of volume/weight thresholds.
                  </div>
                </div>

                <label className="switch-toggle" htmlFor="force-pallet-toggle">
                  <input
                    id="force-pallet-toggle"
                    type="checkbox"
                    checked={config.forcePalletDelivery}
                    onChange={handleToggleForcePallet}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {config.forcePalletDelivery && (
                <div className="toggle-explanation-banner">
                  ⚡ Staff override active: Pallet rate will be applied and all bulky-item surcharges will be automatically waived.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="step-actions-footer">
        <button className="btn-secondary-step" onClick={onPrevStep}>
          <ArrowLeft size={16} />
          <span>Back to Order Items</span>
        </button>

        <div style={{ fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={14} /> Packaging rules evaluated & ready for freight quote
        </div>

        <button className="btn-primary-step" onClick={onNextStep}>
          <span>Continue to Step 4: Calculate Freight Quote</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
