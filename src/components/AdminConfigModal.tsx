import React, { useState } from 'react';
import { X, RotateCcw, Check, Sliders, AlertCircle } from 'lucide-react';
import type { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../rules/defaultConfig';

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

export const AdminConfigModal: React.FC<AdminConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formConfig, setFormConfig] = useState<AppConfig>({ ...config });

  if (!isOpen) return null;

  const handleChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setFormConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFormConfig({ ...DEFAULT_CONFIG });
  };

  const handleSave = () => {
    onSaveConfig(formConfig);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#0284c7" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Freight Rates & Demo Assumptions Configuration
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.84rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              Values marked <span className="pending-badge">Pending SDB approval</span> represent configurable demo assumptions identified in Section 10 of the policy draft that have not yet been finalised by SDB management.
            </span>
          </div>

          {/* Section 1: Official Policy Draft Rates */}
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0284c7',
              borderBottom: '1px solid var(--border-card)',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            1. Official Policy Published Rates (Ex GST)
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div className="form-group">
              <label className="form-label">
                <span>Metro Under $700</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>MET-STD</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.standardMetroUnder700}
                onChange={(e) => handleChange('standardMetroUnder700', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Metro $700+ (Free)</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#10b981' }}>MET-FREE</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.standardMetro700Plus}
                onChange={(e) => handleChange('standardMetro700Plus', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Major Regional Standard</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>REG1-STD</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.majorRegionalStandard}
                onChange={(e) => handleChange('majorRegionalStandard', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Other Regional Standard</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>REG2-STD</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.otherRegionalStandard}
                onChange={(e) => handleChange('otherRegionalStandard', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Bulky Item Fee (per item)</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#fbbf24' }}>BULKY-UNIT</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.bulkyItemFee}
                onChange={(e) => handleChange('bulkyItemFee', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Metro Pallet Rate</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#c084fc' }}>MET-PAL</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.metroPallet}
                onChange={(e) => handleChange('metroPallet', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Major Regional Pallet</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#c084fc' }}>REG1-PAL</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.majorRegionalPallet}
                onChange={(e) => handleChange('majorRegionalPallet', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Other Regional Pallet</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#c084fc' }}>REG2-PAL</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.otherRegionalPallet}
                onChange={(e) => handleChange('otherRegionalPallet', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Free Metro Threshold (ex GST)</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.freeThresholdExGst}
                onChange={(e) => handleChange('freeThresholdExGst', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>GST Rate (Decimal, e.g. 0.10)</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="text-input mono"
                value={formConfig.gstRate}
                onChange={(e) => handleChange('gstRate', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Section 2: Demo Assumptions (Pending SDB Approval) */}
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#d97706',
              borderBottom: '1px solid var(--border-card)',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            2. Demo Rules & Physical Thresholds (Pending SDB Approval)
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="form-group">
              <label className="form-label">
                <span>Pallet Volume Capacity (m³)</span>
                <span className="pending-badge">Pending</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="text-input mono"
                value={formConfig.palletVolumeCapacityM3}
                onChange={(e) => handleChange('palletVolumeCapacityM3', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Max Pallet Weight (kg)</span>
                <span className="pending-badge">Pending</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.maxPalletWeightKg}
                onChange={(e) => handleChange('maxPalletWeightKg', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Bulky Review Threshold (Items)</span>
                <span className="pending-badge">Pending</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.bulkyReviewThreshold}
                onChange={(e) => handleChange('bulkyReviewThreshold', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Carton Max Weight (kg)</span>
                <span className="pending-badge">Pending</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.standardMaxCartonWeightKg}
                onChange={(e) => handleChange('standardMaxCartonWeightKg', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Carton Max Length (mm)</span>
                <span className="pending-badge">Pending</span>
              </label>
              <input
                type="number"
                className="text-input mono"
                value={formConfig.standardMaxCartonLengthMm}
                onChange={(e) => handleChange('standardMaxCartonLengthMm', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Force Pallet Delivery</span>
                <span className="pending-badge">Testing</span>
              </label>
              <select
                className="select-input"
                value={formConfig.forcePalletDelivery ? 'true' : 'false'}
                onChange={(e) => handleChange('forcePalletDelivery', e.target.value === 'true')}
              >
                <option value="false">No (Calculate from metrics)</option>
                <option value="true">Yes (Force pallet treatment)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={15} />
            Reset to Policy Defaults
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Check size={15} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
