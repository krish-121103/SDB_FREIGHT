import React, { useState, useMemo } from 'react';
import {
  History,
  Sparkles,
  PlusCircle,
  Trash2,
  Eye,
  RotateCcw,
  Download,
  Search,
  MapPin,
  DollarSign,
  Truck,
  Boxes,
  Package,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { StoredSessionQuote } from '../../services/sessionStore';
import { getSessionStats } from '../../services/sessionStore';

interface SessionQuotesLogProps {
  quotes: StoredSessionQuote[];
  onInspectQuote: (quote: StoredSessionQuote) => void;
  onReloadQuote: (quote: StoredSessionQuote) => void;
  onDeleteQuote: (id: string) => void;
  onClearAll: () => void;
  onStartNewOrder: () => void;
  onPreloadDemoQuotes?: () => void;
}

export const SessionQuotesLog: React.FC<SessionQuotesLogProps> = ({
  quotes,
  onInspectQuote,
  onReloadQuote,
  onDeleteQuote,
  onClearAll,
  onStartNewOrder,
  onPreloadDemoQuotes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');

  const stats = useMemo(() => {
    return getSessionStats();
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        q.id.toLowerCase().includes(term) ||
        q.customerName.toLowerCase().includes(term) ||
        q.orderNumber.toLowerCase().includes(term) ||
        q.postcode.includes(term) ||
        (q.suburb && q.suburb.toLowerCase().includes(term));

      const matchesZone = zoneFilter === 'ALL' || q.zone === zoneFilter;
      return matchesSearch && matchesZone;
    });
  }, [quotes, searchTerm, zoneFilter]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quotes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sdb_freight_session_quotes_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="workflow-step-container">
      {/* Top Banner Explaining JS Memory Storage */}
      <div className="session-storage-alert-card">
        <div className="session-alert-icon">
          <Sparkles size={22} color="#0284c7" />
        </div>
        <div className="session-alert-body">
          <div className="session-alert-title">
            Temporary JavaScript Session Storage
          </div>
          <div className="session-alert-text">
            All quotes calculated in this session are preserved in active JavaScript memory while you navigate through the workflow.
            <strong> Refreshing the browser page will completely reset this data</strong>, giving you a fresh slate every time without polluting persistent storage.
          </div>
        </div>
        <div className="session-alert-actions">
          <button className="btn-primary" onClick={onStartNewOrder} style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
            <PlusCircle size={15} />
            <span>New Calculation</span>
          </button>
        </div>
      </div>

      {/* High-Level Session Metrics */}
      <div className="session-metrics-grid">
        <div className="session-stat-card">
          <div className="stat-label">
            <FileText size={15} color="#0284c7" /> Quotes Calculated
          </div>
          <div className="stat-val mono">{quotes.length}</div>
          <div className="stat-sub">{stats.freeFreightCount} free freight order(s)</div>
        </div>

        <div className="session-stat-card">
          <div className="stat-label">
            <DollarSign size={15} color="#059669" /> Total Order Value
          </div>
          <div className="stat-val mono">${stats.totalOrderValueExGst.toFixed(2)}</div>
          <div className="stat-sub">Consignment values ex GST</div>
        </div>

        <div className="session-stat-card">
          <div className="stat-label">
            <Truck size={15} color="#2563eb" /> Total Freight Quoted
          </div>
          <div className="stat-val mono">${stats.totalFreightExGst.toFixed(2)}</div>
          <div className="stat-sub">Ex GST across all lanes</div>
        </div>

        <div className="session-stat-card">
          <div className="stat-label">
            <Boxes size={15} color="#7c3aed" /> Pallet Consignments
          </div>
          <div className="stat-val mono">{stats.palletOrdersCount}</div>
          <div className="stat-sub">{stats.carrierQuoteCount} remote quote(s) required</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="session-controls-bar">
        <div className="session-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="text-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quotes by ID, customer name, PO #, postcode..."
            style={{ paddingLeft: '34px' }}
          />
        </div>

        <div className="session-filter-group">
          <select
            className="select-input"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="ALL">All Delivery Zones</option>
            <option value="METRO">Metro</option>
            <option value="MAJOR_REGIONAL">Major Regional</option>
            <option value="OTHER_REGIONAL">Other Regional</option>
            <option value="REMOTE">Remote</option>
          </select>

          {quotes.length > 0 && (
            <button
              className="btn-secondary"
              onClick={handleExportJson}
              title="Download session quotes as JSON file"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>
          )}

          {quotes.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => {
                if (window.confirm('Clear all stored quotes from this temporary session?')) {
                  onClearAll();
                }
              }}
              title="Clear temporary session storage"
              style={{ color: '#e11d48', borderColor: '#fecdd3', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Trash2 size={14} />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Quotes Table / List */}
      {quotes.length === 0 ? (
        <div className="session-empty-state">
          <div className="empty-icon-box">
            <History size={40} color="#94a3b8" />
          </div>
          <h3 className="empty-title">No Quotes Stored in This Session Yet</h3>
          <p className="empty-desc">
            Use the 4-step workflow to calculate freight quotes. When you reach Step 4 and click <strong>"Approve & Save Quote to Temporary Session"</strong>, the result will appear here.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={onStartNewOrder}>
              <PlusCircle size={16} />
              <span>Start 4-Step Calculation Workflow</span>
            </button>

            {onPreloadDemoQuotes && (
              <button className="btn-secondary" onClick={onPreloadDemoQuotes}>
                <Sparkles size={16} color="#0284c7" />
                <span>Preload Demo Sample Quotes</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="session-empty-state">
          <p className="empty-desc">No quotes matched your search query "{searchTerm}".</p>
          <button className="btn-secondary" onClick={() => { setSearchTerm(''); setZoneFilter('ALL'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="session-table-card">
          <div className="table-responsive">
            <table className="session-quotes-table">
              <thead>
                <tr>
                  <th>Quote Ref</th>
                  <th>Customer / Order</th>
                  <th>Destination & Zone</th>
                  <th>Consignment Specs</th>
                  <th>Classification</th>
                  <th style={{ textAlign: 'right' }}>Freight (Ex GST)</th>
                  <th style={{ textAlign: 'right' }}>Total (Inc GST)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => {
                  const isFree = q.freightExGst === 0 && q.totalUnits > 0;
                  return (
                    <tr key={q.id}>
                      <td>
                        <div className="quote-id-badge mono">{q.id}</div>
                        <div className="quote-time-sub">{q.timestamp}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {q.customerName}
                        </div>
                        <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          PO: {q.orderNumber}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#0284c7" />
                          <span className="mono" style={{ fontWeight: 600 }}>{q.postcode}</span>
                          {q.suburb && <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>({q.suburb})</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {q.zoneLabel}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {q.totalUnits} unit(s) • {q.linesCount} SKU(s)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {q.totalWeightKg.toFixed(1)} kg | {q.totalVolumeM3.toFixed(3)} m³
                        </div>
                      </td>

                      <td>
                        <span className={`table-class-pill ${q.classification.toLowerCase()}`}>
                          {q.classification === 'PALLET' && <Boxes size={12} />}
                          {q.classification === 'BULKY_NON_PALLET' && <Package size={12} />}
                          {q.classification === 'STANDARD' && <Truck size={12} />}
                          {q.classification === 'REMOTE' && <AlertTriangle size={12} />}
                          <span>{q.classificationLabel}</span>
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {q.isRemoteCarrierRate ? (
                          <span style={{ color: '#e11d48', fontWeight: 700, fontSize: '0.82rem' }}>Quote Req.</span>
                        ) : isFree ? (
                          <span className="free-tag mono">FREE</span>
                        ) : (
                          <span className="mono" style={{ fontWeight: 700 }}>
                            ${q.freightExGst?.toFixed(2)}
                          </span>
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Order: ${q.orderValueExGst.toFixed(0)}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {q.isRemoteCarrierRate ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Carrier Rate</span>
                        ) : isFree ? (
                          <span className="mono" style={{ color: '#059669', fontWeight: 700 }}>$0.00</span>
                        ) : (
                          <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>
                            ${q.freightIncGst?.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="table-actions-cell">
                          <button
                            className="btn-icon-action"
                            onClick={() => onInspectQuote(q)}
                            title="Inspect complete quote breakdown and policy audit"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="btn-icon-action reload"
                            onClick={() => onReloadQuote(q)}
                            title="Reload order into workflow to re-calculate or edit"
                          >
                            <RotateCcw size={15} />
                          </button>

                          <button
                            className="btn-icon-action delete"
                            onClick={() => onDeleteQuote(q.id)}
                            title="Delete this quote from session storage"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
