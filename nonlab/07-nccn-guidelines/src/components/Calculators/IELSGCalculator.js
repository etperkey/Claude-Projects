import { useState } from 'react';
import './Calculators.css';

const IELSG_FACTORS = [
  { id: 'age', label: 'Age > 60 years', shortLabel: 'Age' },
  { id: 'ecog', label: 'ECOG performance status > 1', shortLabel: 'ECOG' },
  { id: 'ldh', label: 'Elevated serum LDH', shortLabel: 'LDH' },
  { id: 'csf', label: 'Elevated CSF protein concentration', shortLabel: 'CSF Prot' },
  { id: 'deep', label: 'Deep brain structure involvement (periventricular, basal ganglia, brainstem, or cerebellum)', shortLabel: 'Deep' },
];

const IELSG_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os2yr: '~80%' },
  { range: [2, 3], group: 'Intermediate', color: '#ca8a04', os2yr: '~48%' },
  { range: [4, 5], group: 'High', color: '#dc2626', os2yr: '~15%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function IELSGCalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = IELSG_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score, IELSG_RISK);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>IELSG Score</h3>
        <span className="calc-subtitle">International Extranodal Lymphoma Study Group — Primary CNS Lymphoma</span>
      </div>

      <div className="calc-factors">
        {IELSG_FACTORS.map((f) => (
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
          <span className="calc-risk-label">2-yr OS:</span>
          <span className="calc-risk-stat">{risk.os2yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#7c3aed', marginTop: '8px', background: '#f5f3ff', padding: '6px 8px', borderRadius: '4px' }}>
        PCNSL-specific score. Validated in the pre-rituximab, pre-HD-MTX era — outcomes with modern MATRix-based therapy are substantially better. Use for relative risk stratification and prognosis discussions.
      </div>

      <div className="calc-reference">
        Ferreri AJ et al. J Clin Oncol. 2003;21(2):266-272. PMID: 12525518
      </div>
    </div>
  );
}

export default IELSGCalculator;
