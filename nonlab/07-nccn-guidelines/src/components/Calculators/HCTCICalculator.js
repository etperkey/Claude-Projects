import { useState } from 'react';
import './Calculators.css';

// HCT-CI (Sorror 2005, updated 2013) — Hematopoietic Cell Transplant-Comorbidity Index
// Weighted score of 17 comorbidities, predicts NRM and OS after allo-SCT
const COMORBIDITIES = [
  { id: 'arrhythmia', label: 'Arrhythmia (AFib, AFlutter, SSS, ventricular)', points: 1 },
  { id: 'cardiac', label: 'Cardiac disease (CAD, CHF, MI, EF <=50%)', points: 1 },
  { id: 'ibd', label: 'Inflammatory bowel disease (Crohn, UC)', points: 1 },
  { id: 'diabetes', label: 'Diabetes requiring insulin or oral agents', points: 1 },
  { id: 'cerebrovascular', label: 'Cerebrovascular disease (TIA or stroke)', points: 1 },
  { id: 'psych', label: 'Moderate to severe psychiatric illness', points: 1 },
  { id: 'hepatic-mild', label: 'Mild hepatic dysfunction (AST/ALT or bili slightly elevated)', points: 1 },
  { id: 'obesity', label: 'Obesity (BMI > 35)', points: 1 },
  { id: 'infection', label: 'Active infection requiring therapy at SCT', points: 1 },
  { id: 'rheum', label: 'Rheumatologic disease (SLE, RA, vasculitis, etc.)', points: 2 },
  { id: 'pud', label: 'Peptic ulcer disease requiring therapy', points: 2 },
  { id: 'renal-mod', label: 'Moderate/severe renal disease (Cr > 2 mg/dL, on dialysis, or prior transplant)', points: 2 },
  { id: 'pulm-mod', label: 'Moderate pulmonary disease (DLCO/FEV1 66-80%, or dyspnea on moderate exertion)', points: 2 },
  { id: 'cancer-prior', label: 'Prior solid tumor (treated, any time)', points: 3 },
  { id: 'heart-valve', label: 'Heart valve disease (except MVP)', points: 3 },
  { id: 'pulm-severe', label: 'Severe pulmonary disease (DLCO/FEV1 <=65%, dyspnea at rest, O2)', points: 3 },
  { id: 'hepatic-mod', label: 'Moderate/severe hepatic disease (cirrhosis, bili >1.5x ULN, AST/ALT >2.5x ULN)', points: 3 },
];

const RISK = [
  { range: [0, 0], group: 'Low Risk', color: '#16a34a', nrm: '14%', os2yr: '71%' },
  { range: [1, 2], group: 'Intermediate Risk', color: '#ca8a04', nrm: '21%', os2yr: '60%' },
  { range: [3, 99], group: 'High Risk', color: '#dc2626', nrm: '41%', os2yr: '34%' },
];

function getRiskGroup(score) {
  return RISK.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function HCTCICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = COMORBIDITIES.reduce(
    (sum, f) => sum + (factors[f.id] ? f.points : 0),
    0
  );
  const risk = getRiskGroup(score);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>HCT-CI Calculator</h3>
        <span className="calc-subtitle">
          Hematopoietic Cell Transplant-Comorbidity Index (Sorror 2005)
        </span>
      </div>

      <div className="calc-factors" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {COMORBIDITIES.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!factors[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">
              {f.label} <strong style={{ color: '#64748b' }}>({f.points} pt)</strong>
            </span>
          </label>
        ))}
      </div>

      <div className="calc-results">
        <div className="calc-score">
          <span className="calc-score-value">{score}</span>
          <span className="calc-score-label">total points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">HCT-CI Risk:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">2-yr NRM:</span>
          <span className="calc-risk-stat">~{risk.nrm}</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">2-yr OS:</span>
          <span className="calc-risk-stat">~{risk.os2yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
        HCT-CI predicts non-relapse mortality (NRM) and OS after allogeneic SCT. Applicable across conditioning intensities. Consider augmented HCT-CI (incorporates age and ferritin) for further refinement. Scores >=3 warrant careful transplant evaluation and may favor RIC conditioning over MAC.
      </div>

      <div className="calc-reference">
        Sorror ML, Maris MB, Storb R, et al. Hematopoietic cell transplantation (HCT)-specific comorbidity index: a new tool for risk assessment before allogeneic HCT. <em>Blood.</em> 2005;106(8):2912-2919. <a href="https://pubmed.ncbi.nlm.nih.gov/15994282/" target="_blank" rel="noopener noreferrer">PMID 15994282</a>
      </div>
    </div>
  );
}

export default HCTCICalculator;
