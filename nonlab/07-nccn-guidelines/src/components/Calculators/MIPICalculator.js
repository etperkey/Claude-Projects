import { useState } from 'react';
import './Calculators.css';

const MIPI_FACTORS = [
  { id: 'age', label: 'Age > 60 years', shortLabel: 'Age' },
  { id: 'ecog', label: 'ECOG performance status ≥ 2', shortLabel: 'ECOG' },
  { id: 'ldh', label: 'LDH > upper limit of normal', shortLabel: 'LDH' },
  { id: 'wbc', label: 'WBC > 10,000/µL', shortLabel: 'WBC' },
];

// Binary approximation — the published sMIPI uses 3 risk groups from a weighted formula
const MIPI_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', medianOS: 'Not reached', os5yr: '~60%' },
  { range: [2, 2], group: 'Intermediate', color: '#ca8a04', medianOS: '~51 months', os5yr: '~35%' },
  { range: [3, 4], group: 'High', color: '#dc2626', medianOS: '~29 months', os5yr: '~22%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function MIPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = MIPI_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score, MIPI_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>Simplified MIPI</h3>
        <span className="calc-subtitle">Mantle Cell Lymphoma International Prognostic Index</span>
      </div>

      <div className="calc-factors">
        {MIPI_FACTORS.map((f) => (
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
          <span className="calc-risk-label">Median OS:</span>
          <span className="calc-risk-stat">{risk.medianOS}</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">5-yr OS:</span>
          <span className="calc-risk-stat">{risk.os5yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#b45309', marginTop: '8px', background: '#fef3c7', padding: '6px 8px', borderRadius: '4px' }}>
        Approximation only. The published sMIPI uses a weighted formula with continuous variables (exact age, LDH ratio, WBC count) to produce a numeric score stratified into 3 risk groups. This binary checklist provides a rough estimate only.
      </div>

      <div className="calc-reference">
        Hoster et al. Blood 2008. PMID: 18182378
      </div>
    </div>
  );
}

export default MIPICalculator;
