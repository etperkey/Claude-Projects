import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import FREEZER_INVENTORY from '../../data/freezerInventory';
import './OncoprintGrid.css';

// Subtype full names for tooltips
const SUBTYPE_LABELS = {
  'DLBCL_GCB': 'Diffuse Large B-Cell Lymphoma, Germinal Center B-cell subtype',
  'DLBCL_ABC': 'Diffuse Large B-Cell Lymphoma, Activated B-Cell subtype',
  'Burkitt':   'Burkitt Lymphoma',
  'MCL':       'Mantle Cell Lymphoma',
  'FL':        'Follicular Lymphoma',
  'CLL':       'Chronic Lymphocytic Leukemia',
  'PEL':       'Primary Effusion Lymphoma',
  'MZL':       'Marginal Zone Lymphoma',
  'PMBL':      'Primary Mediastinal B-Cell Lymphoma',
  'Other':     'Other B-cell Lymphoma',
  'Contaminated': 'Contaminated Cell Line',
};

// Layout constants
const CELL_WIDTH = 14;
const CELL_HEIGHT = 18;
const CELL_GAP = 2;
const GENE_LABEL_WIDTH = 100;
const SUBTYPE_BAR_HEIGHT = 22;
const CATEGORY_BAR_WIDTH = 6;
const CHAR_WIDTH = 5.4;  // approx width per char at 9px sans-serif
const LABEL_PAD = 12;    // extra breathing room

function OncoprintGrid() {
  const svgRef = useRef(null);
  const { cellLines, genes, getMutations, getCnv, getMutationCount, getCategoryColor, getPanel, getFusionsForCellLine, getCrisprDep, getCrisprEffect, hasCrisprData, getRnaiEffect, hasRnaiData, getExpression, hasExpressionData, getProteomics, hasProteomicsData, getDrugSensitivity, hasDrugData, getLymphgenSubtype } = useData();
  const {
    selectedSubtypes, selectedGenes, selectedPanels, sortBy, sortGene, sortDirection,
    showCNV, showSNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug,
    openCellDetail, setSorting,
    openContextMenu, highlightedGene, highlightedCellLine, hiddenCellLines, filterFreezerOnly
  } = useFilter();

  // Filter and sort cell lines
  const filteredCellLines = useMemo(() => {
    let lines = [...cellLines];

    // Filter by subtype
    if (selectedSubtypes.length > 0) {
      lines = lines.filter(cl => selectedSubtypes.includes(cl.subtype));
    }

    // Filter out hidden cell lines
    if (hiddenCellLines.size > 0) {
      lines = lines.filter(cl => !hiddenCellLines.has(cl.id));
    }

    // Filter to freezer inventory only
    if (filterFreezerOnly) {
      lines = lines.filter(cl => FREEZER_INVENTORY[cl.name]);
    }

    // Hide cell lines without data for the active overlay
    if (showCRISPR) {
      lines = lines.filter(cl => hasCrisprData(cl.id));
    } else if (showRNAi) {
      lines = lines.filter(cl => hasRnaiData(cl.id));
    } else if (showExpression) {
      lines = lines.filter(cl => hasExpressionData(cl.id));
    } else if (showProteomics) {
      lines = lines.filter(cl => hasProteomicsData(cl.id));
    } else if (showDrugSensitivity) {
      lines = lines.filter(cl => hasDrugData(cl.id));
    }

    // Sort — all modes use subtype as tiebreaker so ties look grouped
    if (sortBy === 'subtype') {
      lines.sort((a, b) => {
        const cmp = a.subtype.localeCompare(b.subtype);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (sortBy === 'mutationCount') {
      lines.sort((a, b) => {
        const countA = getMutationCount(a.id);
        const countB = getMutationCount(b.id);
        const primary = sortDirection === 'asc' ? countA - countB : countB - countA;
        return primary !== 0 ? primary : a.subtype.localeCompare(b.subtype);
      });
    } else if (sortBy === 'gene' && sortGene) {
      lines.sort((a, b) => {
        // When any bg overlay is on, push screened lines left (before unscreened)
        if (showCRISPR || showRNAi || showExpression || showProteomics || showDrugSensitivity) {
          const screenedA = (showCRISPR && hasCrisprData(a.id)) || (showRNAi && hasRnaiData(a.id)) || (showExpression && hasExpressionData(a.id)) || (showProteomics && hasProteomicsData(a.id)) || (showDrugSensitivity && hasDrugData(a.id)) ? 1 : 0;
          const screenedB = (showCRISPR && hasCrisprData(b.id)) || (showRNAi && hasRnaiData(b.id)) || (showExpression && hasExpressionData(b.id)) || (showProteomics && hasProteomicsData(b.id)) || (showDrugSensitivity && hasDrugData(b.id)) ? 1 : 0;
          if (screenedA !== screenedB) return screenedB - screenedA;  // screened first
        }
        const mutA = getMutations(a.id, sortGene).length;
        const mutB = getMutations(b.id, sortGene).length;
        // Primary sort: SNV count
        const snvCmp = sortDirection === 'asc' ? mutA - mutB : mutB - mutA;
        if (snvCmp !== 0) return snvCmp;
        // Secondary sort: CRISPR gene effect (when enabled)
        if (showCRISPR) {
          const effA = getCrisprEffect(a.id, sortGene) ?? getCrisprDep(a.id, sortGene) ?? 0;
          const effB = getCrisprEffect(b.id, sortGene) ?? getCrisprDep(b.id, sortGene) ?? 0;
          const effCmp = sortDirection === 'asc' ? effA - effB : effB - effA;
          if (Math.abs(effCmp) > 0.001) return effCmp;
        }
        // Secondary sort: RNAi gene effect (when enabled, after CRISPR)
        if (showRNAi) {
          const rEffA = getRnaiEffect(a.id, sortGene) ?? 0;
          const rEffB = getRnaiEffect(b.id, sortGene) ?? 0;
          const rEffCmp = sortDirection === 'asc' ? rEffA - rEffB : rEffB - rEffA;
          if (Math.abs(rEffCmp) > 0.001) return rEffCmp;
        }
        // Secondary sort: Expression (when enabled)
        if (showExpression) {
          const exprA = getExpression(a.id, sortGene) ?? 0;
          const exprB = getExpression(b.id, sortGene) ?? 0;
          const exprCmp = sortDirection === 'asc' ? exprA - exprB : exprB - exprA;
          if (Math.abs(exprCmp) > 0.001) return exprCmp;
        }
        // Secondary sort: Proteomics (when enabled)
        if (showProteomics) {
          const protA = getProteomics(a.id, sortGene) ?? 0;
          const protB = getProteomics(b.id, sortGene) ?? 0;
          const protCmp = sortDirection === 'asc' ? protA - protB : protB - protA;
          if (Math.abs(protCmp) > 0.001) return protCmp;
        }
        // Secondary sort: Drug sensitivity (when enabled, column-level)
        if (showDrugSensitivity && selectedDrug) {
          const drugA = getDrugSensitivity(a.id, selectedDrug.i) ?? 0;
          const drugB = getDrugSensitivity(b.id, selectedDrug.i) ?? 0;
          const drugCmp = sortDirection === 'asc' ? drugA - drugB : drugB - drugA;
          if (Math.abs(drugCmp) > 0.001) return drugCmp;
        }
        // Tertiary sort: CNV (only when CNV display is enabled)
        if (showCNV) {
          const cnvA = getCnv(a.id, sortGene);
          const cnvB = getCnv(b.id, sortGene);
          const cnvScoreA = cnvA && cnvA.status !== 'neutral' ? 1 : 0;
          const cnvScoreB = cnvB && cnvB.status !== 'neutral' ? 1 : 0;
          const cnvCmp = sortDirection === 'asc' ? cnvScoreA - cnvScoreB : cnvScoreB - cnvScoreA;
          if (cnvCmp !== 0) return cnvCmp;
        }
        // Tiebreaker: subtype grouping
        return a.subtype.localeCompare(b.subtype);
      });
    }

    return lines;
  }, [cellLines, selectedSubtypes, sortBy, sortGene, sortDirection, showCNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug, getMutationCount, getMutations, getCnv, getCrisprDep, getCrisprEffect, hasCrisprData, getRnaiEffect, hasRnaiData, getExpression, hasExpressionData, getProteomics, hasProteomicsData, getDrugSensitivity, hasDrugData, hiddenCellLines, filterFreezerOnly]);

  // Group genes by category from selected panels (first-panel-wins dedup)
  const geneGroups = useMemo(() => {
    const groups = [];
    const categorizedGenes = new Set();

    // Iterate panels in order; first panel wins for shared genes
    selectedPanels.forEach(panelId => {
      const panel = getPanel(panelId);
      if (!panel?.categories) return;

      Object.entries(panel.categories).forEach(([category, panelGenes]) => {
        const matchingGenes = selectedGenes.filter(
          g => panelGenes.includes(g) && !categorizedGenes.has(g)
        );
        if (matchingGenes.length > 0) {
          // Merge into existing group with same category name, or create new
          const existing = groups.find(gr => gr.category === category);
          if (existing) {
            existing.genes.push(...matchingGenes);
          } else {
            groups.push({ category, genes: [...matchingGenes] });
          }
          matchingGenes.forEach(g => categorizedGenes.add(g));
        }
      });
    });

    // Fallback if no panels matched
    if (groups.length === 0 && selectedGenes.length > 0 && selectedPanels.length === 0) {
      return [{ category: 'genes', genes: selectedGenes }];
    }

    // Add any uncategorized genes (genes added from search that aren't in any panel)
    const uncategorized = selectedGenes.filter(g => !categorizedGenes.has(g));
    if (uncategorized.length > 0) {
      groups.push({ category: 'other', genes: uncategorized });
    }

    return groups;
  }, [selectedGenes, selectedPanels, getPanel]);

  // Flatten genes with category info
  const orderedGenes = useMemo(() => {
    return geneGroups.flatMap(group =>
      group.genes.map(gene => ({ gene, category: group.category }))
    );
  }, [geneGroups]);

  // Draw the grid
  useEffect(() => {
    if (!svgRef.current || filteredCellLines.length === 0 || orderedGenes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nSamples = filteredCellLines.length;
    const nGenes = orderedGenes.length;

    const gridWidth = nSamples * (CELL_WIDTH + CELL_GAP);
    const gridHeight = nGenes * (CELL_HEIGHT + CELL_GAP);

    // Compute label overflow from longest name rotated -45 degrees
    const maxNameLen = Math.max(...filteredCellLines.map(cl => cl.name.length));
    const textWidth = maxNameLen * CHAR_WIDTH;
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const labelOverflowRight = Math.ceil(textWidth * cos45) + LABEL_PAD;
    const sampleLabelHeight = Math.ceil(textWidth * sin45) + LABEL_PAD;

    const totalWidth = GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 8 + gridWidth + labelOverflowRight;
    const totalHeight = sampleLabelHeight + SUBTYPE_BAR_HEIGHT + 8 + gridHeight + 20;

    svg
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    // CRISPR Chronos gene effect diverging color scale
    // Blue = positive (loss promotes growth / tumor suppressor)
    // White = neutral (no effect)
    // Red = negative (essential / dependency)
    // Calibrated to Chronos distribution: p5=-1.21, p95=+0.24 in our NHL data
    const crisprEffectScale = d3.scaleLinear()
      .domain([-1.5, -0.5, 0, 0.2, 0.5])
      .range(['#991b1b', '#ef4444', '#f8f8f8', '#93c5fd', '#1d4ed8'])
      .clamp(true);

    // Keep dependency probability scale for fallback
    const crisprColorScale = d3.scaleLinear()
      .domain([0, 0.3, 0.5, 0.75, 1.0])
      .range(['#ffffff', '#fef9c3', '#fed7aa', '#fca5a5', '#dc2626'])
      .clamp(true);

    // RNAi DEMETER2 gene effect diverging color scale
    // DEMETER2 has narrower range than Chronos: p5=-0.67, p95=+0.37 in our NHL data
    // Calibrated independently for DEMETER2 distribution
    const rnaiEffectScale = d3.scaleLinear()
      .domain([-1.0, -0.3, 0, 0.2, 0.5])
      .range(['#991b1b', '#ef4444', '#f8f8f8', '#93c5fd', '#1d4ed8'])
      .clamp(true);

    // Gene expression sequential warm color scale
    // Gray (not expressed) → Yellow → Orange → Red (highly expressed)
    const expressionScale = d3.scaleLinear()
      .domain([0, 1, 3, 6, 10])
      .range(['#9ca3af', '#fde68a', '#fbbf24', '#ea580c', '#991b1b'])
      .clamp(true);

    // Proteomics z-score diverging color scale
    // Blue = low protein, White = average, Red = high protein
    const proteomicsScale = d3.scaleLinear()
      .domain([-2, -0.5, 0, 0.5, 2])
      .range(['#1d4ed8', '#93c5fd', '#f8f8f8', '#fca5a5', '#991b1b'])
      .clamp(true);

    // Drug sensitivity color scale (logFC viability: negative = more sensitive)
    // Red = sensitive (negative logFC), White = neutral (~0), Blue = resistant (positive)
    const drugScale = d3.scaleLinear()
      .domain([-3, -1, 0, 0.5])
      .range(['#991b1b', '#ef4444', '#f8f8f8', '#1d4ed8'])
      .clamp(true);

    // SVG defs: diagonal hatch pattern (always needed for non-DepMap lines + overlays)
    const defs = svg.append('defs');
    defs.append('pattern')
      .attr('id', 'crispr-no-data-hatch')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6)
      .append('path')
      .attr('d', 'M0,6 L6,0')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1);

    const g = svg.append('g')
      .attr('transform', `translate(${GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 8}, ${sampleLabelHeight + SUBTYPE_BAR_HEIGHT + 8})`);

    // Top-left corner: double-click to sort by subtype
    const topLeft = svg.append('g')
      .attr('transform', `translate(0, ${sampleLabelHeight - SUBTYPE_BAR_HEIGHT - 4})`)
      .attr('cursor', 'pointer');

    topLeft.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 4)
      .attr('height', SUBTYPE_BAR_HEIGHT + 4)
      .attr('fill', sortBy === 'subtype' ? 'var(--accent-primary)' : 'var(--bg-tertiary)')
      .attr('rx', 3)
      .attr('opacity', 0.6);

    topLeft.append('text')
      .attr('x', (GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 4) / 2)
      .attr('y', (SUBTYPE_BAR_HEIGHT + 4) / 2 + 3)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', sortBy === 'subtype' ? '700' : '500')
      .attr('fill', sortBy === 'subtype' ? '#fff' : 'var(--text-secondary)')
      .attr('pointer-events', 'none')
      .text(sortBy === 'subtype' ? 'Sorted by Subtype' : 'Sort by Subtype');

    topLeft.append('title')
      .text('Double-click to sort cell lines by subtype');

    topLeft.on('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSorting('subtype', null, 'asc');
    });

    // Draw subtype color bar
    const subtypeBar = svg.append('g')
      .attr('transform', `translate(${GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 8}, ${sampleLabelHeight - 4})`);

    filteredCellLines.forEach((cl, i) => {
      const cellX = i * (CELL_WIDTH + CELL_GAP);
      const subtypeGroup = subtypeBar.append('g')
        .attr('cursor', 'pointer');

      subtypeGroup.append('rect')
        .attr('x', cellX)
        .attr('y', 0)
        .attr('width', CELL_WIDTH)
        .attr('height', SUBTYPE_BAR_HEIGHT)
        .attr('fill', genes.subtypeColors[cl.subtype] || genes.subtypeColors['Other'])
        .attr('rx', 2);

      // LymphGen text overlay on subtype bar
      const lgData = getLymphgenSubtype(cl.id);
      if (lgData) {
        const geneticSub = lgData.s.split('/')[0];
        const tlSub = lgData.tl;
        const isDiscordant = tlSub && lgData.c !== 'tlg' && tlSub !== geneticSub;
        const isTlgOnly = lgData.c === 'tlg';

        // Primary genetic LymphGen label (white) — top row if discordant, centered if not
        if (!isTlgOnly) {
          subtypeGroup.append('text')
            .attr('x', cellX + CELL_WIDTH / 2)
            .attr('y', isDiscordant ? 8 : SUBTYPE_BAR_HEIGHT / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '6px')
            .attr('font-weight', '700')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(geneticSub);
        }

        // tLymphGen label (yellow) — bottom row if discordant, or centered if tLG-only
        if (isDiscordant) {
          subtypeGroup.append('text')
            .attr('x', cellX + CELL_WIDTH / 2)
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '5.5px')
            .attr('font-weight', '600')
            .attr('fill', '#fbbf24')
            .attr('pointer-events', 'none')
            .text(tlSub);
        } else if (isTlgOnly) {
          subtypeGroup.append('text')
            .attr('x', cellX + CELL_WIDTH / 2)
            .attr('y', SUBTYPE_BAR_HEIGHT / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '6px')
            .attr('font-weight', '700')
            .attr('fill', '#fbbf24')
            .attr('pointer-events', 'none')
            .text(geneticSub);
        }
      }

      // Enhanced tooltip with LymphGen info
      let tooltip = `${cl.name}\n${cl.subtype} — ${SUBTYPE_LABELS[cl.subtype] || cl.subtype}`;
      if (lgData) {
        let lgSource;
        if (lgData.c === 'lit') lgSource = lgData.src;
        else if (lgData.c === 'lg2') lgSource = `LymphGen 2.0, p=${lgData.p?.toFixed(2)}`;
        else if (lgData.c === 'tlg') lgSource = `tLymphGen, p=${lgData.tlp?.toFixed(2)}`;
        else {
          lgSource = 'heuristic';
          if (lgData.d && lgData.d.length > 0) lgSource += `: ${lgData.d.join(', ')}`;
        }
        tooltip += `\nLymphGen: ${lgData.s} (${lgSource})`;
        if (lgData.tl && lgData.c !== 'tlg') {
          tooltip += `\ntLymphGen: ${lgData.tl} (p=${lgData.tlp?.toFixed(2)})`;
        }
      }
      subtypeGroup.append('title').text(tooltip);

      subtypeGroup.on('click', (event) => {
        event.stopPropagation();
        openContextMenu('cellLine', event.clientX, event.clientY, {
          cellLineId: cl.id,
          cellLineName: cl.name
        });
      });
    });

    // Draw sample labels (rotated, interactive)
    const sampleLabels = svg.append('g')
      .attr('transform', `translate(${GENE_LABEL_WIDTH + CATEGORY_BAR_WIDTH + 8}, ${sampleLabelHeight - 8})`);

    filteredCellLines.forEach((cl, i) => {
      const freezerEntries = FREEZER_INVENTORY[cl.name];
      const inFreezer = !!freezerEntries;
      // Use first entry's color for the name; default to secondary text
      const nameColor = inFreezer ? freezerEntries[0].color : 'var(--text-secondary)';

      const labelGroup = sampleLabels.append('g')
        .attr('cursor', 'pointer')
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none');

      // Invisible hitbox for reliable click target
      labelGroup.append('rect')
        .attr('x', i * (CELL_WIDTH + CELL_GAP))
        .attr('y', -sampleLabelHeight + 8)
        .attr('width', CELL_WIDTH + CELL_GAP)
        .attr('height', sampleLabelHeight)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all');

      const cx = i * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2;
      const textEl = labelGroup.append('text')
        .attr('x', cx)
        .attr('y', 0)
        .attr('transform', `rotate(-45, ${cx}, 0)`)
        .attr('text-anchor', 'start')
        .attr('font-size', '9px')
        .attr('fill', nameColor)
        .attr('pointer-events', 'none');

      // Cell line name
      textEl.append('tspan').text(cl.name);

      // Append bold "k" for each freezer entry
      if (inFreezer) {
        freezerEntries.forEach(entry => {
          textEl.append('tspan')
            .attr('font-weight', '900')
            .attr('fill', entry.color)
            .text(' k');
        });
        textEl.append('title').text(freezerEntries.map(e => e.label).join('\n'));
      }

      labelGroup.on('click', (event) => {
        event.stopPropagation();
        openContextMenu('cellLine', event.clientX, event.clientY, {
          cellLineId: cl.id,
          cellLineName: cl.name
        });
      });
    });

    // Draw gene category bar
    const categoryBar = svg.append('g')
      .attr('transform', `translate(${GENE_LABEL_WIDTH}, ${sampleLabelHeight + SUBTYPE_BAR_HEIGHT + 8})`);

    let yOffset = 0;
    geneGroups.forEach(group => {
      const groupHeight = group.genes.length * (CELL_HEIGHT + CELL_GAP) - CELL_GAP;
      categoryBar.append('rect')
        .attr('x', 0)
        .attr('y', yOffset)
        .attr('width', CATEGORY_BAR_WIDTH)
        .attr('height', groupHeight)
        .attr('fill', getCategoryColor(group.category))
        .attr('rx', 2);
      yOffset += groupHeight + CELL_GAP;
    });

    // Draw gene labels (double-click to sort by gene)
    const geneLabels = svg.append('g')
      .attr('transform', `translate(${GENE_LABEL_WIDTH - 8}, ${sampleLabelHeight + SUBTYPE_BAR_HEIGHT + 8})`);

    orderedGenes.forEach((geneInfo, i) => {
      const isActiveSortGene = sortBy === 'gene' && sortGene === geneInfo.gene;
      const labelY = i * (CELL_HEIGHT + CELL_GAP);

      const labelGroup = geneLabels.append('g')
        .attr('cursor', 'pointer')
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none');

      // Invisible hitbox rect for reliable click target
      labelGroup.append('rect')
        .attr('x', -GENE_LABEL_WIDTH + 8)
        .attr('y', labelY)
        .attr('width', GENE_LABEL_WIDTH - 8)
        .attr('height', CELL_HEIGHT)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all');

      labelGroup.append('text')
        .attr('x', 0)
        .attr('y', labelY + CELL_HEIGHT / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', isActiveSortGene ? '700' : '500')
        .attr('fill', isActiveSortGene ? 'var(--accent-primary)' : 'var(--text-primary)')
        .attr('pointer-events', 'none')
        .text(geneInfo.gene + (isActiveSortGene ? ' ▼' : ''));

      labelGroup.append('title')
        .text('Double-click to sort by this gene');

      labelGroup.on('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Toggle: if already sorting by this gene descending, clear sort
        if (sortBy === 'gene' && sortGene === geneInfo.gene) {
          setSorting('subtype', null, 'asc');
        } else {
          setSorting('gene', geneInfo.gene, 'desc');
        }
      });

      labelGroup.on('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openContextMenu('gene', event.clientX, event.clientY, {
          gene: geneInfo.gene
        });
      });
    });

    // Build fusion lookup: Map of "cellLineId|gene" → partner info string
    const fusionCells = new Map();
    filteredCellLines.forEach(cl => {
      const fusions = getFusionsForCellLine(cl.id);
      fusions.forEach(fu => {
        const left = fu.leftGene?.split(' ')[0] || '';
        const right = fu.rightGene?.split(' ')[0] || '';
        // Normalize IG loci
        const leftNorm = left.startsWith('IGH') ? 'IGH' : left.startsWith('IGK') ? 'IGK' : left.startsWith('IGL') ? 'IGL' : left;
        const rightNorm = right.startsWith('IGH') ? 'IGH' : right.startsWith('IGK') ? 'IGK' : right.startsWith('IGL') ? 'IGL' : right;
        const src = fu.source === 'curated' ? 'curated' : 'RNA-seq';
        // For IG-partner fusions, mark the non-IG gene with the IG partner
        if (['IGH','IGK','IGL'].includes(leftNorm)) {
          const key = `${cl.id}|${right}`;
          const existing = fusionCells.get(key);
          const entry = `${leftNorm} (${src})`;
          fusionCells.set(key, existing ? `${existing}, ${entry}` : entry);
        } else if (['IGH','IGK','IGL'].includes(rightNorm)) {
          const key = `${cl.id}|${left}`;
          const existing = fusionCells.get(key);
          const entry = `${rightNorm} (${src})`;
          fusionCells.set(key, existing ? `${existing}, ${entry}` : entry);
        } else {
          // Non-IG structural fusion — mark both genes with the other as partner
          const keyL = `${cl.id}|${left}`;
          const keyR = `${cl.id}|${right}`;
          const existL = fusionCells.get(keyL);
          const existR = fusionCells.get(keyR);
          const entryL = `${right} (${src})`;
          const entryR = `${left} (${src})`;
          fusionCells.set(keyL, existL ? `${existL}, ${entryL}` : entryL);
          fusionCells.set(keyR, existR ? `${existR}, ${entryR}` : entryR);
        }
      });
    });

    // Draw cells
    filteredCellLines.forEach((cl, sampleIdx) => {
      orderedGenes.forEach((geneInfo, geneIdx) => {
        const x = sampleIdx * (CELL_WIDTH + CELL_GAP);
        const y = geneIdx * (CELL_HEIGHT + CELL_GAP);

        const mutations = getMutations(cl.id, geneInfo.gene);
        const cnvData = getCnv(cl.id, geneInfo.gene);
        const fusionPartner = fusionCells.get(`${cl.id}|${geneInfo.gene}`);
        const hasFusion = !!fusionPartner;

        const cellGroup = g.append('g')
          .attr('class', 'oncoprint-cell')
          .attr('transform', `translate(${x}, ${y})`)
          .style('cursor', 'pointer')
          .on('click', () => {
            openCellDetail(cl.id, geneInfo.gene);
          })
          .on('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openContextMenu('cell', event.clientX, event.clientY, {
              gene: geneInfo.gene,
              cellLineId: cl.id,
              cellLineName: cl.name
            });
          });

        // Background priority: fusion > active bg overlay > CNV > neutral gray
        // All bg overlays are mutually exclusive (enforced by FilterContext).
        // Non-DepMap lines (KLINE-*) always get hatch since they have no data.
        const isNonDepMap = cl.id.startsWith('KLINE-');
        let bgColor = '#f1f5f9';  // Light gray default
        let useHatch = isNonDepMap;  // always hatch non-DepMap lines
        let screenOverlayApplied = false;

        if (hasFusion) {
          bgColor = genes.fusionColor || '#fecaca';
        } else if (showDrugSensitivity && selectedDrug) {
          // Drug sensitivity: column-level (same color for all genes in a column)
          const hasDrug = hasDrugData(cl.id);
          if (hasDrug) {
            const drugVal = getDrugSensitivity(cl.id, selectedDrug.i);
            if (drugVal !== null) {
              bgColor = drugScale(drugVal);
              screenOverlayApplied = true;
            }
            if (!screenOverlayApplied) {
              useHatch = true;
            }
          } else {
            useHatch = true;
          }
        } else if (showProteomics) {
          const hasProt = hasProteomicsData(cl.id);
          if (hasProt) {
            const protVal = getProteomics(cl.id, geneInfo.gene);
            if (protVal !== null) {
              bgColor = proteomicsScale(protVal);
              screenOverlayApplied = true;
            }
            if (!screenOverlayApplied) {
              useHatch = true;
            }
          } else {
            useHatch = true;
          }
        } else if (showExpression) {
          const hasExpr = hasExpressionData(cl.id);
          if (hasExpr) {
            const exprVal = getExpression(cl.id, geneInfo.gene);
            if (exprVal !== null) {
              bgColor = expressionScale(exprVal);
              screenOverlayApplied = true;
            }
            if (!screenOverlayApplied) {
              useHatch = true;
            }
          } else {
            useHatch = true;
          }
        } else if (showCRISPR || showRNAi) {
          const hasCrispr = showCRISPR && hasCrisprData(cl.id);
          const hasRnai = showRNAi && hasRnaiData(cl.id);

          if (hasCrispr) {
            // CRISPR gene effect (bidirectional) preferred over dependency probability
            const effectVal = getCrisprEffect(cl.id, geneInfo.gene);
            if (effectVal !== null) {
              bgColor = crisprEffectScale(effectVal);
              screenOverlayApplied = true;
            } else {
              const crisprProb = getCrisprDep(cl.id, geneInfo.gene);
              if (crisprProb !== null) {
                bgColor = crisprColorScale(crisprProb);
                screenOverlayApplied = true;
              }
            }
          }

          // Fallback to RNAi if CRISPR didn't apply (unscreened or no data for this gene)
          if (!screenOverlayApplied && hasRnai) {
            const rnaiEff = getRnaiEffect(cl.id, geneInfo.gene);
            if (rnaiEff !== null) {
              bgColor = rnaiEffectScale(rnaiEff);
              screenOverlayApplied = true;
            }
          }

          // If neither screen had data for this line, show hatch
          if (!screenOverlayApplied && !hasCrispr && !hasRnai) {
            useHatch = true;
          }
        }

        // CNV background when no screen overlay is active
        if (!screenOverlayApplied && !hasFusion && !useHatch && showCNV && cnvData && cnvData.status !== 'neutral') {
          bgColor = genes.cnvColors[cnvData.status] || '#f1f5f9';
        }

        cellGroup.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', CELL_WIDTH)
          .attr('height', CELL_HEIGHT)
          .attr('fill', bgColor)
          .attr('rx', 2)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 0.5);

        // Fusion partner tooltip on hover
        if (hasFusion) {
          cellGroup.append('title')
            .text(`${geneInfo.gene} fusion partner: ${fusionPartner}`);
        }

        // Hatch overlay for unscreened lines (CRISPR no-data)
        if (useHatch) {
          cellGroup.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', CELL_WIDTH)
            .attr('height', CELL_HEIGHT)
            .attr('fill', 'url(#crispr-no-data-hatch)')
            .attr('rx', 2);
        }

        // Mutation indicator - more prominent
        if (showSNV && mutations.length > 0) {
          // Determine mutation type for styling
          // Putative GoF: hotspot missense that is NOT LoF/TSG
          // (excludes TP53/CREBBP/CDKN2A etc. hotspots which are LoF)
          const isGoF = mutations.some(m =>
            m.hotspot &&
            m.impact === 'MODERATE' &&
            !m.likelyLoF &&
            !m.tumorSuppressorHighImpact
          );

          // Truncating / LoF: HIGH impact, likelyLoF flag, or consequence keywords
          const isLoF = mutations.some(m =>
            m.impact === 'HIGH' || m.likelyLoF ||
            m.consequence?.includes('frameshift') ||
            m.consequence?.includes('nonsense') || m.consequence?.includes('stop_gained') ||
            m.consequence?.includes('splice')
          );

          // Biallelic evidence in cell lines (clonal, ~100% purity):
          // 1. Mutation + CNV loss (classic LOH)
          // 2. VAF ≥0.85 — in diploid cell lines, het mutations have VAF ≈50%;
          //    ≥85% indicates homozygous mutation, hemizygosity, or copy-neutral LOH
          const hasCNVLoss = cnvData && (cnvData.status === 'het_loss' || cnvData.status === 'hom_del');
          const hasHighVAF = mutations.some(m => m.af && m.af >= 0.85);
          const isBiallelic = hasCNVLoss || hasHighVAF;
          const isCompoundHet = mutations.length > 1;

          // Color: green=GoF, dark=LoF, gray=missense/other
          let mutColor = '#64748b';  // Default: missense / moderate
          if (isGoF) mutColor = '#16a34a';  // Green: putative gain-of-function
          else if (isLoF) mutColor = '#1e293b';  // Dark: truncating / loss-of-function

          // Main mutation bar - fill entire cell, color based on functional class
          cellGroup.append('rect')
            .attr('x', 2)
            .attr('y', 2)
            .attr('width', CELL_WIDTH - 4)
            .attr('height', CELL_HEIGHT - 4)
            .attr('fill', mutColor)
            .attr('rx', 2);

          // Biallelic indicator (star) - mutation + copy loss OR high VAF
          // Show when: CNV loss + showCNV enabled, OR high VAF (always show)
          const showBiallelicStar = (hasCNVLoss && showCNV) || hasHighVAF;

          // Center coordinates
          const centerX = CELL_WIDTH / 2;
          const centerY = CELL_HEIGHT / 2;

          // If both indicators, offset them vertically; otherwise center
          const hasBoth = (isBiallelic && showBiallelicStar) && isCompoundHet;

          if (isBiallelic && showBiallelicStar) {
            // Draw centered star (offset up if both indicators present)
            const starX = centerX;
            const starY = hasBoth ? centerY - 4 : centerY;
            const scale = 0.8;
            const starPath = `M${starX},${starY-4*scale} L${starX+1.2*scale},${starY-1.2*scale} L${starX+4*scale},${starY-1.2*scale} L${starX+2*scale},${starY+1*scale} L${starX+3*scale},${starY+4*scale} L${starX},${starY+2*scale} L${starX-3*scale},${starY+4*scale} L${starX-2*scale},${starY+1*scale} L${starX-4*scale},${starY-1.2*scale} L${starX-1.2*scale},${starY-1.2*scale} Z`;
            cellGroup.append('path')
              .attr('d', starPath)
              .attr('fill', '#ef4444')
              .attr('stroke', '#fff')
              .attr('stroke-width', 0.5);
          }

          // Multiple mutations / compound het indicator (yellow circle)
          if (isCompoundHet) {
            // Center circle (offset down if both indicators present)
            const circleY = hasBoth ? centerY + 4 : centerY;
            cellGroup.append('circle')
              .attr('cx', centerX)
              .attr('cy', circleY)
              .attr('r', 3)
              .attr('fill', '#fbbf24')
              .attr('stroke', '#fff')
              .attr('stroke-width', 0.5);
          }
        }

        // Hover effect handled by CSS
      });
    });

    // ── Highlight overlays (drawn last so they appear on top) ──
    const highlightGroup = g.append('g')
      .attr('class', 'highlight-overlays')
      .style('pointer-events', 'none');

    // Row highlight (gene)
    if (highlightedGene) {
      const geneIdx = orderedGenes.findIndex(gi => gi.gene === highlightedGene);
      if (geneIdx >= 0) {
        highlightGroup.append('rect')
          .attr('x', -2)
          .attr('y', geneIdx * (CELL_HEIGHT + CELL_GAP) - 1)
          .attr('width', gridWidth + 4)
          .attr('height', CELL_HEIGHT + 2)
          .attr('fill', 'rgba(59, 130, 246, 0.12)')
          .attr('stroke', 'rgba(59, 130, 246, 0.4)')
          .attr('stroke-width', 1)
          .attr('rx', 2);
      }
    }

    // Column highlight (cell line)
    if (highlightedCellLine) {
      const clIdx = filteredCellLines.findIndex(cl => cl.id === highlightedCellLine);
      if (clIdx >= 0) {
        highlightGroup.append('rect')
          .attr('x', clIdx * (CELL_WIDTH + CELL_GAP) - 1)
          .attr('y', -2)
          .attr('width', CELL_WIDTH + 2)
          .attr('height', gridHeight + 4)
          .attr('fill', 'rgba(59, 130, 246, 0.12)')
          .attr('stroke', 'rgba(59, 130, 246, 0.4)')
          .attr('stroke-width', 1)
          .attr('rx', 2);
      }
    }

  }, [filteredCellLines, orderedGenes, geneGroups, genes, getMutations, getCnv, getFusionsForCellLine, showCNV, showSNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug, getCrisprDep, getCrisprEffect, hasCrisprData, getRnaiEffect, hasRnaiData, getExpression, hasExpressionData, getProteomics, hasProteomicsData, getDrugSensitivity, hasDrugData, openCellDetail, sortBy, sortGene, setSorting, getCategoryColor, openContextMenu, highlightedGene, highlightedCellLine, getLymphgenSubtype]);

  if (filteredCellLines.length === 0) {
    return (
      <div className="oncoprint-empty">
        <p>No cell lines match the current filters.</p>
      </div>
    );
  }

  if (selectedGenes.length === 0) {
    return (
      <div className="oncoprint-empty">
        <p>No genes selected. Use the Gene Selector to add genes.</p>
      </div>
    );
  }

  return (
    <div className="oncoprint-grid-wrapper">
      <svg ref={svgRef} className="oncoprint-svg" onContextMenu={e => e.preventDefault()} />
    </div>
  );
}

export default OncoprintGrid;
