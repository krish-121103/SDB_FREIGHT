import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { TestScenarios } from './components/TestScenarios';
import { DeliveryDetails } from './components/DeliveryDetails';
import { OrderBuilder } from './components/OrderBuilder';
import { FreightResultCard } from './components/FreightResult';
import { AdminConfigModal } from './components/AdminConfigModal';
import { DataQualityModal } from './components/DataQualityModal';
import { OrderImportModal } from './components/OrderParser/OrderImportModal';
import { WorkflowStepper } from './components/Workflow/WorkflowStepper';
import { Step1Destination } from './components/Workflow/Step1Destination';
import { Step2Items } from './components/Workflow/Step2Items';
import { Step3Packaging } from './components/Workflow/Step3Packaging';
import { Step4Quote } from './components/Workflow/Step4Quote';
import { SessionQuotesLog } from './components/Workflow/SessionQuotesLog';
import { QuoteDetailsModal } from './components/Workflow/QuoteDetailsModal';
import type { OrderLine, DeliveryZone, AppConfig, Product } from './types';
import type { ConvertedFreightOrder } from './services/orderParser/orderToFreightAdapter';
import type { ParsedOrderResult } from './services/orderParser/types';
import { DEFAULT_CONFIG } from './rules/defaultConfig';
import { determineDeliveryZone } from './services/zoneCalculator';
import { calculateFreight } from './services/freightCalculator';
import { buildOrderLine } from './services/productCalculator';
import {
  saveQuoteToSession,
  getAllSessionQuotes,
  deleteSessionQuote,
  clearAllSessionQuotes,
  type StoredSessionQuote,
} from './services/sessionStore';
import productsData from './data/products.json';
import dataQualityReportRaw from './data/dataQualityReport.json';
import { FileUp, ExternalLink, X } from 'lucide-react';

const allProducts = productsData as Product[];

export interface ImportedOrderInfo {
  customer: string;
  orderNumber: string;
  deliveryAddress: string;
  contact: string;
  rawResult: ParsedOrderResult;
}

export function App() {
  // Config state
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Workflow Navigation & Mode State
  const [workflowStep, setWorkflowStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'workflow' | 'session_log'>('workflow');
  const [viewMode, setViewMode] = useState<'stepper' | 'dashboard'>('stepper');

  // Order Header / Customer details
  const [customerName, setCustomerName] = useState('Sydney BBQs & Fireplaces');
  const [orderNumber, setOrderNumber] = useState('PO-94182');
  const [orderNotes, setOrderNotes] = useState('Standard customer delivery');

  // Delivery & Value state
  const [postcode, setPostcode] = useState('3000');
  const [manualZoneOverride, setManualZoneOverride] = useState<DeliveryZone | null>(null);
  const [orderValueExGst, setOrderValueExGst] = useState<number>(500);

  // Active scenario tracker
  const [activeScenario, setActiveScenario] = useState<string | null>('TEST_1');

  // Modals state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState(false);
  const [isOrderImportOpen, setIsOrderImportOpen] = useState(false);
  const [inspectingQuote, setInspectingQuote] = useState<StoredSessionQuote | null>(null);

  // Imported order tracker
  const [importedOrderInfo, setImportedOrderInfo] = useState<ImportedOrderInfo | null>(null);

  // In-Memory JavaScript Session Quotes Tracker
  // Stored strictly in JS memory; automatically resets on browser refresh
  const [sessionQuotes, setSessionQuotes] = useState<StoredSessionQuote[]>(() => getAllSessionQuotes());

  // Initial demo order lines: 4 units of standard product OMTGC
  const [orderLines, setOrderLines] = useState<OrderLine[]>(() => {
    const initialProduct = allProducts.find((p) => p.sku === 'OMTGC') || allProducts[0];
    return [buildOrderLine(initialProduct, 4, DEFAULT_CONFIG, false)];
  });

  // 1. Resolve Delivery Zone
  const zoneResult = useMemo(() => {
    return determineDeliveryZone(postcode, manualZoneOverride);
  }, [postcode, manualZoneOverride]);

  // 2. Compute Freight Result via Pure Engine
  const freightResult = useMemo(() => {
    return calculateFreight(
      orderLines,
      orderValueExGst,
      zoneResult.detectedZone,
      manualZoneOverride !== null,
      config
    );
  }, [orderLines, orderValueExGst, zoneResult.detectedZone, manualZoneOverride, config]);

  // Step unlock validations
  const isStep2Unlocked = postcode.trim().length >= 3;
  const isStep3Unlocked = isStep2Unlocked && orderLines.length > 0;
  const isStep4Unlocked = isStep3Unlocked;

  // Order Line Handlers
  const handleAddLine = (line: OrderLine) => {
    setActiveScenario(null);
    setOrderLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.product.id === line.product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const currentLine = updated[existingIdx];
        const newQty = currentLine.quantity + line.quantity;
        updated[existingIdx] = buildOrderLine(
          currentLine.product,
          newQty,
          config,
          currentLine.isBulkyDesignated
        );
        return updated;
      }
      return [line, ...prev];
    });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setActiveScenario(null);
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          return buildOrderLine(line.product, qty, config, line.isBulkyDesignated);
        }
        return line;
      })
    );
  };

  const handleToggleBulky = (id: string) => {
    setActiveScenario(null);
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const newBulky = !line.isBulkyDesignated;
          return buildOrderLine(line.product, line.quantity, config, newBulky);
        }
        return line;
      })
    );
  };

  const handleRemoveLine = (id: string) => {
    setActiveScenario(null);
    setOrderLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleClearOrder = () => {
    setActiveScenario(null);
    setImportedOrderInfo(null);
    setOrderLines([]);
  };

  // Scenario Loader
  const handleLoadScenario = (
    scenarioId: string,
    newPostcode: string,
    zoneOverride: DeliveryZone | null,
    newOrderValue: number,
    lines: OrderLine[],
    forcePallet = false
  ) => {
    setActiveScenario(scenarioId);
    setImportedOrderInfo(null);
    setPostcode(newPostcode);
    setManualZoneOverride(zoneOverride);
    setOrderValueExGst(newOrderValue);
    setOrderLines(lines);
    setConfig((prev) => ({ ...prev, forcePalletDelivery: forcePallet }));
  };

  // Handler when Order is confirmed from OrderImportModal
  const handleConfirmImportedOrder = (
    converted: ConvertedFreightOrder,
    rawResult: ParsedOrderResult
  ) => {
    setActiveScenario(null);
    setOrderLines(converted.orderLines);

    if (converted.detectedPostcode) {
      setPostcode(converted.detectedPostcode);
      setManualZoneOverride(null);
    }

    if (converted.calculatedOrderValueExGst !== null && converted.calculatedOrderValueExGst > 0) {
      setOrderValueExGst(converted.calculatedOrderValueExGst);
    }

    if (converted.customerSummary.customer) {
      setCustomerName(converted.customerSummary.customer);
    }

    if (converted.customerSummary.orderNumber) {
      setOrderNumber(converted.customerSummary.orderNumber);
    }

    setImportedOrderInfo({
      customer: converted.customerSummary.customer || 'Imported Customer',
      orderNumber: converted.customerSummary.orderNumber || 'N/A',
      deliveryAddress: converted.customerSummary.deliveryAddress || '',
      contact: converted.customerSummary.contact || '',
      rawResult,
    });

    // Advance to Step 2 so staff can review imported lines
    setWorkflowStep(2);
    setActiveTab('workflow');
  };

  // Save current quote to temporary JavaScript session storage
  const handleSaveQuoteToSession = () => {
    const saved = saveQuoteToSession(
      customerName,
      orderNumber,
      orderNotes,
      postcode,
      zoneResult.suburb,
      zoneResult.state,
      freightResult,
      orderLines
    );
    setSessionQuotes(getAllSessionQuotes());
    return saved;
  };

  // Delete quote from session storage
  const handleDeleteQuote = (id: string) => {
    const updated = deleteSessionQuote(id);
    setSessionQuotes(updated);
  };

  // Clear all session quotes
  const handleClearAllSessionQuotes = () => {
    clearAllSessionQuotes();
    setSessionQuotes([]);
  };

  // Reload quote back into workflow
  const handleReloadQuote = (quote: StoredSessionQuote) => {
    setCustomerName(quote.customerName);
    setOrderNumber(quote.orderNumber);
    setOrderNotes(quote.notes || '');
    setPostcode(quote.postcode);
    setManualZoneOverride(quote.isZoneOverridden ? quote.zone : null);
    setOrderValueExGst(quote.orderValueExGst);
    setOrderLines(quote.orderLines);
    setActiveTab('workflow');
    setWorkflowStep(4);
  };

  // Start a fresh order calculation
  const handleStartNewOrder = () => {
    setActiveScenario(null);
    setImportedOrderInfo(null);
    setCustomerName('');
    setOrderNumber(`PO-${Math.floor(10000 + Math.random() * 90000)}`);
    setOrderNotes('');
    setPostcode('3000');
    setManualZoneOverride(null);
    setOrderValueExGst(500);
    const initialProduct = allProducts.find((p) => p.sku === 'OMTGC') || allProducts[0];
    setOrderLines([buildOrderLine(initialProduct, 4, DEFAULT_CONFIG, false)]);
    setWorkflowStep(1);
    setActiveTab('workflow');
  };

  // Seed sample demo session quotes for instant test drive
  const handlePreloadDemoQuotes = () => {
    clearAllSessionQuotes();
    const p1 = allProducts.find((p) => p.sku === 'OMTGC') || allProducts[0];
    const p2 = allProducts.find((p) => p.sku === 'OFW1881AT') || allProducts[1];

    // Quote 1: Metro < $700 ($35)
    const lines1 = [buildOrderLine(p1, 4, DEFAULT_CONFIG, false)];
    const res1 = calculateFreight(lines1, 500, 'METRO', false, DEFAULT_CONFIG);
    saveQuoteToSession('Sydney Fireplace Specialists', 'PO-77102', 'Urgent showroom restock', '3000', 'Melbourne', 'VIC', res1, lines1);

    // Quote 2: Metro $700+ (FREE)
    const lines2 = [buildOrderLine(p1, 8, DEFAULT_CONFIG, false)];
    const res2 = calculateFreight(lines2, 850, 'METRO', false, DEFAULT_CONFIG);
    saveQuoteToSession('Bunnings Chatswood', 'PO-88219', 'Free freight threshold applied', '2000', 'Sydney', 'NSW', res2, lines2);

    // Quote 3: Newcastle Major Regional Pallet ($250)
    const lines3 = [buildOrderLine(p1, 15, DEFAULT_CONFIG, false), buildOrderLine(p2, 2, DEFAULT_CONFIG, true)];
    const res3 = calculateFreight(lines3, 1400, 'MAJOR_REGIONAL', false, { ...DEFAULT_CONFIG, forcePalletDelivery: true });
    saveQuoteToSession('Hunter Valley BBQs', 'PO-99120', 'Palletized consignment (bulky waived)', '2300', 'Newcastle', 'NSW', res3, lines3);

    setSessionQuotes(getAllSessionQuotes());
  };

  return (
    <div className="app-container">
      {/* Header with Navigation & Policy Banner */}
      <Header
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenDataQuality={() => setIsDataQualityOpen(true)}
        onOpenOrderImport={() => setIsOrderImportOpen(true)}
        dataQualityReport={dataQualityReportRaw}
      />

      {/* 1-Click Test Scenarios Bar */}
      <TestScenarios
        onLoadScenario={handleLoadScenario}
        onClearOrder={handleClearOrder}
        activeScenario={activeScenario}
      />

      {/* Active Imported Order Notice Banner */}
      {importedOrderInfo && (
        <div className="imported-order-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="imported-icon-badge">
              <FileUp size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0369a1' }}>
                Active Imported Order: {importedOrderInfo.orderNumber !== 'N/A' ? `PO #${importedOrderInfo.orderNumber} ` : ''}
                ({importedOrderInfo.customer})
              </div>
              <div style={{ fontSize: '0.76rem', color: '#0284c7' }}>
                {orderLines.length} line{orderLines.length !== 1 ? 's' : ''} loaded into Freight Calculator
                {importedOrderInfo.deliveryAddress ? ` \u2022 Destination: ${importedOrderInfo.deliveryAddress}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setIsOrderImportOpen(true)}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                background: '#ffffff',
                color: '#0369a1',
                borderColor: '#bae6fd',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ExternalLink size={12} />
              Inspect / Re-edit Order
            </button>
            <button
              onClick={() => setImportedOrderInfo(null)}
              title="Dismiss banner"
              style={{ color: '#0284c7', padding: '4px', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Workflow Stepper Header */}
      <WorkflowStepper
        currentStep={workflowStep}
        activeTab={activeTab}
        onSelectStep={(step) => {
          setActiveTab('workflow');
          setWorkflowStep(step);
        }}
        onSelectTab={(tab) => setActiveTab(tab)}
        sessionQuotesCount={sessionQuotes.length}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === 'stepper' ? 'dashboard' : 'stepper'))}
        isStep2Unlocked={isStep2Unlocked}
        isStep3Unlocked={isStep3Unlocked}
        isStep4Unlocked={isStep4Unlocked}
      />

      {/* Main Content Area */}
      {activeTab === 'session_log' ? (
        /* View 1: Temporary Session Quotes Board */
        <SessionQuotesLog
          quotes={sessionQuotes}
          onInspectQuote={(q) => setInspectingQuote(q)}
          onReloadQuote={handleReloadQuote}
          onDeleteQuote={handleDeleteQuote}
          onClearAll={handleClearAllSessionQuotes}
          onStartNewOrder={handleStartNewOrder}
          onPreloadDemoQuotes={handlePreloadDemoQuotes}
        />
      ) : viewMode === 'stepper' ? (
        /* View 2: Guided Step-by-Step Workflow Wizard */
        <div>
          {workflowStep === 1 && (
            <Step1Destination
              customerName={customerName}
              onCustomerNameChange={(val) => {
                setActiveScenario(null);
                setCustomerName(val);
              }}
              orderNumber={orderNumber}
              onOrderNumberChange={(val) => {
                setActiveScenario(null);
                setOrderNumber(val);
              }}
              orderNotes={orderNotes}
              onOrderNotesChange={(val) => {
                setActiveScenario(null);
                setOrderNotes(val);
              }}
              postcode={postcode}
              onPostcodeChange={(val) => {
                setActiveScenario(null);
                setPostcode(val);
              }}
              zoneResult={zoneResult}
              manualZoneOverride={manualZoneOverride}
              onManualZoneChange={(zone) => {
                setActiveScenario(null);
                setManualZoneOverride(zone);
              }}
              orderValueExGst={orderValueExGst}
              onOrderValueChange={(val) => {
                setActiveScenario(null);
                setOrderValueExGst(val);
              }}
              freeThresholdExGst={config.freeThresholdExGst}
              gstRate={config.gstRate}
              onNextStep={() => setWorkflowStep(2)}
              onOpenOrderImport={() => setIsOrderImportOpen(true)}
            />
          )}

          {workflowStep === 2 && (
            <Step2Items
              orderLines={orderLines}
              onAddLine={handleAddLine}
              onUpdateQuantity={handleUpdateQuantity}
              onToggleBulky={handleToggleBulky}
              onRemoveLine={handleRemoveLine}
              onOpenOrderImport={() => setIsOrderImportOpen(true)}
              config={config}
              destinationSummary={{
                postcode,
                zoneLabel: zoneResult.zoneLabel,
                orderValueExGst,
                customerName,
              }}
              onPrevStep={() => setWorkflowStep(1)}
              onNextStep={() => setWorkflowStep(3)}
            />
          )}

          {workflowStep === 3 && (
            <Step3Packaging
              result={freightResult}
              config={config}
              onUpdateConfig={(newConfig) => setConfig(newConfig)}
              onPrevStep={() => setWorkflowStep(2)}
              onNextStep={() => setWorkflowStep(4)}
            />
          )}

          {workflowStep === 4 && (
            <Step4Quote
              result={freightResult}
              config={config}
              orderLines={orderLines}
              customerName={customerName}
              orderNumber={orderNumber}
              orderNotes={orderNotes}
              postcode={postcode}
              suburb={zoneResult.suburb}
              state={zoneResult.state}
              onPrevStep={() => setWorkflowStep(3)}
              onSaveQuote={handleSaveQuoteToSession}
              onViewSessionLog={() => setActiveTab('session_log')}
              onStartNewOrder={handleStartNewOrder}
            />
          )}
        </div>
      ) : (
        /* View 3: Classic All-in-One Operations Dashboard */
        <div className="app-grid">
          <div className="left-column">
            <DeliveryDetails
              postcode={postcode}
              onPostcodeChange={(val) => {
                setActiveScenario(null);
                setPostcode(val);
              }}
              zoneResult={zoneResult}
              manualZoneOverride={manualZoneOverride}
              onManualZoneChange={(zone) => {
                setActiveScenario(null);
                setManualZoneOverride(zone);
              }}
              orderValueExGst={orderValueExGst}
              onOrderValueChange={(val) => {
                setActiveScenario(null);
                setOrderValueExGst(val);
              }}
              freeThresholdExGst={config.freeThresholdExGst}
              gstRate={config.gstRate}
            />

            <OrderBuilder
              orderLines={orderLines}
              onAddLine={handleAddLine}
              onUpdateQuantity={handleUpdateQuantity}
              onToggleBulky={handleToggleBulky}
              onRemoveLine={handleRemoveLine}
              onOpenOrderImport={() => setIsOrderImportOpen(true)}
              config={config}
            />
          </div>

          <div className="right-column">
            <FreightResultCard result={freightResult} config={config} />
          </div>
        </div>
      )}

      {/* Modals */}
      <QuoteDetailsModal
        quote={inspectingQuote}
        onClose={() => setInspectingQuote(null)}
        onReloadToWorkflow={handleReloadQuote}
      />

      <OrderImportModal
        isOpen={isOrderImportOpen}
        onClose={() => setIsOrderImportOpen(false)}
        onConfirmOrder={handleConfirmImportedOrder}
        config={config}
        initialParsedResult={importedOrderInfo?.rawResult}
      />

      <AdminConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => setConfig(newConfig)}
      />

      <DataQualityModal
        isOpen={isDataQualityOpen}
        onClose={() => setIsDataQualityOpen(false)}
        onAddProductToOrder={handleAddLine}
        config={config}
      />
    </div>
  );
}

export default App;
