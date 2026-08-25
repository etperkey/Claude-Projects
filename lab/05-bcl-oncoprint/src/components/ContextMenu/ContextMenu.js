import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useFilter } from '../../context/FilterContext';
import { useData } from '../../context/DataContext';
import { getKeyDrivers } from '../../utils/driverUtils';
import FREEZER_INVENTORY from '../../data/freezerInventory';
import './ContextMenu.css';

const SUBTYPE_LABELS = {
  'DLBCL_GCB': 'Diffuse Large B-Cell Lymphoma, Germinal Center B-cell',
  'DLBCL_ABC': 'Diffuse Large B-Cell Lymphoma, Activated B-Cell',
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

function ContextMenu() {
  const {
    contextMenu, closeContextMenu,
    toggleHighlightGene, toggleHighlightCellLine, highlightCrosshair,
    highlightedGene, highlightedCellLine,
    hideCellLine,
    setSorting, removeGene,
    openCellDetail
  } = useFilter();

  const { cellLines, getMutationsForCellLine, getCnvForCellLine, getFusionsForCellLine, getLymphgenSubtype } = useData();

  const menuRef = useRef(null);

  // Viewport clamping
  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [contextMenu]);

  // Close on Escape only
  useEffect(() => {
    if (!contextMenu) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu, closeContextMenu]);

  // Look up the cell line record for accession data
  const cellLineRecord = useMemo(() => {
    if (!contextMenu) return null;
    const cellLineId = contextMenu.data?.cellLineId;
    if (!cellLineId) return null;
    return cellLines.find(cl => cl.id === cellLineId) || null;
  }, [contextMenu, cellLines]);

  // Compute drivers and fusions for cell line menus
  const { drivers, fusions } = useMemo(() => {
    if (!contextMenu) return { drivers: [], fusions: [] };
    const cellLineId = contextMenu.type === 'cellLine'
      ? contextMenu.data?.cellLineId
      : contextMenu.type === 'cell'
        ? contextMenu.data?.cellLineId
        : null;
    if (!cellLineId) return { drivers: [], fusions: [] };
    return getKeyDrivers(cellLineId, getMutationsForCellLine, getCnvForCellLine, getFusionsForCellLine);
  }, [contextMenu, getMutationsForCellLine, getCnvForCellLine, getFusionsForCellLine]);

  const handleAction = useCallback((action) => {
    closeContextMenu();
    action();
  }, [closeContextMenu]);

  if (!contextMenu) return null;

  const { type, data } = contextMenu;

  const getBadgeClass = (badge) => {
    const lower = badge.toLowerCase();
    if (lower === 'oncogene') return 'oncogene';
    if (lower === 'tsg') return 'tsg';
    if (lower === 'hotspot') return 'hotspot';
    if (lower === 'truncating') return 'truncating';
    if (lower === 'amplification') return 'amplification';
    if (lower.includes('deletion')) return 'hom-del';
    if (lower === 'concordant') return 'concordant';
    if (lower === 'recurrent') return 'recurrent';
    if (lower.includes('partner')) return 'ig-partner';
    if (lower === 'structural') return 'structural';
    if (lower === 'no literature') return 'no-literature';
    if (lower.startsWith('t(')) return 'translocation';
    if (lower === 'rna-seq') return 'rna-seq';
    if (lower === 'dsmz' || lower === 'cellosaurus' || lower === 'atcc' || lower === 'literature' || lower === 'pu2019') return 'curated';
    return '';
  };

  const BADGE_TOOLTIPS = {
    'Oncogene': 'Activating mutation in a known oncogene (OncoKB/CGC)',
    'TSG': 'Loss-of-function mutation in a tumor suppressor gene',
    'Hotspot': 'Recurrent mutation hotspot seen across cancers (COSMIC/OncoKB)',
    'Truncating': 'Frameshift, nonsense, or splice-site mutation (HIGH impact)',
    'Recurrent': 'Known recurrent translocation in lymphoma',
    'Structural': 'Structural rearrangement involving a known driver gene',
    'No literature': 'No matching entries in CIViC, COSMIC, ClinVar, or dbSNP',
    'Concordant': 'CNV direction matches expected cytogenetic event',
    'RNA-seq': 'Detected by STAR-Fusion from DepMap RNA-seq data (24Q4)',
    'DSMZ': 'German Collection of Microorganisms and Cell Cultures — curated karyotype/FISH data',
    'Cellosaurus': 'SIB Cellosaurus — curated cell line knowledge base',
    'ATCC': 'American Type Culture Collection — cell line characterization data',
    'Literature': 'Curated from published literature (karyotype/FISH/cytogenetics)',
    'Pu2019': 'Pu et al. 2019, J Hematol Oncol — FISH-confirmed MYC/BCL2 double-hit',
  };

  const BADGE_LINKS = {
    'DSMZ': 'https://www.dsmz.de/collection/catalogue/human-and-animal-cell-lines/catalogue',
    'Cellosaurus': 'https://www.cellosaurus.org/',
    'ATCC': 'https://www.atcc.org/',
    'RNA-seq': 'https://depmap.org/portal/',
    'Pu2019': 'https://doi.org/10.1186/s13045-019-0761-2',
  };

  const getBadgeTooltip = (badge) => {
    if (BADGE_TOOLTIPS[badge]) return BADGE_TOOLTIPS[badge];
    const lower = badge.toLowerCase();
    if (lower.includes('partner')) return `Translocation partner with immunoglobulin locus (${badge})`;
    if (lower.startsWith('t(')) return `Cytogenetic translocation event: ${badge}`;
    return badge;
  };

  const renderBadge = (badge, key, urlOverride) => {
    const tooltip = getBadgeTooltip(badge);
    const link = urlOverride || BADGE_LINKS[badge];
    const className = `driver-mini-badge ${getBadgeClass(badge)}`;

    if (link) {
      return (
        <a key={key} className={className} title={tooltip}
          href={link} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}>
          {badge}
        </a>
      );
    }
    return <span key={key} className={className} title={tooltip}>{badge}</span>;
  };

  const renderGeneMenu = () => {
    const gene = data?.gene;
    if (!gene) return null;
    const isHighlighted = highlightedGene === gene;

    return (
      <>
        <button className={`context-menu-item ${isHighlighted ? 'active' : ''}`}
          onClick={() => handleAction(() => toggleHighlightGene(gene))}>
          <span className="item-icon">{isHighlighted ? '✓' : '―'}</span>
          <span className="item-label">{isHighlighted ? 'Remove highlight' : 'Highlight row'}</span>
        </button>
        <button className="context-menu-item"
          onClick={() => handleAction(() => setSorting('gene', gene, 'desc'))}>
          <span className="item-icon">↕</span>
          <span className="item-label">Sort by {gene}</span>
        </button>
        <button className="context-menu-item danger"
          onClick={() => handleAction(() => removeGene(gene))}>
          <span className="item-icon">×</span>
          <span className="item-label">Remove gene</span>
        </button>
        <div className="context-menu-divider" />
        <div className="context-menu-header">External Links</div>
        <a className="context-menu-item external-link"
          href={`https://www.ncbi.nlm.nih.gov/gene/?term=${gene}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">NCBI Gene</span>
        </a>
        <a className="context-menu-item external-link"
          href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">GeneCards</span>
        </a>
        <a className="context-menu-item external-link"
          href={`https://www.oncokb.org/gene/${gene}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">OncoKB</span>
        </a>
        <a className="context-menu-item external-link"
          href={`https://civicdb.org/genes/${gene}/summary`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">CIViC</span>
        </a>
        <a className="context-menu-item external-link"
          href={`https://www.cbioportal.org/results/mutations?gene_list=${gene}&cancer_study_list=dlbc_tcga`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">cBioPortal</span>
        </a>
      </>
    );
  };

  const renderCellLineMenu = () => {
    const { cellLineId, cellLineName } = data || {};
    if (!cellLineId) return null;
    const isHighlighted = highlightedCellLine === cellLineId;
    const subtype = cellLineRecord?.subtype || '';
    const subtypeFullName = SUBTYPE_LABELS[subtype] || subtype;

    return (
      <>
        <div className="context-menu-header" style={{ fontSize: '13px', fontWeight: 700 }}>
          {cellLineName || cellLineId}
        </div>
        <div className="context-menu-header" style={{ fontSize: '10px', opacity: 0.7, marginTop: '-4px' }}>
          {subtype}{subtypeFullName ? ` — ${subtypeFullName}` : ''}
        </div>
        {FREEZER_INVENTORY[cellLineName] && (
          <div className="context-menu-freezer">
            <span className="freezer-label">In Kline Lab -80C</span>
            {FREEZER_INVENTORY[cellLineName].map((entry, idx) => (
              <span key={idx} className="freezer-entry">
                <span className="freezer-cap-dot" style={{ backgroundColor: entry.color }} />
                {entry.label}
              </span>
            ))}
          </div>
        )}
        {(() => {
          const lgData = getLymphgenSubtype(cellLineId);
          if (!lgData) return null;
          let source;
          if (lgData.c === 'lit') source = lgData.src;
          else if (lgData.c === 'lg2') source = `LymphGen 2.0, p=${lgData.p?.toFixed(2)}`;
          else if (lgData.c === 'tlg') source = `tLymphGen, p=${lgData.tlp?.toFixed(2)}`;
          else {
            source = 'heuristic';
            if (lgData.d && lgData.d.length > 0) {
              source += `: ${lgData.d.join(', ')}`;
            }
          }
          if (lgData.d && lgData.d.length > 0 && lgData.c === 'lg2') {
            source += ` + ${lgData.d.join(', ')}`;
          }
          return (
            <div className="context-menu-lymphgen">
              <span className="lymphgen-label">LymphGen</span>
              <span className="lymphgen-subtype">{lgData.s}</span>
              <span className="lymphgen-source">({source})</span>
              {lgData.tl && lgData.c !== 'tlg' && (
                <span className="lymphgen-source" style={{ marginLeft: 4, color: '#6366f1' }}>
                  tLG: {lgData.tl} ({lgData.tlp?.toFixed(2)})
                </span>
              )}
            </div>
          );
        })()}
        <div className="context-menu-divider" />
        <button className={`context-menu-item ${isHighlighted ? 'active' : ''}`}
          onClick={() => handleAction(() => toggleHighlightCellLine(cellLineId))}>
          <span className="item-icon">{isHighlighted ? '✓' : '|'}</span>
          <span className="item-label">{isHighlighted ? 'Remove highlight' : 'Highlight column'}</span>
        </button>
        <button className="context-menu-item danger"
          onClick={() => handleAction(() => hideCellLine(cellLineId))}>
          <span className="item-icon">⊘</span>
          <span className="item-label">Hide cell line</span>
        </button>
        {fusions.length > 0 && (
          <>
            <div className="context-menu-divider" />
            <div className="context-menu-header">Fusions / Translocations</div>
            {fusions.slice(0, 6).map((fu, i) => (
              <div key={`fu-${i}`} className="driver-item">
                <span className="driver-gene">{fu.gene}</span>
                <div className="driver-badges">
                  {fu.badges.map((badge, bi) => {
                    // Use cell-line-specific URL for source badges
                    const isSourceBadge = badge === fu.curatedSource || badge === 'RNA-seq';
                    const urlOverride = isSourceBadge && fu.curatedUrl ? fu.curatedUrl : undefined;
                    return renderBadge(badge, bi, urlOverride);
                  })}
                </div>
              </div>
            ))}
          </>
        )}
        {drivers.length > 0 && (
          <>
            <div className="context-menu-divider" />
            <div className="context-menu-header">Potential Drivers</div>
            {drivers.slice(0, 8).map((d, i) => (
              <div key={`dr-${i}`} className="driver-item">
                <span className="driver-gene">{d.gene}</span>
                <div className="driver-badges">
                  {d.badges.map((badge, bi) => renderBadge(badge, bi))}
                </div>
              </div>
            ))}
          </>
        )}
        {cellLineRecord?.notes && (
          <>
            <div className="context-menu-divider" />
            <div className="context-menu-note">{cellLineRecord.notes}</div>
          </>
        )}
        <div className="context-menu-divider" />
        <div className="context-menu-header">External Links</div>
        <a className="context-menu-item external-link"
          href={`https://depmap.org/portal/cell_line/${cellLineId}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">DepMap</span>
        </a>
        {cellLineRecord?.cellosaurusUrl ? (
          <a className="context-menu-item external-link"
            href={cellLineRecord.cellosaurusUrl}
            target="_blank" rel="noopener noreferrer"
            onClick={closeContextMenu}>
            <span className="item-icon">↗</span>
            <span className="item-label">Cellosaurus ({cellLineRecord.cellosaurusId})</span>
          </a>
        ) : (
          <a className="context-menu-item external-link"
            href={`https://www.cellosaurus.org/search?input=${encodeURIComponent(cellLineName || cellLineId)}`}
            target="_blank" rel="noopener noreferrer"
            onClick={closeContextMenu}>
            <span className="item-icon">↗</span>
            <span className="item-label">Cellosaurus (search)</span>
          </a>
        )}
        {cellLineRecord?.dsmzUrl && (
          <a className="context-menu-item external-link"
            href={cellLineRecord.dsmzUrl}
            target="_blank" rel="noopener noreferrer"
            onClick={closeContextMenu}>
            <span className="item-icon">↗</span>
            <span className="item-label">DSMZ ({cellLineRecord.dsmzId})</span>
          </a>
        )}
        {cellLineRecord?.atccUrl && (
          <a className="context-menu-item external-link"
            href={cellLineRecord.atccUrl}
            target="_blank" rel="noopener noreferrer"
            onClick={closeContextMenu}>
            <span className="item-icon">↗</span>
            <span className="item-label">ATCC ({cellLineRecord.atccId})</span>
          </a>
        )}
      </>
    );
  };

  const renderCellMenu = () => {
    const { gene, cellLineId, cellLineName } = data || {};
    if (!gene || !cellLineId) return null;
    const isGeneHighlighted = highlightedGene === gene;
    const isCellLineHighlighted = highlightedCellLine === cellLineId;
    const isCrosshair = isGeneHighlighted && isCellLineHighlighted;

    return (
      <>
        <button className={`context-menu-item ${isCrosshair ? 'active' : ''}`}
          onClick={() => handleAction(() => highlightCrosshair(gene, cellLineId))}>
          <span className="item-icon">+</span>
          <span className="item-label">{isCrosshair ? 'Remove crosshair' : 'Highlight row + column'}</span>
        </button>
        <button className="context-menu-item"
          onClick={() => handleAction(() => openCellDetail(cellLineId, gene))}>
          <span className="item-icon">⊞</span>
          <span className="item-label">View details</span>
        </button>
        <div className="context-menu-divider" />
        <div className="context-menu-header">External Links</div>
        <a className="context-menu-item external-link"
          href={`https://www.oncokb.org/gene/${gene}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">OncoKB — {gene}</span>
        </a>
        <a className="context-menu-item external-link"
          href={`https://depmap.org/portal/cell_line/${cellLineId}`}
          target="_blank" rel="noopener noreferrer"
          onClick={closeContextMenu}>
          <span className="item-icon">↗</span>
          <span className="item-label">DepMap — {cellLineName || cellLineId}</span>
        </a>
      </>
    );
  };

  const menuContent = (
    <div className="context-menu-overlay">
      <div
        ref={menuRef}
        className="context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button className="context-menu-close" onClick={closeContextMenu}>×</button>
        {type === 'gene' && renderGeneMenu()}
        {type === 'cellLine' && renderCellLineMenu()}
        {type === 'cell' && renderCellMenu()}
      </div>
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
}

export default ContextMenu;
