import { useState } from 'react';
import './Calculators.css';

const CNSIPI_FACTORS = [
  { id: 'age', label: 'Age > 60 years' },
  { id: 'ldh', label: 'Serum LDH > upper limit of normal' },
  { id: 'ecog', label: 'ECOG performance status ≥ 2' },
  { id: 'stage', label: 'Ann Arbor stage III or IV' },
  { id: 'extranodal', label: '> 1 extranodal site' },
  { id: 'kidney', label: 'Kidney or adrenal gland involvement' },
];

const CNSIPI_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', cns2yr: '0.6%' },
  { range: [2, 3], group: 'Intermediate', color: '#ca8a04', cns2yr: '3.4%' },
  { range: [4, 6], group: 'High', color: '#dc2626', cns2yr: '10.2%' },
];

const HIGH_RISK_SITES = [
  'Testicular',
  'Breast',
  'Uterine',
  'Kidney/Adrenal',
  'Epidural',
  'Bone marrow (large cell)',
];

function getRiskGroup(score) {
  return CNSIPI_RISK.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function CNSIPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const score = CNSIPI_FACTORS.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score);
  const needsProphylaxis = score >= 4;

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>CNS-IPI Calculator</h3>
        <span className="calc-subtitle">CNS Relapse Risk Assessment</span>
      </div>

      <div className="calc-factors">
        {CNSIPI_FACTORS.map((f) => (
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
          <span className="calc-score-label">/ 6 points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">CNS-IPI Risk:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
          <span className="calc-risk-stat">2-yr CNS relapse ~{risk.cns2yr}</span>
        </div>

        <div className={`calc-prophylaxis ${needsProphylaxis ? 'recommended' : 'not-recommended'}`}>
          <strong>CNS Prophylaxis:</strong>{' '}
          {needsProphylaxis
            ? 'Recommended — Consider IT MTX or HD-MTX (NCCN Cat 2A)'
            : 'Not routinely recommended at this score'}
        </div>
      </div>

      <div className="calc-note">
        <strong>Additional high-risk sites</strong> (consider prophylaxis regardless of score):
        <div className="calc-sites">
          {HIGH_RISK_SITES.map((site) => (
            <span key={site} className="calc-site-tag">{site}</span>
          ))}
        </div>
      </div>

      <div className="calc-reference">
        Schmitz et al. JCO 2016. NCCN B-Cell Lymphomas v2.2025.
      </div>
    </div>
  );
}

export default CNSIPICalculator;
