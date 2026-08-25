import { useState } from 'react';
import './Calculators.css';

const DEAUVILLE_SCORES = [
  {
    score: 1,
    label: 'No uptake above background',
    response: 'CMR',
    responseLabel: 'Complete Metabolic Response',
    color: '#16a34a',
  },
  {
    score: 2,
    label: 'Uptake ≤ mediastinum',
    response: 'CMR',
    responseLabel: 'Complete Metabolic Response',
    color: '#16a34a',
  },
  {
    score: 3,
    label: 'Uptake > mediastinum but ≤ liver',
    response: 'CMR',
    responseLabel: 'Complete Metabolic Response',
    color: '#22c55e',
  },
  {
    score: 4,
    label: 'Uptake moderately > liver',
    response: 'Context-dependent',
    responseLabel: 'PMR if reduced from baseline, PMD if new/increased',
    color: '#ca8a04',
  },
  {
    score: 5,
    label: 'Uptake markedly > liver and/or new lesions',
    response: 'PMD',
    responseLabel: 'Progressive Metabolic Disease',
    color: '#dc2626',
  },
];

function DeauvilleCalculator() {
  const [selected, setSelected] = useState(null);
  const [isInterim, setIsInterim] = useState(false);

  const entry = selected !== null ? DEAUVILLE_SCORES[selected] : null;

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>Deauville Score</h3>
        <span className="calc-subtitle">PET/CT Response Assessment (Lugano)</span>
      </div>

      <div className="calc-toggle-row">
        <label className="calc-toggle">
          <input
            type="radio"
            name="timing"
            checked={!isInterim}
            onChange={() => setIsInterim(false)}
          />
          End-of-treatment
        </label>
        <label className="calc-toggle">
          <input
            type="radio"
            name="timing"
            checked={isInterim}
            onChange={() => setIsInterim(true)}
          />
          Interim
        </label>
      </div>

      <div className="deauville-options">
        {DEAUVILLE_SCORES.map((d, i) => (
          <button
            key={d.score}
            className={`deauville-option ${selected === i ? 'selected' : ''}`}
            style={selected === i ? { borderColor: d.color, background: d.color + '12' } : {}}
            onClick={() => setSelected(i)}
          >
            <span className="deauville-score" style={{ color: d.color }}>
              {d.score}
            </span>
            <span className="deauville-desc">{d.label}</span>
          </button>
        ))}
      </div>

      {entry && (
        <div className="calc-results">
          <div className="calc-risk-row">
            <span className="calc-risk-label">
              {isInterim ? 'Interim' : 'End-of-treatment'} Assessment:
            </span>
            <span className="calc-risk-badge" style={{ background: entry.color }}>
              Deauville {entry.score}
            </span>
          </div>
          <div className="calc-risk-row">
            <span className="calc-risk-label">Interpretation:</span>
            <span style={{ fontWeight: 500 }}>{entry.responseLabel}</span>
          </div>
          {entry.score <= 3 && (
            <div className="calc-prophylaxis not-recommended">
              Scores 1-3 at end of treatment = Complete Response. Proceed to surveillance.
            </div>
          )}
          {entry.score === 4 && (
            <div className="calc-prophylaxis" style={{ background: '#fef3c7', borderColor: '#ca8a04' }}>
              Score 4 is context-dependent. Compare to baseline — if reduced, may represent PMR.
              Consider biopsy of residual PET-avid site.
            </div>
          )}
          {entry.score === 5 && (
            <div className="calc-prophylaxis recommended">
              Score 5 indicates progressive/refractory disease. Consider salvage therapy.
            </div>
          )}
        </div>
      )}

      <div className="calc-reference">
        Barrington et al. JCO 2014 (Lugano classification).
      </div>
    </div>
  );
}

export default DeauvilleCalculator;
