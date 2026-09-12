import React from 'react';
import { Truck, Settings, Database } from 'lucide-react';
import type { DataQualityReport } from '../types';

interface HeaderProps {
  onOpenConfig: () => void;
  onOpenDataQuality: () => void;
  dataQualityReport: DataQualityReport;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenConfig,
  onOpenDataQuality,
  dataQualityReport,
}) => {
  const issuesCount =
    dataQualityReport.duplicateSkusCount +
    dataQualityReport.missingPhysicalDataCount;

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Truck size={26} strokeWidth={2.2} />
          </div>
          <div className="brand-titles">
            <h1>
              SDB Freight Calculator
              <span className="tag-internal-draft">Internal Discussion Draft</span>
            </h1>
            <p className="brand-subtitle">
              S & D Berg Trading Pty Ltd | Delivery Pricing & Shipment Classification Engine
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={onOpenDataQuality}
            title="Inspect spreadsheet product master data quality"
          >
            <Database size={16} />
            Data Quality Inspector
            {issuesCount > 0 && (
              <span
                style={{
                  background: '#f43f5e',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  marginLeft: '4px',
                }}
              >
                {issuesCount}
              </span>
            )}
          </button>

          <button
            className="btn-primary"
            onClick={onOpenConfig}
            title="Adjust rates and pending demo assumptions"
          >
            <Settings size={16} />
            Demo Rules & Rates
          </button>
        </div>
      </div>
    </header>
  );
};
