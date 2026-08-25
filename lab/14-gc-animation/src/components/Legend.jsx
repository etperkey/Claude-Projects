import React from 'react';
import { CELL_COLORS } from '../utils/colors.js';

const C = CELL_COLORS;
const legendItems = [
  { type: 'FoB', color: C.FoB.cytoplasm, border: C.FoB.outline, label: 'Follicular B Cell', shape: 'circle-small' },
  { type: 'Centroblast', color: C.Centroblast.cytoplasm, border: '#0d1257', label: 'Centroblast (DZ)', shape: 'circle-large' },
  { type: 'Centrocyte', color: C.Centrocyte.cytoplasm, border: '#4a0072', label: 'Centrocyte (LZ)', shape: 'circle-med' },
  { type: 'Tfh', color: C.Tfh.cytoplasm, border: '#8e0000', label: 'T Follicular Helper', shape: 'circle-med' },
  { type: 'FDC', color: C.FDC.body, border: '#7f3300', label: 'Follicular Dendritic Cell', shape: 'star' },
  { type: 'Plasmablast', color: C.Plasmablast.cytoplasm, border: '#00413a', label: 'Plasmablast', shape: 'circle-med' },
  { type: 'MemoryB', color: C.MemoryB.cytoplasm, border: '#0a3d0c', label: 'Memory B Cell', shape: 'circle-small' },
  { type: 'Macrophage', color: C.Macrophage.cytoplasm, border: '#3e2723', label: 'Macrophage', shape: 'circle-large' },
];

export default React.memo(function Legend({ visible }) {
  if (!visible) return null;

  return (
    <div className="legend">
      <div className="legend-title">Cell Types</div>
      {legendItems.map(item => (
        <div key={item.type} className="legend-item">
          <span
            className={`legend-swatch ${item.shape}`}
            style={{
              backgroundColor: item.color,
              border: `1.5px solid ${item.border || item.color}`,
            }}
          />
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
})
