import React, { useState, useRef } from 'react';
import {
  FileUp,
  FileText,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Check,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import type { AppConfig } from '../../types';
import type {
  ParsedOrderResult,
  ParsedItem,
} from '../../services/orderParser/types';
import { parseOrderText } from '../../services/orderParser/textParser';
import { extractAndParsePdf, type PdfExtractionProgress } from '../../services/orderParser/pdfExtractor';
import {
  convertOrderToFreightCalculator,
  extractPostcodeFromAddress,
  type ConvertedFreightOrder,
} from '../../services/orderParser/orderToFreightAdapter';
import {
  findProductInCatalog,
  getAllCatalogProducts,
} from '../../services/orderParser/productCatalogMatcher';

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOrder: (converted: ConvertedFreightOrder, rawResult: ParsedOrderResult) => void;
  config: AppConfig;
  initialParsedResult?: ParsedOrderResult | null;
}

// Sample presets for 1-click testing
const SAMPLE_SYDNEY_BBQS = `SYDNEY BBQS
18/79 Williamson Rd
INGLEBURN 2565

O/No: Erik

2 X OM2017-1B
2 X OM2017-8JD
60 X SBFL
36 X JETGAS`;

const SAMPLE_INVOICE_TABLE = `TAX INVOICE
Invoice No: INV-88492
Date: 03/10/2026
Customer: Coastal BBQ & Hardware Supplies
Deliver To: 14 Bayview Street, Gosford NSW 2250

Item Code       Description                  Qty    Unit Price    Total
OM2017-1B       1 Burner Portable BBQ        2      $150.00       $300.00
OMTGC           Standard BBQ Cart            4      $45.00        $180.00
SBFL            Safety Burner Flashlight     24     $18.50        $444.00
JETGAS          Jet Gas Refill Canisters     48     $8.20         $393.60`;

const SAMPLE_REVIEW_EDGE_CASE = `PURCHASE ORDER
PO Number: PO-ALERT-2026
Date: 04/10/2026
Customer: Outback Grill Specialists
Deliver To: 88 Desert Hwy, Alice Springs NT 0870

2 X OM2017-8JD~   (Low-confidence OCR character)
0 X SBFL          (Zero quantity flagged)
5 X CUSTOM-SKU-99 (Unlisted SKU not in catalog)
1 X JETGAS @ $12.00 ea`;

export const OrderImportModal: React.FC<OrderImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmOrder,
  config,
  initialParsedResult,
}) => {
  const [activeTab, setActiveTab] = useState<'PDF' | 'TEXT'>('TEXT');

  // Input states
  const [manualText, setManualText] = useState(SAMPLE_SYDNEY_BBQS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [forceOcr, setForceOcr] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfExtractionProgress | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Parsed state
  const [parsedResult, setParsedResult] = useState<ParsedOrderResult | null>(
    initialParsedResult || null
  );

  // Editable review states
  const [showRawSource, setShowRawSource] = useState(false);
  const [activeSkuDropdown, setActiveSkuDropdown] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const allCatalogProducts = getAllCatalogProducts();

  if (!isOpen) return null;

  // Handle PDF Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setInputError(null);
      } else {
        setInputError('Please select a valid PDF file (.pdf)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setInputError(null);
    }
  };

  // Run Order Parsing
  const handleParseOrder = async () => {
    setInputError(null);
    setIsProcessing(true);

    try {
      if (activeTab === 'TEXT') {
        if (!manualText.trim()) {
          setInputError('Please paste or enter order text before parsing.');
          setIsProcessing(false);
          return;
        }
        const result = parseOrderText(manualText, 'TEXT');
        setParsedResult(result);
      } else {
        // PDF Tab
        if (!selectedFile) {
          setInputError('Please upload or select a PDF document first.');
          setIsProcessing(false);
          return;
        }

        const result = await extractAndParsePdf(selectedFile, selectedFile.name, {
          forceOcr,
          onProgress: (prog) => setPdfProgress(prog),
        });
        setParsedResult(result);
      }
    } catch (err: any) {
      console.error('Order parsing failed:', err);
      setInputError(`Failed to parse order: ${err?.message || 'Unknown error occurred.'}`);
    } finally {
      setIsProcessing(false);
      setPdfProgress(null);
    }
  };

  // Header Field Update Handlers
  const handleUpdateHeaderField = (field: keyof ParsedOrderResult['order'], value: string) => {
    if (!parsedResult) return;
    setParsedResult({
      ...parsedResult,
      order: {
        ...parsedResult.order,
        [field]: value,
      },
    });
  };

  // Line Item Update Handlers
  const handleUpdateItem = (itemId: string, updates: Partial<ParsedItem>) => {
    if (!parsedResult) return;

    setParsedResult({
      ...parsedResult,
      items: parsedResult.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };

          // If SKU was updated, re-evaluate against catalog and check confidence
          if (updates.sku !== undefined) {
            const catProd = findProductInCatalog(updated.sku);
            if (catProd) {
              updated.matchedCatalogSku = catProd.sku;
              // Clear catalog warning if present
              updated.warnings = updated.warnings.filter(
                (w) => !w.toLowerCase().includes('not found in product catalog')
              );
              if (updated.warnings.length === 0) {
                updated.confidence = 'HIGH';
              }
              if (!updated.description || updated.description === item.sku) {
                updated.description = catProd.type ? `${catProd.type} (${catProd.sku})` : catProd.sku;
              }
            } else {
              updated.matchedCatalogSku = undefined;
              if (!updated.warnings.some((w) => w.includes('not found in product catalog'))) {
                updated.warnings.push(`SKU '${updated.sku}' not found in product catalog`);
              }
              if (updated.confidence === 'HIGH') {
                updated.confidence = 'MEDIUM';
              }
            }
          }

          // If quantity or unit price was updated, recalculate total price if present
          if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
            if (updated.unitPrice !== null) {
              updated.totalPrice = Number((updated.unitPrice * updated.quantity).toFixed(2));
            }
          }

          // Quantity validation
          if (updated.quantity <= 0) {
            if (!updated.warnings.some((w) => w.includes('Quantity'))) {
              updated.warnings.push('Quantity must be at least 1');
            }
            updated.confidence = 'LOW';
          } else {
            updated.warnings = updated.warnings.filter((w) => !w.includes('Quantity'));
            if (updated.warnings.length === 0 && updated.matchedCatalogSku) {
              updated.confidence = 'HIGH';
            }
          }

          return updated;
        }
        return item;
      }),
    });
  };

  const handleAddNewItem = () => {
    if (!parsedResult) return;
    const newItem: ParsedItem = {
      id: `ITEM_MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sku: '',
      description: '',
      quantity: 1,
      unitPrice: null,
      totalPrice: null,
      attributes: {},
      confidence: 'MEDIUM',
      warnings: ['New manual line item - enter SKU'],
    };

    setParsedResult({
      ...parsedResult,
      items: [...parsedResult.items, newItem],
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!parsedResult) return;
    setParsedResult({
      ...parsedResult,
      items: parsedResult.items.filter((item) => item.id !== itemId),
    });
  };

  // Confirm Order and send to Freight Calculator
  const handleConfirmOrder = () => {
    if (!parsedResult || parsedResult.items.length === 0) return;

    // Convert parsed structure into Freight Calculator's expected format
    const converted = convertOrderToFreightCalculator(parsedResult, config);
    onConfirmOrder(converted, parsedResult);
    onClose();
  };

  // Detected Postcode from delivery address
  const detectedPostcode = parsedResult
    ? extractPostcodeFromAddress(parsedResult.order.deliveryAddress)
    : null;

  // Review Summary statistics
  const totalUnits = parsedResult
    ? parsedResult.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : 0;

  const totalCalculatedValue = parsedResult
    ? parsedResult.items.reduce((sum, item) => {
        if (item.totalPrice !== null) return sum + item.totalPrice;
        if (item.unitPrice !== null) return sum + item.unitPrice * item.quantity;
        return sum;
      }, 0)
    : 0;

  const itemsNeedingReviewCount = parsedResult
    ? parsedResult.items.filter((item) => item.confidence === 'LOW' || item.warnings.length > 0).length
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '1150px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--accent-blue-bg)',
                border: '1px solid var(--accent-blue-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <FileUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                {parsedResult ? 'Review & Confirm Extracted Order' : 'Order Import & Document Parser'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {parsedResult
                  ? 'Inspect, edit, and confirm order lines before sending to the Freight Calculator'
                  : 'Import digital or scanned PDF orders, invoices, or paste raw text messages'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Close window">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px', position: 'relative' }}>
          {inputError && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} />
              <span>{inputError}</span>
            </div>
          )}

          {/* VIEW 1: Input & Upload Screen */}
          {!parsedResult ? (
            <div>
              {/* Tabs for Input Method */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-card)',
                  paddingBottom: '12px',
                  marginBottom: '18px',
                }}
              >
                <button
                  className={`scenario-btn ${activeTab === 'TEXT' ? 'active' : ''}`}
                  onClick={() => setActiveTab('TEXT')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FileText size={16} />
                  <span>Manual Text Input (Email / Chat / Copy-Paste)</span>
                </button>
                <button
                  className={`scenario-btn ${activeTab === 'PDF' ? 'active' : ''}`}
                  onClick={() => setActiveTab('PDF')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <UploadCloud size={16} />
                  <span>PDF Document Upload (Digital / Scanned OCR)</span>
                </button>
              </div>

              {/* TAB 1: Manual Text Input */}
              {activeTab === 'TEXT' && (
                <div>
                  {/* Preset quick loader bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <label
                      htmlFor="order-text-area"
                      style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                    >
                      Paste Order Text:
                    </label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Load Demo Preset:</span>
                      <button
                        type="button"
                        onClick={() => setManualText(SAMPLE_SYDNEY_BBQS)}
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                        }}
                      >
                        Sydney BBQs (Specs)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualText(SAMPLE_INVOICE_TABLE)}
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                        }}
                      >
                        Invoice with Prices
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualText(SAMPLE_REVIEW_EDGE_CASE)}
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                        }}
                      >
                        Needs Review Sample
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="order-text-area"
                    className="text-input mono"
                    style={{
                      width: '100%',
                      minHeight: '230px',
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      padding: '14px',
                      borderRadius: '8px',
                      resize: 'vertical',
                    }}
                    placeholder={`e.g.\nSYDNEY BBQS\n18/79 Williamson Rd\nINGLEBURN 2565\n\nO/No: Erik\n\n2 X OM2017-1B\n2 X OM2017-8JD\n60 X SBFL\n36 X JETGAS`}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                  />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>
                      Supports formats like <code>2 X SKU</code>, <code>SKU x 2</code>, tab-delimited tables, and key-values.
                    </span>
                    <span>{manualText.split('\n').filter(Boolean).length} lines</span>
                  </div>
                </div>
              )}

              {/* TAB 2: PDF Upload */}
              {activeTab === 'PDF' && (
                <div>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #94a3b8',
                      borderRadius: '12px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      background: selectedFile ? '#f0fdf4' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf,.pdf"
                      style={{ display: 'none' }}
                    />

                    {selectedFile ? (
                      <div>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto',
                          }}
                        >
                          <CheckCircle2 size={26} />
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#166534' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px' }}>
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready to parse
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          style={{
                            marginTop: '10px',
                            fontSize: '0.75rem',
                            color: '#b91c1c',
                            textDecoration: 'underline',
                          }}
                        >
                          Choose a different file
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto',
                          }}
                        >
                          <UploadCloud size={28} />
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                          Drag & drop your Purchase Order PDF here
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          or click to browse your local computer
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '12px' }}>
                          Supports digitally generated PDFs and scanned/image documents via OCR fallback.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PDF OCR Options */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '16px',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="force-ocr-checkbox"
                      checked={forceOcr}
                      onChange={(e) => setForceOcr(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="force-ocr-checkbox"
                      style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <strong>Force OCR processing:</strong> Check this if the PDF is a poor-quality scanned image or has corrupted embedded fonts.
                    </label>
                  </div>

                  {/* OCR Progress Indicator */}
                  {pdfProgress && (
                    <div style={{ marginTop: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                          color: 'var(--accent-blue)',
                          marginBottom: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <span>{pdfProgress.status}</span>
                        <span>{pdfProgress.percent}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pdfProgress.percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Review & Confirmation Screen */
            <div>
              {/* Header Details Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                    Detected Order Header Information
                  </span>
                  {detectedPostcode ? (
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} /> Postcode {detectedPostcode} detected
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      No postcode detected in address
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {/* Customer Name */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Customer / Company
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      style={{ padding: '6px 10px', fontSize: '0.84rem', marginTop: '2px' }}
                      value={parsedResult.order.customer}
                      onChange={(e) => handleUpdateHeaderField('customer', e.target.value)}
                      placeholder="e.g. Sydney BBQs"
                    />
                  </div>

                  {/* Order Number / PO */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Order / PO Number
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      style={{ padding: '6px 10px', fontSize: '0.84rem', marginTop: '2px' }}
                      value={parsedResult.order.orderNumber}
                      onChange={(e) => handleUpdateHeaderField('orderNumber', e.target.value)}
                      placeholder="e.g. Erik, PO-10293"
                    />
                  </div>

                  {/* Order Date */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Order Date
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      style={{ padding: '6px 10px', fontSize: '0.84rem', marginTop: '2px' }}
                      value={parsedResult.order.orderDate}
                      onChange={(e) => handleUpdateHeaderField('orderDate', e.target.value)}
                      placeholder="e.g. 03/10/2026"
                    />
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Contact / Reference
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      style={{ padding: '6px 10px', fontSize: '0.84rem', marginTop: '2px' }}
                      value={parsedResult.order.contact}
                      onChange={(e) => handleUpdateHeaderField('contact', e.target.value)}
                      placeholder="e.g. Erik"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Delivery Address (Included postcode will auto-set Freight Calculator destination):
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    style={{ padding: '6px 10px', fontSize: '0.84rem', marginTop: '2px' }}
                    value={parsedResult.order.deliveryAddress}
                    onChange={(e) => handleUpdateHeaderField('deliveryAddress', e.target.value)}
                    placeholder="e.g. 18/79 Williamson Rd INGLEBURN 2565"
                  />
                </div>
              </div>

              {/* Items Needing Review Alert Banner */}
              {itemsNeedingReviewCount > 0 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, color: '#d97706' }} />
                  <div>
                    <strong>{itemsNeedingReviewCount} item(s) flagged for review:</strong> Please verify the highlighted lines below (unrecognized SKU, ambiguous quantity, or OCR misread) before confirming.
                  </div>
                </div>
              )}

              {/* Items Table Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                    Order Line Items ({parsedResult.items.length})
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    &bull; {totalUnits} total units
                    {totalCalculatedValue > 0 && ` &bull; Est. Value: $${totalCalculatedValue.toFixed(2)} ex GST`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                    onClick={() => setShowRawSource(!showRawSource)}
                  >
                    {showRawSource ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showRawSource ? 'Hide Raw Source' : 'View Raw Source Text'}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#0284c7' }}
                    onClick={handleAddNewItem}
                  >
                    <Plus size={14} />
                    Add Missing Line
                  </button>
                </div>
              </div>

              {/* Raw Source Collapsible Drawer */}
              {showRawSource && (
                <div
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '0.78rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                    }}
                  >
                    <span>ORIGINAL EXTRACTED DOCUMENT TEXT ({parsedResult.sourceType}):</span>
                    <span>{parsedResult.ocrUsed ? 'OCR Engine Used' : 'Digital Text Extraction'}</span>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                    {parsedResult.rawSourceText}
                  </pre>
                </div>
              )}

              {/* Editable Review Table */}
              <div className="order-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="order-table">
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>SKU / Product Code</th>
                      <th>Description</th>
                      <th style={{ width: '80px' }}>Qty</th>
                      <th style={{ width: '100px' }}>Unit Price ($)</th>
                      <th style={{ width: '100px' }}>Total ($)</th>
                      <th style={{ width: '190px' }}>Confidence & Status</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.items.map((item) => {
                      const isNeedsReview = item.confidence === 'LOW' || item.warnings.length > 0;
                      const catalogProd = item.matchedCatalogSku
                        ? findProductInCatalog(item.matchedCatalogSku)
                        : null;

                      return (
                        <tr
                          key={item.id}
                          className={isNeedsReview ? 'line-error-row' : ''}
                          style={{
                            background: isNeedsReview ? '#fffbeb' : undefined,
                          }}
                        >
                          {/* SKU Input */}
                          <td style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="text-input mono"
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                borderColor: isNeedsReview ? '#f59e0b' : undefined,
                              }}
                              value={item.sku}
                              onChange={(e) => handleUpdateItem(item.id, { sku: e.target.value })}
                              onFocus={() => setActiveSkuDropdown(item.id)}
                              onBlur={() => setTimeout(() => setActiveSkuDropdown(null), 200)}
                            />

                            {/* Catalog Autocomplete Suggestions */}
                            {activeSkuDropdown === item.id && (
                              <div
                                className="autocomplete-dropdown"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  width: '260px',
                                  zIndex: 50,
                                  maxHeight: '160px',
                                  overflowY: 'auto',
                                }}
                              >
                                {allCatalogProducts
                                  .filter(
                                    (p) =>
                                      !item.sku ||
                                      p.sku.toLowerCase().includes(item.sku.toLowerCase())
                                  )
                                  .slice(0, 8)
                                  .map((p) => (
                                    <div
                                      key={p.id}
                                      className="autocomplete-item"
                                      onMouseDown={() => {
                                        handleUpdateItem(item.id, {
                                          sku: p.sku,
                                          description: p.type ? `${p.type} (${p.sku})` : p.sku,
                                        });
                                      }}
                                    >
                                      <span className="sku-text">{p.sku}</span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                        {p.type || ''}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </td>

                          {/* Description Input */}
                          <td>
                            <input
                              type="text"
                              className="text-input"
                              style={{ padding: '5px 8px', fontSize: '0.82rem' }}
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            />
                            {catalogProd && (
                              <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>
                                Catalog: {catalogProd.lengthMm}×{catalogProd.widthMm}×{catalogProd.heightMm} mm &bull; {catalogProd.weightKg} kg
                              </div>
                            )}
                          </td>

                          {/* Quantity Input */}
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="text-input mono"
                              style={{
                                padding: '5px 6px',
                                width: '65px',
                                fontSize: '0.84rem',
                                borderColor: item.quantity <= 0 ? '#ef4444' : undefined,
                              }}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  quantity: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </td>

                          {/* Unit Price */}
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="text-input mono"
                              style={{ padding: '5px 6px', width: '85px', fontSize: '0.82rem' }}
                              value={item.unitPrice !== null ? item.unitPrice : ''}
                              placeholder="-"
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  unitPrice: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                            />
                          </td>

                          {/* Total Price */}
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="text-input mono"
                              style={{ padding: '5px 6px', width: '85px', fontSize: '0.82rem' }}
                              value={item.totalPrice !== null ? item.totalPrice : ''}
                              placeholder="-"
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  totalPrice: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                            />
                          </td>

                          {/* Confidence / Status */}
                          <td>
                            {item.matchedCatalogSku && item.confidence === 'HIGH' && item.warnings.length === 0 ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Check size={12} /> Verified SKU
                              </span>
                            ) : (
                              <div>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <AlertTriangle size={12} /> Needs Review
                                </span>
                                {item.warnings.map((w, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontSize: '0.7rem',
                                      color: '#b45309',
                                      marginTop: '2px',
                                    }}
                                  >
                                    &bull; {w}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Delete Action */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn-remove"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete line"
                            >
                              <Trash2 size={15} />
                            </button>
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

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {!parsedResult ? (
            <>
              <button className="btn-secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleParseOrder}
                disabled={isProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isProcessing ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" />
                    Parsing Document...
                  </>
                ) : (
                  <>
                    <PackageCheck size={16} />
                    Parse Order
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-secondary"
                onClick={() => setParsedResult(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                Re-parse / Change Input
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmOrder}
                  disabled={parsedResult.items.length === 0}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    borderColor: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Confirm Order & Send to Freight Calculator
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
