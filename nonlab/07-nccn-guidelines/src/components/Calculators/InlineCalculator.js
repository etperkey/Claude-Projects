import { useState } from 'react';
import IPICalculator from './IPICalculator';
import CNSIPICalculator from './CNSIPICalculator';
import DeauvilleCalculator from './DeauvilleCalculator';
import FLIPICalculator from './FLIPICalculator';
import MIPICalculator from './MIPICalculator';
import CLLIPICalculator from './CLLIPICalculator';
import IPSSWMCalculator from './IPSSWMCalculator';
import IELSGCalculator from './IELSGCalculator';
import PITCalculator from './PITCalculator';
import PINKCalculator from './PINKCalculator';
import TNMBCalculator from './TNMBCalculator';
import './InlineCalculator.css';

const CALCULATOR_MAP = {
  ipi: { label: 'IPI / R-IPI Calculator', component: IPICalculator },
  cnsipi: { label: 'CNS-IPI Calculator', component: CNSIPICalculator },
  deauville: { label: 'Deauville Score', component: DeauvilleCalculator },
  flipi: { label: 'FLIPI Calculator', component: FLIPICalculator },
  mipi: { label: 'MIPI Calculator', component: MIPICalculator },
  cllipi: { label: 'CLL-IPI Calculator', component: CLLIPICalculator },
  ipsswm: { label: 'IPSSWM Calculator', component: IPSSWMCalculator },
  ielsg: { label: 'IELSG Score', component: IELSGCalculator },
  pit: { label: 'PIT Calculator', component: PITCalculator },
  pink: { label: 'PINK / PINK-E Score', component: PINKCalculator },
  tnmb: { label: 'TNMB Staging (MF/SS)', component: TNMBCalculator },
};

// Maps node IDs to relevant calculators
const NODE_CALCULATORS = {
  // DLBCL nodes
  'wu-risk': ['ipi'],
  'dec-stage': ['ipi'],
  'dec-cns': ['cnsipi'],
  'resp-pet': ['deauville'],
  'dec-response': ['deauville'],
  // FL nodes
  'wu-risk-fl': ['flipi'],
  'dec-stage-fl': ['flipi'],
  'dec-treat-now': ['flipi'],
  'resp-eot-fl': ['deauville'],
  'dec-response-fl': ['deauville'],
  // MCL nodes
  'wu-risk-mcl': ['mipi'],
  'dec-age-fitness': ['mipi'],
  'resp-eot-mcl': ['deauville'],
  'dec-response-mcl': ['deauville'],
  // CLL nodes
  'wu-workup-cll': ['cllipi'],
  'dec-risk-cll': ['cllipi'],
  'dec-treat-cll': ['cllipi'],
  // Burkitt nodes
  'resp-eot-bl': ['deauville'],
  'dec-response-bl': ['deauville'],
  // PMBCL nodes
  'resp-eot-pmbcl': ['deauville'],
  'dec-pet-pmbcl': ['deauville'],
  // HL nodes
  'resp-eot-hl': ['deauville'],
  'dec-interim-pet': ['deauville'],
  'dec-eot-response-hl': ['deauville'],
  // HIV-BCL nodes (reuses IPI, Deauville)
  'wu-hiv-status': ['ipi'],
  'dec-hivbcl-subtype': ['ipi'],
  'resp-hiv-pet': ['deauville'],
  'dec-hiv-response': ['deauville'],
  // PTLD nodes (reuses Deauville)
  'resp-ptld-pet': ['deauville'],
  // HGBL nodes (reuses IPI, CNS-IPI, Deauville)
  'wu-hgbl-ipi': ['ipi', 'cnsipi'],
  'dec-hgbl-cns-involvement': ['cnsipi'],
  'resp-hgbl-pet': ['deauville'],
  'dec-hgbl-response': ['deauville'],
  // HT-DLBCL nodes (reuses Deauville)
  'resp-ht-pet': ['deauville'],
  'dec-ht-response': ['deauville'],
  // WM nodes (IPSSWM)
  'wu-ipsswm': ['ipsswm'],
  'dec-ipsswm-score': ['ipsswm'],
  'dec-treat-wm': ['ipsswm'],
  // PCNSL nodes (IELSG)
  'wu-ielsg-pcnsl': ['ielsg'],
  'dec-fitness-pcnsl': ['ielsg'],
  // PTCL nodes (PIT, Deauville)
  'wu-pit': ['pit'],
  'dec-cd30-status': ['pit'],
  'dec-fitness-ptcl': ['pit'],
  'dec-response-ptcl': ['deauville'],
  // ATLL nodes (Deauville)
  'dec-response-atll': ['deauville'],
  // ENKTL nodes (PINK)
  'wu-pink-score': ['pink'],
  'dec-stage-enktl': ['pink'],
  'dec-response-localized': ['deauville'],
  'dec-response-advanced': ['deauville'],
  // MF/SS nodes (TNMB)
  'wu-staging-mfss': ['tnmb'],
  'dec-tnmb-mfss': ['tnmb'],
  'dec-blood-mfss': ['tnmb'],
};

export function getCalculatorsForNode(nodeId) {
  return NODE_CALCULATORS[nodeId] || [];
}

function InlineCalculator({ calculatorIds }) {
  const [openCalc, setOpenCalc] = useState(null);

  if (!calculatorIds || calculatorIds.length === 0) return null;

  return (
    <div className="inline-calculators">
      <div className="inline-calc-header">
        <span className="inline-calc-icon">🧮</span>
        <span>Relevant calculators:</span>
      </div>
      <div className="inline-calc-buttons">
        {calculatorIds.map((id) => {
          const calc = CALCULATOR_MAP[id];
          if (!calc) return null;
          return (
            <button
              key={id}
              className={`inline-calc-toggle ${openCalc === id ? 'active' : ''}`}
              onClick={() => setOpenCalc(openCalc === id ? null : id)}
            >
              {calc.label}
              <span className="inline-calc-chevron">{openCalc === id ? '▲' : '▼'}</span>
            </button>
          );
        })}
      </div>
      {openCalc && CALCULATOR_MAP[openCalc] && (
        <div className="inline-calc-body">
          {(() => {
            const Comp = CALCULATOR_MAP[openCalc].component;
            return <Comp />;
          })()}
        </div>
      )}
    </div>
  );
}

export default InlineCalculator;
