import React from 'react';

const cellDescriptions = {
  FoB: 'Follicular B Cell — Naive B cell in the mantle zone, awaiting antigen encounter.',
  Centroblast: 'Centroblast — Rapidly dividing B cell in the dark zone undergoing somatic hypermutation.',
  Centrocyte: 'Centrocyte — Non-dividing B cell in the light zone testing BCR affinity on FDCs.',
  Tfh: 'T Follicular Helper Cell — Provides CD40L-mediated survival signals to high-affinity centrocytes.',
  FDC: 'Follicular Dendritic Cell — Displays native antigen on dendrites for BCR affinity testing.',
  Plasmablast: 'Plasmablast — Antibody-secreting cell exiting the GC.',
  MemoryB: 'Memory B Cell — Long-lived cell exiting GC for future recall responses.',
  Macrophage: 'Tingible Body Macrophage — Engulfs apoptotic B cells (starry sky pattern).',
  Apoptotic: 'Apoptotic Body — Remnants of a B cell that failed affinity selection.',
};

const TRACKABLE = ['FoB', 'Centroblast', 'Centrocyte', 'Plasmablast', 'MemoryB'];

export default function CellInfoTooltip({ entity, x, y, onClose, onTrack }) {
  if (!entity) return null;

  const canTrack = TRACKABLE.includes(entity.type) && onTrack;

  return (
    <div
      className="cell-tooltip"
      style={{
        left: Math.min(x, window.innerWidth - (window.innerWidth < 768 ? 210 : 300)),
        top: Math.max(0, Math.min(y - 120, window.innerHeight - 180)),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="tooltip-close" onClick={onClose}>x</button>
      <div className="tooltip-type">{entity.type}</div>
      <div className="tooltip-desc">{cellDescriptions[entity.type] || ''}</div>
      <div className="tooltip-stats">
        <div>State: {entity.state}</div>
        {entity.affinity != null && (
          <div>BCR Affinity: {(entity.affinity * 100).toFixed(1)}%</div>
        )}
        {entity.isotype && <div>Isotype: {entity.isotype}</div>}
        {entity.zone && <div>Zone: {entity.zone}</div>}
        {entity.engulfed != null && entity.engulfed > 0 && (
          <div>Engulfed: {entity.engulfed} bodies</div>
        )}
      </div>
      {canTrack && (
        <button className="tooltip-track-btn" onClick={() => onTrack(entity.id)}>
          Follow this cell
        </button>
      )}
    </div>
  );
}
