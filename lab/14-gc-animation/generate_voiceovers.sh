#!/bin/bash
# Generate all 18 voiceover MP3s via ElevenLabs API
# Voice: Charlotte (XB0fDUnXU5powFXDhCwa) — warm, expressive female
# Model: eleven_multilingual_v2

API_KEY="sk_fc09aeda0c39ef664692ee85739a1635eca9a852b3230582"
VOICE_ID="XB0fDUnXU5powFXDhCwa"
MODEL="eleven_multilingual_v2"
BASE="C:/dev/Claude-Projects/lab/14-gc-animation/public/audio"

generate() {
  local track="$1"
  local stage="$2"
  local text="$3"
  local outfile="$BASE/$track/stage${stage}.mp3"

  echo "Generating $track/stage${stage}.mp3 ..."
  curl -s "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
    -H "xi-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\":$(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),\"model_id\":\"$MODEL\",\"voice_settings\":{\"stability\":0.4,\"similarity_boost\":0.75,\"style\":0.35}}" \
    -o "$outfile"

  local size=$(stat -c%s "$outfile" 2>/dev/null || stat -f%z "$outfile" 2>/dev/null)
  echo "  -> $outfile ($size bytes)"
}

# Track 1: Mutations
generate mutations 1 "A naive follicular B cell encounters antigen on an FDC. Its germline-encoded BCR binds with moderate affinity — the starting point for all mutations to come."
generate mutations 2 "The activated B cell seeds a germinal center. The dark zone will become the engine of mutation — where AID rewrites the antibody genome."
generate mutations 3 "Centroblasts divide rapidly in the dark zone, expanding clones that will each acquire unique mutations. Division precedes mutation — creating the substrate for diversification."
generate mutations 4 "Activation-induced cytidine deaminase, or AID, targets the immunoglobulin variable region, deaminating cytosine to uracil. Error-prone repair introduces point mutations — somatic hypermutation. Most mutations are neutral or deleterious; rarely, one improves antigen binding."
generate mutations 5 "Mutated centroblasts differentiate into centrocytes and migrate to the light zone. Their newly mutated BCRs will now be tested against native antigen on FDC surfaces."
generate mutations 6 "Centrocytes compete for antigen on FDC dendrites. Higher-affinity BCRs capture more antigen, enabling better peptide-MHC presentation to T-follicular helper cells. Low-affinity clones fail and die — this is the selective filter that enriches beneficial mutations."
generate mutations 7 "Failed clones undergo apoptosis — the cost of random mutagenesis. Tingible body macrophages clear the debris, creating the characteristic starry sky pattern."
generate mutations 8 "Selected B cells face a fate decision. Most recycle to the dark zone for further rounds of somatic hypermutation. Meanwhile, AID also targets the switch regions upstream of constant-region genes, driving class switch recombination — changing the antibody from IgM to IgG, IgA, or IgE without altering antigen specificity."
generate mutations 9 "Over multiple cycles of mutation and selection, beneficial mutations accumulate while deleterious ones are purged. This is affinity maturation — Darwinian evolution on a timescale of days, not millennia."

# Track 2: Chemokines
generate chemokines 1 "A naive B cell, guided by CXCL13 produced by FDCs, migrates into the follicle. CXCR5 on the B cell surface follows this chemokine gradient toward antigen."
generate chemokines 2 "As the germinal center forms, two chemokine zones emerge. CXCL12, produced by reticular cells, dominates the dark zone. CXCL13, produced by FDCs, dominates the light zone. These opposing gradients create the GC's bipolar architecture."
generate chemokines 3 "Centroblasts express high CXCR4, the receptor for CXCL12. This retains them in the dark zone where CXCL12 concentration is highest — anchoring them for proliferation."
generate chemokines 4 "While centroblasts undergo somatic hypermutation in the dark zone, their positioning is maintained by CXCR4-CXCL12 signaling. P2RY8 senses geranylgeranylglutathione at the GC periphery, helping confine cells within the reaction."
generate chemokines 5 "The receptor switch drives migration: centroblasts downregulate CXCR4 and upregulate CXCR5. No longer retained by CXCL12, they follow the CXCL13 gradient into the light zone, becoming centrocytes."
generate chemokines 6 "In the light zone, S1PR2 and P2RY8 signal through G-alpha-13 to activate RhoA, which opposes migration toward S1P and GGG at the GC edge. This retention pathway keeps centrocytes confined for selection. GGT5 on FDCs degrades GGG near the GC center, shaping the confinement gradient."
generate chemokines 7 "Apoptotic cells that failed selection are cleared by macrophages. The chemokine microenvironment remains intact — FDCs continue producing CXCL13, maintaining the light zone niche."
generate chemokines 8 "Exiting cells downregulate S1PR2, the confinement receptor, and upregulate S1PR1, becoming responsive to sphingosine-1-phosphate in the blood and lymph. This receptor switch releases them from GC confinement. Recycling cells re-express CXCR4 to return to the dark zone."
generate chemokines 9 "Each cycle of dark zone to light zone to dark zone migration is orchestrated by sequential receptor switching: CXCR4 for dark zone retention, then CXCR5 for light zone migration, then CXCR4 again for dark zone return. The chemokine compass guides affinity maturation."

echo ""
echo "Done! All 18 voiceovers generated."
