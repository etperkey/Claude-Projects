// Research project data
export const researchProjects = [
  {
    id: 'training',
    title: 'Research Training & Resources',
    subtitle: 'Lab Onboarding & Compliance',
    color: '#2E7D32',
    icon: 'training',
    description: 'Lab training requirements, resources, and important reference information for the Kline Lab at UChicago.',
    hypothesis: '',
    approaches: ['Flow Cytometry', 'Animal Work', 'Lab Safety', 'Data Management'],
    tasks: {
      backlog: [
        {
          id: 'train-1',
          title: 'Flow Cytometry Training Course',
          priority: 'high',
          description: 'Complete UC Flow training courses',
          links: [{ title: 'UC Flow Training', url: 'https://voices.uchicago.edu/ucflow/training-courses/' }]
        },
        {
          id: 'train-2',
          title: 'Working with Rodents Training',
          priority: 'high',
          description: 'Required for animal room access',
          links: [{ title: 'Rodent Training', url: 'https://voices.uchicago.edu/animalresources/project/working-with-rodents-in-the-arc/' }]
        },
        {
          id: 'train-3',
          title: 'KCBD Virtual Tour',
          priority: 'medium',
          description: 'Complete AALAS virtual facility tour',
          links: [{ title: 'AALAS Learning Library', url: 'https://aalaslearninglibrary.org/' }]
        },
        {
          id: 'train-4',
          title: 'Basic Lab Safety Training',
          priority: 'high',
          description: 'Required for all lab members',
          links: [{ title: 'EHSA Training Portal', url: 'https://ehsa-prd-01.uchicago.edu/ehsa/public/webtraining/webtrainingindex' }]
        },
        {
          id: 'train-5',
          title: 'Optional Hands-on Rodent Training',
          priority: 'low',
          description: 'Request hands-on technique training',
          links: [{ title: 'Request Training', url: 'https://voices.uchicago.edu/animalresources/rodent-technique-training-request/' }]
        },
        {
          id: 'train-6',
          title: 'HDID Training',
          priority: 'medium',
          description: 'Contact Cezary for training: cciszews@bsd.uchicago.edu'
        }
      ],
      inProgress: [
        {
          id: 'train-7',
          title: 'Set up FileZilla for Flow Data',
          priority: 'high',
          description: 'Flow data automatically saved when using flowcore instruments',
          links: [{ title: 'Data Server Guide', url: 'https://voices.uchicago.edu/ucflow/2025/01/07/new-online-data-server-portal-tips-and-tricks/' }]
        },
        {
          id: 'train-8',
          title: 'Register for iLab Flow Scheduler',
          priority: 'high',
          description: 'Use UChicago ID & Pass to login',
          links: [{ title: 'iLab Login', url: 'https://my.ilabsolutions.com/account/login' }]
        }
      ],
      review: [
        {
          id: 'train-9',
          title: 'Verify Animal Room Access (KCBD 2259)',
          priority: 'medium',
          description: '2nd floor in KCBD, Room 2259'
        }
      ],
      done: [
        {
          id: 'train-10',
          title: 'Note Kline Lab Location',
          priority: 'low',
          description: '900 E. 57th St., KCBD 6230A, Chicago IL 60637',
          links: [{ title: 'Kline Lab Website', url: 'https://klinelab.uchicago.edu/' }]
        }
      ]
    }
  },
  {
    id: 'tp53',
    title: 'TP53 Loss-of-Function in DLBCL',
    subtitle: 'Immune Escape Mechanisms',
    color: '#8B2942',
    icon: 'tp53',
    description: 'Investigating how TP53 mutation actively remodels the immune microenvironment to create a "cold" tumor that resists T-cell killing.',
    hypothesis: 'TP53 mutation is not just a cell-cycle defect; it actively remodels the immune microenvironment to create a "cold" tumor that resists T-cell killing.',
    approaches: ['Immune Profiling', 'Epigenetic Modifiers', 'MHC-I Restoration', 'cGAS-STING Analysis'],
    tasks: {
      backlog: [
        { id: 'tp53-1', title: 'Literature review: TP53 in lymphoma', priority: 'medium' },
        { id: 'tp53-2', title: 'Design CRISPR screen for MHC-I regulators', priority: 'high' },
        { id: 'tp53-3', title: 'Identify patient cohort for validation', priority: 'medium' }
      ],
      inProgress: [
        { id: 'tp53-4', title: 'Analyze RNA-seq data from TP53-mutant samples', priority: 'high' },
        { id: 'tp53-5', title: 'Flow cytometry panel optimization', priority: 'medium' }
      ],
      review: [
        { id: 'tp53-6', title: 'Draft manuscript introduction', priority: 'low' }
      ],
      done: [
        { id: 'tp53-7', title: 'IRB approval for sample collection', priority: 'high' },
        { id: 'tp53-8', title: 'Cell line characterization', priority: 'medium' }
      ]
    }
  },
  {
    id: 'bite',
    title: 'BiTE Therapy Optimization',
    subtitle: 'Translational Model Development',
    color: '#5B4A8A',
    icon: 'bite',
    description: 'Understanding and overcoming T-cell exhaustion and the "antigen sink" effect that limits BiTE efficacy in B-cell lymphoma.',
    hypothesis: 'The efficacy of Bispecific T-cell Engagers (BiTEs) in B-cell lymphoma is limited by T-cell exhaustion and the "antigen sink" of healthy B-cells.',
    approaches: ['Humanized Mouse Models', 'T-cell Exhaustion Profiling', 'Combination Immunotherapy', 'Dosing Optimization'],
    tasks: {
      backlog: [
        { id: 'bite-1', title: 'Design intermittent dosing protocol', priority: 'high' },
        { id: 'bite-2', title: 'Source NSG-SGM3 mice', priority: 'medium' },
        { id: 'bite-3', title: 'Plan STING agonist combination study', priority: 'medium' }
      ],
      inProgress: [
        { id: 'bite-4', title: 'T-cell exhaustion marker panel (TOX, PD-1, TIM-3)', priority: 'high' },
        { id: 'bite-5', title: 'In vitro killing assay setup', priority: 'high' }
      ],
      review: [
        { id: 'bite-6', title: 'Mouse model protocol review', priority: 'medium' },
        { id: 'bite-7', title: 'Preliminary data for grant application', priority: 'high' }
      ],
      done: [
        { id: 'bite-8', title: 'BiTE reagent acquisition', priority: 'high' },
        { id: 'bite-9', title: 'Establish tumor cell lines', priority: 'medium' }
      ]
    }
  },
  {
    id: 'chemokine',
    title: 'Chemokine & G-Protein Mutations',
    subtitle: 'Lymphoma Dissemination',
    color: '#3A5A8A',
    icon: 'chemokine',
    description: 'Studying how mutations in the S1PR2-GNA13-RhoA axis disable GC confinement and enable lymphoma dissemination.',
    hypothesis: 'Mutations in the S1PR2 → Gα13 → RhoA axis disable the "confinement" signal in Germinal Center B-cells, allowing dissemination.',
    approaches: ['G-protein Signaling', 'Migration Assays', 'S1P Pathway Modulation', 'In Vivo Dissemination Models'],
    tasks: {
      backlog: [
        { id: 'chem-1', title: 'Design GNA13 knockout cell lines', priority: 'high' },
        { id: 'chem-2', title: 'Source S1PR2 agonist compounds', priority: 'medium' },
        { id: 'chem-3', title: 'Plan intravital imaging experiments', priority: 'low' }
      ],
      inProgress: [
        { id: 'chem-4', title: 'Transwell migration assays', priority: 'high' },
        { id: 'chem-5', title: 'Western blots for RhoA activation', priority: 'medium' }
      ],
      review: [
        { id: 'chem-6', title: 'Bioinformatics analysis of GNA13 mutant tumors', priority: 'high' }
      ],
      done: [
        { id: 'chem-7', title: 'Literature review on S1P signaling', priority: 'medium' },
        { id: 'chem-8', title: 'ROCK inhibitor dose-response curves', priority: 'medium' },
        { id: 'chem-9', title: 'Establish in vitro migration model', priority: 'high' }
      ]
    }
  },
  {
    id: 'microbiome',
    title: 'Microbial Drivers of NLPHL',
    subtitle: 'Moraxella & Indolent Lymphoma',
    color: '#8A6A3A',
    icon: 'microbe',
    description: 'Investigating how chronic antigenic stimulation by Moraxella catarrhalis drives NLPHL pathogenesis.',
    hypothesis: 'Chronic antigenic stimulation by Moraxella catarrhalis drives the pathogenesis of Nodular Lymphocyte-Predominant Hodgkin Lymphoma (NLPHL).',
    approaches: ['Microbiome Analysis', 'BCR Sequencing', 'Tfh Interactions', 'Clinical Correlates'],
    tasks: {
      backlog: [
        { id: 'micro-1', title: 'Design clinical study for antibiotic intervention', priority: 'high' },
        { id: 'micro-2', title: 'Develop IgD-Moraxella binding assay', priority: 'medium' },
        { id: 'micro-3', title: 'Plan Tfh co-culture experiments', priority: 'medium' }
      ],
      inProgress: [
        { id: 'micro-4', title: 'BCR sequencing of NLPHL patient samples', priority: 'high' },
        { id: 'micro-5', title: 'Microbiome profiling of respiratory samples', priority: 'high' }
      ],
      review: [
        { id: 'micro-6', title: 'Retrospective chart review protocol', priority: 'medium' }
      ],
      done: [
        { id: 'micro-7', title: 'Identify NLPHL patient cohort', priority: 'high' },
        { id: 'micro-8', title: 'MID/Hag protein purification', priority: 'medium' }
      ]
    }
  }
];

export const getProjectById = (id) => {
  return researchProjects.find(project => project.id === id);
};
