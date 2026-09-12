import React from 'react';
import { PlayCircle, RotateCcw } from 'lucide-react';
import type { OrderLine, DeliveryZone, Product } from '../types';
import { buildOrderLine } from '../services/productCalculator';
import { DEFAULT_CONFIG } from '../rules/defaultConfig';
import productsData from '../data/products.json';

const allProducts = productsData as Product[];

// Helper to find sample products
const standardProduct =
  allProducts.find((p) => p.sku === 'OMTGC') ||
  allProducts.find((p) => p.isPhysicalDataComplete && p.weightKg && p.weightKg < 1) ||
  allProducts[0];

const bulkyProduct =
  allProducts.find((p) => p.sku === 'OFW1881AT') ||
  allProducts.find((p) => p.type === 'Wood Carriers' && p.isPhysicalDataComplete) ||
  allProducts[1];

interface TestScenariosProps {
  onLoadScenario: (
    scenarioId: string,
    postcode: string,
    zoneOverride: DeliveryZone | null,
    orderValueExGst: number,
    lines: OrderLine[],
    forcePallet?: boolean
  ) => void;
  onClearOrder: () => void;
  activeScenario: string | null;
}

export const TestScenarios: React.FC<TestScenariosProps> = ({
  onLoadScenario,
  onClearOrder,
  activeScenario,
}) => {
  const scenarios = [
    {
      id: 'TEST_1',
      title: 'Test 1: Metro < $700',
      badge: 'Expected: $35',
      desc: 'Metro standard order ($500 ex GST)',
      run: () => {
        const line = buildOrderLine(standardProduct, 4, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_1', '3000', 'METRO', 500, [line], false);
      },
    },
    {
      id: 'TEST_2',
      title: 'Test 2: Metro $700+',
      badge: 'Expected: FREE',
      desc: 'Metro standard order ($800 ex GST)',
      run: () => {
        const line = buildOrderLine(standardProduct, 8, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_2', '3000', 'METRO', 800, [line], false);
      },
    },
    {
      id: 'TEST_3',
      title: 'Test 3: Metro + 1 Bulky',
      badge: 'Expected: $30',
      desc: '$800 Metro order with 1 bulky item',
      run: () => {
        const lineStd = buildOrderLine(standardProduct, 6, DEFAULT_CONFIG, false);
        const lineBulky = buildOrderLine(bulkyProduct, 1, DEFAULT_CONFIG, true);
        onLoadScenario('TEST_3', '3000', 'METRO', 800, [lineStd, lineBulky], false);
      },
    },
    {
      id: 'TEST_4',
      title: 'Test 4: Metro + 2 Bulky',
      badge: 'Expected: $60',
      desc: '$800 Metro order with 2 bulky items',
      run: () => {
        const lineStd = buildOrderLine(standardProduct, 6, DEFAULT_CONFIG, false);
        const lineBulky = buildOrderLine(bulkyProduct, 2, DEFAULT_CONFIG, true);
        onLoadScenario('TEST_4', '3000', 'METRO', 800, [lineStd, lineBulky], false);
      },
    },
    {
      id: 'TEST_5',
      title: 'Test 5: Major Reg. Std',
      badge: 'Expected: $75',
      desc: 'Newcastle / Geelong order ($500 ex GST)',
      run: () => {
        const line = buildOrderLine(standardProduct, 5, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_5', '2300', 'MAJOR_REGIONAL', 500, [line], false);
      },
    },
    {
      id: 'TEST_6',
      title: 'Test 6: Other Reg. Std',
      badge: 'Expected: $120',
      desc: 'Armidale / Country order ($500 ex GST)',
      run: () => {
        const line = buildOrderLine(standardProduct, 5, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_6', '2350', 'OTHER_REGIONAL', 500, [line], false);
      },
    },
    {
      id: 'TEST_7',
      title: 'Test 7: Metro Pallet',
      badge: 'Expected: $150',
      desc: 'Palletised order to Metro (waives bulky fee)',
      run: () => {
        const lineStd = buildOrderLine(standardProduct, 10, DEFAULT_CONFIG, false);
        const lineBulky = buildOrderLine(bulkyProduct, 2, DEFAULT_CONFIG, true);
        onLoadScenario('TEST_7', '3000', 'METRO', 800, [lineStd, lineBulky], true);
      },
    },
    {
      id: 'TEST_8',
      title: 'Test 8: Major Reg. Pallet',
      badge: 'Expected: $250',
      desc: 'Palletised order to Major Regional centre',
      run: () => {
        const lineStd = buildOrderLine(standardProduct, 15, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_8', '2300', 'MAJOR_REGIONAL', 1200, [lineStd], true);
      },
    },
    {
      id: 'TEST_9',
      title: 'Test 9: Other Reg. Pallet',
      badge: 'Expected: $350',
      desc: 'Palletised order to Other Regional location',
      run: () => {
        const lineStd = buildOrderLine(standardProduct, 15, DEFAULT_CONFIG, false);
        onLoadScenario('TEST_9', '2350', 'OTHER_REGIONAL', 1200, [lineStd], true);
      },
    },
    {
      id: 'TEST_10',
      title: 'Test 10: 3+ Bulky Items',
      badge: 'Warehouse Review',
      desc: '3+ bulky items triggering review alert',
      run: () => {
        const lineBulky = buildOrderLine(bulkyProduct, 3, DEFAULT_CONFIG, true);
        onLoadScenario('TEST_10', '3000', 'METRO', 800, [lineBulky], false);
      },
    },
  ];

  return (
    <div className="scenarios-strip">
      <div className="scenarios-header">
        <div className="scenarios-title">
          <PlayCircle size={16} />
          Predefined Demo Scenarios (Policy Verification)
        </div>
        <button
          className="btn-secondary"
          onClick={onClearOrder}
          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
          title="Reset order lines and values"
        >
          <RotateCcw size={13} />
          Clear Order
        </button>
      </div>

      <div className="scenarios-grid">
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              className={`scenario-pill ${isActive ? 'active' : ''}`}
              onClick={sc.run}
              title={sc.desc}
            >
              <span>{sc.title}</span>
              <span className="scenario-badge">{sc.badge}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
