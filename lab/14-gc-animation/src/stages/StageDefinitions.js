/**
 * 9 narrative stages of the GC reaction.
 * Each stage has:
 *   - title: display name
 *   - narration: explanation text
 *   - duration: ticks in autoplay mode (synced to ElevenLabs voiceover + 2s buffer)
 *   - setup: function(sim) called when stage activates
 *   - condition: function(sim) → bool, if truthy can auto-advance
 */
export const STAGES = [
  {
    id: 1,
    title: 'Antigen Encounter',
    narration: 'A naive follicular B cell encounters antigen displayed on a follicular dendritic cell. The B cell receptor (BCR) binds antigen with moderate affinity, triggering activation.',
    duration: 900,   // ~11s voice + extra for approach animation
    setup: (sim) => {
      sim.setupStage1_AntigenEncounter();
    },
  },
  {
    id: 2,
    title: 'GC Formation',
    narration: 'The activated B cell migrates into the follicle and begins rapid proliferation. A germinal center forms with two distinct zones: the dark zone (DZ) for proliferation and the light zone (LZ) for selection.',
    duration: 857,   // ~12s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage2_GCFormation();
    },
  },
  {
    id: 3,
    title: 'Dark Zone: Proliferation',
    narration: 'Centroblasts in the dark zone undergo rapid cell division. Each round of division takes ~6 hours in vivo. The population expands exponentially.',
    duration: 757,   // ~11s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage3_Proliferation();
    },
  },
  {
    id: 4,
    title: 'Somatic Hypermutation',
    narration: 'Activation-induced cytidine deaminase (AID) introduces point mutations in the immunoglobulin variable regions. Most mutations are neutral or deleterious; rarely, one improves antigen binding.',
    duration: 968,   // ~14s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage4_SHM();
    },
  },
  {
    id: 5,
    title: 'Migration to Light Zone',
    narration: 'Centroblasts downregulate CXCR4 (the DZ-retaining receptor for CXCL12) and upregulate CXCR5, following the CXCL13 chemokine gradient into the light zone. They shrink into smaller centrocytes, ready for affinity-based selection on FDC-displayed antigen.',
    duration: 1247,  // ~19s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage5_Migration();
    },
  },
  {
    id: 6,
    title: 'Affinity Selection',
    narration: 'Centrocytes test their mutated BCR against antigen on FDC dendrites. High-affinity cells capture more antigen, process it, and present peptide-MHC to Tfh cells. Low-affinity cells fail and undergo apoptosis. GC confinement is maintained by S1PR2 and P2RY8 signaling through Gα13-RhoA. P2RY8 senses GGG (geranylgeranylglutathione) — a lipid gradient shaped by GGT5 on FDCs, which degrades GGG near the GC center.',
    duration: 2401,  // ~38s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage6_Selection();
    },
  },
  {
    id: 7,
    title: 'Apoptotic Clearance',
    narration: 'Tingible body macrophages engulf apoptotic B cells that failed selection. This "starry sky" pattern is a hallmark of GC histology.',
    duration: 718,   // ~10s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage7_Clearance();
    },
  },
  {
    id: 8,
    title: 'Recycling & Exit',
    narration: 'Selected B cells face a fate decision: most recycle back to the dark zone via CXCL12/CXCR4 for further rounds of mutation and selection. A fraction differentiates into antibody-secreting plasmablasts or long-lived memory B cells. These cells downregulate S1PR2 (the GC-confinement receptor) and upregulate S1PR1, following the sphingosine-1-phosphate gradient to exit the germinal center.',
    duration: 1674,  // ~26s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage8_RecyclingExit();
    },
  },
  {
    id: 9,
    title: 'Affinity Maturation',
    narration: 'Over multiple cycles of mutation, selection, and recycling, the average BCR affinity progressively increases. This is affinity maturation — the hallmark of the germinal center reaction.',
    duration: 854,   // ~12s voice + 2s buffer
    setup: (sim) => {
      sim.setupStage9_AffinityMaturation();
    },
  },
];
