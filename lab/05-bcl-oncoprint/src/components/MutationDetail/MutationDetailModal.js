import React, { useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import { getCytogeneticInfo, getCnvConcordance } from '../../data/cytogeneticMap';
import './MutationDetailModal.css';

function MutationDetailModal() {
  const { cellLines, genes, getMutations, getCnv, getFusionsForCellLine, getGeneCategory, getCategoryColor, getCrisprDep, getCrisprEffect, hasCrisprData, getRnaiEffect, getRnaiDep, hasRnaiData, getExpression, hasExpressionData, getProteomics, hasProteomicsData, getDrugSensitivity, getDrugsForGene, getTopSensitiveDrugs, hasDrugData, getLymphgenSubtype } = useData();
  const { selectedCell, closeCellDetail, selectedPanels, showDrugSensitivity, selectedDrug } = useFilter();

  // Get cell line and gene info
  const cellLine = useMemo(() => {
    if (!selectedCell) return null;
    return cellLines.find(cl => cl.id === selectedCell.cellLineId);
  }, [cellLines, selectedCell]);

  const mutations = useMemo(() => {
    if (!selectedCell) return [];
    return getMutations(selectedCell.cellLineId, selectedCell.gene);
  }, [selectedCell, getMutations]);

  const cnvData = useMemo(() => {
    if (!selectedCell) return null;
    return getCnv(selectedCell.cellLineId, selectedCell.gene);
  }, [selectedCell, getCnv]);

  // Get fusions involving this gene for this cell line
  const geneFusions = useMemo(() => {
    if (!selectedCell) return [];
    const allFusions = getFusionsForCellLine(selectedCell.cellLineId);
    return allFusions.filter(fu => {
      const left = fu.leftGene?.split(' ')[0] || '';
      const right = fu.rightGene?.split(' ')[0] || '';
      return left === selectedCell.gene || right === selectedCell.gene;
    });
  }, [selectedCell, getFusionsForCellLine]);

  // Find gene category from first matching panel (first-panel-wins)
  const geneCategory = useMemo(() => {
    if (!selectedCell) return null;
    for (const panelId of selectedPanels) {
      const cat = getGeneCategory(panelId, selectedCell.gene);
      if (cat && cat !== 'other') return cat;
    }
    // Fallback: check all panels
    for (const panelId of selectedPanels) {
      const cat = getGeneCategory(panelId, selectedCell.gene);
      if (cat) return cat;
    }
    return null;
  }, [selectedCell, getGeneCategory, selectedPanels]);

  // Close on Escape key
  useEffect(() => {
    if (!selectedCell) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeCellDetail();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, closeCellDetail]);

  if (!selectedCell || !cellLine) return null;

  const hasAlterations = mutations.length > 0 || (cnvData && cnvData.status !== 'neutral') || geneFusions.length > 0;
  const hasCnvData = cnvData && cnvData.copyRatio !== undefined && cnvData.copyRatio !== null;

  // Format consequence for display
  // Data format: "SO:0001583|missense_variant" or "SO:0001589|frameshift_variant,SO:0001627|intron_variant"
  // Falls back to inferring from impact/variantType/proteinChange when consequence is empty (93% of data)
  const formatConsequence = (consequence, mut) => {
    if (consequence) {
      // Extract readable names from SO:XXXX|name format
      const parts = consequence.split(',').map(part => {
        const pipeIdx = part.indexOf('|');
        if (pipeIdx >= 0) {
          return part.substring(pipeIdx + 1).replace(/_/g, ' ').replace(/variant$/, '').trim();
        }
        return part.replace(/_/g, ' ').replace(/variant$/, '').trim();
      });
      const result = [...new Set(parts)].filter(Boolean).join(', ');
      if (result) return result;
    }
    // Infer from other fields
    if (mut) {
      const protein = mut.proteinChange || '';
      if (mut.impact === 'HIGH') {
        if (protein.includes('fsTer') || protein.includes('fs*')) return 'Frameshift';
        if (protein.includes('Ter') || protein.includes('*')) return 'Nonsense (stop gained)';
        if (mut.variantType === 'deletion') return 'Frameshift deletion';
        if (mut.variantType === 'insertion') return 'Frameshift insertion';
        return 'Truncating (LoF)';
      }
      if (mut.impact === 'MODERATE') {
        if (mut.variantType === 'SNV' || mut.variantType === 'substitution') return 'Missense';
        if (mut.variantType === 'deletion') return 'In-frame deletion';
        if (mut.variantType === 'insertion') return 'In-frame insertion';
        return 'Missense';
      }
      if (mut.impact === 'LOW') return 'Synonymous / low impact';
    }
    return 'Unknown';
  };

  // Get impact badge color
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'HIGH': return '#e74c3c';
      case 'MODERATE': return '#f39c12';
      case 'LOW': return '#3498db';
      default: return '#95a5a6';
    }
  };

  // Get CNV status display
  const getCnvDisplay = (status) => {
    switch (status) {
      case 'amp': return { label: 'Amplification', color: genes.cnvColors?.amp || '#E74C3C' };
      case 'gain': return { label: 'Copy Gain', color: genes.cnvColors?.gain || '#F39C12' };
      case 'het_loss': return { label: 'Heterozygous Loss', color: genes.cnvColors?.het_loss || '#3498DB' };
      case 'hom_del': return { label: 'Homozygous Deletion', color: genes.cnvColors?.hom_del || '#1E3A5F' };
      default: return { label: 'Neutral', color: '#666' };
    }
  };

  // Generate external database links
  const getDbLinks = (mut) => {
    const links = [];

    // CIViC
    if (mut.civicId) {
      links.push({
        name: 'CIViC',
        url: `https://civicdb.org/variants/${mut.civicId}/summary`,
        description: mut.civicDescription || 'Clinical interpretation',
        score: mut.civicScore
      });
    }

    // dbSNP
    if (mut.dbsnpId) {
      links.push({
        name: 'dbSNP',
        url: `https://www.ncbi.nlm.nih.gov/snp/${mut.dbsnpId}`,
        description: mut.dbsnpId
      });
    }

    // COSMIC (extract from VepExistingVariation)
    if (mut.cosmicId) {
      const cosmicMatch = mut.cosmicId.match(/COSM(\d+)/);
      if (cosmicMatch) {
        links.push({
          name: 'COSMIC',
          url: `https://cancer.sanger.ac.uk/cosmic/mutation/overview?id=${cosmicMatch[1]}`,
          description: `COSM${cosmicMatch[1]}`
        });
      }
    }

    // ClinVar (if has clinical significance)
    if (mut.clinvar) {
      links.push({
        name: 'ClinVar',
        url: mut.dbsnpId
          ? `https://www.ncbi.nlm.nih.gov/clinvar/?term=${mut.dbsnpId}`
          : `https://www.ncbi.nlm.nih.gov/clinvar/?term=${mut.gene}[gene]+${mut.proteinChange}`,
        description: mut.clinvar
      });
    }

    // gnomAD (if has population frequency)
    if (mut.chrom && mut.pos && mut.ref && mut.alt) {
      const chrom = mut.chrom.replace('chr', '');
      links.push({
        name: 'gnomAD',
        url: `https://gnomad.broadinstitute.org/variant/${chrom}-${mut.pos}-${mut.ref}-${mut.alt}?dataset=gnomad_r4`,
        description: mut.gnomadAF ? `AF: ${parseFloat(mut.gnomadAF).toExponential(2)}` : 'Population frequency'
      });
    }

    // UniProt (for protein info)
    if (mut.uniprotId) {
      links.push({
        name: 'UniProt',
        url: `https://www.uniprot.org/uniprotkb/${mut.uniprotId}`,
        description: 'Protein function'
      });
    }

    // Ensembl transcript
    if (mut.ensemblTranscript) {
      links.push({
        name: 'Ensembl',
        url: `https://www.ensembl.org/Homo_sapiens/Transcript/Summary?t=${mut.ensemblTranscript}`,
        description: mut.ensemblTranscript
      });
    }

    return links;
  };

  // Get gene-level database links
  const getGeneLevelLinks = (gene, entrezId) => {
    const links = [];

    links.push({
      name: 'NCBI Gene',
      url: entrezId
        ? `https://www.ncbi.nlm.nih.gov/gene/${entrezId}`
        : `https://www.ncbi.nlm.nih.gov/gene/?term=${gene}`,
      description: 'Gene summary'
    });

    links.push({
      name: 'GeneCards',
      url: `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene}`,
      description: 'Gene overview'
    });

    links.push({
      name: 'CIViC Gene',
      url: `https://civicdb.org/genes/${gene}/summary`,
      description: 'All variants'
    });

    links.push({
      name: 'OncoKB',
      url: `https://www.oncokb.org/gene/${gene}`,
      description: 'Oncogenic annotations'
    });

    links.push({
      name: 'cBioPortal',
      url: `https://www.cbioportal.org/results/mutations?gene_list=${gene}&cancer_study_list=dlbc_tcga`,
      description: 'TCGA DLBCL mutations'
    });

    return links;
  };

  // Get first mutation for gene-level links
  const firstMut = mutations[0] || {};

  return (
    <div className="modal-overlay" onClick={closeCellDetail}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={closeCellDetail}>×</button>

        <div className="modal-header">
          <div className="header-main">
            <h2>{selectedCell.gene}</h2>
            {geneCategory && geneCategory !== 'other' && (
              <span
                className="category-badge"
                style={{ backgroundColor: getCategoryColor(geneCategory) }}
              >
                {geneCategory.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="header-sub">
            <span className="cell-line-name">{cellLine.name}</span>
            <span
              className="subtype-badge"
              style={{ backgroundColor: genes.subtypeColors?.[cellLine.subtype] || '#666' }}
            >
              {cellLine.subtype.replace('_', ' ')}
            </span>
          </div>
          {(() => {
            const cyto = getCytogeneticInfo(selectedCell.gene);
            return cyto ? (
              <div className="header-cytoband">{cyto.cytoband}</div>
            ) : null;
          })()}
        </div>

        {/* Contamination warning */}
        {cellLine.subtype === 'Contaminated' && (
          <div className="section" style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '10px 12px',
          }}>
            <p style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 4px 0' }}>
              Contaminated Cell Line
            </p>
            <p style={{ color: '#7f1d1d', fontSize: '0.8rem', margin: 0 }}>
              {cellLine.notes || 'This cell line is registered as contaminated (ICLAC). Mutations may not represent B-cell lymphoma biology.'}
            </p>
          </div>
        )}

        {/* Cell line notes (non-contaminated) */}
        {cellLine.notes && cellLine.subtype !== 'Contaminated' && (
          <div className="section" style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '8px 12px',
          }}>
            <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0 }}>
              <strong>Note:</strong> {cellLine.notes}
            </p>
          </div>
        )}

        {/* Gene-level database links */}
        <div className="section gene-links-section">
          <h3>Gene Resources</h3>
          <div className="db-links gene-links">
            {getGeneLevelLinks(selectedCell.gene, firstMut.entrezGeneId).map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="db-link"
                title={link.description}
              >
                {link.name} ↗
              </a>
            ))}
          </div>
        </div>

        {/* Fusion Section */}
        {geneFusions.length > 0 && (
          <div className="section fusions-section">
            <h3>Fusions / Translocations</h3>
            {geneFusions.map((fu, idx) => {
              const isCurated = fu.source === 'curated';
              const sourceLabel = isCurated
                ? (fu.curatedSource || 'Literature')
                : 'RNA-seq (STAR-Fusion)';
              const sourceLinks = [];
              if (isCurated) {
                // Use direct cell-line-specific URL if available
                const directUrl = fu.curatedUrl;
                if (fu.curatedSource === 'DSMZ') {
                  sourceLinks.push({ name: 'DSMZ', url: directUrl || 'https://www.dsmz.de/collection/catalogue/human-and-animal-cell-lines/catalogue', desc: 'German Collection of Microorganisms and Cell Cultures' });
                } else if (fu.curatedSource === 'Cellosaurus') {
                  sourceLinks.push({ name: 'Cellosaurus', url: directUrl || `https://www.cellosaurus.org/search?input=${encodeURIComponent(cellLine.name)}`, desc: 'SIB Cellosaurus cell line database' });
                } else if (fu.curatedSource === 'ATCC') {
                  sourceLinks.push({ name: 'ATCC', url: directUrl || 'https://www.atcc.org/', desc: 'American Type Culture Collection' });
                } else if (fu.curatedSource === 'Pu2019') {
                  sourceLinks.push({ name: 'Pu et al. 2019', url: 'https://doi.org/10.1186/s13045-019-0761-2', desc: 'FISH-confirmed DHL — J Hematol Oncol 12:73' });
                }
              } else {
                sourceLinks.push({ name: 'DepMap', url: `https://depmap.org/portal/cell_line/${cellLine.id}`, desc: 'DepMap cell line page' });
              }
              return (
                <div key={idx} className="mutation-card">
                  <div className="mutation-main">
                    <span className="protein-change">{fu.fusionName}</span>
                    <div className="badges">
                      <span className="impact-badge" style={{ backgroundColor: '#9333ea' }}>Fusion</span>
                      {isCurated && <span className="driver-badge tsg">{fu.curatedSource || 'Literature'}</span>}
                      {!isCurated && <span className="driver-badge oncogene">RNA-seq</span>}
                    </div>
                  </div>
                  <div className="mutation-details">
                    {(() => {
                      const left = fu.leftGene?.split(' ')[0] || '';
                      const right = fu.rightGene?.split(' ')[0] || '';
                      const leftNorm = left.startsWith('IGH') ? 'IGH' : left.startsWith('IGK') ? 'IGK' : left.startsWith('IGL') ? 'IGL' : left;
                      const rightNorm = right.startsWith('IGH') ? 'IGH' : right.startsWith('IGK') ? 'IGK' : right.startsWith('IGL') ? 'IGL' : right;
                      const partner = (left === selectedCell.gene || leftNorm === selectedCell.gene) ? rightNorm : leftNorm;
                      return partner ? (
                        <div className="detail-row">
                          <span className="label">Fusion Partner:</span>
                          <span className="value" style={{ fontWeight: 600 }}>{partner}</span>
                        </div>
                      ) : null;
                    })()}
                    {fu.curatedEvent && (
                      <div className="detail-row">
                        <span className="label">Cytogenetic Event:</span>
                        <span className="value mono">{fu.curatedEvent}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Detection:</span>
                      <span className="value">{sourceLabel}</span>
                    </div>
                    {fu.ffpm > 0 && (
                      <div className="detail-row">
                        <span className="label">FFPM:</span>
                        <span className="value mono">{fu.ffpm.toFixed(4)}</span>
                      </div>
                    )}
                    {fu.leftBreakpoint && (
                      <div className="detail-row">
                        <span className="label">Breakpoints:</span>
                        <span className="value mono">{fu.leftBreakpoint} — {fu.rightBreakpoint}</span>
                      </div>
                    )}
                    {fu.junctionReadCount !== undefined && (
                      <div className="detail-row">
                        <span className="label">Evidence:</span>
                        <span className="value">{fu.junctionReadCount} junction reads, {fu.spanningFragCount} spanning fragments</span>
                      </div>
                    )}
                  </div>
                  {sourceLinks.length > 0 && (
                    <div className="mutation-links">
                      <span className="links-label">Source:</span>
                      <div className="db-links">
                        {sourceLinks.map((link, li) => (
                          <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
                            className="db-link" title={link.desc}>
                            {link.name} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mutations Section */}
        {mutations.length > 0 && (
          <div className="section mutations-section">
            <h3>Mutations ({mutations.length})</h3>
            <div className="mutations-list">
              {mutations.map((mut, idx) => {
                const dbLinks = getDbLinks(mut);
                return (
                  <div key={idx} className="mutation-card">
                    <div className="mutation-main">
                      <span className="protein-change">
                        {mut.proteinChange || mut.dnaChange || 'N/A'}
                      </span>
                      <div className="badges">
                        <span
                          className="impact-badge"
                          style={{ backgroundColor: getImpactColor(mut.impact) }}
                        >
                          {mut.impact || 'Unknown'}
                        </span>
                        {mut.hotspot && (
                          <span className="hotspot-badge" title="Known cancer hotspot">
                            Hotspot
                          </span>
                        )}
                        {mut.oncogeneHighImpact && (
                          <span className="driver-badge oncogene">Oncogene</span>
                        )}
                        {mut.tumorSuppressorHighImpact && (
                          <span className="driver-badge tsg">TSG</span>
                        )}
                        {mut.likelyLoF && (
                          <span className="lof-badge">LoF</span>
                        )}
                      </div>
                    </div>

                    <div className="mutation-details">
                      <div className="detail-row">
                        <span className="label">Consequence:</span>
                        <span className="value">{formatConsequence(mut.consequence, mut)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Variant Type:</span>
                        <span className="value">{mut.variantType || 'N/A'}</span>
                      </div>
                      {mut.af !== null && mut.af !== undefined && mut.af > 0 && (
                        <div className="detail-row">
                          <span className="label">VAF:</span>
                          <span className={`value ${mut.af >= 0.85 ? 'high-vaf' : ''}`}>
                            {(mut.af * 100).toFixed(1)}%
                            {mut.af >= 0.85 && ' (likely biallelic)'}
                          </span>
                        </div>
                      )}
                      {mut.sift && (
                        <div className="detail-row">
                          <span className="label">SIFT:</span>
                          <span className={`value prediction ${mut.sift.includes('deleterious') ? 'damaging' : ''}`}>
                            {mut.sift}
                          </span>
                        </div>
                      )}
                      {mut.polyphen && (
                        <div className="detail-row">
                          <span className="label">PolyPhen:</span>
                          <span className={`value prediction ${mut.polyphen.includes('damaging') ? 'damaging' : ''}`}>
                            {mut.polyphen}
                          </span>
                        </div>
                      )}
                      {mut.revel && parseFloat(mut.revel) > 0 && (
                        <div className="detail-row">
                          <span className="label">REVEL:</span>
                          <span className={`value prediction ${parseFloat(mut.revel) > 0.5 ? 'damaging' : ''}`}>
                            {parseFloat(mut.revel).toFixed(3)}
                          </span>
                        </div>
                      )}
                      {mut.clinvar && (
                        <div className="detail-row">
                          <span className="label">ClinVar:</span>
                          <span className="value clinvar">{mut.clinvar}</span>
                        </div>
                      )}
                      {mut.civicDescription && (
                        <div className="detail-row civic-row">
                          <span className="label">CIViC:</span>
                          <span className="value civic-description">{mut.civicDescription}</span>
                        </div>
                      )}
                    </div>

                    {/* Database Links */}
                    {dbLinks.length > 0 && (
                      <div className="mutation-links">
                        <span className="links-label">Links:</span>
                        <div className="db-links">
                          {dbLinks.map((link, linkIdx) => (
                            <a
                              key={linkIdx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="db-link"
                              title={link.description}
                            >
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Biallelic indicator */}
        {mutations.length > 0 && (() => {
          const hasCNVLoss = cnvData && (cnvData.status === 'het_loss' || cnvData.status === 'hom_del');
          const hasHighVAF = mutations.some(m => m.af && m.af >= 0.85);
          if (!hasCNVLoss && !hasHighVAF) return null;

          // In cell lines (clonal, ~100% purity), het mutations have VAF ≈50%.
          // VAF ≥85% indicates biallelic: homozygous mutation, hemizygosity, or cnLOH.
          const reasons = [];
          if (hasCNVLoss) reasons.push('mutation + copy number loss');
          if (hasHighVAF) reasons.push(`high VAF (${(Math.max(...mutations.map(m => m.af || 0)) * 100).toFixed(0)}%)`);
          return (
            <div className="biallelic-indicator">
              <span className="biallelic-badge">Likely Biallelic Inactivation</span>
              <p>
                Evidence: {reasons.join(' and ')}.
                {hasCNVLoss && hasHighVAF
                  ? ' Mutation with concurrent copy loss and high VAF.'
                  : hasCNVLoss
                  ? ' Mutation with concurrent copy loss (classic LOH).'
                  : ' In clonal cell lines, VAF ≥85% indicates loss of the wild-type allele.'}
              </p>
            </div>
          );
        })()}

        {/* CRISPR Dependency Section */}
        {selectedCell && (() => {
          const isScreened = hasCrisprData(selectedCell.cellLineId);
          const crisprProb = getCrisprDep(selectedCell.cellLineId, selectedCell.gene);
          const geneEffect = getCrisprEffect(selectedCell.cellLineId, selectedCell.gene);

          if (!isScreened) return (
            <div className="section crispr-section">
              <h3>CRISPR Screen</h3>
              <p className="no-data-note">This cell line was not screened in the DepMap CRISPR knockout dataset.</p>
            </div>
          );

          if (crisprProb === null && geneEffect === null) return (
            <div className="section crispr-section">
              <h3>CRISPR Screen</h3>
              <p className="no-data-note">No CRISPR data available for this gene in this cell line.</p>
            </div>
          );

          const pct = crisprProb !== null ? (crisprProb * 100).toFixed(1) : null;
          let classification, classColor;
          if (geneEffect !== null) {
            if (geneEffect > 0.3) { classification = 'Loss Promotes Growth'; classColor = '#1d4ed8'; }
            else if (geneEffect > 0.05) { classification = 'Mild Growth Benefit'; classColor = '#60a5fa'; }
            else if (geneEffect > -0.3) { classification = 'No Effect'; classColor = '#6b7280'; }
            else if (geneEffect > -0.5) { classification = 'Likely Dependent'; classColor = '#ea580c'; }
            else { classification = 'Strongly Essential'; classColor = '#dc2626'; }
          } else if (crisprProb !== null) {
            if (crisprProb >= 0.75) { classification = 'Strongly Dependent'; classColor = '#dc2626'; }
            else if (crisprProb >= 0.5) { classification = 'Likely Dependent'; classColor = '#ea580c'; }
            else if (crisprProb >= 0.3) { classification = 'Borderline'; classColor = '#ca8a04'; }
            else { classification = 'Not Dependent'; classColor = '#6b7280'; }
          }

          return (
            <div className="section crispr-section">
              <h3>CRISPR Screen</h3>
              <div className="cnv-data-grid">
                {geneEffect !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Gene Effect</span>
                    <span className="cnv-data-value mono" style={{ color: geneEffect > 0.05 ? '#1d4ed8' : geneEffect < -0.3 ? '#dc2626' : 'inherit' }}>
                      {geneEffect > 0 ? '+' : ''}{geneEffect.toFixed(4)}
                    </span>
                  </div>
                )}
                {crisprProb !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Dependency Prob.</span>
                    <span className="cnv-data-value mono">{crisprProb.toFixed(3)} ({pct}%)</span>
                  </div>
                )}
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Classification</span>
                  <span className="cnv-data-value">
                    <span className="cnv-indicator" style={{ backgroundColor: classColor }} />
                    {classification}
                  </span>
                </div>
                {geneEffect !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Interpretation</span>
                    <span className="cnv-data-value" style={{ fontSize: '11px' }}>
                      {geneEffect > 0.05
                        ? 'Knockout increases cell growth — tumor suppressor behavior'
                        : geneEffect < -0.3
                        ? 'Knockout reduces cell growth — gene is essential'
                        : 'Knockout has minimal effect on cell growth'}
                    </span>
                  </div>
                )}
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Source</span>
                  <span className="cnv-data-value">DepMap 24Q4 Chronos</span>
                </div>
                {cnvData && (cnvData.status === 'amp' || cnvData.status === 'gain') && geneEffect !== null && geneEffect < -0.3 && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label" style={{ color: '#ca8a04' }}>CN Caveat</span>
                    <span className="cnv-data-value" style={{ fontSize: '11px', color: '#ca8a04' }}>
                      This gene is amplified. CRISPR essentiality may be inflated by copy-number-dependent cutting artifacts.
                    </span>
                  </div>
                )}
              </div>
              <div className="mutation-links" style={{ marginTop: '8px' }}>
                <span className="links-label">View on DepMap:</span>
                <div className="db-links">
                  <a
                    href={`https://depmap.org/portal/gene/${selectedCell.gene}?tab=dependency`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-link"
                    title="View gene dependency across all cell lines"
                  >
                    Gene Dependency ↗
                  </a>
                  <a
                    href={`https://depmap.org/portal/cell_line/${selectedCell.cellLineId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-link"
                    title="View cell line profile"
                  >
                    Cell Line Profile ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* RNAi DEMETER2 Section */}
        {selectedCell && (() => {
          const isRnaiScreened = hasRnaiData(selectedCell.cellLineId);
          const rnaiEffect = getRnaiEffect(selectedCell.cellLineId, selectedCell.gene);
          const rnaiProb = getRnaiDep(selectedCell.cellLineId, selectedCell.gene);

          if (!isRnaiScreened) return (
            <div className="section crispr-section">
              <h3>RNAi Screen</h3>
              <p className="no-data-note">This cell line was not screened in the DEMETER2 RNAi dataset.</p>
            </div>
          );

          if (rnaiEffect === null && rnaiProb === null) return (
            <div className="section crispr-section">
              <h3>RNAi Screen</h3>
              <p className="no-data-note">No RNAi data available for this gene in this cell line.</p>
            </div>
          );

          // DEMETER2 thresholds calibrated independently from Chronos
          // DEMETER2 has narrower distribution: p5=-0.67, p95=+0.37 in NHL lines
          let classification, classColor;
          if (rnaiEffect !== null) {
            if (rnaiEffect > 0.5) { classification = 'Loss Promotes Growth'; classColor = '#1d4ed8'; }
            else if (rnaiEffect > 0.1) { classification = 'Mild Growth Benefit'; classColor = '#60a5fa'; }
            else if (rnaiEffect > -0.2) { classification = 'No Effect'; classColor = '#6b7280'; }
            else if (rnaiEffect > -0.5) { classification = 'Likely Dependent'; classColor = '#ea580c'; }
            else { classification = 'Strongly Essential'; classColor = '#dc2626'; }
          } else if (rnaiProb !== null) {
            if (rnaiProb >= 0.75) { classification = 'Strongly Dependent'; classColor = '#dc2626'; }
            else if (rnaiProb >= 0.5) { classification = 'Likely Dependent'; classColor = '#ea580c'; }
            else { classification = 'Not Dependent'; classColor = '#6b7280'; }
          }

          return (
            <div className="section crispr-section">
              <h3>RNAi Screen</h3>
              <div className="cnv-data-grid">
                {rnaiEffect !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Gene Effect</span>
                    <span className="cnv-data-value mono" style={{ color: rnaiEffect > 0.05 ? '#1d4ed8' : rnaiEffect < -0.3 ? '#dc2626' : 'inherit' }}>
                      {rnaiEffect > 0 ? '+' : ''}{rnaiEffect.toFixed(4)}
                    </span>
                  </div>
                )}
                {rnaiProb !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Dependency Prob.</span>
                    <span className="cnv-data-value mono">{rnaiProb.toFixed(3)} ({(rnaiProb * 100).toFixed(1)}%)</span>
                  </div>
                )}
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Classification</span>
                  <span className="cnv-data-value">
                    <span className="cnv-indicator" style={{ backgroundColor: classColor }} />
                    {classification}
                  </span>
                </div>
                {rnaiEffect !== null && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Interpretation</span>
                    <span className="cnv-data-value" style={{ fontSize: '11px' }}>
                      {rnaiEffect > 0.1
                        ? 'Knockdown increases cell growth — tumor suppressor behavior'
                        : rnaiEffect < -0.2
                        ? 'Knockdown reduces cell growth — gene is essential'
                        : 'Knockdown has minimal effect on cell growth'}
                    </span>
                  </div>
                )}
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Source</span>
                  <span className="cnv-data-value">DEMETER2 (Achilles + DRIVE + Marcotte)</span>
                </div>
                {cnvData && (cnvData.status === 'amp' || cnvData.status === 'gain') && rnaiEffect !== null && rnaiEffect < -0.2 && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label" style={{ color: '#ca8a04' }}>CN Caveat</span>
                    <span className="cnv-data-value" style={{ fontSize: '11px', color: '#ca8a04' }}>
                      This gene is amplified. RNAi essentiality may be inflated by seed-effect or off-target artifacts at amplified loci.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Gene Expression Section — always visible */}
        {selectedCell && (() => {
          const isExprScreened = hasExpressionData(selectedCell.cellLineId);
          const exprVal = getExpression(selectedCell.cellLineId, selectedCell.gene);

          if (!isExprScreened) return (
            <div className="section crispr-section">
              <h3>Gene Expression</h3>
              <p className="no-data-note">This cell line was not screened in the DepMap RNA-seq dataset.</p>
            </div>
          );

          if (exprVal === null) return (
            <div className="section crispr-section">
              <h3>Gene Expression</h3>
              <p className="no-data-note">No expression data available for this gene in this cell line.</p>
            </div>
          );

          // Back-calculate TPM from log2(TPM+1)
          const tpmValue = Math.pow(2, exprVal) - 1;

          // Classification thresholds
          let classification, classColor;
          if (exprVal < 0.5) { classification = 'Not Expressed'; classColor = '#9ca3af'; }
          else if (exprVal < 2) { classification = 'Low Expression'; classColor = '#fbbf24'; }
          else if (exprVal < 5) { classification = 'Moderate Expression'; classColor = '#ea580c'; }
          else { classification = 'Highly Expressed'; classColor = '#991b1b'; }

          return (
            <div className="section crispr-section">
              <h3>Gene Expression</h3>
              <div className="cnv-data-grid">
                <div className="cnv-data-item">
                  <span className="cnv-data-label">log2(TPM+1)</span>
                  <span className="cnv-data-value mono">{exprVal.toFixed(3)}</span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">TPM</span>
                  <span className="cnv-data-value mono">{tpmValue < 0.01 ? tpmValue.toExponential(2) : tpmValue.toFixed(2)}</span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Classification</span>
                  <span className="cnv-data-value">
                    <span className="cnv-indicator" style={{ backgroundColor: classColor }} />
                    {classification}
                  </span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Source</span>
                  <span className="cnv-data-value">DepMap 24Q4 RNA-seq</span>
                </div>
              </div>
              <div className="mutation-links" style={{ marginTop: '8px' }}>
                <span className="links-label">View on DepMap:</span>
                <div className="db-links">
                  <a
                    href={`https://depmap.org/portal/gene/${selectedCell.gene}?tab=characterization`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-link"
                    title="View gene expression across all cell lines"
                  >
                    Gene Expression ↗
                  </a>
                  <a
                    href={`https://depmap.org/portal/cell_line/${selectedCell.cellLineId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-link"
                    title="View cell line profile"
                  >
                    Cell Line Profile ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Proteomics Section — always visible */}
        {selectedCell && (() => {
          const isProtScreened = hasProteomicsData(selectedCell.cellLineId);
          const protVal = getProteomics(selectedCell.cellLineId, selectedCell.gene);

          if (!isProtScreened) return (
            <div className="section crispr-section">
              <h3>Proteomics</h3>
              <p className="no-data-note">This cell line was not screened in the ProCan-DepMapSanger proteomics dataset.</p>
            </div>
          );

          if (protVal === null) return (
            <div className="section crispr-section">
              <h3>Proteomics</h3>
              <p className="no-data-note">No proteomics data available for this gene in this cell line.</p>
            </div>
          );

          let classification, classColor;
          if (protVal < -1.5) { classification = 'Very Low'; classColor = '#1d4ed8'; }
          else if (protVal < -0.5) { classification = 'Below Average'; classColor = '#93c5fd'; }
          else if (protVal < 0.5) { classification = 'Average'; classColor = '#6b7280'; }
          else if (protVal < 1.5) { classification = 'Above Average'; classColor = '#fca5a5'; }
          else { classification = 'Very High'; classColor = '#991b1b'; }

          return (
            <div className="section crispr-section">
              <h3>Proteomics</h3>
              <div className="cnv-data-grid">
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Z-score</span>
                  <span className="cnv-data-value mono" style={{ color: protVal > 0.5 ? '#991b1b' : protVal < -0.5 ? '#1d4ed8' : 'inherit' }}>
                    {protVal > 0 ? '+' : ''}{protVal.toFixed(3)}
                  </span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Classification</span>
                  <span className="cnv-data-value">
                    <span className="cnv-indicator" style={{ backgroundColor: classColor }} />
                    {classification}
                  </span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Source</span>
                  <span className="cnv-data-value">ProCan-DepMapSanger</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Drug Sensitivity: Selected Drug (when overlay active) */}
        {selectedCell && showDrugSensitivity && selectedDrug && (() => {
          const hasDrug = hasDrugData(selectedCell.cellLineId);
          const drugVal = hasDrug ? getDrugSensitivity(selectedCell.cellLineId, selectedDrug.i) : null;

          return (
            <div className="section crispr-section">
              <h3>Drug Sensitivity: {selectedDrug.n}</h3>
              {!hasDrug ? (
                <p className="no-data-note">This cell line was not screened in PRISM.</p>
              ) : drugVal === null ? (
                <p className="no-data-note">No sensitivity data for this drug in this cell line.</p>
              ) : (
                <div className="cnv-data-grid">
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">logFC</span>
                    <span className="cnv-data-value mono" style={{ color: drugVal < -1 ? '#dc2626' : drugVal > 0.3 ? '#1d4ed8' : 'inherit' }}>
                      {drugVal.toFixed(4)}
                    </span>
                  </div>
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Classification</span>
                    <span className="cnv-data-value">
                      <span className="cnv-indicator" style={{ backgroundColor: drugVal < -2 ? '#991b1b' : drugVal < -1 ? '#dc2626' : drugVal < -0.3 ? '#ea580c' : drugVal < 0.3 ? '#6b7280' : '#1d4ed8' }} />
                      {drugVal < -2 ? 'Highly Sensitive' : drugVal < -1 ? 'Sensitive' : drugVal < -0.3 ? 'Mildly Sensitive' : drugVal < 0.3 ? 'Neutral' : 'Resistant'}
                    </span>
                  </div>
                  {selectedDrug.t && (
                    <div className="cnv-data-item">
                      <span className="cnv-data-label">Target</span>
                      <span className="cnv-data-value">{selectedDrug.t}</span>
                    </div>
                  )}
                  {selectedDrug.m && (
                    <div className="cnv-data-item">
                      <span className="cnv-data-label">MOA</span>
                      <span className="cnv-data-value">{selectedDrug.m}</span>
                    </div>
                  )}
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Source</span>
                    <span className="cnv-data-value">PRISM Repurposing 24Q2</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Top Sensitive Drugs — always visible if data available */}
        {selectedCell && (() => {
          const topDrugs = getTopSensitiveDrugs(selectedCell.cellLineId, 10);
          if (topDrugs.length === 0) return null;

          return (
            <div className="section crispr-section">
              <h3>Top Sensitive Drugs</h3>
              <div className="drug-table-wrapper">
                <table className="drug-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Target</th>
                      <th>logFC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDrugs.map((entry, idx) => (
                      <tr key={idx}>
                        <td className="drug-name-cell">{entry.drug.n}</td>
                        <td className="drug-target-cell">{entry.drug.t || '-'}</td>
                        <td className="drug-value-cell mono" style={{ color: entry.value < -1 ? '#dc2626' : '#6b7280' }}>
                          {entry.value.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mutation-links" style={{ marginTop: '8px' }}>
                <span className="links-label">View on DepMap:</span>
                <div className="db-links">
                  <a
                    href={`https://depmap.org/portal/cell_line/${selectedCell.cellLineId}?tab=drug`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-link"
                    title="View drug sensitivity for this cell line"
                  >
                    Cell Line Drug Profile ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Drugs Targeting This Gene — always visible if data available */}
        {selectedCell && (() => {
          const targetingDrugs = getDrugsForGene(selectedCell.gene);
          if (targetingDrugs.length === 0) return null;

          return (
            <div className="section crispr-section">
              <h3>Drugs Targeting {selectedCell.gene}</h3>
              <div className="drug-table-wrapper">
                <table className="drug-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>MOA</th>
                      <th>logFC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetingDrugs.map((drug, idx) => {
                      const val = getDrugSensitivity(selectedCell.cellLineId, drug.i);
                      return (
                        <tr key={idx}>
                          <td className="drug-name-cell">{drug.n}</td>
                          <td className="drug-target-cell">{drug.m || '-'}</td>
                          <td className="drug-value-cell mono" style={{ color: val !== null && val < -1 ? '#dc2626' : '#6b7280' }}>
                            {val !== null ? val.toFixed(3) : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* CNV Section — last */}
        {hasCnvData && (() => {
          const cytoInfo = getCytogeneticInfo(selectedCell.gene);
          const cnvDisplay = getCnvDisplay(cnvData.status);
          const estAbsCN = (cnvData.copyRatio * 2).toFixed(1);
          return (
            <div className="section cnv-section">
              <h3>Copy Number — {cellLine.name}</h3>
              <div className="cnv-data-grid">
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Status</span>
                  <span className="cnv-data-value">
                    <span
                      className="cnv-indicator"
                      style={{ backgroundColor: cnvDisplay.color }}
                    />
                    {cnvDisplay.label}
                  </span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Relative CN</span>
                  <span className="cnv-data-value mono">{cnvData.copyRatio.toFixed(3)}</span>
                </div>
                <div className="cnv-data-item">
                  <span className="cnv-data-label">Est. Absolute CN</span>
                  <span className="cnv-data-value mono">~{estAbsCN} copies</span>
                </div>
                {cytoInfo && (
                  <div className="cnv-data-item">
                    <span className="cnv-data-label">Locus</span>
                    <span className="cnv-data-value mono">{cytoInfo.cytoband}</span>
                  </div>
                )}
              </div>
              {cytoInfo && cytoInfo.event && (() => {
                const concordance = getCnvConcordance(cnvData.status, cytoInfo);
                const isDiscrepant = concordance === 'discrepant';
                const isConcordant = concordance === 'concordant';
                return (
                  <div className={`cyto-context-mini ${isDiscrepant ? 'discrepant' : ''} ${isConcordant ? 'concordant' : ''}`}>
                    <div className="cyto-event-header">
                      <span className="cyto-event-name">{cytoInfo.event}</span>
                      {isConcordant && (
                        <span className="concordance-badge concordant">Consistent with recurrent event</span>
                      )}
                      {isDiscrepant && (
                        <span className="concordance-badge discrepant">
                          Opposite direction — expected {cytoInfo.direction}, observed {cnvData.status === 'amp' || cnvData.status === 'gain' ? 'gain' : 'loss'}
                        </span>
                      )}
                      {!concordance && cnvData.status === 'neutral' && (
                        <span className="concordance-badge neutral">Neutral CN at recurrently altered locus</span>
                      )}
                    </div>
                    <span className="cyto-note-inline">{cytoInfo.note}</span>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {!hasAlterations && !hasCnvData && (
          <div className="no-alterations">
            <p>No alterations detected in this gene for this cell line.</p>
          </div>
        )}

        {/* Cell Line Info */}
        <div className="section cell-line-info">
          <h3>Cell Line Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">DepMap ID:</span>
              <span className="value">
                <a
                  href={`https://depmap.org/portal/cell_line/${cellLine.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cellLine.id} ↗
                </a>
              </span>
            </div>
            <div className="info-item">
              <span className="label">Disease:</span>
              <span className="value">{cellLine.disease || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Subtype:</span>
              <span className="value">{cellLine.oncotreeSubtype || cellLine.subtype}</span>
            </div>
            {(() => {
              const lgData = getLymphgenSubtype(cellLine.id);
              if (!lgData) return null;
              let source;
              if (lgData.c === 'lit') source = lgData.src;
              else if (lgData.c === 'lg2') source = `LymphGen 2.0, p=${lgData.p?.toFixed(2)}`;
              else if (lgData.c === 'tlg') source = `tLymphGen, p=${lgData.tlp?.toFixed(2)}`;
              else source = `heuristic: ${(lgData.d || []).join(', ')}`;
              if (lgData.d && lgData.d.length > 0 && lgData.c !== 'heur') {
                source += ` + ${lgData.d.join(', ')}`;
              }
              return (
                <>
                  <div className="info-item">
                    <span className="label">LymphGen:</span>
                    <span className="value">
                      <strong style={{ color: '#7c3aed' }}>{lgData.s}</strong>
                      {' '}
                      <span style={{ fontSize: '0.8em', color: '#6b7280' }}>({source})</span>
                    </span>
                  </div>
                  {lgData.tl && lgData.c !== 'tlg' && (
                    <div className="info-item">
                      <span className="label">tLymphGen:</span>
                      <span className="value">
                        <strong style={{ color: '#6366f1' }}>{lgData.tl}</strong>
                        {' '}
                        <span style={{ fontSize: '0.8em', color: '#6b7280' }}>
                          (expression, p={lgData.tlp?.toFixed(2)})
                        </span>
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
            {cellLine.sex && (
              <div className="info-item">
                <span className="label">Sex:</span>
                <span className="value">{cellLine.sex}</span>
              </div>
            )}
            {cellLine.age && (
              <div className="info-item">
                <span className="label">Age:</span>
                <span className="value">{cellLine.age}</span>
              </div>
            )}
            {cellLine.sampleSite && (
              <div className="info-item">
                <span className="label">Sample Site:</span>
                <span className="value">{cellLine.sampleSite.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MutationDetailModal;
