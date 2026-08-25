import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useFilter } from '../../context/FilterContext';
import './OncoprintLegend.css';

// Inline SVG legend swatch: mutation square with optional centered overlay
function MutationSwatch({ fill, children }) {
  return (
    <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
      {/* Background cell */}
      <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
            stroke="#cbd5e1" strokeWidth="0.5" />
      {/* Mutation bar */}
      <rect x="2" y="2" width="10" height="14" fill={fill} rx="2" />
      {children}
    </svg>
  );
}

function OncoprintLegend() {
  const { genes, getCategoryColor, getPanel, crisprScreenedLines, rnaiScreenedLines, expressionScreenedLines, proteomicsScreenedLines, drugScreenedLines } = useData();
  const { showCNV, showCRISPR, showRNAi, showExpression, showProteomics, showDrugSensitivity, selectedDrug, selectedPanels, selectedGenes } = useFilter();

  // Derive only the categories that have visible genes (same logic as OncoprintGrid)
  const activeCategories = useMemo(() => {
    const categories = [];
    const seen = new Set();
    const selectedSet = new Set(selectedGenes);

    selectedPanels.forEach(panelId => {
      const panel = getPanel(panelId);
      if (!panel?.categories) return;
      Object.entries(panel.categories).forEach(([category, panelGenes]) => {
        if (!seen.has(category) && panelGenes.some(g => selectedSet.has(g))) {
          seen.add(category);
          categories.push({ category, color: getCategoryColor(category) });
        }
      });
    });

    return categories;
  }, [selectedPanels, selectedGenes, getPanel, getCategoryColor]);

  // Star path centered at (7, 9) matching the grid's star logic
  const cx = 7, cy = 9, s = 0.8;
  const starPath = `M${cx},${cy-4*s} L${cx+1.2*s},${cy-1.2*s} L${cx+4*s},${cy-1.2*s} L${cx+2*s},${cy+1*s} L${cx+3*s},${cy+4*s} L${cx},${cy+2*s} L${cx-3*s},${cy+4*s} L${cx-2*s},${cy+1*s} L${cx-4*s},${cy-1.2*s} L${cx-1.2*s},${cy-1.2*s} Z`;

  return (
    <div className="oncoprint-legend">
      <div className="legend-section">
        <h4>Subtypes</h4>
        <div className="legend-items">
          {Object.entries(genes.subtypeColors || {}).map(([subtype, color]) => (
            <div key={subtype} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: color }} />
              <span className="legend-label">{subtype.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <h4>Mutations</h4>
        <div className="legend-items">
          <div className="legend-item">
            <MutationSwatch fill="#16a34a" />
            <span className="legend-label">Gain-of-Function</span>
          </div>
          <div className="legend-item">
            <MutationSwatch fill="#1e293b" />
            <span className="legend-label">Truncating / LoF</span>
          </div>
          <div className="legend-item">
            <MutationSwatch fill="#64748b" />
            <span className="legend-label">Missense / Other</span>
          </div>
          <div className="legend-item">
            <MutationSwatch fill="#1e293b">
              <path d={starPath} fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
            </MutationSwatch>
            <span className="legend-label">Biallelic</span>
          </div>
          <div className="legend-item">
            <MutationSwatch fill="#64748b">
              <circle cx="7" cy="9" r="3" fill="#fbbf24" stroke="#fff" strokeWidth="0.5" />
            </MutationSwatch>
            <span className="legend-label">Multiple Mutations</span>
          </div>
        </div>
      </div>

      {activeCategories.length > 0 && (
        <div className="legend-section">
          <h4>Gene Categories</h4>
          <div className="legend-items">
            {activeCategories.map(({ category, color }) => (
              <div key={category} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: color }} />
                <span className="legend-label">{category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="legend-section">
        <h4>LymphGen Subtype</h4>
        <div className="legend-items">
          <div className="legend-item">
            <svg className="legend-swatch" width="16" height="22" viewBox="0 0 14 22">
              <rect x="0" y="0" width="14" height="22" fill="#3b82f6" rx="2" />
              <text x="7" y="9" textAnchor="middle" dominantBaseline="central"
                    fontSize="6" fontWeight="700" fill="#fff">EZB</text>
            </svg>
            <span className="legend-label">Genetic LymphGen (gLG)</span>
          </div>
          <div className="legend-item">
            <svg className="legend-swatch" width="16" height="22" viewBox="0 0 14 22">
              <rect x="0" y="0" width="14" height="22" fill="#3b82f6" rx="2" />
              <text x="7" y="8" textAnchor="middle" dominantBaseline="central"
                    fontSize="6" fontWeight="700" fill="#fff">ST2</text>
              <text x="7" y="16" textAnchor="middle" dominantBaseline="central"
                    fontSize="5.5" fontWeight="600" fill="#fbbf24">BN2</text>
            </svg>
            <span className="legend-label">Discordant tLymphGen</span>
          </div>
          <div className="legend-item">
            <svg className="legend-swatch" width="16" height="22" viewBox="0 0 14 22">
              <rect x="0" y="0" width="14" height="22" fill="#3b82f6" rx="2" />
              <text x="7" y="11" textAnchor="middle" dominantBaseline="central"
                    fontSize="6" fontWeight="700" fill="#fbbf24">MCD</text>
            </svg>
            <span className="legend-label">tLymphGen only (no genetic data)</span>
          </div>
        </div>
        <div className="legend-caveat" style={{ fontSize: '0.7em', color: '#9ca3af', marginTop: 4, lineHeight: 1.3 }}>
          tLymphGen: unpublished expression-based classifier (Kline Lab). Predicts 4 of 7 subtypes
          (EZB, MCD, BN2, ST2 only — no A53/N1). Trained on patient RNA-seq; cell line predictions
          are approximate.
        </div>
      </div>

      <div className="legend-section">
        <h4>Freezer Inventory</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span style={{ fontWeight: 700, fontSize: '12px', color: '#f97316', marginRight: '2px' }}>k</span>
            <span className="legend-label">In Kline Lab -80°C (color = cap color)</span>
          </div>
        </div>
      </div>

      <div className="legend-section">
        <h4>Fusion / Translocation</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: genes.fusionColor || '#fecaca' }} />
            <span className="legend-label">Fusion/Translocation</span>
          </div>
        </div>
      </div>

      {showCNV && (
        <div className="legend-section">
          <h4>Copy Number</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: genes.cnvColors?.amp }} />
              <span className="legend-label">Amplification</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: genes.cnvColors?.gain }} />
              <span className="legend-label">Gain</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: genes.cnvColors?.het_loss }} />
              <span className="legend-label">Het. Loss</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: genes.cnvColors?.hom_del }} />
              <span className="legend-label">Hom. Del</span>
            </div>
          </div>
        </div>
      )}

      {showCRISPR && (
        <div className="legend-section">
          <h4>CRISPR Gene Effect</h4>
          <div className="legend-items">
            <div className="legend-item">
              <svg className="legend-swatch" width="140" height="14" viewBox="0 0 140 14">
                <defs>
                  {/* Domain: [-1.5, -0.5, 0, 0.2, 0.5] → stops at 0%, 50%, 75%, 85%, 100% */}
                  <linearGradient id="crispr-effect-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#991b1b" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="75%" stopColor="#f8f8f8" />
                    <stop offset="85%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="140" height="14" fill="url(#crispr-effect-gradient)" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <text x="3" y="11" fontSize="7" fill="#fff">Essential</text>
                <text x="100" y="11" fontSize="7" fill="#666">0</text>
                <text x="115" y="11" fontSize="7" fill="#fff">+</text>
              </svg>
              <span className="legend-label">Gene effect (Chronos)</span>
            </div>
            <div className="legend-item">
              <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
                <defs>
                  <pattern id="legend-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0,6 L6,0" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="0" width="14" height="18" fill="url(#legend-hatch)" rx="2" />
              </svg>
              <span className="legend-label">No CRISPR data ({crisprScreenedLines.size} of 94 screened)</span>
            </div>
          </div>
        </div>
      )}

      {showRNAi && (
        <div className="legend-section">
          <h4>RNAi Gene Effect</h4>
          <div className="legend-items">
            <div className="legend-item">
              <svg className="legend-swatch" width="140" height="14" viewBox="0 0 140 14">
                <defs>
                  {/* Domain: [-1.0, -0.3, 0, 0.2, 0.5] → stops at 0%, 47%, 67%, 80%, 100% */}
                  <linearGradient id="rnai-effect-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#991b1b" />
                    <stop offset="47%" stopColor="#ef4444" />
                    <stop offset="67%" stopColor="#f8f8f8" />
                    <stop offset="80%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="140" height="14" fill="url(#rnai-effect-gradient)" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <text x="3" y="11" fontSize="7" fill="#fff">Essential</text>
                <text x="90" y="11" fontSize="7" fill="#666">0</text>
                <text x="115" y="11" fontSize="7" fill="#fff">+</text>
              </svg>
              <span className="legend-label">Gene effect (DEMETER2)</span>
            </div>
            <div className="legend-item">
              <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
                <defs>
                  <pattern id="legend-rnai-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0,6 L6,0" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="0" width="14" height="18" fill="url(#legend-rnai-hatch)" rx="2" />
              </svg>
              <span className="legend-label">No RNAi data ({rnaiScreenedLines.size} of 94 screened)</span>
            </div>
          </div>
        </div>
      )}

      {showExpression && (
        <div className="legend-section">
          <h4>Gene Expression</h4>
          <div className="legend-items">
            <div className="legend-item">
              <svg className="legend-swatch" width="140" height="14" viewBox="0 0 140 14">
                <defs>
                  <linearGradient id="expression-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="10%" stopColor="#fde68a" />
                    <stop offset="30%" stopColor="#fbbf24" />
                    <stop offset="60%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="140" height="14" fill="url(#expression-gradient)" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <text x="3" y="11" fontSize="7" fill="#fff">0</text>
                <text x="37" y="11" fontSize="7" fill="#fff">3</text>
                <text x="77" y="11" fontSize="7" fill="#fff">6</text>
                <text x="117" y="11" fontSize="7" fill="#fff">10+</text>
              </svg>
              <span className="legend-label">log2(TPM+1)</span>
            </div>
            <div className="legend-item">
              <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
                <defs>
                  <pattern id="legend-expr-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0,6 L6,0" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="0" width="14" height="18" fill="url(#legend-expr-hatch)" rx="2" />
              </svg>
              <span className="legend-label">No expression data ({expressionScreenedLines.size} of 94 screened)</span>
            </div>
          </div>
        </div>
      )}

      {showProteomics && (
        <div className="legend-section">
          <h4>Proteomics</h4>
          <div className="legend-items">
            <div className="legend-item">
              <svg className="legend-swatch" width="140" height="14" viewBox="0 0 140 14">
                <defs>
                  {/* Domain: [-2, -0.5, 0, 0.5, 2] → stops at 0%, 37.5%, 50%, 62.5%, 100% */}
                  <linearGradient id="proteomics-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#1d4ed8" />
                    <stop offset="37.5%" stopColor="#93c5fd" />
                    <stop offset="50%" stopColor="#f8f8f8" />
                    <stop offset="62.5%" stopColor="#fca5a5" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="140" height="14" fill="url(#proteomics-gradient)" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <text x="3" y="11" fontSize="7" fill="#fff">-2</text>
                <text x="63" y="11" fontSize="7" fill="#666">0</text>
                <text x="120" y="11" fontSize="7" fill="#fff">+2</text>
              </svg>
              <span className="legend-label">Z-score (ProCan)</span>
            </div>
            <div className="legend-item">
              <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
                <defs>
                  <pattern id="legend-prot-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0,6 L6,0" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="0" width="14" height="18" fill="url(#legend-prot-hatch)" rx="2" />
              </svg>
              <span className="legend-label">No proteomics data ({proteomicsScreenedLines.size} of 94 screened)</span>
            </div>
          </div>
        </div>
      )}

      {showDrugSensitivity && (
        <div className="legend-section">
          <h4>Drug Sensitivity{selectedDrug ? `: ${selectedDrug.n}` : ''}</h4>
          {selectedDrug && selectedDrug.t && (
            <div className="legend-drug-info">
              Target: {selectedDrug.t}{selectedDrug.m ? ` | ${selectedDrug.m}` : ''}
            </div>
          )}
          <div className="legend-items">
            <div className="legend-item">
              <svg className="legend-swatch" width="140" height="14" viewBox="0 0 140 14">
                <defs>
                  {/* Domain: [-3, -1, 0, 0.5] → stops at 0%, 57%, 86%, 100% */}
                  <linearGradient id="drug-gradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#991b1b" />
                    <stop offset="57%" stopColor="#ef4444" />
                    <stop offset="86%" stopColor="#f8f8f8" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="140" height="14" fill="url(#drug-gradient)" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <text x="3" y="11" fontSize="7" fill="#fff">Sensitive</text>
                <text x="105" y="11" fontSize="7" fill="#666">0</text>
                <text x="120" y="11" fontSize="7" fill="#fff">Res.</text>
              </svg>
              <span className="legend-label">logFC (PRISM)</span>
            </div>
            <div className="legend-item">
              <svg className="legend-swatch" width="16" height="18" viewBox="0 0 14 18">
                <defs>
                  <pattern id="legend-drug-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M0,6 L6,0" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="14" height="18" fill="#f1f5f9" rx="2"
                      stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="0" width="14" height="18" fill="url(#legend-drug-hatch)" rx="2" />
              </svg>
              <span className="legend-label">No drug data ({drugScreenedLines.size} of 94 screened)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OncoprintLegend;
