# GC Animation Voiceover Scripts (v2)

Generate each as an MP3 using ElevenLabs (Rachel voice, 0.85 volume).
Save to the corresponding `public/audio/{track}/stage{N}.mp3`.

**Key change from v1:** Both tracks now follow a single "hero" B cell through the entire GC reaction.
The hero cell is visually highlighted with a pulsing gold ring — scripts should reference it naturally.

**Pronunciation notes for ElevenLabs (not displayed in app):**
- "A-I-D" → spelled out, not pronounced as the word "aid"
- "Row-A" → the protein RhoA (displayed as "RhoA" in the app)
- Gα13 → "G-alpha-13"

---

## Track 1: Mutations (public/audio/mutations/)

### Stage 1 — Antigen Encounter (~15s)
A naive follicular B cell encounters antigen displayed on a follicular dendritic cell. Let's follow this one cell — highlighted in gold — through the entire germinal center reaction. Its germline-encoded BCR binds antigen with moderate affinity. This is the starting point for all mutations to come.

### Stage 2 — GC Formation (~10s)
Our activated B cell migrates into the follicle and becomes a centroblast — the first cell to seed the dark zone. A germinal center forms around it: the dark zone below for proliferation, the light zone above for selection.

### Stage 3 — Dark Zone: Proliferation (~13s)
Our cell divides rapidly in the dark zone, generating a clone of daughter cells. Each daughter will acquire its own unique mutations. Division precedes mutation — creating the raw substrate for diversification.

### Stage 4 — Somatic Hypermutation (~21s)
Now, activation-induced cytidine deaminase — A-I-D — targets the immunoglobulin variable region, deaminating cytosine to uracil. Error-prone repair introduces point mutations. This is somatic hypermutation, or SHM. Most mutations are neutral or deleterious. But watch our cell — it acquires a mutation that improves antigen binding.

### Stage 5 — Migration to Light Zone (~13s)
Mutated centroblasts differentiate into smaller centrocytes and migrate to the light zone. Our cell carries its improved BCR — and it's about to be tested against native antigen on FDC surfaces.

### Stage 6 — Affinity Selection (~20s)
Centrocytes compete for antigen on FDC dendrites. Our cell's higher-affinity BCR captures more antigen, enabling better peptide-MHC presentation to T follicular helper cells. A Tfh cell provides rescue signals, confirming selection. Low-affinity clones fail this test and die — the selective filter that enriches beneficial mutations.

### Stage 7 — Apoptotic Clearance (~12s)
Failed clones undergo apoptosis — the cost of random mutagenesis. Tingible body macrophages engulf the debris, creating the characteristic "starry sky" pattern seen in GC histology.

### Stage 8 — Recycling & Exit (~26s)
Selected B cells face a fate decision. Our cell recycles back to the dark zone for another round of SHM — acquiring additional mutations that further refine its BCR. Meanwhile, A-I-D also targets the switch regions upstream of constant-region genes, driving class switch recombination — CSR. This changes the antibody from IgM to IgG, IgA, or IgE, without altering antigen specificity. Some selected cells differentiate into antibody-secreting plasmablasts or long-lived memory B cells and exit the germinal center.

### Stage 9 — Affinity Maturation (~14s)
Over multiple cycles of mutation and selection, beneficial mutations accumulate while deleterious ones are purged. Our cell's BCR affinity has steadily improved through each round. This is affinity maturation — Darwinian evolution on a timescale of days, not millennia.

---

## Track 2: Chemokines (public/audio/chemokines/)

### Stage 1 — Antigen Encounter (~15s)
A naive follicular B cell approaches an FDC. We'll follow this one cell — marked in gold — through the germinal center, tracking the chemokine receptors that guide its journey. Right now, CXCR5 on the B cell surface directs it toward CXCL13 produced by FDCs in the follicle.

### Stage 2 — GC Formation (~19s)
As the germinal center forms, two chemokine domains emerge. CXCL12, produced by reticular cells, dominates the dark zone. CXCL13, produced by FDCs, dominates the light zone. These opposing gradients create the GC's bipolar architecture. Our activated B cell upregulates CXCR4, pulling it into the CXCL12-rich dark zone. GC B cells also express S1PR2, the confinement receptor — visible on cells throughout the reaction.

### Stage 3 — Dark Zone: Proliferation (~13s)
Centroblasts express high levels of CXCR4, the receptor for CXCL12. This retains our cell and its daughters in the dark zone, where CXCL12 concentration is highest — anchoring them during rapid proliferation.

### Stage 4 — Somatic Hypermutation (~17s)
While centroblasts undergo SHM in the dark zone, their positioning is maintained by CXCR4–CXCL12 signaling. At the GC periphery, two confinement systems are active: S1PR2 opposes S1P-directed migration outward, while P2RY8 senses GGG — geranylgeranylglutathione — keeping cells within the reaction.

### Stage 5 — Migration to Light Zone (~17s)
Now watch the receptor switch that drives migration. Our cell downregulates CXCR4 and upregulates CXCR5. No longer retained by CXCL12, it follows the CXCL13 gradient into the light zone, becoming a centrocyte. This CXCR4-to-CXCR5 switch is the molecular basis of DZ-to-LZ migration.

### Stage 6 — Affinity Selection (~24s)
In the light zone, S1PR2 and P2RY8 signal through Gα13 to activate Row-A. S1PR2 opposes migration toward S1P at the GC edge, while P2RY8 opposes migration toward GGG at the periphery. Together, this retention pathway keeps centrocytes like our cell confined for selection. GGT5 on FDCs degrades GGG near the GC center, shaping the confinement gradient — low in the interior, high at the edge.

### Stage 7 — Apoptotic Clearance (~14s)
Apoptotic cells that failed selection are cleared by macrophages. The chemokine microenvironment remains intact — FDCs continue producing CXCL13, maintaining the light zone niche for ongoing selection.

### Stage 8 — Recycling & Exit (~24s)
Our selected cell recycles — re-expressing CXCR4 to follow the CXCL12 gradient back to the dark zone, while retaining S1PR2 for confinement. Other selected cells differentiate into plasmablasts or memory B cells. To exit, they downregulate S1PR2 and P2RY8 — releasing the Gα13-mediated confinement brake — and upregulate S1PR1, becoming responsive to sphingosine-1-phosphate in the blood and lymph. This receptor switch — S1PR2 down, P2RY8 down, S1PR1 up — is what releases them from the germinal center.

### Stage 9 — Affinity Maturation (~20s)
Each cycle of DZ-to-LZ-to-DZ migration is orchestrated by sequential receptor switching. CXCR4 retains cells in the dark zone. CXCR5 drives them to the light zone. CXCR4 again pulls recycling cells back. Our cell has navigated this chemokine compass through multiple rounds — each pass refining its BCR through mutation and selection. This is how the germinal center achieves affinity maturation.
