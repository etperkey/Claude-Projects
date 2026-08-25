import { useState } from 'react';
import './Calculators.css';

// NCCN-IPI (Zhou 2014) — refined IPI for rituximab era in DLBCL
// Weighted score 0-8 with finer risk stratification than original IPI
const AGE_POINTS = [
  { value: 0, label: 'Age <= 40' },
  { value: 1, label: 'Age 41-60' },
  { value: 2, label: 'Age 61-75' },
  { value: 3, label: 'Age > 75' },
];

const LDH_POINTS = [
  { value: 0, label: 'LDH ratio <= 1 (normal)' },
  { value: 1, label: 'LDH ratio 1-3 (> ULN but <= 3x ULN)' },
  { value: 2, label: 'LDH ratio > 3 (> 3x ULN)' },
];

const BINARY = [
  { id: 'stage', label: 'Ann Arbor stage III-IV', points: 1 },
  { id: 'extranodal', label: 'Extranodal disease in bone marrow, CNS, liver/GI tract, or lung', points: 1 },
  { id: 'ecog', label: 'ECOG performance status >= 2', points: 1 },
];

const RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os5yr: '96%' },
  { range: [2, 3], group: 'Low-Intermediate', color: '#ca8a04', os5yr: '82%' },
  { range: [4, 5], group: 'High-Intermediate', color: '#ea580c', os5yr: '64%' },
  { range: [6, 8], group: 'High', color: '#dc2626', os5yr: '33%' },
];

function getRiskGroup(score) {
  return RISK.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function NCCNIPICalculator() {
  const [age, setAge] = useState(0);
  const [ldh, setLdh] = useState(0);
  const [binary, setBinary] = useState({});

  const toggle = (id) => {
    setBinary((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const binaryScore = BINARY.reduce((sum, f) => sum + (binary[f.id] ? f.points : 0), 0);
  const score = age + ldh + binaryScore;
  const risk = getRiskGroup(score);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>NCCN-IPI Calculator</h3>
        <span className="calc-subtitle">Enhanced IPI for DLBCL in the rituximab era (Zhou 2014)</span>
      </div>

      <div className="calc-factors">
        <div className="calc-factor-group">
          <div className="calc-factor-label-bold">Age (0-3 pts)</div>
          <select value={age} onChange={(e) => setAge(parseInt(e.target.value, 10))}>
            {AGE_POINTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} ({a.value} pt)
              </option>
            ))}
          </select>
        </div>

        <div className="calc-factor-group">
          <div className="calc-factor-label-bold">LDH ratio (0-2 pts)</div>
          <select value={ldh} onChange={(e) => setLdh(parseInt(e.target.value, 10))}>
            {LDH_POINTS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} ({l.value} pt)
              </option>
            ))}
          </select>
        </div>

        {BINARY.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!binary[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">{f.label} (1 pt)</span>
          </label>
        ))}
      </div>

      <div className="calc-results">
        <div className="calc-score">
          <span className="calc-score-value">{score}</span>
          <span className="calc-score-label">/ 8 points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">NCCN-IPI Risk:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
          <span className="calc-risk-stat">5-yr OS ~{risk.os5yr}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
        NCCN-IPI refines the standard IPI by weighting age and LDH ratio and defining specific high-risk extranodal sites. Better discrimination in the rituximab era than classic IPI or R-IPI. NCCN-IPI >=4 is the threshold at which Pola-R-CHP is preferred (POLARIX IPI >=2 eligibility overlaps but differs).
      </div>

      <div className="calc-reference">
        Zhou Z, Sehn LH, Rademaker AW, et al. An enhanced International Prognostic Index (NCCN-IPI) for patients with diffuse large B-cell lymphoma treated in the rituximab era. <em>Blood.</em> 2014;123(6):837-842. <a href="https://pubmed.ncbi.nlm.nih.gov/24264230/" target="_blank" rel="noopener noreferrer">PMID 24264230</a>
      </div>
    </div>
  );
}

export default NCCNIPICalculator;
