import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * Export the oncoprint SVG as PNG
 */
export async function exportAsPNG(svgElement, filename = 'oncoprint.png') {
  if (!svgElement) {
    console.error('No SVG element provided');
    return;
  }

  try {
    // Get the SVG's parent container for better capture
    const container = svgElement.closest('.oncoprint-grid-wrapper') || svgElement.parentElement;

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw error;
  }
}

/**
 * Export the oncoprint as PDF
 */
export async function exportAsPDF(svgElement, filename = 'oncoprint.pdf', title = 'DLBCL Cell Line Oncoprint') {
  if (!svgElement) {
    console.error('No SVG element provided');
    return;
  }

  try {
    const container = svgElement.closest('.oncoprint-grid-wrapper') || svgElement.parentElement;

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Determine orientation based on aspect ratio
    const isLandscape = imgWidth > imgHeight;
    const orientation = isLandscape ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [imgWidth / 2 + 40, imgHeight / 2 + 80], // Custom size with margins
    });

    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 20, 30);

    // Add timestamp
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);

    // Add the image
    pdf.addImage(imgData, 'PNG', 20, 60, imgWidth / 2, imgHeight / 2);

    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

/**
 * Export mutation data as CSV
 */
export function exportAsCSV(cellLines, genes, getMutations, getCnv, filename = 'oncoprint_data.csv', getCrisprDep = null, getCrisprEffect = null, getRnaiEffect = null, getRnaiDep = null, getExpression = null, getProteomics = null, getDrugSensitivity = null, selectedDrug = null, getLymphgenSubtype = null) {
  // RFC 4180 CSV escaping: quote fields containing commas, quotes, or newlines
  const csvEscape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [];

  // Header
  const header = ['Cell Line', 'DepMap ID', 'Subtype',
                  'LymphGen', 'LymphGen Source', 'tLymphGen', 'tLymphGen Prob',
                  'Gene', 'Protein Change', 'DNA Change',
                  'Consequence', 'Impact', 'VAF', 'CNV Status', 'CNV Copy Ratio', 'Biallelic Evidence',
                  'CRISPR Dependency', 'CRISPR Gene Effect', 'RNAi Effect', 'RNAi Dependency',
                  'Expression log2(TPM+1)', 'Proteomics Z-score'];
  if (selectedDrug) {
    header.push(`Drug Sensitivity (${selectedDrug.n})`);
  }
  rows.push(header.join(','));

  // Helper: resolve LymphGen fields for a cell line
  const lgFields = (cl) => {
    const lgData = getLymphgenSubtype ? getLymphgenSubtype(cl.id) : null;
    if (!lgData) return ['', '', '', ''];
    let source;
    if (lgData.c === 'lit') source = lgData.src;
    else if (lgData.c === 'lg2') source = `LymphGen 2.0 (p=${lgData.p?.toFixed(2)})`;
    else if (lgData.c === 'tlg') source = 'tLymphGen only';
    else source = `heuristic: ${(lgData.d || []).join('; ')}`;
    return [
      lgData.s,
      source,
      lgData.tl || '',
      lgData.tlp != null ? lgData.tlp.toFixed(3) : ''
    ];
  };

  // Data rows
  cellLines.forEach(cl => {
    genes.forEach(gene => {
      const mutations = getMutations(cl.id, gene);
      const cnv = getCnv(cl.id, gene);
      const crisprVal = getCrisprDep ? getCrisprDep(cl.id, gene) : null;
      const crisprStr = crisprVal !== null ? crisprVal.toFixed(3) : '';
      const effectVal = getCrisprEffect ? getCrisprEffect(cl.id, gene) : null;
      const effectStr = effectVal !== null ? effectVal.toFixed(4) : '';
      const rnaiEffVal = getRnaiEffect ? getRnaiEffect(cl.id, gene) : null;
      const rnaiEffStr = rnaiEffVal !== null ? rnaiEffVal.toFixed(4) : '';
      const rnaiDepVal = getRnaiDep ? getRnaiDep(cl.id, gene) : null;
      const rnaiDepStr = rnaiDepVal !== null ? rnaiDepVal.toFixed(3) : '';
      const exprVal = getExpression ? getExpression(cl.id, gene) : null;
      const exprStr = exprVal !== null ? exprVal.toFixed(3) : '';
      const protVal = getProteomics ? getProteomics(cl.id, gene) : null;
      const protStr = protVal !== null ? protVal.toFixed(3) : '';
      const drugVal = (getDrugSensitivity && selectedDrug) ? getDrugSensitivity(cl.id, selectedDrug.i) : null;
      const drugStr = drugVal !== null ? drugVal.toFixed(4) : '';

      if (mutations.length > 0 || (cnv && cnv.status !== 'neutral')) {
        if (mutations.length > 0) {
          mutations.forEach(mut => {
            const hasHighVAF = mut.af && mut.af >= 0.85;
            const hasCNVLoss = cnv && (cnv.status === 'het_loss' || cnv.status === 'hom_del');
            const biallelicEvidence = [];
            if (hasCNVLoss) biallelicEvidence.push('CNV Loss');
            if (hasHighVAF) biallelicEvidence.push('High VAF');

            const rowData = [
              csvEscape(cl.name),
              cl.id,
              cl.subtype,
              ...lgFields(cl),
              gene,
              csvEscape(mut.proteinChange || ''),
              csvEscape(mut.dnaChange || ''),
              csvEscape(mut.consequence || ''),
              mut.impact || '',
              mut.af ? (mut.af * 100).toFixed(1) + '%' : '',
              cnv?.status || 'neutral',
              cnv?.copyRatio?.toFixed(3) || '',
              csvEscape(biallelicEvidence.join('; ')),
              crisprStr,
              effectStr,
              rnaiEffStr,
              rnaiDepStr,
              exprStr,
              protStr
            ];
            if (selectedDrug) rowData.push(drugStr);
            rows.push(rowData.join(','));
          });
        } else if (cnv && cnv.status !== 'neutral') {
          // CNV only, no mutation
          const cnvRowData = [
            csvEscape(cl.name),
            cl.id,
            cl.subtype,
            ...lgFields(cl),
            gene,
            '',
            '',
            '',
            '',
            '',
            cnv.status,
            cnv.copyRatio?.toFixed(3) || '',
            '',
            crisprStr,
            effectStr,
            rnaiEffStr,
            rnaiDepStr,
            exprStr,
            protStr
          ];
          if (selectedDrug) cnvRowData.push(drugStr);
          rows.push(cnvRowData.join(','));
        }
      }
    });
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

/**
 * Export summary statistics as CSV
 */
export function exportSummaryCSV(cellLines, genes, getMutations, getCnv, filename = 'oncoprint_summary.csv') {
  const rows = [];

  // Gene summary header
  rows.push('Gene,Mutation Count,Mutation Frequency,CNV Amp,CNV Gain,CNV Het Loss,CNV Hom Del,Any Alteration');

  genes.forEach(gene => {
    let mutCount = 0;
    let ampCount = 0;
    let gainCount = 0;
    let hetLossCount = 0;
    let homDelCount = 0;
    let anyAlteration = 0;

    cellLines.forEach(cl => {
      const mutations = getMutations(cl.id, gene);
      const cnv = getCnv(cl.id, gene);

      const hasMut = mutations.length > 0;
      const hasCNV = cnv && cnv.status !== 'neutral';

      if (hasMut) mutCount++;
      if (cnv?.status === 'amp') ampCount++;
      if (cnv?.status === 'gain') gainCount++;
      if (cnv?.status === 'het_loss') hetLossCount++;
      if (cnv?.status === 'hom_del') homDelCount++;
      if (hasMut || hasCNV) anyAlteration++;
    });

    const mutFreq = ((mutCount / cellLines.length) * 100).toFixed(1) + '%';

    rows.push([
      gene,
      mutCount,
      mutFreq,
      ampCount,
      gainCount,
      hetLossCount,
      homDelCount,
      anyAlteration
    ].join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

/**
 * Encode state to URL params
 */
export function encodeStateToURL(state) {
  const params = new URLSearchParams();

  if (state.selectedPanels && state.selectedPanels.length > 0) {
    params.set('panels', state.selectedPanels.join(','));
  }

  if (state.selectedGenes && state.selectedGenes.length > 0) {
    params.set('genes', state.selectedGenes.join(','));
  }

  if (state.selectedSubtypes && state.selectedSubtypes.length > 0) {
    params.set('subtypes', state.selectedSubtypes.join(','));
  }

  if (state.sortBy) {
    params.set('sortBy', state.sortBy);
  }

  if (state.sortGene) {
    params.set('sortGene', state.sortGene);
  }

  if (state.sortDirection) {
    params.set('sortDir', state.sortDirection);
  }

  if (state.showCNV !== undefined) {
    params.set('cnv', state.showCNV ? '1' : '0');
  }

  if (state.showCRISPR !== undefined) {
    params.set('crispr', state.showCRISPR ? '1' : '0');
  }

  if (state.showRNAi !== undefined) {
    params.set('rnai', state.showRNAi ? '1' : '0');
  }

  if (state.showExpression !== undefined) {
    params.set('expr', state.showExpression ? '1' : '0');
  }

  if (state.showProteomics !== undefined) {
    params.set('prot', state.showProteomics ? '1' : '0');
  }

  if (state.showDrugSensitivity !== undefined) {
    params.set('drug', state.showDrugSensitivity ? '1' : '0');
  }

  if (state.selectedDrug) {
    params.set('drugId', String(state.selectedDrug.i));
  }

  return params.toString();
}

/**
 * Decode URL params to state
 * Supports both new `panels=` and old `panel=` (backward compat)
 */
export function decodeStateFromURL(searchString) {
  const params = new URLSearchParams(searchString);
  const state = {};

  if (params.has('panels')) {
    state.selectedPanels = params.get('panels').split(',').filter(p => p);
  } else if (params.has('panel')) {
    // Backward compat: single panel= treated as one-element array
    state.selectedPanels = [params.get('panel')].filter(p => p);
  }

  if (params.has('genes')) {
    state.selectedGenes = params.get('genes').split(',').filter(g => g);
  }

  if (params.has('subtypes')) {
    state.selectedSubtypes = params.get('subtypes').split(',').filter(s => s);
  }

  if (params.has('sortBy')) {
    state.sortBy = params.get('sortBy');
  }

  if (params.has('sortGene')) {
    state.sortGene = params.get('sortGene');
  }

  if (params.has('sortDir')) {
    state.sortDirection = params.get('sortDir');
  }

  if (params.has('cnv')) {
    state.showCNV = params.get('cnv') === '1';
  }

  if (params.has('crispr')) {
    state.showCRISPR = params.get('crispr') === '1';
  }

  if (params.has('rnai')) {
    state.showRNAi = params.get('rnai') === '1';
  }

  if (params.has('expr')) {
    state.showExpression = params.get('expr') === '1';
  }

  if (params.has('prot')) {
    state.showProteomics = params.get('prot') === '1';
  }

  if (params.has('drug')) {
    state.showDrugSensitivity = params.get('drug') === '1';
  }

  if (params.has('drugId')) {
    state.selectedDrug = { i: parseInt(params.get('drugId')) };
  }

  return state;
}

/**
 * Generate shareable URL
 */
export function generateShareableURL(state) {
  const baseURL = window.location.origin + window.location.pathname;
  const params = encodeStateToURL(state);
  return params ? `${baseURL}?${params}` : baseURL;
}
