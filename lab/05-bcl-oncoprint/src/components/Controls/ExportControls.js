import React, { useState, useCallback } from 'react';
import { useFilter } from '../../context/FilterContext';
import { useData } from '../../context/DataContext';
import {
  exportAsPNG,
  exportAsPDF,
  exportAsCSV,
  exportSummaryCSV,
  generateShareableURL
} from '../../utils/exportUtils';
import './ExportControls.css';

function ExportControls() {
  const [isExporting, setIsExporting] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const { selectedPanels, selectedGenes, selectedSubtypes, sortBy, sortGene, sortDirection, showCNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug, hiddenCellLines } = useFilter();
  const { cellLines, getMutations, getCnv, getCrisprDep, getCrisprEffect, getRnaiEffect, getRnaiDep, getExpression, getProteomics, getDrugSensitivity, getLymphgenSubtype } = useData();

  // Join panel IDs for filenames
  const panelSlug = selectedPanels.join('+');

  // Get filtered cell lines (same logic as OncoprintGrid)
  const filteredCellLines = React.useMemo(() => {
    let lines = [...cellLines];
    if (selectedSubtypes.length > 0) {
      lines = lines.filter(cl => selectedSubtypes.includes(cl.subtype));
    }
    // Exclude hidden cell lines from export (match what's visible on grid)
    if (hiddenCellLines.size > 0) {
      lines = lines.filter(cl => !hiddenCellLines.has(cl.id));
    }
    return lines;
  }, [cellLines, selectedSubtypes, hiddenCellLines]);

  const handleExportPNG = useCallback(async () => {
    setIsExporting(true);
    try {
      const svg = document.querySelector('.oncoprint-svg');
      await exportAsPNG(svg, `oncoprint_${panelSlug}_${new Date().toISOString().split('T')[0]}.png`);
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('Export failed. Please try again.');
    }
    setIsExporting(false);
  }, [panelSlug]);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const svg = document.querySelector('.oncoprint-svg');
      const title = `DLBCL Oncoprint - ${selectedPanels.map(p => p.replace(/_/g, ' ')).join(' + ')}`;
      await exportAsPDF(svg, `oncoprint_${panelSlug}_${new Date().toISOString().split('T')[0]}.pdf`, title);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Export failed. Please try again.');
    }
    setIsExporting(false);
  }, [panelSlug, selectedPanels]);

  const handleExportCSV = useCallback(() => {
    exportAsCSV(
      filteredCellLines,
      selectedGenes,
      getMutations,
      getCnv,
      `oncoprint_data_${panelSlug}_${new Date().toISOString().split('T')[0]}.csv`,
      getCrisprDep,
      getCrisprEffect,
      getRnaiEffect,
      getRnaiDep,
      getExpression,
      getProteomics,
      getDrugSensitivity,
      selectedDrug,
      getLymphgenSubtype
    );
  }, [filteredCellLines, selectedGenes, getMutations, getCnv, getCrisprDep, getCrisprEffect, getRnaiEffect, getRnaiDep, getExpression, getProteomics, getDrugSensitivity, selectedDrug, getLymphgenSubtype, panelSlug]);

  const handleExportSummary = useCallback(() => {
    exportSummaryCSV(
      filteredCellLines,
      selectedGenes,
      getMutations,
      getCnv,
      `oncoprint_summary_${panelSlug}_${new Date().toISOString().split('T')[0]}.csv`
    );
  }, [filteredCellLines, selectedGenes, getMutations, getCnv, panelSlug]);

  const handleCopyURL = useCallback(() => {
    const state = {
      selectedPanels,
      selectedGenes,
      selectedSubtypes,
      sortBy,
      sortGene,
      sortDirection,
      showCNV,
      showCRISPR,
      showRNAi,
      showExpression,
      showProteomics,
      showDrugSensitivity,
      selectedDrug
    };

    const url = generateShareableURL(state);

    navigator.clipboard.writeText(url).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);

      // Also update the browser URL without reloading
      window.history.replaceState({}, '', url);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      // Fallback: show the URL in a prompt
      prompt('Copy this URL:', url);
    });
  }, [selectedPanels, selectedGenes, selectedSubtypes, sortBy, sortGene, sortDirection, showCNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug]);

  return (
    <div className="control-section export-controls">
      <h3>Export & Share</h3>

      <div className="export-buttons">
        <button
          className="export-btn"
          onClick={handleExportPNG}
          disabled={isExporting}
          title="Export as PNG image"
        >
          {isExporting ? '...' : 'PNG'}
        </button>

        <button
          className="export-btn"
          onClick={handleExportPDF}
          disabled={isExporting}
          title="Export as PDF document"
        >
          {isExporting ? '...' : 'PDF'}
        </button>

        <button
          className="export-btn"
          onClick={handleExportCSV}
          title="Export mutation data as CSV"
        >
          CSV
        </button>

        <button
          className="export-btn"
          onClick={handleExportSummary}
          title="Export gene summary statistics"
        >
          Summary
        </button>
      </div>

      <button
        className={`share-btn ${showCopied ? 'copied' : ''}`}
        onClick={handleCopyURL}
        title="Copy shareable URL with current view"
      >
        {showCopied ? 'Copied!' : 'Copy Share Link'}
      </button>
    </div>
  );
}

export default ExportControls;
