import React from 'react';
import {
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  Scale,
  Maximize2,
  FileText,
  Info,
} from 'lucide-react';
import type { FreightResult as FreightResultType, AppConfig } from '../types';

interface FreightResultProps {
  result: FreightResultType;
  config: AppConfig;
}

export const FreightResultCard: React.FC<FreightResultProps> = ({ result, config }) => {
  // Determine badge styling based on classification
  const getBadgeClass = () => {
    if (result.classification === 'REMOTE') return 'badge-remote';
    if (result.classification === 'PALLET') return 'badge-pallet';
    if (result.classification === 'BULKY_NON_PALLET') return 'badge-bulky';
    if (result.freightExGst === 0 && result.totalItemCount > 0) return 'badge-free';
    return 'badge-standard';
  };

  return (
    <div className="hero-freight-card">
      {/* Top Classification Badge & Zone */}
      <div className="hero-status-row">
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Shipment Classification
          </div>
          <div className={`classification-badge ${getBadgeClass()}`} style={{ marginTop: '4px' }}>
            {result.classification === 'PALLET' && <Boxes size={15} />}
            {result.classification === 'BULKY_NON_PALLET' && <Package size={15} />}
            {result.classification === 'STANDARD' && <Truck size={15} />}
            {result.classification === 'REMOTE' && <AlertTriangle size={15} />}
            {result.hasDataErrors ? 'DATA ERROR' : result.classificationLabel}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Zone
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            {result.zoneLabel}
          </div>
        </div>
      </div>

      {/* Hero Price Display */}
      <div className="hero-price-display">
        <div className="hero-price-label">Freight Charge (Ex GST)</div>

        {result.hasDataErrors ? (
          <div>
            <div className="hero-price-val remote" style={{ fontSize: '1.4rem' }}>
              CALCULATION HALTED
            </div>
            <div style={{ color: '#be123c', fontSize: '0.82rem', marginTop: '6px' }}>
              Insufficient physical data for calculation
            </div>
          </div>
        ) : result.isRemoteCarrierRate ? (
          <div>
            <div className="hero-price-val remote">
              CARRIER QUOTE
            </div>
            <div style={{ color: '#be123c', fontSize: '0.82rem', marginTop: '6px' }}>
              Carrier freight rate applies (Pending quotation)
            </div>
          </div>
        ) : (
          <div>
            <div className={`hero-price-val ${result.freightExGst === 0 && result.totalItemCount > 0 ? 'free' : ''}`}>
              ${result.freightExGst?.toFixed(2)}
            </div>

            <div className="hero-gst-breakdown">
              <div>
                GST ({Number((config.gstRate * 100).toFixed(0))}%):{' '}
                <strong className="mono" style={{ color: 'var(--text-primary)' }}>
                  ${result.gstAmount?.toFixed(2)}
                </strong>
              </div>
              <div style={{ color: '#cbd5e1' }}>|</div>
              <div>
                Total Inc GST:{' '}
                <strong className="mono" style={{ color: '#0284c7' }}>
                  ${result.freightIncGst?.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shipment Metrics Strip */}
      <div className="shipment-metrics-grid">
        <div className="metric-tile">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Scale size={13} /> Total Weight
          </div>
          <div className="metric-val">{result.totalWeightKg} kg</div>
          <div className="metric-sub">Across {result.totalItemCount} item(s)</div>
        </div>

        <div className="metric-tile">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Maximize2 size={13} /> Total Volume
          </div>
          <div className="metric-val">{result.totalVolumeM3} m³</div>
          <div className="metric-sub">Sum of unit volumes</div>
        </div>

        <div className="metric-tile">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Package size={13} /> Bulky Items
          </div>
          <div className="metric-val" style={{ color: result.bulkyItemCount > 0 ? '#d97706' : 'var(--text-primary)' }}>
            {result.bulkyItemCount}
          </div>
          <div className="metric-sub">{result.standardItemCount} standard item(s)</div>
        </div>

        <div className="metric-tile">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Boxes size={13} /> Estimated Pallets
          </div>
          <div className="metric-val" style={{ color: result.palletsRequired > 0 ? '#7c3aed' : 'var(--text-primary)' }}>
            {result.palletsRequired}
          </div>
          <div className="metric-sub">
            {result.palletsRequired > 0 ? 'Pallet rate applied' : 'Ordinary carton'}
          </div>
        </div>
      </div>

      {/* Itemized Calculation Lines */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileText size={14} />
          Calculation Breakdown
        </div>

        <div className="calc-lines-box">
          {result.calculationLines.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '8px' }}>
              Add products above to see line-by-line freight rates.
            </div>
          ) : (
            result.calculationLines.map((line, idx) => (
              <div key={idx} className="calc-line-item">
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <div>
                    <span className="calc-code-tag">{line.code}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.description}</span>
                  </div>
                  {line.notes && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {line.notes}
                    </div>
                  )}
                </div>
                <div className="mono" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {line.isCarrierRate ? (
                    <span style={{ color: '#e11d48' }}>Quote Req.</span>
                  ) : (
                    `$${line.totalExGst.toFixed(2)}`
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Explainable Policy Reasoning Card */}
      {result.ruleExplanations.length > 0 && (
        <div className="explain-card">
          <div className="explain-title">
            <Info size={15} color="#0284c7" />
            Why this rate was calculated
          </div>
          <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {result.ruleExplanations.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings & Notices */}
      {result.warnings.length > 0 && (
        <div className="warning-box">
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>Operational Notice</div>
            <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {result.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Data Errors Notice */}
      {result.hasDataErrors && (
        <div className="error-box">
          <AlertTriangle size={18} color="#f43f5e" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>Data Validation Required</div>
            <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {result.dataErrorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Demo Assumptions Label */}
      {result.demoAssumptionsApplied.length > 0 && (
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '10px' }}>
          * {result.demoAssumptionsApplied.join('; ')}
        </div>
      )}
    </div>
  );
};
