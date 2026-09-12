import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { TestScenarios } from './components/TestScenarios';
import { DeliveryDetails } from './components/DeliveryDetails';
import { OrderBuilder } from './components/OrderBuilder';
import { FreightResultCard } from './components/FreightResult';
import { AdminConfigModal } from './components/AdminConfigModal';
import { DataQualityModal } from './components/DataQualityModal';
import type { OrderLine, DeliveryZone, AppConfig, Product } from './types';
import { DEFAULT_CONFIG } from './rules/defaultConfig';
import { determineDeliveryZone } from './services/zoneCalculator';
import { calculateFreight } from './services/freightCalculator';
import { buildOrderLine } from './services/productCalculator';
import productsData from './data/products.json';
import dataQualityReportRaw from './data/dataQualityReport.json';

const allProducts = productsData as Product[];

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
    setPostcode(newPostcode);
    setManualZoneOverride(zoneOverride);
    setOrderValueExGst(newOrderValue);
    setOrderLines(lines);
    setConfig((prev) => ({ ...prev, forcePalletDelivery: forcePallet }));
  };

  return (
    <div className="app-container">
      {/* Header with Navigation & Policy Banner */}
      <Header
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenDataQuality={() => setIsDataQualityOpen(true)}
        dataQualityReport={dataQualityReportRaw}
      />

      {/* 1-Click Test Scenarios Bar */}
      <TestScenarios
        onLoadScenario={handleLoadScenario}
        onClearOrder={handleClearOrder}
        activeScenario={activeScenario}
      />

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
            config={config}
          />
        </div>

        {/* Right Column: Hero Freight Card & Explainability Breakdown */}
        <div className="right-column">
          <FreightResultCard result={freightResult} config={config} />
        </div>
      </div>

      {/* Modals */}
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
