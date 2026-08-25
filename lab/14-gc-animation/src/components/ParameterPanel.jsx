import React from 'react';
import { DEFAULTS } from '../utils/constants.js';

const paramDefs = [
  { key: 'shmRate', label: 'SHM Rate', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'selectionStringency', label: 'Selection Stringency', min: 0.1, max: 0.9, step: 0.05 },
  { key: 'dzLzRatio', label: 'DZ Fraction', min: 0.2, max: 0.6, step: 0.05 },
  { key: 'tfhCount', label: 'Tfh Count', min: 1, max: 10, step: 1 },
  { key: 'recycleProbability', label: 'Recycle Probability', min: 0, max: 1, step: 0.05 },
];

export default function ParameterPanel({ engine, onUpdate }) {
  const handleChange = (key, value) => {
    engine.setParam(key, parseFloat(value));
    onUpdate();
  };

  const handleReset = () => {
    for (const p of paramDefs) {
      engine.setParam(p.key, DEFAULTS[p.key]);
    }
    onUpdate();
  };

  return (
    <div className="parameter-panel">
      <div className="panel-header">
        <span>Parameters</span>
        <button className="reset-btn" onClick={handleReset}>Reset</button>
      </div>
      {paramDefs.map(p => (
        <div key={p.key} className="param-row">
          <label>{p.label}</label>
          <input
            type="range"
            min={p.min}
            max={p.max}
            step={p.step}
            value={engine.params[p.key]}
            onChange={(e) => handleChange(p.key, e.target.value)}
          />
          <span className="param-value">
            {p.key === 'tfhCount'
              ? engine.params[p.key]
              : engine.params[p.key].toFixed(2)}
          </span>
        </div>
      ))}

      <div className="stats-section">
        <div className="stat">Centroblasts: {engine.entities.count('Centroblast')}</div>
        <div className="stat">Centrocytes: {engine.entities.count('Centrocyte')}</div>
        <div className="stat">Total B cells: {
          engine.entities.count('Centroblast') +
          engine.entities.count('Centrocyte') +
          engine.entities.count('FoB')
        }</div>
      </div>
    </div>
  );
}
