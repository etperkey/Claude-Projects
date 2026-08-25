import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useData } from './DataContext';
import { decodeStateFromURL } from '../utils/exportUtils';

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const { genes, getDrugList } = useData();
  const initializedFromURL = useRef(false);

  // Filter state
  const [selectedSubtypes, setSelectedSubtypes] = useState([]);  // Empty = all
  const [selectedPanels, setSelectedPanels] = useState(['gc_trafficking']);
  const [selectedGenes, setSelectedGenes] = useState([]);

  // Helper: merge genes from multiple panels (deduped, preserving order)
  const getGenesFromPanels = useCallback((panelIds) => {
    if (!genes?.panels) return [];
    const seen = new Set();
    const merged = [];
    panelIds.forEach(pid => {
      const panel = genes.panels[pid];
      if (panel?.allGenes) {
        panel.allGenes.forEach(g => {
          if (!seen.has(g)) {
            seen.add(g);
            merged.push(g);
          }
        });
      }
    });
    return merged;
  }, [genes]);

  // Initialize from URL params on first load
  useEffect(() => {
    if (genes?.panels && !initializedFromURL.current) {
      initializedFromURL.current = true;

      const urlState = decodeStateFromURL(window.location.search);

      // Support both new panels= and old panel= URL params
      const urlPanels = urlState.selectedPanels || [];
      const validPanels = urlPanels.filter(pid => genes.panels[pid]);

      if (validPanels.length > 0) {
        setSelectedPanels(validPanels);
        if (urlState.selectedGenes && urlState.selectedGenes.length > 0) {
          setSelectedGenes(urlState.selectedGenes);
        } else {
          setSelectedGenes(getGenesFromPanels(validPanels));
        }
      } else {
        // No valid URL state, use default panel
        setSelectedGenes(getGenesFromPanels(['gc_trafficking']));
      }

      if (urlState.selectedSubtypes) {
        setSelectedSubtypes(urlState.selectedSubtypes);
      }

      if (urlState.sortBy) {
        setSortBy(urlState.sortBy);
      }

      if (urlState.sortGene) {
        setSortGene(urlState.sortGene);
      }

      if (urlState.sortDirection) {
        setSortDirection(urlState.sortDirection);
      }

      if (urlState.showCNV !== undefined) {
        setShowCNV(urlState.showCNV);
      }

      // Mutual exclusivity: only one background overlay active at a time
      // Priority: Drug > Proteomics > Expression > CRISPR > RNAi
      if (urlState.showDrugSensitivity === true) {
        setShowDrugSensitivity(true);
        // Resolve drug object from index
        if (urlState.selectedDrug?.i !== undefined) {
          const drugList = getDrugList();
          const drug = drugList.find(d => d.i === urlState.selectedDrug.i);
          if (drug) setSelectedDrug(drug);
        }
      } else if (urlState.showProteomics === true) {
        setShowProteomics(true);
      } else if (urlState.showExpression === true) {
        setShowExpression(true);
      } else {
        if (urlState.showCRISPR !== undefined) {
          setShowCRISPR(urlState.showCRISPR);
        }
        if (urlState.showRNAi !== undefined) {
          setShowRNAi(urlState.showRNAi);
        }
        if (urlState.showExpression !== undefined) {
          setShowExpression(urlState.showExpression);
        }
        if (urlState.showProteomics !== undefined) {
          setShowProteomics(urlState.showProteomics);
        }
        if (urlState.showDrugSensitivity !== undefined) {
          setShowDrugSensitivity(urlState.showDrugSensitivity);
        }
      }
    }
  }, [genes, getGenesFromPanels, getDrugList]);

  // Display options
  const [showCNV, setShowCNV] = useState(false);  // CNV off by default
  const [showSNV, setShowSNV] = useState(true);   // SNV on by default
  const [showCRISPR, setShowCRISPR] = useState(false);  // CRISPR dependency off by default
  const [showRNAi, setShowRNAi] = useState(false);  // RNAi dependency off by default
  const [showExpression, setShowExpression] = useState(false);  // Gene expression off by default
  const [showProteomics, setShowProteomics] = useState(false);  // Proteomics off by default
  const [showDrugSensitivity, setShowDrugSensitivity] = useState(false);  // Drug sensitivity off by default
  const [selectedDrug, setSelectedDrug] = useState(null);  // { i, n, t, m } from drugList

  // Sort state
  const [sortBy, setSortBy] = useState('subtype');  // 'subtype', 'mutationCount', 'gene'
  const [sortGene, setSortGene] = useState(null);   // Gene to sort by when sortBy='gene'
  const [sortDirection, setSortDirection] = useState('asc');

  // Modal state
  const [selectedCell, setSelectedCell] = useState(null);  // { cellLineId, gene }

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);  // { type, x, y, data }

  // Highlight state
  const [highlightedGene, setHighlightedGene] = useState(null);
  const [highlightedCellLine, setHighlightedCellLine] = useState(null);

  // Hidden cell lines
  const [hiddenCellLines, setHiddenCellLines] = useState(new Set());

  // Freezer inventory filter
  const [filterFreezerOnly, setFilterFreezerOnly] = useState(false);

  // Filter actions
  const toggleSubtype = useCallback((subtype) => {
    setSelectedSubtypes(prev => {
      if (prev.includes(subtype)) {
        return prev.filter(s => s !== subtype);
      }
      return [...prev, subtype];
    });
  }, []);

  const clearSubtypeFilter = useCallback(() => {
    setSelectedSubtypes([]);
  }, []);

  const setSubtypeFilter = useCallback((subtypes) => {
    setSelectedSubtypes(subtypes);
  }, []);

  // Gene selection actions
  const addGene = useCallback((gene) => {
    setSelectedGenes(prev => {
      if (prev.includes(gene)) return prev;
      return [...prev, gene];
    });
  }, []);

  const removeGene = useCallback((gene) => {
    setSelectedGenes(prev => prev.filter(g => g !== gene));
  }, []);

  const setGenes = useCallback((genes) => {
    setSelectedGenes(genes);
  }, []);

  const resetGenes = useCallback(() => {
    setSelectedGenes(getGenesFromPanels(selectedPanels));
  }, [getGenesFromPanels, selectedPanels]);

  // Panel toggle: add/remove panel, merge/prune genes accordingly
  const togglePanel = useCallback((panelId) => {
    setSelectedPanels(prev => {
      if (prev.includes(panelId)) {
        // Cannot remove last panel
        if (prev.length <= 1) return prev;
        const next = prev.filter(p => p !== panelId);
        // Remove genes unique to this panel (not in any remaining panel)
        const remainingGenes = new Set(getGenesFromPanels(next));
        setSelectedGenes(prevGenes => prevGenes.filter(g => remainingGenes.has(g)));
        return next;
      } else {
        const next = [...prev, panelId];
        // Add new genes from the added panel (deduped)
        const panel = genes?.panels?.[panelId];
        if (panel?.allGenes) {
          setSelectedGenes(prevGenes => {
            const existing = new Set(prevGenes);
            const toAdd = panel.allGenes.filter(g => !existing.has(g));
            return toAdd.length > 0 ? [...prevGenes, ...toAdd] : prevGenes;
          });
        }
        return next;
      }
    });
  }, [genes, getGenesFromPanels]);

  // Backward compat: selectPanel sets a single panel (replaces all)
  const selectPanel = useCallback((panelId) => {
    setSelectedPanels([panelId]);
    if (genes?.panels?.[panelId]?.allGenes) {
      setSelectedGenes(genes.panels[panelId].allGenes);
    }
  }, [genes]);

  // Sort actions
  const setSorting = useCallback((by, gene = null, direction = 'asc') => {
    setSortBy(by);
    setSortGene(gene);
    setSortDirection(direction);
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // Modal actions
  const openCellDetail = useCallback((cellLineId, gene) => {
    setSelectedCell({ cellLineId, gene });
  }, []);

  const closeCellDetail = useCallback(() => {
    setSelectedCell(null);
  }, []);

  // Display options actions
  const toggleCNV = useCallback(() => {
    setShowCNV(prev => !prev);
  }, []);

  const toggleSNV = useCallback(() => {
    setShowSNV(prev => !prev);
  }, []);

  // Toggle bg overlay: turn off all others, then flip the target.
  // Each toggle disables everything else first, then sets itself.
  const toggleCRISPR = useCallback(() => {
    setShowCRISPR(prev => {
      const next = !prev;
      if (next) {
        setShowRNAi(false);
        setShowExpression(false);
        setShowProteomics(false);
        setShowDrugSensitivity(false);
        setSelectedDrug(null);
      }
      return next;
    });
  }, []);

  const toggleRNAi = useCallback(() => {
    setShowRNAi(prev => {
      const next = !prev;
      if (next) {
        setShowCRISPR(false);
        setShowExpression(false);
        setShowProteomics(false);
        setShowDrugSensitivity(false);
        setSelectedDrug(null);
      }
      return next;
    });
  }, []);

  const toggleExpression = useCallback(() => {
    setShowExpression(prev => {
      const next = !prev;
      if (next) {
        setShowCRISPR(false);
        setShowRNAi(false);
        setShowProteomics(false);
        setShowDrugSensitivity(false);
        setSelectedDrug(null);
      }
      return next;
    });
  }, []);

  const toggleProteomics = useCallback(() => {
    setShowProteomics(prev => {
      const next = !prev;
      if (next) {
        setShowCRISPR(false);
        setShowRNAi(false);
        setShowExpression(false);
        setShowDrugSensitivity(false);
        setSelectedDrug(null);
      }
      return next;
    });
  }, []);

  const toggleDrugSensitivity = useCallback(() => {
    setShowDrugSensitivity(prev => {
      const next = !prev;
      if (next) {
        setShowCRISPR(false);
        setShowRNAi(false);
        setShowExpression(false);
        setShowProteomics(false);
      }
      if (!next) setSelectedDrug(null);
      return next;
    });
  }, []);

  const selectDrug = useCallback((drug) => {
    setSelectedDrug(drug);
  }, []);

  // Context menu actions
  const openContextMenu = useCallback((type, x, y, data) => {
    setContextMenu({ type, x, y, data });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Highlight actions
  const toggleHighlightGene = useCallback((gene) => {
    setHighlightedGene(prev => prev === gene ? null : gene);
  }, []);

  const toggleHighlightCellLine = useCallback((cellLineId) => {
    setHighlightedCellLine(prev => prev === cellLineId ? null : cellLineId);
  }, []);

  const highlightCrosshair = useCallback((gene, cellLineId) => {
    setHighlightedGene(prev => prev === gene ? null : gene);
    setHighlightedCellLine(prev => prev === cellLineId ? null : cellLineId);
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedGene(null);
    setHighlightedCellLine(null);
  }, []);

  // Hidden cell lines actions
  const hideCellLine = useCallback((cellLineId) => {
    setHiddenCellLines(prev => new Set([...prev, cellLineId]));
  }, []);

  const showAllCellLines = useCallback(() => {
    setHiddenCellLines(new Set());
  }, []);

  const toggleFreezerOnly = useCallback(() => {
    setFilterFreezerOnly(prev => !prev);
  }, []);

  const value = {
    // Filter state
    selectedSubtypes,
    selectedGenes,
    selectedPanels,
    // Display options
    showCNV,
    showSNV,
    showCRISPR,
    showRNAi,
    showExpression,
    showProteomics,
    showDrugSensitivity,
    selectedDrug,
    // Sort state
    sortBy,
    sortGene,
    sortDirection,
    // Modal state
    selectedCell,
    // Filter actions
    toggleSubtype,
    clearSubtypeFilter,
    setSubtypeFilter,
    // Gene actions
    addGene,
    removeGene,
    setGenes,
    resetGenes,
    togglePanel,
    selectPanel,
    // Display options actions
    toggleCNV,
    toggleSNV,
    toggleCRISPR,
    toggleRNAi,
    toggleExpression,
    toggleProteomics,
    toggleDrugSensitivity,
    selectDrug,
    // Sort actions
    setSorting,
    toggleSortDirection,
    // Modal actions
    openCellDetail,
    closeCellDetail,
    // Context menu
    contextMenu,
    openContextMenu,
    closeContextMenu,
    // Highlights
    highlightedGene,
    highlightedCellLine,
    toggleHighlightGene,
    toggleHighlightCellLine,
    highlightCrosshair,
    clearHighlights,
    // Hidden cell lines
    hiddenCellLines,
    hideCellLine,
    showAllCellLines,
    // Freezer inventory filter
    filterFreezerOnly,
    toggleFreezerOnly
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
}
