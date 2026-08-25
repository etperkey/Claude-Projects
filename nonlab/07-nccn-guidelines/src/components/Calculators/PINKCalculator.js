import { useState } from 'react';
import './Calculators.css';

const PINK_FACTORS = [
  { id: 'age', label: 'Age > 60 years', shortLabel: 'Age' },
  { id: 'stage', label: 'Stage III or IV disease', shortLabel: 'Stage' },
  { id: 'distant_ln', label: 'Distant lymph node involvement', shortLabel: 'Distant LN' },
  { id: 'nonnasal', label: 'Non-nasal type disease', shortLabel: 'Non-nasal' },
];

const PINKE_EXTRA_FACTOR = {
  id: 'ebv_dna',
  label: 'Pretreatment EBV DNA detectable in plasma',
  shortLabel: 'EBV DNA',
};

const PINK_RISK = [
  { range: [0, 0], group: 'Low', color: '#16a34a', os3yr: '~81%' },
  { range: [1, 1], group: 'Intermediate', color: '#ca8a04', os3yr: '~62%' },
  { range: [2, 4], group: 'High', color: '#dc2626', os3yr: '~25%' },
];

const PINKE_RISK = [
  { range: [0, 1], group: 'Low', color: '#16a34a', os3yr: '~81%' },
  { range: [2, 2], group: 'Intermediate', color: '#ca8a04', os3yr: '~55%' },
  { range: [3, 5], group: 'High', color: '#dc2626', os3yr: '~28%' },
];

function getRiskGroup(score, table) {
  return table.find((r) => score >= r.range[0] && score <= r.range[1]);
}

function PINKCalculator() {
  const [mode, setMode] = useState('pink');
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isPinkE = mode === 'pink-e';
  const activeFactors = isPinkE ? [...PINK_FACTORS, PINKE_EXTRA_FACTOR] : PINK_FACTORS;
  const maxScore = isPinkE ? 5 : 4;
  const riskTable = isPinkE ? PINKE_RISK : PINK_RISK;

  const score = activeFactors.reduce((sum, f) => sum + (factors[f.id] ? 1 : 0), 0);
  const risk = getRiskGroup(score, riskTable);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>PINK / PINK-E Calculator</h3>
        <span className="calc-subtitle">Prognostic Index for NK/T-Cell Lymphoma</span>
      </div>

      <div className="calc-mode-toggle" style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          className={`calc-mode-btn${mode === 'pink' ? ' active' : ''}`}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            background: mode === 'pink' ? '#1e40af' : '#f8fafc',
            color: mode === 'pink' ? '#fff' : '#475569',
            cursor: 'pointer',
            fontWeight: mode === 'pink' ? '600' : '400',
            fontSize: '13px',
          }}
          onClick={() => setMode('pink')}
        >
          PINK (4 factors)
        </button>
        <button
          className={`calc-mode-btn${mode === 'pink-e' ? ' active' : ''}`}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            background: mode === 'pink-e' ? '#1e40af' : '#f8fafc',
            color: mode === 'pink-e' ? '#fff' : '#475569',
            cursor: 'pointer',
            fontWeight: mode === 'pink-e' ? '600' : '400',
            fontSize: '13px',
          }}
          onClick={() => setMode('pink-e')}
        >
          PINK-E (+ EBV DNA)
        </button>
      </div>

      <div className="calc-factors">
        {PINK_FACTORS.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!factors[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">{f.label}</span>
          </label>
        ))}
        {isPinkE && (
          <label key={PINKE_EXTRA_FACTOR.id} className="calc-factor" style={{ borderTop: '1px dashed #cbd5e1', marginTop: '6px', paddingTop: '6px' }}>
            <input
              type="checkbox"
              checked={!!factors[PINKE_EXTRA_FACTOR.id]}
              onChange={() => toggle(PINKE_EXTRA_FACTOR.id)}
            />
            <span className="calc-factor-label" style={{ color: '#1e40af' }}>
              {PINKE_EXTRA_FACTOR.label}
            </span>
          </label>
        )}
      </div>

      <div className="calc-results">
        <div className="calc-score">
          <span className="calc-score-value">{score}</span>
          <span className="calc-score-label">/ {maxScore} points</span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">Risk Group:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
        </div>

        <div className="calc-risk-row">
          <span className="calc-risk-label">3-yr OS:</span>
          <span className="calc-risk-stat">{risk.os3yr}</span>
        </div>

        <div className="calc-risk-row" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
          <span>Model: {isPinkE ? 'PINK-E' : 'PINK'}</span>
        </div>
      </div>

      <div className="calc-note" style={{ fontSize: '11px', color: '#1e3a5f', marginTop: '8px', background: '#eff6ff', padding: '6px 8px', borderRadius: '4px' }}>
        PINK-E adds detectable pretreatment plasma EBV DNA as a 5th prognostic factor and improves risk discrimination. Note: PINK-E risk groups shift to 0-1 (Low), 2 (Intermediate), 3+ (High). Validated in a large multicenter international cohort.
      </div>

      <div className="calc-reference">
        Kim SJ et al. Lancet Oncol. 2016;17(3):389-400. PMID: 26873565
      </div>
    </div>
  );
}

export default PINKCalculator;
