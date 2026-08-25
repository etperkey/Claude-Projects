import { useState } from 'react';
import './Calculators.css';

const FLIPI_FACTORS = [
  { id: 'age', label: 'Age ≥ 60 years', shortLabel: 'Age' },
  { id: 'stage', label: 'Ann Arbor stage III or IV', shortLabel: 'Stage' },
  { id: 'hgb', label: 'Hemoglobin < 12 g/dL', shortLabel: 'Hgb' },
  { id: 'nodal', label: '≥ 5 nodal areas involved', shortLabel: 'Nodal' },
  { id: 'ldh', label: 'Serum LDH > upper limit of normal', shortLabel: 'LDH' },
];

const FLIPI_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os5yr: '91%', os10yr: '71%' },
  { range: [2, 2], group: 'Intermediate', color: '#ca8a04', os5yr: '78%', os10yr: '51%' },
  { range: [3, 5], group: 'High', color: '#dc2626', os5yr: '53%', os10yr: '36%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function FLIPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = FLIPI_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score, FLIPI_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>FLIPI Calculator</h3>
        <span className="calc-subtitle">Follicular Lymphoma International Prognostic Index</span>
      </div>

      <div className="calc-factors">
        {FLIPI_FACTORS.map((f) => (
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
          <span className="calc-score-label">/ 5 points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">Risk Group:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">5-yr OS:</span>
          <span className="calc-risk-stat">~{risk.os5yr}</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">10-yr OS:</span>
          <span className="calc-risk-stat">~{risk.os10yr}</span>
        </div>
      </div>

      <div className="calc-reference">
        Solal-Céligny et al. Blood 2004. PMID: 15126323
      </div>
    </div>
  );
}

export default FLIPICalculator;
