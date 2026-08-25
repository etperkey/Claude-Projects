import { useState } from 'react';
import './Calculators.css';

const IPSSWM_FACTORS = [
  { id: 'age', label: 'Age > 65 years', shortLabel: 'Age' },
  { id: 'hgb', label: 'Hemoglobin ≤ 11.5 g/dL', shortLabel: 'Hgb' },
  { id: 'plt', label: 'Platelet count ≤ 100,000/µL', shortLabel: 'Plt' },
  { id: 'b2m', label: 'Beta-2 microglobulin > 3 mg/L', shortLabel: 'β2M' },
  { id: 'igm', label: 'Serum IgM > 7,000 mg/dL', shortLabel: 'IgM' },
];

const IPSSWM_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os5yr: '~87%' },
  { range: [2, 2], group: 'Intermediate', color: '#ca8a04', os5yr: '~68%' },
  { range: [3, 5], group: 'High', color: '#dc2626', os5yr: '~36%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function IPSSWMCalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = IPSSWM_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  // Special rule: age >65 as the sole adverse factor → Intermediate (not Low)
  const ageOnly = score === 1 && factors.age;
  const risk = ageOnly
    ? IPSSWM_RISK.find((r) => r.group === 'Intermediate')
    : getRiskGroup(score, IPSSWM_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>IPSSWM Calculator</h3>
        <span className="calc-subtitle">International Prognostic Scoring System for Waldenstrom's Macroglobulinemia</span>
      </div>

      <div className="calc-factors">
        {IPSSWM_FACTORS.map((f) => (
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
          <span className="calc-risk-stat">{risk.os5yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#1e40af', marginTop: '8px', background: '#eff6ff', padding: '6px 8px', borderRadius: '4px' }}>
        Low: 0 factors, or 1 non-age factor. Intermediate: 2 factors, OR age &gt;65 as the sole adverse factor. High: ≥3 factors.
      </div>

      <div className="calc-reference">
        Morel P et al. Blood. 2009;113(18):4163-4170. PMID: 19196866
      </div>
    </div>
  );
}

export default IPSSWMCalculator;
