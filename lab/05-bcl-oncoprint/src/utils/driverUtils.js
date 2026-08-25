import CYTOGENETIC_MAP from '../data/cytogeneticMap';

/**
 * Known biologically significant fusion partner genes in lymphoma.
 * These are the non-IG partners that define recurrent translocations.
 */
const RECURRENT_FUSION_PARTNERS = new Set([
  'BCL2',   // t(14;18) — EZB/FL hallmark
  'BCL6',   // t(3;14) / 3q27 rearrangements
  'MYC',    // t(8;14) — Burkitt / double-hit
  'CCND1',  // t(11;14) — MCL
  'CIITA',  // 16p13 break — MHC-II loss
  'MALT1',  // t(14;18) — MALT lymphoma
  'IRF4',   // t(6;14) — myeloma/DLBCL
  'PAX5',   // 9p13 rearrangements
  'BCL2L1', // rare but significant
  'PRDM1',  // 6q21 structural events
  'TP53',   // structural rearrangements
]);

/**
 * IG loci that indicate a true IG-partner translocation when detected.
 */
const IG_LOCI = new Set(['IGH', 'IGK', 'IGL']);

/**
 * Check if a mutation has any literature/database annotation.
 */
function hasLiterature(mut) {
  return !!(
    mut.civicId ||
    mut.cosmicId ||
    mut.clinvar ||
    mut.dbsnpId ||
    mut.civicDescription ||
    mut.hessDriver
  );
}

/**
 * Derive key cytogenetic drivers for a cell line.
 * Returns { drivers: [...], fusions: [...] } — fusions are a separate category.
 *
 * @param {string} cellLineId
 * @param {Function} getMutationsForCellLine
 * @param {Function} getCnvForCellLine
 * @param {Function} getFusionsForCellLine
 * @returns {{ drivers: Array, fusions: Array }}
 */
export function getKeyDrivers(cellLineId, getMutationsForCellLine, getCnvForCellLine, getFusionsForCellLine) {
  const allMuts = getMutationsForCellLine(cellLineId);
  const allCnv = getCnvForCellLine(cellLineId);
  const allFusions = getFusionsForCellLine ? getFusionsForCellLine(cellLineId) : [];

  // ── Build per-gene maps ──
  const mutsByGene = {};
  allMuts.forEach(mut => {
    if (!mutsByGene[mut.gene]) mutsByGene[mut.gene] = [];
    mutsByGene[mut.gene].push(mut);
  });

  const cnvByGene = {};
  allCnv.forEach(c => {
    cnvByGene[c.gene] = c;
  });

  // ── Process fusions (separate category) ──
  const fusionEntries = [];
  const seenFusions = new Set();

  allFusions.forEach(fu => {
    const left = fu.leftGene?.split(' ')[0] || '';
    const right = fu.rightGene?.split(' ')[0] || '';
    const fusionName = fu.fusionName || `${left}--${right}`;

    // Deduplicate
    if (seenFusions.has(fusionName)) return;
    seenFusions.add(fusionName);

    // Determine which gene is the biologically significant partner
    const leftNorm = normalizeIG(left);
    const rightNorm = normalizeIG(right);
    const leftIsIG = IG_LOCI.has(leftNorm);
    const rightIsIG = IG_LOCI.has(rightNorm);

    // Classify: is this a known recurrent translocation?
    const partner = leftIsIG ? right : rightIsIG ? left : null;
    const igLocus = leftIsIG ? leftNorm : rightIsIG ? rightNorm : null;
    const isIGTranslocation = !!(partner && igLocus);
    const isRecurrent = isIGTranslocation && RECURRENT_FUSION_PARTNERS.has(partner);
    const isKnownPartner = RECURRENT_FUSION_PARTNERS.has(left) || RECURRENT_FUSION_PARTNERS.has(right);

    // Skip: non-IG fusions involving unknown genes (likely noise)
    if (!isIGTranslocation && !isKnownPartner) return;

    // Build the display entry
    const cytoInfo = CYTOGENETIC_MAP[partner || left] || CYTOGENETIC_MAP[right] || null;
    const badges = [];

    if (isRecurrent) {
      badges.push('Recurrent');
      // Map to known cytogenetic event name
      if (cytoInfo?.event) badges.push(cytoInfo.event.split(' ')[0]); // e.g., "t(14;18)"
    }
    if (isIGTranslocation) badges.push(`${igLocus} partner`);
    if (!isIGTranslocation && isKnownPartner) badges.push('Structural');

    // Add source badge
    const source = fu.source || 'RNA-seq';
    if (source === 'curated') {
      badges.push(fu.curatedSource || 'Literature');
    } else {
      badges.push('RNA-seq');
    }

    fusionEntries.push({
      gene: partner || (isKnownPartner ? (RECURRENT_FUSION_PARTNERS.has(left) ? left : right) : left),
      fusionName,
      leftGene: left,
      rightGene: right,
      igLocus,
      isRecurrent,
      cytoEvent: fu.curatedEvent || cytoInfo?.event || null,
      ffpm: fu.ffpm || 0,
      source,
      curatedUrl: fu.curatedUrl || null,
      curatedSource: fu.curatedSource || null,
      cellosaurusUrl: fu.cellosaurusUrl || null,
      badges,
      category: 'fusion'
    });
  });

  // Sort fusions: recurrent first, then by FFPM
  fusionEntries.sort((a, b) => {
    if (b.isRecurrent !== a.isRecurrent) return b.isRecurrent ? 1 : -1;
    return (b.ffpm || 0) - (a.ffpm || 0);
  });

  // ── Process SNV-based potential drivers (no CNV-only entries) ──
  const drivers = [];

  for (const gene in mutsByGene) {
    const muts = mutsByGene[gene];
    const highImpactMuts = muts.filter(m =>
      m.oncogeneHighImpact ||
      m.tumorSuppressorHighImpact ||
      m.hotspot ||
      m.impact === 'HIGH'
    );
    if (highImpactMuts.length === 0) continue;

    const badges = [];
    if (highImpactMuts.some(m => m.oncogeneHighImpact)) badges.push('Oncogene');
    if (highImpactMuts.some(m => m.tumorSuppressorHighImpact)) badges.push('TSG');
    if (highImpactMuts.some(m => m.hotspot)) badges.push('Hotspot');
    if (highImpactMuts.some(m => m.impact === 'HIGH')) badges.push('Truncating');

    const anyLiterature = highImpactMuts.some(hasLiterature);
    if (!anyLiterature) badges.push('No literature');

    drivers.push({
      gene,
      mutations: highImpactMuts,
      badges,
      category: 'driver'
    });
  }

  // Sort by badge count (most annotated first)
  drivers.sort((a, b) => b.badges.length - a.badges.length);

  return { drivers, fusions: fusionEntries };
}

function normalizeIG(gene) {
  if (!gene) return gene;
  if (gene.startsWith('IGH')) return 'IGH';
  if (gene.startsWith('IGK')) return 'IGK';
  if (gene.startsWith('IGL')) return 'IGL';
  return gene;
}
