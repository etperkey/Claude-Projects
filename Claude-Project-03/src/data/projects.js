// Biomedical Research Lab Projects - KanLab Demo

// Helper to generate dates relative to today
const getDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

export const researchProjects = [
  {
    id: 'cart',
    title: 'CAR-T Cell Optimization',
    subtitle: 'Adoptive Cell Therapy',
    color: '#2E7D32',
    icon: 'cart',
    description: 'Engineering next-generation CAR-T cells with enhanced persistence and reduced exhaustion for solid tumor targeting.',
    hypothesis: 'Incorporation of a 4-1BB costimulatory domain combined with IL-15 cytokine support will enhance CAR-T cell persistence and anti-tumor efficacy in solid tumor models.',
    aims: [
      'Aim 1: Design and validate novel CAR constructs with modified signaling domains',
      'Aim 2: Evaluate CAR-T expansion protocols using IL-15 vs IL-2 supplementation',
      'Aim 3: Assess anti-tumor efficacy in xenograft models of pancreatic adenocarcinoma'
    ],
    approaches: ['Lentiviral Transduction', 'Flow Cytometry', 'Xenograft Models', 'Cytokine Analysis'],
    tasks: {
      backlog: [
        { id: 'cart-1', title: 'Design 3rd generation CAR construct with 4-1BB/CD28 domains', priority: 'high', description: 'Clone new CAR construct into lentiviral backbone' },
        { id: 'cart-2', title: 'Order IL-15 superagonist (ALT-803)', priority: 'medium', description: 'Contact vendor for quote and delivery timeline' },
        { id: 'cart-3', title: 'Establish PANC-1 xenograft model in NSG mice', priority: 'high', description: 'Tumor implantation and growth kinetics' }
      ],
      inProgress: [
        { id: 'cart-4', title: 'T-cell isolation from healthy donor PBMCs', priority: 'high', dueDate: getDate(3), description: 'Ficoll separation and CD3+ enrichment' },
        { id: 'cart-5', title: 'Lentivirus production for CAR transduction', priority: 'high', dueDate: getDate(7), description: '293T transfection with packaging plasmids' }
      ],
      review: [
        { id: 'cart-6', title: 'Flow cytometry panel for T-cell exhaustion markers', priority: 'medium', dueDate: getDate(5), description: 'PD-1, TIM-3, LAG-3, TOX staining protocol' }
      ],
      done: [
        { id: 'cart-7', title: 'IRB approval for healthy donor blood collection', priority: 'high', description: 'Protocol #2024-0892 approved' },
        { id: 'cart-8', title: 'CAR construct sequence verification', priority: 'medium', description: 'Sanger sequencing confirmed correct insert' }
      ]
    }
  },
  {
    id: 'crispr',
    title: 'CRISPR Screen for Drug Resistance',
    subtitle: 'Functional Genomics',
    color: '#1565C0',
    icon: 'crispr',
    description: 'Genome-wide CRISPR knockout screen to identify genetic determinants of chemotherapy resistance in triple-negative breast cancer.',
    hypothesis: 'Systematic CRISPR-Cas9 knockout screening will reveal novel synthetic lethal interactions that can be exploited to overcome paclitaxel resistance.',
    aims: [
      'Aim 1: Perform genome-wide CRISPR screen in paclitaxel-treated MDA-MB-231 cells',
      'Aim 2: Validate top candidate genes using individual sgRNA knockouts',
      'Aim 3: Characterize mechanism of resistance for lead candidates'
    ],
    approaches: ['CRISPR-Cas9', 'NGS Analysis', 'Drug Synergy Assays', 'Western Blot'],
    tasks: {
      backlog: [
        { id: 'crispr-1', title: 'Optimize Cas9 delivery efficiency in MDA-MB-231', priority: 'high', description: 'Test electroporation vs lentiviral delivery' },
        { id: 'crispr-2', title: 'Establish IC50 for paclitaxel selection', priority: 'medium', description: 'Dose-response curve over 72h' },
        { id: 'crispr-3', title: 'Plan validation experiments for top 50 hits', priority: 'medium', description: 'Individual sgRNA cloning strategy' }
      ],
      inProgress: [
        { id: 'crispr-4', title: 'Brunello library amplification', priority: 'high', dueDate: getDate(2), description: 'Electroporate into electrocompetent cells' },
        { id: 'crispr-5', title: 'NGS sample prep for screen readout', priority: 'high', dueDate: getDate(10), description: 'PCR amplify sgRNA from genomic DNA' }
      ],
      review: [
        { id: 'crispr-6', title: 'MAGeCK analysis pipeline setup', priority: 'medium', dueDate: getDate(14), description: 'Configure analysis parameters for hit calling' }
      ],
      done: [
        { id: 'crispr-7', title: 'Brunello library QC (plasmid representation)', priority: 'high', description: 'NGS confirmed >90% guide representation' },
        { id: 'crispr-8', title: 'Cas9-stable MDA-MB-231 cell line generation', priority: 'high', description: 'Clonal selection complete, confirmed editing' },
        { id: 'crispr-9', title: 'Bioinformatics pipeline installation', priority: 'medium', description: 'MAGeCK and STARS installed on cluster' }
      ]
    }
  },
  {
    id: 'tme',
    title: 'Tumor Microenvironment Profiling',
    subtitle: 'Spatial Transcriptomics',
    color: '#7B1FA2',
    icon: 'tme',
    description: 'Characterizing immune cell spatial organization in the tumor microenvironment using multiplexed imaging and spatial transcriptomics.',
    hypothesis: 'Spatial proximity of CD8+ T-cells to tumor cells predicts response to immune checkpoint blockade in melanoma patients.',
    aims: [
      'Aim 1: Develop 40-plex CODEX antibody panel for TME characterization',
      'Aim 2: Perform spatial transcriptomics on pre-treatment melanoma biopsies',
      'Aim 3: Correlate spatial features with clinical response to anti-PD-1 therapy'
    ],
    approaches: ['CODEX Imaging', '10x Visium', 'Digital Pathology', 'Machine Learning'],
    tasks: {
      backlog: [
        { id: 'tme-1', title: 'Validate CODEX antibody panel on tonsil controls', priority: 'high', description: 'Test each antibody for specificity and signal' },
        { id: 'tme-2', title: 'Coordinate sample acquisition with pathology', priority: 'medium', description: 'FFPE blocks from melanoma biobank' },
        { id: 'tme-3', title: 'Set up QuPath analysis pipeline', priority: 'medium', description: 'Cell segmentation and phenotyping workflow' }
      ],
      inProgress: [
        { id: 'tme-4', title: 'CODEX antibody conjugation', priority: 'high', dueDate: getDate(5), description: 'Conjugate 20 antibodies to metal-tagged oligos' },
        { id: 'tme-5', title: 'Visium spatial transcriptomics - first cohort', priority: 'high', dueDate: getDate(12), description: '10 samples, permeabilization optimization' }
      ],
      review: [
        { id: 'tme-6', title: 'Spatial analysis R package evaluation', priority: 'low', dueDate: getDate(8), description: 'Compare Seurat vs Giotto vs squidpy' }
      ],
      done: [
        { id: 'tme-7', title: 'IRB amendment for archival tissue use', priority: 'high', description: 'Amendment approved for retrospective analysis' },
        { id: 'tme-8', title: 'CODEX instrument training completed', priority: 'medium', description: 'Core facility certification obtained' }
      ]
    }
  },
  {
    id: 'scrna',
    title: 'Single-Cell Atlas of Leukemia',
    subtitle: 'Computational Biology',
    color: '#E65100',
    icon: 'scrna',
    description: 'Building a comprehensive single-cell transcriptomic atlas of acute myeloid leukemia to identify therapy-resistant cell populations.',
    hypothesis: 'Leukemic stem cells with a distinct transcriptional signature persist after chemotherapy and drive relapse.',
    aims: [
      'Aim 1: Generate scRNA-seq profiles from 50 AML patient samples at diagnosis',
      'Aim 2: Identify and characterize therapy-resistant cell populations',
      'Aim 3: Develop gene signature for predicting relapse risk'
    ],
    approaches: ['10x Chromium', 'Scanpy/Seurat', 'Trajectory Analysis', 'Gene Signature Modeling'],
    tasks: {
      backlog: [
        { id: 'scrna-1', title: 'Establish sample processing SOP for bone marrow', priority: 'high', description: 'Viability and doublet rate optimization' },
        { id: 'scrna-2', title: 'Set up CellRanger pipeline on HPC cluster', priority: 'medium', description: 'Request allocation and install software' },
        { id: 'scrna-3', title: 'Design CITE-seq antibody panel for surface markers', priority: 'medium', description: 'CD34, CD38, CD123, CD45RA panel' }
      ],
      inProgress: [
        { id: 'scrna-4', title: 'Process first batch of 10 AML samples', priority: 'high', dueDate: getDate(4), description: '10x library prep and QC' },
        { id: 'scrna-5', title: 'Develop Scanpy analysis pipeline', priority: 'high', dueDate: getDate(9), description: 'QC, clustering, annotation workflow' }
      ],
      review: [
        { id: 'scrna-6', title: 'Literature review on AML LSC signatures', priority: 'medium', dueDate: getDate(6), description: 'Compile published gene sets for validation' },
        { id: 'scrna-7', title: 'Statistical analysis plan for relapse prediction', priority: 'high', dueDate: getDate(11), description: 'Machine learning approach selection' }
      ],
      done: [
        { id: 'scrna-8', title: 'Patient consent and sample collection protocol', priority: 'high', description: 'IRB-approved, accrual initiated' },
        { id: 'scrna-9', title: '10x Chromium training completed', priority: 'medium', description: 'Certified for independent use' },
        { id: 'scrna-10', title: 'Reference dataset download (van Galen AML atlas)', priority: 'low', description: 'Downloaded for integration analysis' }
      ]
    }
  }
];

export const getProjectById = (id) => {
  return researchProjects.find(project => project.id === id);
};
