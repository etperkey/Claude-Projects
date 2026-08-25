import { useState } from 'react';
import './Calculators.css';

const IPI_FACTORS = [
  { id: 'age', label: 'Age > 60 years', shortLabel: 'Age' },
  { id: 'ldh', label: 'Serum LDH > upper limit of normal', shortLabel: 'LDH' },
  { id: 'ecog', label: 'ECOG performance status ≥ 2', shortLabel: 'ECOG' },
  { id: 'stage', label: 'Ann Arbor stage III or IV', shortLabel: 'Stage' },
  { id: 'extranodal', label: '> 1 extranodal site', shortLabel: 'Extranodal' },
];

const IPI_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os5yr: '73%' },
  { range: [2, 2], group: 'Low-Intermediate', color: '#ca8a04', os5yr: '51%' },
  { range: [3, 3], group: 'High-Intermediate', color: '#ea580c', os5yr: '43%' },
  { range: [4, 5], group: 'High', color: '#dc2626', os5yr: '26%' },
];

const RIPI_RISK = [
  { range: [0, 0], group: 'Very Good', color: '#16a34a', os4yr: '94%' },
  { range: [1, 2], group: 'Good', color: '#ca8a04', os4yr: '79%' },
  { range: [3, 5], group: 'Poor', color: '#dc2626', os4yr: '55%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function IPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = IPI_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const ipiRisk = getRiskGroup(score, IPI_RISK);
  const ripiRisk = getRiskGroup(score, RIPI_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>IPI Calculator</h3>
        <span className="calc-subtitle">International Prognostic Index</span>
      </div>

      <div className="calc-factors">
        {IPI_FACTORS.map((f) => (
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
          <span className="calc-risk-label">IPI Risk:</span>
          <span className="calc-risk-badge" style={{ background: ipiRisk.color }}>
            {ipiRisk.group}
          </span>
          <span className="calc-risk-stat">5-yr OS ~{ipiRisk.os5yr}</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">R-IPI Risk:</span>
          <span className="calc-risk-badge" style={{ background: ripiRisk.color }}>
            {ripiRisk.group}
          </span>
          <span className="calc-risk-stat">4-yr OS ~{ripiRisk.os4yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
        IPI 5-yr OS figures are from the pre-rituximab era (1993) and are significantly better with modern R-CHOP-based therapy. R-IPI better reflects rituximab-era outcomes.
      </div>
      <div className="calc-reference">
        IPI: Shipp et al. NEJM 1993. R-IPI: Sehn et al. Blood 2007.
      </div>
    </div>
  );
}

export default IPICalculator;
