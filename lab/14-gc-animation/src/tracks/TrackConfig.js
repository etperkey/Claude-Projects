/**
 * Two-track GC animation system.
 * Track 1 (Mutations): emphasizes SHM + CSR with enhanced visuals
 * Track 2 (Chemokines): emphasizes chemokine gradients + receptor switching
 *
 * Duration ticks are synced to Rachel voiceover MP3s at 60fps + 2s buffer.
 */

export const TRACKS = {
  mutations: {
    id: 'mutations',
    title: 'Mutations',
    subtitle: 'SHM & IgH Class Switching',
    description: 'Follow how AID-driven somatic hypermutation and class switch recombination shape antibody diversity.',
    icon: '\u26A1',
    audioFolder: 'mutations',
    visuals: {
      showChemokines: false,
      enhanceSHM: true,
      enhanceCSR: true,
      showReceptorLabels: false,
      showMutationCallouts: true,
    },
    narration: {
      1: {
        text: 'A naive follicular B cell encounters antigen displayed on a follicular dendritic cell. Let\u2019s follow this one cell \u2014 highlighted in gold \u2014 through the entire germinal center reaction. Its germline-encoded BCR binds antigen with moderate affinity. This is the starting point for all mutations to come.',
        duration: 1308,  // ~19.8s voice + 2s buffer
      },
      2: {
        text: 'Our activated B cell migrates into the follicle and becomes a centroblast \u2014 the first cell to seed the dark zone. A germinal center forms around it: the dark zone below for proliferation, the light zone above for selection.',
        duration: 917,   // ~13.3s
      },
      3: {
        text: 'Our cell divides rapidly in the dark zone, generating a clone of daughter cells. Each daughter will acquire its own unique mutations. Division precedes mutation \u2014 creating the raw substrate for diversification.',
        duration: 881,   // ~12.7s
      },
      4: {
        text: 'Now, activation-induced cytidine deaminase (AID) targets the immunoglobulin variable region, deaminating cytosine to uracil. Error-prone repair introduces point mutations. This is somatic hypermutation, or SHM. Most mutations are neutral or deleterious. But watch our cell \u2014 it acquires a mutation that improves antigen binding.',
        duration: 1678,  // ~26.0s
      },
      5: {
        text: 'Mutated centroblasts differentiate into smaller centrocytes and migrate to the light zone. Our cell carries its improved BCR \u2014 and it\u2019s about to be tested against native antigen on FDC surfaces.',
        duration: 856,   // ~12.3s
      },
      6: {
        text: 'Centrocytes compete for antigen on FDC dendrites. Our cell\u2019s higher-affinity BCR captures more antigen, enabling better peptide-MHC presentation to T follicular helper cells. A Tfh cell provides rescue signals, confirming selection. Low-affinity clones fail this test and die \u2014 the selective filter that enriches beneficial mutations.',
        duration: 1598,  // ~24.6s
      },
      7: {
        text: 'Failed clones undergo apoptosis \u2014 the cost of random mutagenesis. Tingible body macrophages engulf the debris, creating the characteristic \u201Cstarry sky\u201D pattern seen in GC histology.',
        duration: 834,   // ~11.9s
      },
      8: {
        text: 'Selected B cells face a fate decision. Our cell recycles back to the dark zone for another round of SHM \u2014 acquiring additional mutations that further refine its BCR. Meanwhile, AID also targets the switch regions upstream of constant-region genes, driving class switch recombination \u2014 CSR. This changes the antibody from IgM to IgG, IgA, or IgE, without altering antigen specificity. Some selected cells differentiate into antibody-secreting plasmablasts or long-lived memory B cells and exit the germinal center.',
        duration: 2573,  // ~40.9s
      },
      9: {
        text: 'Over multiple cycles of mutation and selection, beneficial mutations accumulate while deleterious ones are purged. Our cell\u2019s BCR affinity has steadily improved through each round. This is affinity maturation \u2014 Darwinian evolution on a timescale of days, not millennia.',
        duration: 1154,  // ~17.2s
      },
    },
  },
  chemokines: {
    id: 'chemokines',
    title: 'Chemokines',
    subtitle: 'Gradients & Receptors',
    description: 'See how chemokine gradients and receptor switching drive B cell movement through the GC.',
    icon: '\uD83E\uDDED',
    audioFolder: 'chemokines',
    visuals: {
      showChemokines: true,
      enhanceSHM: false,
      enhanceCSR: false,
      showReceptorLabels: true,
      showMutationCallouts: false,
    },
    narration: {
      1: {
        text: 'A naive follicular B cell approaches an FDC. We\u2019ll follow this one cell \u2014 marked in gold \u2014 through the germinal center, tracking the chemokine receptors that guide its journey. Right now, CXCR5 on the B cell surface directs it toward CXCL13 produced by FDCs in the follicle.',
        duration: 1251,  // ~18.9s voice + 2s buffer
      },
      2: {
        text: 'As the germinal center forms, two chemokine domains emerge. CXCL12, produced by reticular cells, dominates the dark zone. CXCL13, produced by FDCs, dominates the light zone. These opposing gradients create the GC\u2019s bipolar architecture. Our activated B cell upregulates CXCR4, pulling it into the CXCL12-rich dark zone. GC B cells also express S1PR2, the confinement receptor \u2014 visible on cells throughout the reaction.',
        duration: 2174,  // ~34.2s
      },
      3: {
        text: 'Centroblasts express high levels of CXCR4, the receptor for CXCL12. This retains our cell and its daughters in the dark zone, where CXCL12 concentration is highest \u2014 anchoring them during rapid proliferation.',
        duration: 950,   // ~13.8s
      },
      4: {
        text: 'While centroblasts undergo SHM in the dark zone, their positioning is maintained by CXCR4\u2013CXCL12 signaling. At the GC periphery, two confinement systems are active: S1PR2 opposes S1P-directed migration outward, while P2RY8 senses GGG \u2014 geranylgeranylglutathione \u2014 keeping cells within the reaction.',
        duration: 1527,  // ~23.5s
      },
      5: {
        text: 'Now watch the receptor switch that drives migration. Our cell downregulates CXCR4 and upregulates CXCR5. No longer retained by CXCL12, it follows the CXCL13 gradient into the light zone, becoming a centrocyte. This CXCR4-to-CXCR5 switch is the molecular basis of DZ-to-LZ migration.',
        duration: 1519,  // ~23.3s
      },
      6: {
        text: 'In the light zone, S1PR2 and P2RY8 signal through G\u03B113 to activate RhoA. S1PR2 opposes migration toward S1P at the GC edge, while P2RY8 opposes migration toward GGG at the periphery. Together, this retention pathway keeps centrocytes like our cell confined for selection. GGT5 on FDCs degrades GGG near the GC center, shaping the confinement gradient \u2014 low in the interior, high at the edge.',
        duration: 2013,  // ~31.6s
      },
      7: {
        text: 'Apoptotic cells that failed selection are cleared by macrophages. The chemokine microenvironment remains intact \u2014 FDCs continue producing CXCL13, maintaining the light zone niche for ongoing selection.',
        duration: 957,   // ~14.0s
      },
      8: {
        text: 'Our selected cell recycles \u2014 re-expressing CXCR4 to follow the CXCL12 gradient back to the dark zone, while retaining S1PR2 for confinement. Other selected cells differentiate into plasmablasts or memory B cells. To exit, they downregulate S1PR2 and P2RY8 \u2014 releasing the G\u03B113-mediated confinement brake \u2014 and upregulate S1PR1, becoming responsive to sphingosine-1-phosphate in the blood and lymph. This receptor switch \u2014 S1PR2 down, P2RY8 down, S1PR1 up \u2014 is what releases them from the germinal center.',
        duration: 2587,  // ~41.1s
      },
      9: {
        text: 'Each cycle of DZ-to-LZ-to-DZ migration is orchestrated by sequential receptor switching. CXCR4 retains cells in the dark zone. CXCR5 drives them to the light zone. CXCR4 again pulls recycling cells back. Our cell has navigated this chemokine compass through multiple rounds \u2014 each pass refining its BCR through mutation and selection. This is how the germinal center achieves affinity maturation.',
        duration: 1928,  // ~30.1s
      },
    },
  },
};

export const TRACK_ORDER = ['mutations', 'chemokines'];
