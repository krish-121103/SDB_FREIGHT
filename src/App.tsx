import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { TestScenarios } from './components/TestScenarios';
import { DeliveryDetails } from './components/DeliveryDetails';
import { OrderBuilder } from './components/OrderBuilder';
import { FreightResultCard } from './components/FreightResult';
import { AdminConfigModal } from './components/AdminConfigModal';
import { DataQualityModal } from './components/DataQualityModal';
import { OrderImportModal } from './components/OrderParser/OrderImportModal';
import type { OrderLine, DeliveryZone, AppConfig, Product } from './types';
import type { ConvertedFreightOrder } from './services/orderParser/orderToFreightAdapter';
import type { ParsedOrderResult } from './services/orderParser/types';
import { DEFAULT_CONFIG } from './rules/defaultConfig';
import { determineDeliveryZone } from './services/zoneCalculator';
import { calculateFreight } from './services/freightCalculator';
import { buildOrderLine } from './services/productCalculator';
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

  // Imported order tracker
  const [importedOrderInfo, setImportedOrderInfo] = useState<ImportedOrderInfo | null>(null);

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

  // Order Line Handlers
  const handleAddLine = (line: OrderLine) => {
    setActiveScenario(null);
    setOrderLines((prev) => {
      // If SKU already in lines, increment quantity instead of adding duplicate line
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
      setManualZoneOverride(null); // auto-detect zone from newly imported postcode
    }

    if (converted.calculatedOrderValueExGst !== null && converted.calculatedOrderValueExGst > 0) {
      setOrderValueExGst(converted.calculatedOrderValueExGst);
    }

    setImportedOrderInfo({
      customer: converted.customerSummary.customer || 'Imported Customer',
      orderNumber: converted.customerSummary.orderNumber || 'N/A',
      deliveryAddress: converted.customerSummary.deliveryAddress || '',
      contact: converted.customerSummary.contact || '',
      rawResult,
    });
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

      {/* Main 2-Column Responsive Layout */}
      <div className="app-grid">
        {/* Left Column: Delivery Details + Order Builder */}
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

        {/* Right Column: Hero Freight Card & Explainability Breakdown */}
        <div className="right-column">
          <FreightResultCard result={freightResult} config={config} />
        </div>
      </div>

      {/* Modals */}
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
