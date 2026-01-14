// Sample data for KanLab demo - prepopulated data for biomedical research projects

// Helper to generate dates relative to today
const getDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

const getDateTime = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

// Sample literature references for each project
export const sampleLiterature = {
  cart: [
    {
      id: 'ref-cart-1',
      pmid: '32433953',
      doi: '10.1038/s41591-020-0914-7',
      title: 'Long-term follow-up of CD19 CAR T-cell therapy in children and young adults with B-ALL',
      authors: 'Maude SL, Frey N, Shaw PA, et al.',
      journal: 'Nature Medicine',
      year: '2020',
      volume: '26',
      pages: '1587-1593',
      abstract: 'Chimeric antigen receptor (CAR) T-cell therapy targeting CD19 has shown remarkable efficacy in patients with relapsed or refractory B-cell acute lymphoblastic leukemia (B-ALL).',
      notes: 'Key reference for CAR-T persistence data. Important for Aim 2 comparison.',
      tags: ['CAR-T', 'persistence', 'clinical'],
      dateAdded: getDateTime(-30)
    },
    {
      id: 'ref-cart-2',
      pmid: '35396580',
      doi: '10.1016/j.cell.2022.03.023',
      title: '4-1BB costimulation induces T cell mitochondrial function and biogenesis enabling cancer immunotherapy',
      authors: 'Kawalekar OU, O\'Connor RS, Fraietta JA, et al.',
      journal: 'Cell',
      year: '2022',
      volume: '185',
      pages: '2252-2270',
      abstract: 'We show that 4-1BB costimulation enhances mitochondrial biogenesis in CAR T cells, leading to improved persistence and anti-tumor function.',
      notes: 'Supports our 4-1BB CAR design hypothesis. Review for methods.',
      tags: ['4-1BB', 'metabolism', 'signaling'],
      dateAdded: getDateTime(-15)
    },
    {
      id: 'ref-cart-3',
      pmid: '33504987',
      doi: '10.1172/JCI141256',
      title: 'IL-15 promotes CAR T cell expansion and memory formation in vivo',
      authors: 'Hurton LV, Singh H, Najjar AM, et al.',
      journal: 'Journal of Clinical Investigation',
      year: '2021',
      volume: '131',
      pages: 'e141256',
      abstract: 'IL-15 transpresentation by engineered CAR T cells enhances their persistence and anti-tumor efficacy.',
      notes: 'Critical for IL-15 supplementation approach. Compare dosing regimens.',
      tags: ['IL-15', 'cytokine', 'expansion'],
      dateAdded: getDateTime(-7)
    }
  ],
  crispr: [
    {
      id: 'ref-crispr-1',
      pmid: '32753547',
      doi: '10.1038/s41586-020-2629-y',
      title: 'Mapping the genetic landscape of human cells reveals novel regulators of cancer dependencies',
      authors: 'Tsherniak A, Vazquez F, Montgomery PG, et al.',
      journal: 'Nature',
      year: '2020',
      volume: '596',
      pages: '517-522',
      abstract: 'We performed genome-wide CRISPR screens across hundreds of cancer cell lines to identify genetic dependencies.',
      notes: 'Reference for screen design and analysis pipeline. Use DepMap data.',
      tags: ['CRISPR screen', 'DepMap', 'methods'],
      dateAdded: getDateTime(-45)
    },
    {
      id: 'ref-crispr-2',
      pmid: '31511697',
      doi: '10.1038/s41596-019-0209-6',
      title: 'MAGeCK enables robust identification of essential genes from genome-scale CRISPR/Cas9 knockout screens',
      authors: 'Li W, Xu H, Xiao T, et al.',
      journal: 'Nature Protocols',
      year: '2019',
      volume: '14',
      pages: '2939-2962',
      abstract: 'MAGeCK is a computational tool to identify positively and negatively selected sgRNAs from CRISPR screens.',
      notes: 'Primary analysis tool for our screen. Follow protocol exactly.',
      tags: ['MAGeCK', 'bioinformatics', 'analysis'],
      dateAdded: getDateTime(-20)
    }
  ],
  tme: [
    {
      id: 'ref-tme-1',
      pmid: '35512530',
      doi: '10.1038/s41586-022-04718-6',
      title: 'Spatial transcriptomics reveals immune cell infiltration patterns in melanoma',
      authors: 'Thrane K, Eriksson H, Maaskola J, et al.',
      journal: 'Nature',
      year: '2022',
      volume: '612',
      pages: '89-97',
      abstract: 'We applied spatial transcriptomics to melanoma samples to characterize the tumor immune microenvironment.',
      notes: 'Key reference for spatial analysis approach. Compare methods.',
      tags: ['spatial', 'melanoma', 'immune'],
      dateAdded: getDateTime(-25)
    },
    {
      id: 'ref-tme-2',
      pmid: '34497389',
      doi: '10.1016/j.cell.2021.08.020',
      title: 'CODEX multiplexed tissue imaging reveals immune-stromal interactions predicting immunotherapy response',
      authors: 'Black S, Phillips D, Hickey JW, et al.',
      journal: 'Cell',
      year: '2021',
      volume: '184',
      pages: '4988-5002',
      abstract: 'CODEX imaging reveals spatial relationships between immune and stromal cells in tumors.',
      notes: 'Reference for CODEX protocol and spatial analysis metrics.',
      tags: ['CODEX', 'spatial', 'immunotherapy'],
      dateAdded: getDateTime(-12)
    }
  ],
  scrna: [
    {
      id: 'ref-scrna-1',
      pmid: '31455834',
      doi: '10.1016/j.cell.2019.07.036',
      title: 'Single-cell RNA sequencing reveals the cellular hierarchy of human AML',
      authors: 'van Galen P, Hovestadt V, Wadsworth II MH, et al.',
      journal: 'Cell',
      year: '2019',
      volume: '176',
      pages: '1265-1281',
      abstract: 'We generated a single-cell atlas of AML revealing cellular heterogeneity and leukemic stem cell signatures.',
      notes: 'Primary reference dataset for integration. Use as benchmark.',
      tags: ['AML', 'scRNA-seq', 'atlas'],
      dateAdded: getDateTime(-60)
    },
    {
      id: 'ref-scrna-2',
      pmid: '33176164',
      doi: '10.1038/s41587-020-00744-z',
      title: 'Scanpy: large-scale single-cell gene expression data analysis',
      authors: 'Wolf FA, Angerer P, Theis FJ',
      journal: 'Nature Methods',
      year: '2021',
      volume: '15',
      pages: '818-825',
      abstract: 'Scanpy is a scalable toolkit for analyzing single-cell gene expression data.',
      notes: 'Primary analysis framework. Review tutorials for best practices.',
      tags: ['Scanpy', 'methods', 'software'],
      dateAdded: getDateTime(-40)
    },
    {
      id: 'ref-scrna-3',
      pmid: '34385701',
      doi: '10.1182/blood.2021011426',
      title: 'Therapy-resistant leukemic stem cells defined by single-cell RNA sequencing',
      authors: 'Pei S, Pollyea DA, Jordan CT, et al.',
      journal: 'Blood',
      year: '2021',
      volume: '138',
      pages: '1674-1688',
      abstract: 'scRNA-seq identifies therapy-resistant LSC populations with distinct gene expression profiles.',
      notes: 'Key paper for relapse signature genes. Compare our results.',
      tags: ['LSC', 'resistance', 'signature'],
      dateAdded: getDateTime(-18)
    }
  ]
};

// Sample protocols for each project
export const sampleProtocols = {
  cart: [
    {
      id: 'prot-cart-1',
      title: 'Lentiviral CAR-T Transduction Protocol',
      content: `## Lentiviral CAR-T Cell Generation

### Materials Required
- Lentivirus (CAR construct, titer >1x10^8 TU/mL)
- CD3+ T-cells (freshly isolated or thawed)
- X-VIVO 15 media
- Human AB serum (5%)
- IL-2 (100 U/mL)
- CD3/CD28 Dynabeads
- RetroNectin-coated plates
- Polybrene (8 µg/mL)

### Day 0: T-cell Activation
1. Thaw T-cells and rest for 2 hours at 37°C
2. Count viable cells (target >90% viability)
3. Resuspend at 1x10^6 cells/mL in complete media
4. Add CD3/CD28 beads at 1:1 ratio
5. Culture overnight at 37°C, 5% CO2

### Day 1: Transduction
1. Prepare RetroNectin plates (20 µg/mL, overnight at 4°C)
2. Wash plates 2x with PBS
3. Add lentivirus at MOI 10-20
4. Centrifuge at 2000g for 2 hours at 32°C
5. Remove supernatant, add activated T-cells
6. Add polybrene to 8 µg/mL
7. Spinoculate at 1000g for 90 min at 32°C

### Day 2-14: Expansion
1. Refresh media every 2-3 days
2. Maintain cell density at 0.5-1x10^6/mL
3. Remove beads on Day 6
4. Check CAR expression by flow on Day 5

### Quality Control
- Viability >80%
- CAR expression >30%
- CD4:CD8 ratio documented`,
      createdAt: getDateTime(-30),
      updatedAt: getDateTime(-10),
      tags: ['transduction', 'CAR-T', 'lentivirus']
    },
    {
      id: 'prot-cart-2',
      title: 'T-cell Exhaustion Flow Cytometry Panel',
      content: `## Exhaustion Marker Flow Cytometry

### Antibody Panel
| Marker | Fluorochrome | Clone | Dilution |
|--------|--------------|-------|----------|
| CD3 | BV421 | UCHT1 | 1:100 |
| CD4 | BV605 | RPA-T4 | 1:200 |
| CD8 | BV785 | SK1 | 1:100 |
| PD-1 | PE | EH12.2H7 | 1:50 |
| TIM-3 | APC | F38-2E2 | 1:50 |
| LAG-3 | PE-Cy7 | 11C3C65 | 1:50 |
| TIGIT | PerCP-Cy5.5 | A15153G | 1:100 |
| CAR | FITC | Protein L | 1:100 |

### Staining Protocol
1. Harvest 1x10^6 cells per sample
2. Wash with FACS buffer (PBS + 2% FBS)
3. Block Fc receptors (Human TruStain FcX, 10 min)
4. Add antibody cocktail, incubate 30 min at 4°C
5. Wash 2x with FACS buffer
6. Fix with 2% PFA if needed
7. Acquire on flow cytometer within 2 hours

### Gating Strategy
1. FSC-A vs SSC-A → Lymphocytes
2. FSC-A vs FSC-H → Singlets
3. CD3+ → T-cells
4. CD4+ or CD8+ → Subsets
5. CAR+ → Transduced cells`,
      createdAt: getDateTime(-15),
      updatedAt: getDateTime(-15),
      tags: ['flow cytometry', 'exhaustion', 'panel']
    }
  ],
  crispr: [
    {
      id: 'prot-crispr-1',
      title: 'Genome-wide CRISPR Screen Protocol',
      content: `## Pooled CRISPR Knockout Screen

### Library Information
- Brunello library (77,441 sgRNAs)
- 4 sgRNAs per gene
- Coverage: 500x minimum

### Cell Preparation
1. Expand Cas9-stable cells to 100x10^6
2. Verify Cas9 activity with test sgRNA
3. Prepare for lentiviral infection

### Library Transduction
1. Infect at MOI 0.3 (30% transduction)
2. Use enough cells for 500x coverage
3. Spinoculate at 1000g, 2 hours, 32°C
4. Rest overnight, add puromycin (2 µg/mL)
5. Select for 3 days

### Screen Timeline
- Day 0: Library infection
- Day 1: Begin puromycin selection
- Day 4: End selection, split cells
- Day 5: Begin drug treatment (if applicable)
- Day 14: Harvest cells for gDNA

### Genomic DNA Extraction
1. Pellet 30x10^6 cells
2. Lyse with Buffer AL + Proteinase K
3. Extract with phenol:chloroform
4. Precipitate with isopropanol
5. Resuspend in TE buffer

### PCR Amplification
1. Use 10 µg gDNA per reaction
2. Run 23 cycles with Herculase II
3. Pool reactions, purify with beads
4. Index with Illumina adapters`,
      createdAt: getDateTime(-45),
      updatedAt: getDateTime(-20),
      tags: ['CRISPR', 'screen', 'Brunello']
    }
  ],
  tme: [
    {
      id: 'prot-tme-1',
      title: 'CODEX Multiplexed Imaging Protocol',
      content: `## CODEX Tissue Imaging

### Tissue Preparation
1. Cut 5 µm FFPE sections onto poly-L-lysine slides
2. Bake at 60°C for 1 hour
3. Deparaffinize: Xylene (3x5 min)
4. Rehydrate: EtOH gradient to water
5. Antigen retrieval: Citrate buffer, pH 6.0, 20 min

### Antibody Conjugation
1. Conjugate antibodies to CODEX barcodes
2. Verify conjugation by dot blot
3. Titrate on positive control tissue

### Staining
1. Block with CODEX blocking buffer (30 min)
2. Apply antibody cocktail (overnight, 4°C)
3. Wash 3x with CODEX buffer
4. Fix with 1.6% PFA (10 min)
5. Post-fix with ice-cold methanol (5 min)

### Imaging Cycles
1. Mount tissue in CODEX buffer
2. Add fluorescent reporters
3. Image all cycles (3-channel per cycle)
4. Strip reporters between cycles
5. Repeat for all antibody cycles

### Analysis
1. Register images across cycles
2. Segment cells (CODEX Processor)
3. Extract single-cell intensities
4. Phenotype using clustering`,
      createdAt: getDateTime(-20),
      updatedAt: getDateTime(-8),
      tags: ['CODEX', 'imaging', 'spatial']
    }
  ],
  scrna: [
    {
      id: 'prot-scrna-1',
      title: '10x Chromium scRNA-seq Protocol',
      content: `## Single-Cell RNA Sequencing (10x Genomics)

### Sample Requirements
- Single-cell suspension
- Viability >80%
- Cell concentration: 700-1200 cells/µL
- No debris or clumps

### Cell Preparation
1. Filter through 40 µm strainer
2. Wash with PBS + 0.04% BSA
3. Count cells (hemocytometer + Trypan blue)
4. Adjust to 1000 cells/µL
5. Keep on ice until loading

### Chromium Controller
1. Load cells per chip well (10,000 target)
2. Run Chromium Controller program
3. Collect GEMs (gel beads in emulsion)
4. Perform reverse transcription

### Library Preparation
1. cDNA amplification (12 cycles)
2. QC: Bioanalyzer (expect 400-3000 bp)
3. Fragmentation and adapter ligation
4. Sample index PCR
5. Final QC: Qubit + Bioanalyzer

### Sequencing Parameters
- Read 1: 28 bp (cell barcode + UMI)
- i7 Index: 8 bp
- Read 2: 91 bp (transcript)
- Depth: 50,000 reads/cell minimum`,
      createdAt: getDateTime(-25),
      updatedAt: getDateTime(-5),
      tags: ['10x', 'scRNA-seq', 'library prep']
    }
  ]
};

// Sample results for each project
export const sampleResults = {
  cart: [
    {
      id: 'res-cart-1',
      title: 'CAR Expression Analysis - Batch 1',
      content: `## Flow Cytometry Results

### Transduction Efficiency
| Sample | MOI | CAR+ (%) | Viability |
|--------|-----|----------|-----------|
| HD-001 | 5 | 28.4% | 91% |
| HD-001 | 10 | 42.1% | 88% |
| HD-001 | 20 | 51.3% | 82% |
| HD-002 | 10 | 38.7% | 90% |
| HD-002 | 20 | 48.9% | 85% |

### Key Findings
- Optimal MOI appears to be 10-20
- Higher MOI reduces viability
- CAR expression stable through Day 14

### CD4/CD8 Ratios
| Sample | Pre-transduction | Post-transduction |
|--------|-----------------|-------------------|
| HD-001 | 1.8 | 1.2 |
| HD-002 | 2.1 | 1.4 |

### Conclusions
MOI 10 provides good balance of transduction efficiency and viability. Proceed with expansion studies using this condition.`,
      createdAt: getDateTime(-12),
      updatedAt: getDateTime(-12),
      tags: ['flow cytometry', 'transduction', 'results']
    }
  ],
  crispr: [
    {
      id: 'res-crispr-1',
      title: 'Paclitaxel IC50 Determination',
      content: `## Drug Sensitivity Results

### MDA-MB-231 Paclitaxel Response

#### 72-hour Viability Assay
| Concentration (nM) | Viability (%) | SD |
|--------------------|---------------|-----|
| 0 | 100.0 | 2.1 |
| 1 | 98.2 | 3.4 |
| 5 | 87.4 | 4.2 |
| 10 | 62.3 | 5.1 |
| 25 | 38.7 | 3.8 |
| 50 | 21.4 | 2.9 |
| 100 | 12.1 | 2.3 |

### Calculated IC50
**IC50 = 18.3 nM** (95% CI: 15.2 - 21.8 nM)

### Recommended Screen Concentration
Use 25 nM paclitaxel for selection:
- ~60% cell death
- Sufficient selective pressure
- Allows resistant population outgrowth`,
      createdAt: getDateTime(-25),
      updatedAt: getDateTime(-25),
      tags: ['IC50', 'paclitaxel', 'viability']
    }
  ],
  tme: [
    {
      id: 'res-tme-1',
      title: 'Spatial Analysis - Pilot Melanoma Sample',
      content: `## Spatial Transcriptomics Pilot Results

### Sample Information
- Patient: MEL-042 (pre-treatment)
- Response: Partial responder to anti-PD-1
- Tissue: Primary cutaneous melanoma

### Cell Type Composition
| Cell Type | Percentage | Location |
|-----------|------------|----------|
| Melanoma cells | 45% | Tumor core |
| CD8+ T-cells | 12% | Tumor margin |
| CD4+ T-cells | 8% | Stroma |
| Macrophages | 15% | Infiltrating |
| Fibroblasts | 18% | Stroma |
| B-cells | 2% | Tertiary lymphoid |

### Spatial Metrics
- CD8+ T-cell proximity to tumor: 45 µm (median)
- PD-L1+ tumor fraction: 32%
- Tertiary lymphoid structures: 2 identified

### Key Observations
1. "Hot" regions with CD8 infiltration at tumor margin
2. "Cold" core with minimal immune infiltration
3. Macrophages predominantly M2 polarized`,
      createdAt: getDateTime(-6),
      updatedAt: getDateTime(-6),
      tags: ['spatial', 'pilot', 'melanoma']
    }
  ],
  scrna: [
    {
      id: 'res-scrna-1',
      title: 'QC Metrics - Batch 1 Sequencing',
      content: `## scRNA-seq Quality Control

### Sequencing Summary
| Sample | Reads | Cells | Median Genes | Median UMI |
|--------|-------|-------|--------------|------------|
| AML-001 | 285M | 6,842 | 2,145 | 8,234 |
| AML-002 | 312M | 7,231 | 2,389 | 9,102 |
| AML-003 | 278M | 5,921 | 1,987 | 7,456 |
| AML-004 | 301M | 6,654 | 2,234 | 8,567 |
| AML-005 | 295M | 6,123 | 2,098 | 7,890 |

### QC Thresholds Applied
- Minimum genes: 500
- Maximum genes: 6000
- Maximum MT%: 15%
- Doublet removal: scrublet

### Cells Passing QC
| Sample | Pre-QC | Post-QC | % Retained |
|--------|--------|---------|------------|
| AML-001 | 6,842 | 5,823 | 85.1% |
| AML-002 | 7,231 | 6,412 | 88.7% |
| AML-003 | 5,921 | 4,892 | 82.6% |
| AML-004 | 6,654 | 5,734 | 86.2% |
| AML-005 | 6,123 | 5,298 | 86.5% |

### Total Cells for Analysis: 28,159`,
      createdAt: getDateTime(-3),
      updatedAt: getDateTime(-3),
      tags: ['QC', 'sequencing', 'metrics']
    }
  ]
};

// Sample research notes for each project
export const sampleResearchNotes = {
  cart: {
    background: `## Research Background

### Scientific Rationale
CAR-T cell therapy has revolutionized treatment for B-cell malignancies, but efficacy in solid tumors remains limited. Key challenges include:

1. **T-cell exhaustion**: Chronic antigen exposure leads to functional exhaustion
2. **Immunosuppressive TME**: Solid tumors create hostile environments
3. **Limited persistence**: CAR-T cells often fail to establish long-term memory

### Our Approach
We hypothesize that combining:
- **4-1BB costimulation**: Enhances mitochondrial fitness and memory formation
- **IL-15 supplementation**: Promotes T-cell survival without exhaustion
- **Novel CAR design**: Optimized for solid tumor targeting

### Preliminary Data
- 4-1BB CARs show 2.3x improved persistence vs CD28 CARs
- IL-15 reduces PD-1 expression by 40%
- Combination shows synergistic anti-tumor activity in vitro`,
    notes: `## Research Notes

### Week 1-2 Summary
- Completed IRB approval for healthy donor blood collection
- Validated CAR construct by Sanger sequencing
- Established lentivirus production protocol

### Key Observations
1. Transduction efficiency varies significantly by donor (28-52%)
2. IL-15 groups maintain better viability during expansion
3. Need to optimize MOI for each donor batch

### Outstanding Questions
- Optimal IL-15 concentration for expansion?
- When to assess exhaustion markers?
- Best solid tumor model for in vivo studies?

### Next Steps
1. Complete expansion comparison study
2. Flow cytometry for exhaustion panel
3. Plan xenograft experiments`,
    createdAt: getDateTime(-20),
    updatedAt: getDateTime(-2)
  },
  crispr: {
    background: `## Research Background

### Scientific Context
Triple-negative breast cancer (TNBC) has limited treatment options and frequently develops chemotherapy resistance. Understanding the genetic basis of resistance could identify new therapeutic targets.

### CRISPR Screening Strategy
- **Library**: Brunello (genome-wide, 77,441 sgRNAs)
- **Selection**: Paclitaxel treatment
- **Readout**: Enrichment/depletion of sgRNAs
- **Analysis**: MAGeCK for hit identification

### Expected Outcomes
1. Identify genes whose loss confers paclitaxel resistance
2. Validate top hits with individual knockouts
3. Characterize mechanisms for drug development

### Preliminary Work
- Cas9-stable MDA-MB-231 cells validated
- Library QC confirms excellent representation
- IC50 determined for selection concentration`,
    notes: `## Research Notes

### Screen Design Notes
- MOI 0.3 ensures single sgRNA per cell
- 500x coverage requires 40M cells minimum
- Treatment duration: 14 days with drug refresh

### Analysis Pipeline
1. FastQC → quality assessment
2. MAGeCK count → sgRNA quantification
3. MAGeCK test → statistical analysis
4. GSEA → pathway enrichment

### Validation Strategy
- Top 50 enriched genes for validation
- 3-4 independent sgRNAs per gene
- Confirm knockout by Western blot
- Re-test drug sensitivity

### Potential Hits to Watch
Based on literature, expect to see:
- ABC transporters (drug efflux)
- DNA repair genes
- Apoptosis regulators`,
    createdAt: getDateTime(-30),
    updatedAt: getDateTime(-5)
  },
  tme: {
    background: `## Research Background

### Clinical Context
Response to immune checkpoint blockade (ICB) in melanoma varies widely. Spatial organization of immune cells in the tumor microenvironment may predict treatment response.

### Hypothesis
Patients with CD8+ T-cells in close proximity to tumor cells will have better response to anti-PD-1 therapy.

### Technical Approach
1. **CODEX imaging**: 40-plex antibody panel for comprehensive TME profiling
2. **Spatial transcriptomics**: 10x Visium for gene expression in spatial context
3. **Clinical correlation**: Link spatial features to treatment outcomes

### Cohort Information
- 40 melanoma patients with pre-treatment biopsies
- Response data available (RECIST criteria)
- Mix of responders and non-responders`,
    notes: `## Research Notes

### Panel Development
40-plex CODEX panel includes:
- T-cell markers: CD3, CD4, CD8, FOXP3
- Myeloid markers: CD68, CD163, CD11c
- B-cell markers: CD20, CD19
- Structural: Pan-CK, SMA, Vimentin
- Functional: Ki67, PD-1, PD-L1, LAG-3

### Spatial Metrics to Calculate
1. Nearest neighbor distances
2. Cell type co-localization scores
3. Infiltration depth into tumor
4. Tertiary lymphoid structure identification

### Preliminary Findings
Pilot sample (MEL-042) shows:
- Clear spatial segregation of immune/tumor compartments
- CD8+ T-cells concentrated at tumor margin
- M2 macrophages in tumor core`,
    createdAt: getDateTime(-15),
    updatedAt: getDateTime(-4)
  },
  scrna: {
    background: `## Research Background

### Disease Context
Acute myeloid leukemia (AML) is characterized by cellular heterogeneity. Leukemic stem cells (LSCs) are thought to drive relapse after chemotherapy.

### Scientific Questions
1. What defines the LSC transcriptional signature?
2. Which populations persist after treatment?
3. Can we predict relapse from diagnosis samples?

### Approach
- Single-cell RNA-seq on 50 AML patient samples
- Samples at diagnosis (pre-treatment)
- Integration with published datasets
- Machine learning for relapse prediction

### Expected Impact
- Define therapy-resistant cell populations
- Identify therapeutic targets on LSCs
- Develop prognostic gene signature`,
    notes: `## Research Notes

### Sample Collection
- Bone marrow aspirates at diagnosis
- Minimum 1x10^6 mononuclear cells
- Viability >80% required
- Cryopreserved in 10% DMSO

### Analysis Pipeline
1. CellRanger → alignment and counting
2. Scanpy → QC, normalization, clustering
3. Cell type annotation → reference mapping
4. Trajectory analysis → differentiation paths
5. Signature scoring → LSC identification

### Reference Datasets
- van Galen et al. (Cell 2019): AML atlas
- Pei et al. (Blood 2021): LSC signatures
- TCGA AML: bulk RNA-seq for validation

### Key Genes for LSC
CD34+, CD38-, CD123+, TIM-3+
Signature: GPR56, CD99, IL1RAP`,
    createdAt: getDateTime(-25),
    updatedAt: getDateTime(-1)
  }
};

// Sample lab notebook entries
export const sampleNotebookEntries = [
  {
    id: 'nb-1',
    title: 'CAR-T transduction optimization - Day 1',
    content: `## Experiment Overview
Optimized lentiviral transduction protocol for CAR-T cell generation.

## Materials
- Lentivirus: CAR19-4-1BB (lot #LV2024-03)
- T-cells: CD3+ cells from healthy donor HD-001
- Polybrene: 8 µg/mL
- RetroNectin plates: pre-coated overnight

## Protocol
1. Thawed T-cells and activated with CD3/CD28 beads (1:1 ratio)
2. Cultured in X-VIVO 15 + 5% human serum + IL-2 (100 U/mL)
3. Day 2: Added lentivirus at MOI 5, 10, and 20
4. Spinoculated at 1000g for 90 min at 32°C

## Results
- Cell viability post-thaw: 92%
- Activation efficiency (CD25+): 78%
- Transduction pending (check Day 5)

## Next Steps
- Flow cytometry for CAR expression on Day 5
- Expansion count every 2 days`,
    projectId: 'cart',
    tags: ['transduction', 'protocol', 'optimization'],
    createdAt: getDateTime(-14),
    updatedAt: getDateTime(-14),
    author: 'Demo User',
    isLocked: true,
    auditTrail: []
  },
  {
    id: 'nb-2',
    title: 'Brunello library QC results',
    content: `## Library Quality Control

### NGS Results Summary
Performed deep sequencing of Brunello library to assess sgRNA representation.

### Key Metrics
- Total reads: 42.3M
- Mapped to library: 98.2%
- sgRNA detected: 76,441/77,441 (98.7%)
- Gini index: 0.09 (excellent uniformity)

### Distribution Analysis
\`\`\`
Representation percentiles:
- 10th: 312 reads
- 50th: 548 reads
- 90th: 892 reads
\`\`\`

### Conclusion
Library quality is excellent. Proceed with screen at 500x coverage.

### Files
- FastQ: /data/crispr/brunello_qc_R1.fastq.gz
- Count table: /data/crispr/brunello_counts.txt`,
    projectId: 'crispr',
    tags: ['QC', 'NGS', 'library'],
    createdAt: getDateTime(-21),
    updatedAt: getDateTime(-21),
    author: 'Demo User',
    isLocked: true,
    auditTrail: []
  },
  {
    id: 'nb-3',
    title: 'CODEX panel validation - tonsil tissue',
    content: `## Antibody Panel Validation

### Objective
Validate first 20 antibodies of CODEX panel on positive control tissue (tonsil).

### Antibodies Tested
| Marker | Clone | Dilution | Result |
|--------|-------|----------|--------|
| CD3 | UCHT1 | 1:200 | Pass |
| CD4 | RPA-T4 | 1:100 | Pass |
| CD8 | SK1 | 1:150 | Pass |
| CD20 | L26 | 1:200 | Pass |
| CD68 | KP1 | 1:100 | Pass |
| PanCK | AE1/AE3 | 1:200 | Pass |
| Ki67 | MIB-1 | 1:100 | Pass |
| PD-1 | NAT105 | 1:50 | Weak |
| FOXP3 | 236A/E7 | 1:100 | Pass |
| CD45 | HI30 | 1:200 | Pass |

### Issues
- PD-1 signal weak - try 1:25 dilution
- Some autofluorescence in germinal centers

### Next Steps
1. Re-test PD-1 at lower dilution
2. Add autofluorescence removal step
3. Proceed with remaining 20 antibodies`,
    projectId: 'tme',
    tags: ['CODEX', 'validation', 'antibodies'],
    createdAt: getDateTime(-8),
    updatedAt: getDateTime(-6),
    author: 'Demo User',
    isLocked: false,
    auditTrail: []
  },
  {
    id: 'nb-4',
    title: 'AML sample processing - Batch 1',
    content: `## Sample Processing Log

### Samples Received
5 AML bone marrow aspirates (diagnostic)

| Sample ID | Diagnosis | Blast % | Viability |
|-----------|-----------|---------|-----------|
| AML-001 | AML-M1 | 78% | 89% |
| AML-002 | AML-M4 | 65% | 92% |
| AML-003 | AML-M2 | 82% | 85% |
| AML-004 | AML-M5 | 71% | 88% |
| AML-005 | AML-M1 | 69% | 91% |

### Processing Protocol
1. Ficoll separation (400g, 30 min)
2. Red cell lysis (ACK buffer, 5 min)
3. Wash 2x in PBS + 0.04% BSA
4. Count and viability check
5. Target: 10,000 cells for 10x loading

### 10x Chromium Loading
- Target cells: 10,000
- Expected recovery: 6,000-8,000
- Loaded all 5 samples successfully

### Notes
- AML-003 had some clumping - extra filtering
- All samples passed QC for sequencing`,
    projectId: 'scrna',
    tags: ['sample processing', '10x', 'AML'],
    createdAt: getDateTime(-5),
    updatedAt: getDateTime(-5),
    author: 'Demo User',
    isLocked: false,
    auditTrail: []
  },
  {
    id: 'nb-5',
    title: 'IL-15 expansion comparison - Week 1',
    content: `## CAR-T Expansion Study

### Experimental Design
Compare CAR-T expansion with IL-2 vs IL-15 supplementation.

### Conditions
- **Group A**: IL-2 (100 U/mL)
- **Group B**: IL-15 (10 ng/mL)
- **Group C**: IL-15 + IL-21 (10 ng/mL each)

### Cell Counts (x10^6)

| Day | IL-2 | IL-15 | IL-15/21 |
|-----|------|-------|----------|
| 0 | 2.0 | 2.0 | 2.0 |
| 3 | 4.2 | 5.1 | 5.8 |
| 5 | 8.5 | 12.3 | 14.1 |
| 7 | 15.2 | 28.4 | 31.2 |

### Observations
- IL-15 groups showing enhanced expansion
- Cell morphology healthier in IL-15 groups
- Less activation-induced cell death

### Samples Collected
- Day 7: Flow cytometry for exhaustion markers
- Day 7: Cytokine supernatant (stored -80C)`,
    projectId: 'cart',
    tags: ['expansion', 'IL-15', 'comparison'],
    createdAt: getDateTime(-3),
    updatedAt: getDateTime(-2),
    author: 'Demo User',
    isLocked: false,
    auditTrail: []
  }
];

// Initialize sample data in localStorage if not present
export const initializeSampleData = () => {
  const DEMO_INITIALIZED_KEY = 'kanlab-demo-initialized';

  // Check if already initialized
  if (localStorage.getItem(DEMO_INITIALIZED_KEY)) {
    return;
  }

  // Initialize literature
  const litKey = 'research-dashboard-literature';
  if (!localStorage.getItem(litKey)) {
    localStorage.setItem(litKey, JSON.stringify(sampleLiterature));
  }

  // Initialize notebook entries
  const notebookKey = 'research-dashboard-lab-notebook';
  if (!localStorage.getItem(notebookKey)) {
    localStorage.setItem(notebookKey, JSON.stringify(sampleNotebookEntries));
  }

  // Initialize protocols for each project
  const protocolsKey = 'research-dashboard-protocols';
  if (!localStorage.getItem(protocolsKey)) {
    localStorage.setItem(protocolsKey, JSON.stringify(sampleProtocols));
  }

  // Initialize results for each project
  const resultsKey = 'research-dashboard-results';
  if (!localStorage.getItem(resultsKey)) {
    localStorage.setItem(resultsKey, JSON.stringify(sampleResults));
  }

  // Initialize research notes for each project
  const notesKey = 'research-dashboard-research-notes';
  if (!localStorage.getItem(notesKey)) {
    localStorage.setItem(notesKey, JSON.stringify(sampleResearchNotes));
  }

  // Mark as initialized
  localStorage.setItem(DEMO_INITIALIZED_KEY, 'true');
};
