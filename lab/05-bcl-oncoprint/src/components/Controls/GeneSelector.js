import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import './GeneSelector.css';

function GeneSelector() {
  const { genes, getPanelList, getPanel, getCategoryColor, getGeneInfo } = useData();
  const { selectedGenes, selectedPanels, addGene, removeGene, resetGenes, togglePanel, setGenes } = useFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showAllGenes, setShowAllGenes] = useState(false);

  // Get list of available panels
  const panelList = useMemo(() => getPanelList(), [getPanelList]);

  // Build merged categories from all selected panels (first-panel-wins for shared genes)
  const mergedCategories = useMemo(() => {
    const result = {};
    const assignedGenes = new Set();

    selectedPanels.forEach(panelId => {
      const panel = getPanel(panelId);
      if (!panel?.categories) return;
      Object.entries(panel.categories).forEach(([category, geneList]) => {
        geneList.forEach(g => {
          if (!assignedGenes.has(g)) {
            assignedGenes.add(g);
            const key = category;
            if (!result[key]) result[key] = [];
            result[key].push(g);
          }
        });
      });
    });

    return result;
  }, [selectedPanels, getPanel]);

  // Filter merged categories by search
  const filteredGenesByCategory = useMemo(() => {
    const result = {};
    Object.entries(mergedCategories).forEach(([category, geneList]) => {
      const filtered = geneList.filter(g =>
        g.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    });
    return result;
  }, [mergedCategories, searchTerm]);

  // Search all genes across all panels
  const allMatchingGenes = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    if (!genes.geneInfo) return [];

    return Object.keys(genes.geneInfo)
      .filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const infoA = genes.geneInfo[a];
        const infoB = genes.geneInfo[b];
        return (infoB?.mutatedLines || 0) - (infoA?.mutatedLines || 0);
      })
      .slice(0, 50);  // Limit results
  }, [searchTerm, genes.geneInfo]);

  // Check if a gene is selected
  const isSelected = (gene) => selectedGenes.includes(gene);

  // Toggle gene selection
  const toggleGene = (gene) => {
    if (isSelected(gene)) {
      removeGene(gene);
    } else {
      addGene(gene);
    }
  };

  // Add/remove all genes in a category
  const toggleCategory = (category) => {
    const categoryGenes = mergedCategories[category] || [];
    const allSelected = categoryGenes.every(g => isSelected(g));

    if (allSelected) {
      categoryGenes.forEach(g => removeGene(g));
    } else {
      categoryGenes.forEach(g => addGene(g));
    }
  };

  // Clear all genes
  const clearAll = () => {
    setGenes([]);
  };

  // Format category name for display
  const formatCategoryName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const activePanelCount = selectedPanels.length;

  return (
    <div className="control-section gene-selector">
      <h3>Gene Panels</h3>

      {/* Panel checkbox list */}
      <div className="panel-checkbox-list">
        {panelList.map(panel => {
          const isActive = selectedPanels.includes(panel.id);
          const isOnly = isActive && activePanelCount === 1;
          return (
            <label
              key={panel.id}
              className={`panel-option${isActive ? ' active' : ''}`}
              title={isOnly ? 'At least one panel must remain selected' : panel.description || ''}
            >
              <input
                type="checkbox"
                checked={isActive}
                disabled={isOnly}
                onChange={() => togglePanel(panel.id)}
              />
              <span className="panel-option-name">{panel.name}</span>
              <span className="panel-option-count">({panel.geneCount})</span>
            </label>
          );
        })}
        <div className="panel-summary">
          {activePanelCount} panel{activePanelCount !== 1 ? 's' : ''} active
        </div>
      </div>

      {/* Gene search */}
      <div className="gene-search">
        <input
          type="text"
          placeholder="Search genes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm.length >= 2 && (
          <button
            className="btn btn-small search-all-toggle"
            onClick={() => setShowAllGenes(!showAllGenes)}
          >
            {showAllGenes ? 'Show Panel' : 'Search All'}
          </button>
        )}
      </div>

      {/* Gene list - either panel categories or all genes search */}
      {showAllGenes && searchTerm.length >= 2 ? (
        <div className="all-genes-search">
          <p className="search-info">
            {allMatchingGenes.length} genes found (showing top 50)
          </p>
          <div className="gene-list">
            {allMatchingGenes.map(gene => {
              const info = getGeneInfo(gene);
              return (
                <label key={gene} className="gene-option">
                  <input
                    type="checkbox"
                    checked={isSelected(gene)}
                    onChange={() => toggleGene(gene)}
                  />
                  <span className="gene-name">{gene}</span>
                  {info && (
                    <span className="gene-freq" title={`Mutated in ${info.mutatedLines} cell lines`}>
                      ({info.mutatedLines})
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="gene-categories">
          {Object.entries(filteredGenesByCategory).map(([category, categoryGenes]) => (
            <div key={category} className="gene-category">
              <div
                className="category-header"
                onClick={() => setExpandedCategory(
                  expandedCategory === category ? null : category
                )}
              >
                <span
                  className="category-color"
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
                <span className="category-name">
                  {formatCategoryName(category)}
                </span>
                <span className="category-count">
                  ({categoryGenes.filter(g => isSelected(g)).length}/{categoryGenes.length})
                </span>
                <span className="expand-icon">
                  {expandedCategory === category ? '−' : '+'}
                </span>
              </div>

              {expandedCategory === category && (
                <div className="category-genes">
                  <button
                    className="btn btn-small btn-secondary toggle-all"
                    onClick={() => toggleCategory(category)}
                  >
                    {categoryGenes.every(g => isSelected(g)) ? 'Remove All' : 'Add All'}
                  </button>
                  {categoryGenes.map(gene => {
                    const info = getGeneInfo(gene);
                    return (
                      <label key={gene} className="gene-option">
                        <input
                          type="checkbox"
                          checked={isSelected(gene)}
                          onChange={() => toggleGene(gene)}
                        />
                        <span className="gene-name">{gene}</span>
                        {info && (
                          <span className="gene-freq" title={`Mutated in ${info.mutatedLines} cell lines`}>
                            ({info.mutatedLines})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="gene-actions">
        <span className="selected-count">
          {selectedGenes.length} genes selected
        </span>
        <div className="action-buttons">
          <button
            className="btn btn-small btn-secondary"
            onClick={clearAll}
            title="Clear all genes"
          >
            Clear
          </button>
          <button
            className="btn btn-small btn-secondary"
            onClick={resetGenes}
            title="Reset to panel defaults"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeneSelector;
