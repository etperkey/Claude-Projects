import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import FREEZER_INVENTORY from '../../data/freezerInventory';
import './FilterPanel.css';

const SUBTYPES = [
  { id: 'DLBCL_GCB', label: 'DLBCL GCB', color: '#3b82f6' },
  { id: 'DLBCL_ABC', label: 'DLBCL ABC', color: '#ef4444' },
  { id: 'PMBL', label: 'PMBL', color: '#f472b6' },
  { id: 'Burkitt', label: 'Burkitt', color: '#a855f7' },
  { id: 'MCL', label: 'MCL', color: '#22c55e' },
  { id: 'CLL', label: 'CLL', color: '#eab308' },
  { id: 'PEL', label: 'PEL', color: '#14b8a6' },
  { id: 'FL', label: 'FL', color: '#f97316' },
  { id: 'MZL', label: 'MZL', color: '#06b6d4' },
  { id: 'Contaminated', label: 'Contaminated', color: '#991b1b' },
  { id: 'Other', label: 'Other', color: '#6b7280' }
];

function FilterPanel() {
  const { cellLines } = useData();
  const { selectedSubtypes, toggleSubtype, clearSubtypeFilter, hiddenCellLines, showAllCellLines, filterFreezerOnly, toggleFreezerOnly } = useFilter();

  // Count cell lines per subtype
  const subtypeCounts = useMemo(() => {
    const counts = {};
    cellLines.forEach(cl => {
      counts[cl.subtype] = (counts[cl.subtype] || 0) + 1;
    });
    return counts;
  }, [cellLines]);

  // Filter subtypes to only show those with cell lines
  const availableSubtypes = useMemo(() => {
    return SUBTYPES.filter(st => subtypeCounts[st.id] > 0);
  }, [subtypeCounts]);

  const filteredCount = useMemo(() => {
    if (selectedSubtypes.length === 0) return cellLines.length;
    return cellLines.filter(cl => selectedSubtypes.includes(cl.subtype)).length;
  }, [cellLines, selectedSubtypes]);

  const freezerCount = useMemo(() => {
    return cellLines.filter(cl => FREEZER_INVENTORY[cl.name]).length;
  }, [cellLines]);

  return (
    <div className="control-section filter-panel">
      <h3>Filter by Subtype</h3>

      <div className="filter-options">
        {availableSubtypes.map(subtype => (
          <label key={subtype.id} className="filter-option">
            <input
              type="checkbox"
              checked={selectedSubtypes.includes(subtype.id)}
              onChange={() => toggleSubtype(subtype.id)}
            />
            <span
              className="color-indicator"
              style={{ backgroundColor: subtype.color }}
            />
            <span className="label">{subtype.label}</span>
            <span className="count">({subtypeCounts[subtype.id]})</span>
          </label>
        ))}
      </div>

      <div className="filter-summary">
        <span>{filteredCount} / {cellLines.length} cell lines</span>
        {selectedSubtypes.length > 0 && (
          <button
            className="btn btn-small btn-secondary"
            onClick={clearSubtypeFilter}
          >
            Clear
          </button>
        )}
      </div>

      <label className="filter-option freezer-filter">
        <input
          type="checkbox"
          checked={filterFreezerOnly}
          onChange={toggleFreezerOnly}
        />
        <span
          className="color-indicator"
          style={{ backgroundColor: '#60a5fa' }}
        />
        <span className="label">Kline Lab -80C only</span>
        <span className="count">({freezerCount})</span>
      </label>

      {hiddenCellLines.size > 0 && (
        <div className="hidden-cell-lines-indicator">
          <span>{hiddenCellLines.size} cell line{hiddenCellLines.size > 1 ? 's' : ''} hidden</span>
          <button
            className="btn btn-small btn-secondary"
            onClick={showAllCellLines}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
