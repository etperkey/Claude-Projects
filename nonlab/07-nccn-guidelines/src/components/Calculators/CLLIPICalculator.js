import { useState } from 'react';
import './Calculators.css';

const CLL_IPI_FACTORS = [
  { id: 'tp53', label: 'del(17p) and/or TP53 mutation', points: 4, shortLabel: 'TP53' },
  { id: 'ighv', label: 'IGHV unmutated', points: 2, shortLabel: 'IGHV' },
  { id: 'b2m', label: 'Beta-2 microglobulin > 3.5 mg/L', points: 2, shortLabel: 'β2M' },
  { id: 'stage', label: 'Rai stage I-IV (Binet B-C)', points: 1, shortLabel: 'Stage' },
  { id: 'age', label: 'Age > 65 years', points: 1, shortLabel: 'Age' },
];

const CLL_IPI_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os5yr: '93%' },
  { range: [2, 3], group: 'Intermediate', color: '#ca8a04', os5yr: '79%' },
  { range: [4, 6], group: 'High', color: '#ea580c', os5yr: '63%' },
  { range: [7, 10], group: 'Very High', color: '#dc2626', os5yr: '23%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function CLLIPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = CLL_IPI_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? f.points : 0), 0);
  const risk = getRiskGroup(score, CLL_IPI_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>CLL-IPI Calculator</h3>
        <span className="calc-subtitle">CLL International Prognostic Index</span>
      </div>

      <div className="calc-factors">
        {CLL_IPI_FACTORS.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!factors[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">
              {f.label}
              <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '6px' }}>
                (+{f.points} pt{f.points > 1 ? 's' : ''})
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="calc-results">
        <div className="calc-score">
          <span className="calc-score-value">{score}</span>
          <span className="calc-score-label">/ 10 points</span>
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

        {factors.tp53 && (
          <div className="calc-note" style={{ fontSize: '11px', color: '#dc2626', marginTop: '8px', fontWeight: '600' }}>
            del(17p)/TP53 mutation detected — chemoimmunotherapy is NOT effective. Use targeted agents (BTKi or venetoclax-based).
          </div>
        )}
      </div>

      <div className="calc-reference">
        International CLL-IPI. Lancet Oncol 2016. PMID: 27185642
      </div>
    </div>
  );
}

export default CLLIPICalculator;
