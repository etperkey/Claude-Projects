import React from 'react';

export default function PathwayOverlay({ engine, onUpdate }) {
  return (
    <div className="pathway-overlay-controls">
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={engine.showChemokines}
          onChange={() => {
            engine.showChemokines = !engine.showChemokines;
            onUpdate();
          }}
        />
        <span>CXCL12/CXCL13 Gradients</span>
      </label>
    </div>
  );
}
