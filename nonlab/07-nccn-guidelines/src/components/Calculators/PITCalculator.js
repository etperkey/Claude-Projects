import { useState } from 'react';
import './Calculators.css';

const PIT_FACTORS = [
  { id: 'age', label: 'Age > 60 years', shortLabel: 'Age' },
  { id: 'ecog', label: 'ECOG performance status ≥ 2', shortLabel: 'ECOG' },
  { id: 'ldh', label: 'LDH > upper limit of normal', shortLabel: 'LDH' },
  { id: 'bm', label: 'Bone marrow involvement', shortLabel: 'BM' },
];

const PIT_RISK = [
  { range: [0, 0], group: 'Group 1 / Low', color: '#16a34a', os5yr: '~62%' },
  { range: [1, 1], group: 'Group 2 / Low-Int', color: '#65a30d', os5yr: '~53%' },
  { range: [2, 2], group: 'Group 3 / High-Int', color: '#ca8a04', os5yr: '~33%' },
  { range: [3, 4], group: 'Group 4 / High', color: '#dc2626', os5yr: '~18%' },
];

function getRiskGroup(score) {
  return PIT_RISK.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function PITCalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = PIT_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>PIT Calculator</h3>
        <span className="calc-subtitle">Prognostic Index for T-Cell Lymphoma (PTCL-NOS)</span>
      </div>

      <div className="calc-factors">
        {PIT_FACTORS.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!factors[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="calc-results">
        <div className="calc-score">
          <span className="calc-score-value">{score}</span>
          <span className="calc-score-label">/ 4 points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">Risk Group:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">5-yr OS:</span>
          <span className="calc-risk-stat">{risk.os5yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#92400e', marginTop: '8px', background: '#fef3c7', padding: '6px 8px', borderRadius: '4px' }}>
        Validated for PTCL-NOS and AITL. Does not apply to ALCL (ALK+ or ALK-), which has distinct biology and prognosis.
      </div>

      <div className="calc-reference">
        Gallamini A et al. Blood. 2004;103(7):2474-2479. PMID: 14645001
      </div>
    </div>
  );
}

export default PITCalculator;
