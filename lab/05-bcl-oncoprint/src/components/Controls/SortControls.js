import React from 'react';
import { useFilter } from '../../context/FilterContext';
import './SortControls.css';

function SortControls() {
  const { sortBy, sortGene, sortDirection, setSorting, toggleSortDirection, selectedGenes } = useFilter();

  const handleSortByChange = (e) => {
    const value = e.target.value;
    if (value === 'gene') {
      // Default to first gene if sorting by gene
      setSorting('gene', selectedGenes[0] || null, sortDirection);
    } else {
      setSorting(value, null, sortDirection);
    }
  };

  const handleSortGeneChange = (e) => {
    setSorting('gene', e.target.value, sortDirection);
  };

  return (
    <div className="control-section sort-controls">
      <h3>Sort Samples</h3>

      <div className="sort-row">
        <label>Sort by:</label>
        <select value={sortBy} onChange={handleSortByChange}>
          <option value="subtype">Subtype</option>
          <option value="mutationCount">Mutation Count</option>
          <option value="gene">Gene Alteration</option>
        </select>
      </div>

      {sortBy === 'gene' && (
        <div className="sort-row">
          <label>Gene:</label>
          <select value={sortGene || ''} onChange={handleSortGeneChange}>
            {selectedGenes.map(gene => (
              <option key={gene} value={gene}>{gene}</option>
            ))}
          </select>
        </div>
      )}

      <div className="sort-row">
        <label>Direction:</label>
        <button
          className="btn btn-secondary btn-small direction-btn"
          onClick={toggleSortDirection}
        >
          {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
        </button>
      </div>
    </div>
  );
}

export default SortControls;
