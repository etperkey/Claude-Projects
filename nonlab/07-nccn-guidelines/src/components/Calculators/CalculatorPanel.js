import { useState } from 'react';
import IPICalculator from './IPICalculator';
import NCCNIPICalculator from './NCCNIPICalculator';
import CNSIPICalculator from './CNSIPICalculator';
import DeauvilleCalculator from './DeauvilleCalculator';
import FLIPICalculator from './FLIPICalculator';
import PRIMAPICalculator from './PRIMAPICalculator';
import MIPICalculator from './MIPICalculator';
import MIPIcCalculator from './MIPIcCalculator';
import CLLIPICalculator from './CLLIPICalculator';
import TNMBCalculator from './TNMBCalculator';
import IPSSWMCalculator from './IPSSWMCalculator';
import IELSGCalculator from './IELSGCalculator';
import PITCalculator from './PITCalculator';
import PINKCalculator from './PINKCalculator';
import HCTCICalculator from './HCTCICalculator';
import './CalculatorPanel.css';

const CALCULATORS = [
  { id: 'ipi', label: 'IPI / R-IPI', component: IPICalculator },
  { id: 'nccnipi', label: 'NCCN-IPI', component: NCCNIPICalculator },
  { id: 'flipi', label: 'FLIPI', component: FLIPICalculator },
  { id: 'primapi', label: 'PRIMA-PI', component: PRIMAPICalculator },
  { id: 'mipi', label: 'MIPI', component: MIPICalculator },
  { id: 'mipic', label: 'MIPI-c', component: MIPIcCalculator },
  { id: 'cllipi', label: 'CLL-IPI', component: CLLIPICalculator },
  { id: 'cnsipi', label: 'CNS-IPI', component: CNSIPICalculator },
  { id: 'ipsswm', label: 'IPSSWM', component: IPSSWMCalculator },
  { id: 'ielsg', label: 'IELSG', component: IELSGCalculator },
  { id: 'deauville', label: 'Deauville', component: DeauvilleCalculator },
  { id: 'tnmb', label: 'TNMB (MF/SS)', component: TNMBCalculator },
  { id: 'pit', label: 'PIT', component: PITCalculator },
  { id: 'pink', label: 'PINK / PINK-E', component: PINKCalculator },
  { id: 'hctci', label: 'HCT-CI', component: HCTCICalculator },
];

function CalculatorPanel({ isOpen, onClose }) {
  const [activeCalc, setActiveCalc] = useState('ipi');

  if (!isOpen) return null;

  const ActiveComponent = CALCULATORS.find((c) => c.id === activeCalc)?.component;

  return (
    <div className="calc-panel-overlay" onClick={onClose}>
      <div className="calc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="calc-panel-header">
          <h2>Clinical Calculators</h2>
          <button className="calc-panel-close" onClick={onClose}>&times;</button>
        </div>
        <div className="calc-panel-tabs">
          {CALCULATORS.map((c) => (
            <button
              key={c.id}
              className={`calc-panel-tab ${c.id === activeCalc ? 'active' : ''}`}
              onClick={() => setActiveCalc(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="calc-panel-body">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}

export default CalculatorPanel;
