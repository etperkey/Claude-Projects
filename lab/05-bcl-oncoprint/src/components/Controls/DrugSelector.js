import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import './DrugSelector.css';

function DrugSelector() {
  const { getDrugList } = useData();
  const { selectedDrug, selectDrug } = useFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const drugList = getDrugList();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and group drugs by MOA
  const filteredDrugs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return drugList;
    return drugList.filter(d =>
      d.n.toLowerCase().includes(term) ||
      (d.t && d.t.toLowerCase().includes(term)) ||
      (d.m && d.m.toLowerCase().includes(term))
    );
  }, [drugList, searchTerm]);

  // Group by MOA for display
  const groupedDrugs = useMemo(() => {
    const groups = {};
    filteredDrugs.forEach(d => {
      const moa = d.m || 'Other';
      if (!groups[moa]) groups[moa] = [];
      groups[moa].push(d);
    });
    // Sort groups by name, putting "Other" last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [filteredDrugs]);

  const handleSelect = (drug) => {
    selectDrug(drug);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="drug-selector" ref={containerRef}>
      <div
        className="drug-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedDrug ? (
          <span className="selected-drug-name">{selectedDrug.n}</span>
        ) : (
          <span className="drug-placeholder">Select a drug...</span>
        )}
        <span className="drug-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </div>

      {isOpen && (
        <div className="drug-dropdown">
          <input
            type="text"
            className="drug-search"
            placeholder="Search drugs, targets, MOA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="drug-list">
            {groupedDrugs.length === 0 && (
              <div className="drug-no-results">No drugs match "{searchTerm}"</div>
            )}
            {groupedDrugs.map(([moa, drugs]) => (
              <div key={moa} className="drug-group">
                <div className="drug-group-header">{moa}</div>
                {drugs.map(drug => (
                  <div
                    key={drug.i}
                    className={`drug-item ${selectedDrug?.i === drug.i ? 'active' : ''}`}
                    onClick={() => handleSelect(drug)}
                  >
                    <span className="drug-name">{drug.n}</span>
                    {drug.t && <span className="drug-target">{drug.t}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="drug-count">{filteredDrugs.length} drugs</div>
        </div>
      )}
    </div>
  );
}

export default DrugSelector;
