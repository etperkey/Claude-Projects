import React from 'react';

const eventLabels = {
  tracked: 'Started tracking',
  shm: 'AID-mediated SHM',
  csr: 'IgH DSB → Class Switch',
  selected: 'Affinity selection passed',
  apoptosis: 'Failed selection → apoptosis',
  recycle: 'Recycled to Dark Zone',
  differentiate: 'Differentiated →',
};

const eventIcons = {
  tracked: '🔍',
  shm: '⚡',
  csr: '🧬',
  selected: '✓',
  apoptosis: '✗',
  recycle: '↻',
  differentiate: '→',
};

export default function TrackedCellPanel({ engine, onUpdate }) {
  const entity = engine.trackedId ? engine.entities.get(engine.trackedId) : null;
  const events = engine.trackedEvents;

  if (!entity && !engine.trackedId) return null;

  const handleUntrack = () => {
    engine.untrackCell();
    onUpdate();
  };

  return (
    <div className="tracked-panel">
      <div className="tracked-header">
        <span className="tracked-title">
          {entity ? `Tracking: ${entity.type}` : 'Cell lost'}
        </span>
        <button className="tracked-close" onClick={handleUntrack}>×</button>
      </div>

      {entity && (
        <div className="tracked-stats">
          <div>Affinity: <strong>{((entity.affinity || 0.5) * 100).toFixed(1)}%</strong></div>
          <div>Isotype: <strong>{entity.isotype || 'IgM'}</strong></div>
          <div>State: {entity.state}</div>
          <div>Zone: {entity.zone}</div>
        </div>
      )}

      <div className="tracked-events">
        <div className="events-label">Journey</div>
        {events.map((ev, i) => (
          <div key={i} className={`tracked-event ev-${ev.type}`}>
            <span className="ev-icon">{eventIcons[ev.type] || '•'}</span>
            <span className="ev-text">
              {eventLabels[ev.type] || ev.type}
              {ev.isotype && ` ${ev.isotype}`}
              {ev.to && ` ${ev.to}`}
              {ev.affinity != null && ` (${(ev.affinity * 100).toFixed(0)}%)`}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <div className="tracked-event ev-empty">Waiting for events...</div>
        )}
      </div>

      <div className="tracked-hint">Click another B cell to switch, or × to stop tracking</div>
    </div>
  );
}
