import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [cellLines, setCellLines] = useState([]);
  const [mutations, setMutations] = useState({});
  const [mutationCounts, setMutationCounts] = useState({});
  const [cnv, setCnv] = useState({});
  const [fusions, setFusions] = useState({});  // { cellLineId: [fusion objects] }
  const [genes, setGenes] = useState({ categories: {}, allGenes: [] });
  const [crisprDep, setCrisprDep] = useState({});  // { "cellLineId|gene" → probability }
  const [crisprEffect, setCrisprEffect] = useState({});  // { "cellLineId|gene" → gene effect score }
  const [crisprScreenedLines, setCrisprScreenedLines] = useState(new Set());
  const [rnaiEffect, setRnaiEffect] = useState({});  // { "cellLineId|gene" → gene effect score }
  const [rnaiDep, setRnaiDep] = useState({});  // { "cellLineId|gene" → dependency probability }
  const [rnaiScreenedLines, setRnaiScreenedLines] = useState(new Set());
  const [expression, setExpression] = useState({});  // { "cellLineId|gene" → log2(TPM+1) }
  const [expressionScreenedLines, setExpressionScreenedLines] = useState(new Set());
  const [proteomics, setProteomics] = useState({});  // { "cellLineId|gene" → z-score }
  const [proteomicsScreenedLines, setProteomicsScreenedLines] = useState(new Set());
  const [drugSensitivity, setDrugSensitivity] = useState(null);  // full JSON: { drugList, data, screenedLines }
  const [drugTargets, setDrugTargets] = useState({});  // { gene → [{n, m, i}] }
  const [drugScreenedLines, setDrugScreenedLines] = useState(new Set());
  const [lymphgen, setLymphgen] = useState({});  // { cellLineId → {s, c, src?, d?} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load all JSON files in parallel
        // Core files (required): cell_lines, mutations, cnv, genes
        // Optional files (graceful degradation): fusions, crispr, rnai, expression
        const safeFetch = (url) => fetch(url).catch(() => ({ ok: false }));

        const [cellLinesRes, mutationsRes, cnvRes, genesRes, fusionsRes, crisprRes, crisprEffectRes, rnaiRes, expressionRes, proteomicsRes, drugSensRes, drugTargetsRes, lymphgenRes] = await Promise.all([
          fetch(`${process.env.PUBLIC_URL}/data/cell_lines.json`),
          fetch(`${process.env.PUBLIC_URL}/data/mutations.json`),
          fetch(`${process.env.PUBLIC_URL}/data/cnv.json`),
          fetch(`${process.env.PUBLIC_URL}/data/genes.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/fusions.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/crispr_dependency.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/crispr_gene_effect.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/rnai_dependency.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/expression.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/proteomics.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/drug_sensitivity.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/drug_targets.json`),
          safeFetch(`${process.env.PUBLIC_URL}/data/lymphgen.json`)
        ]);

        if (!cellLinesRes.ok || !mutationsRes.ok || !cnvRes.ok || !genesRes.ok) {
          throw new Error('Failed to load data files');
        }

        const [cellLinesData, mutationsData, cnvData, genesData] = await Promise.all([
          cellLinesRes.json(),
          mutationsRes.json(),
          cnvRes.json(),
          genesRes.json()
        ]);

        // Fusions are optional (won't block app if missing)
        const fusionsData = fusionsRes.ok ? await fusionsRes.json() : {};
        setFusions(fusionsData);

        // CRISPR dependency data (optional)
        if (crisprRes.ok) {
          const crisprData = await crisprRes.json();
          const depMap = {};
          (crisprData.dependencies || []).forEach(d => {
            depMap[`${d.c}|${d.g}`] = d.p;
          });
          setCrisprDep(depMap);
          setCrisprScreenedLines(new Set(crisprData.screenedLines || []));
        }

        // CRISPR gene effect data (optional)
        if (crisprEffectRes.ok) {
          const effectData = await crisprEffectRes.json();
          const effectMap = {};
          (effectData.effects || []).forEach(d => {
            effectMap[`${d.c}|${d.g}`] = d.e;
          });
          setCrisprEffect(effectMap);
        }

        // RNAi DEMETER2 data (optional)
        if (rnaiRes.ok) {
          const rnaiData = await rnaiRes.json();
          const rEffectMap = {};
          const rDepMap = {};
          (rnaiData.entries || []).forEach(d => {
            const key = `${d.c}|${d.g}`;
            if (d.e !== undefined) rEffectMap[key] = d.e;
            if (d.p !== undefined) rDepMap[key] = d.p;
          });
          setRnaiEffect(rEffectMap);
          setRnaiDep(rDepMap);
          setRnaiScreenedLines(new Set(rnaiData.screenedLines || []));
        }

        // Gene expression RNA-seq data (optional)
        if (expressionRes.ok) {
          const exprData = await expressionRes.json();
          const exprMap = {};
          (exprData.entries || []).forEach(d => {
            exprMap[`${d.c}|${d.g}`] = d.v;
          });
          setExpression(exprMap);
          setExpressionScreenedLines(new Set(exprData.screenedLines || []));
        }

        // Proteomics z-score data (optional)
        if (proteomicsRes.ok) {
          const protData = await proteomicsRes.json();
          const protMap = {};
          (protData.entries || []).forEach(d => {
            protMap[`${d.c}|${d.g}`] = d.v;
          });
          setProteomics(protMap);
          setProteomicsScreenedLines(new Set(protData.screenedLines || []));
        }

        // Drug sensitivity data (optional)
        if (drugSensRes.ok) {
          const drugData = await drugSensRes.json();
          setDrugSensitivity(drugData);
          setDrugScreenedLines(new Set(drugData.screenedLines || []));
        }

        // Drug target mapping (optional)
        if (drugTargetsRes.ok) {
          const targetData = await drugTargetsRes.json();
          setDrugTargets(targetData.geneTargets || {});
        }

        // LymphGen classification (optional)
        if (lymphgenRes.ok) {
          const lymphgenData = await lymphgenRes.json();
          setLymphgen(lymphgenData);
        }

        setCellLines(cellLinesData);
        setGenes(genesData);

        // Create lookup maps for O(1) access
        // Mutations: { "CELL_ID|GENE": [mutation objects] }
        const mutationMap = {};
        mutationsData.forEach(mut => {
          const key = `${mut.cellLineId}|${mut.gene}`;
          if (!mutationMap[key]) {
            mutationMap[key] = [];
          }
          mutationMap[key].push(mut);
        });
        setMutations(mutationMap);

        // Pre-compute mutation counts per cell line: { cellLineId: totalCount }
        const countMap = {};
        for (const key in mutationMap) {
          const cellLineId = key.substring(0, key.indexOf('|'));
          countMap[cellLineId] = (countMap[cellLineId] || 0) + mutationMap[key].length;
        }
        setMutationCounts(countMap);

        // CNV: { "CELL_ID|GENE": { copyRatio, status } }
        // copyRatio = relative CN (diploid=1.0); supports both old "log2" and new "copyRatio" keys
        const cnvMap = {};
        cnvData.forEach(c => {
          const key = `${c.cellLineId}|${c.gene}`;
          cnvMap[key] = { copyRatio: c.copyRatio ?? c.log2, status: c.status };
        });
        setCnv(cnvMap);

        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Helper functions
  const getMutations = (cellLineId, gene) => {
    return mutations[`${cellLineId}|${gene}`] || [];
  };

  const getCnv = (cellLineId, gene) => {
    return cnv[`${cellLineId}|${gene}`] || null;
  };

  const hasMutation = (cellLineId, gene) => {
    return getMutations(cellLineId, gene).length > 0;
  };

  const hasAlteration = (cellLineId, gene) => {
    const muts = getMutations(cellLineId, gene);
    const cnvData = getCnv(cellLineId, gene);
    return muts.length > 0 || (cnvData && cnvData.status !== 'neutral');
  };

  const isBiallelic = (cellLineId, gene) => {
    const muts = getMutations(cellLineId, gene);
    if (muts.length === 0) return false;
    const cnvData = getCnv(cellLineId, gene);
    // Cell lines are clonal (~100% purity), so VAF ≥0.85 in diploid = biallelic
    // (heterozygous mutations in diploid cell lines have VAF ≈ 50%)
    const hasCNVLoss = cnvData && (cnvData.status === 'het_loss' || cnvData.status === 'hom_del');
    const hasHighVAF = muts.some(m => m.af && m.af >= 0.85);
    return hasCNVLoss || hasHighVAF;
  };

  // Get genes for a category within a panel
  const getGenesByCategory = (panelId, category) => {
    return genes.panels?.[panelId]?.categories?.[category] || [];
  };

  // Get the category for a gene within a specific panel
  const getGeneCategory = (panelId, gene) => {
    const panel = genes.panels?.[panelId];
    if (!panel?.categories) return 'other';
    for (const [category, geneList] of Object.entries(panel.categories)) {
      if (geneList.includes(gene)) {
        return category;
      }
    }
    return 'other';
  };

  // Get panel info
  const getPanel = (panelId) => {
    return genes.panels?.[panelId] || null;
  };

  // Get all available panels
  const getPanelList = () => {
    if (!genes.panels) return [];
    return Object.entries(genes.panels).map(([id, panel]) => ({
      id,
      name: panel.name,
      description: panel.description,
      geneCount: panel.allGenes?.length || 0
    }));
  };

  // Get color for a category
  const getCategoryColor = (category) => {
    return genes.categoryColors?.[category] || '#6b7280';
  };

  // Get gene info (mutation frequency, etc.)
  const getGeneInfo = (gene) => {
    return genes.geneInfo?.[gene] || null;
  };

  // Get mutation count for a cell line (across all genes) — O(1) lookup
  const getMutationCount = (cellLineId) => {
    return mutationCounts[cellLineId] || 0;
  };

  // Get all mutations for a cell line (O(n) scan — use on-demand, not in render loops)
  const getMutationsForCellLine = (cellLineId) => {
    const prefix = `${cellLineId}|`;
    const result = [];
    for (const key in mutations) {
      if (key.startsWith(prefix)) {
        const gene = key.substring(prefix.length);
        mutations[key].forEach(mut => result.push({ ...mut, gene }));
      }
    }
    return result;
  };

  // Get fusions for a cell line — O(1) lookup
  const getFusionsForCellLine = (cellLineId) => {
    return fusions[cellLineId] || [];
  };

  // Get all CNV data for a cell line (O(n) scan — use on-demand, not in render loops)
  const getCnvForCellLine = (cellLineId) => {
    const prefix = `${cellLineId}|`;
    const result = [];
    for (const key in cnv) {
      if (key.startsWith(prefix)) {
        const gene = key.substring(prefix.length);
        result.push({ gene, ...cnv[key] });
      }
    }
    return result;
  };

  // CRISPR dependency helpers
  const getCrisprDep = (cellLineId, gene) => {
    const val = crisprDep[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  // CRISPR gene effect helpers (negative=essential, positive=loss promotes growth)
  const getCrisprEffect = (cellLineId, gene) => {
    const val = crisprEffect[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  const hasCrisprData = (cellLineId) => {
    return crisprScreenedLines.has(cellLineId);
  };

  // RNAi DEMETER2 helpers
  const getRnaiEffect = (cellLineId, gene) => {
    const val = rnaiEffect[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  const getRnaiDep = (cellLineId, gene) => {
    const val = rnaiDep[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  const hasRnaiData = (cellLineId) => {
    return rnaiScreenedLines.has(cellLineId);
  };

  // Gene expression helpers (log2(TPM+1))
  const getExpression = (cellLineId, gene) => {
    const val = expression[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  const hasExpressionData = (cellLineId) => {
    return expressionScreenedLines.has(cellLineId);
  };

  // Proteomics helpers (z-score)
  const getProteomics = (cellLineId, gene) => {
    const val = proteomics[`${cellLineId}|${gene}`];
    return val !== undefined ? val : null;
  };

  const hasProteomicsData = (cellLineId) => {
    return proteomicsScreenedLines.has(cellLineId);
  };

  // Drug sensitivity helpers
  const getDrugSensitivity = (cellLineId, drugIdx) => {
    if (!drugSensitivity?.data?.[cellLineId]) return null;
    const val = drugSensitivity.data[cellLineId][String(drugIdx)];
    return val !== undefined ? val : null;
  };

  const getDrugList = () => {
    return drugSensitivity?.drugList || [];
  };

  const getDrugsForGene = (gene) => {
    return drugTargets[gene] || [];
  };

  const getTopSensitiveDrugs = (cellLineId, n = 10) => {
    if (!drugSensitivity?.data?.[cellLineId]) return [];
    const cellData = drugSensitivity.data[cellLineId];
    const drugList = drugSensitivity.drugList || [];
    const entries = Object.entries(cellData)
      .map(([idx, val]) => ({
        drug: drugList[parseInt(idx)],
        value: val
      }))
      .filter(e => e.drug)
      .sort((a, b) => a.value - b.value);  // lower AUC = more sensitive
    return entries.slice(0, n);
  };

  const hasDrugData = (cellLineId) => {
    return drugScreenedLines.has(cellLineId);
  };

  // LymphGen classification helper
  const getLymphgenSubtype = (cellLineId) => {
    return lymphgen[cellLineId] || null;
  };

  const value = {
    cellLines,
    genes,
    loading,
    error,
    getMutations,
    getCnv,
    hasMutation,
    hasAlteration,
    isBiallelic,
    getGenesByCategory,
    getGeneCategory,
    getMutationCount,
    getMutationsForCellLine,
    getCnvForCellLine,
    getFusionsForCellLine,
    getPanel,
    getPanelList,
    getCategoryColor,
    getGeneInfo,
    getCrisprDep,
    getCrisprEffect,
    hasCrisprData,
    crisprScreenedLines,
    getRnaiEffect,
    getRnaiDep,
    hasRnaiData,
    rnaiScreenedLines,
    getExpression,
    hasExpressionData,
    expressionScreenedLines,
    getProteomics,
    hasProteomicsData,
    proteomicsScreenedLines,
    getDrugSensitivity,
    getDrugList,
    getDrugsForGene,
    getTopSensitiveDrugs,
    hasDrugData,
    drugScreenedLines,
    drugSensitivity,
    getLymphgenSubtype
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
