#!/usr/bin/env node
/**
 * Dedupe edge labels across all guidelines to prevent label/arrow overlap.
 *
 * Rules applied:
 * 1. Multiple edges with same (source, target): keep label only on first
 *    (typically decision nodes with multiple options all routing to same target
 *     like dec-cns → dec-cns-route having both "High" and "Int" labels).
 * 2. Many edges with same label converging on same target (3+): keep label
 *    on just one (typically "Progression → Salvage" or "BTKi failure").
 * 3. Leave conditionIndex intact (needed for Walker decision mapping).
 */

const fs = require('fs');
const path = require('path');

const GUIDELINES_DIR = path.join(__dirname, '..', 'src', 'data', 'guidelines');
const guidelineDirs = fs
  .readdirSync(GUIDELINES_DIR)
  .filter((f) => fs.statSync(path.join(GUIDELINES_DIR, f)).isDirectory());

let totalDeduped = 0;

for (const g of guidelineDirs) {
  const edgesPath = path.join(GUIDELINES_DIR, g, 'edges.json');
  if (!fs.existsSync(edgesPath)) continue;

  const edges = JSON.parse(fs.readFileSync(edgesPath, 'utf8'));
  let changesThisFile = 0;

  // Rule 1: dedupe same (source, target) pairs — keep label on first only
  const sourceTargetSeen = new Map();
  for (const e of edges) {
    const key = `${e.source}|${e.target}`;
    if (sourceTargetSeen.has(key)) {
      if (e.label) {
        delete e.label;
        changesThisFile++;
      }
    } else {
      sourceTargetSeen.set(key, true);
    }
  }

  // Rule 2: dedupe labels converging on same target (3+ same-label edges to target)
  // Group by (target, label)
  const targetLabelCount = new Map();
  for (const e of edges) {
    if (!e.label) continue;
    const key = `${e.target}|${e.label}`;
    targetLabelCount.set(key, (targetLabelCount.get(key) || 0) + 1);
  }

  const seenTargetLabel = new Map();
  for (const e of edges) {
    if (!e.label) continue;
    const key = `${e.target}|${e.label}`;
    if (targetLabelCount.get(key) >= 3) {
      // Keep label on first only; strip rest
      if (seenTargetLabel.has(key)) {
        delete e.label;
        changesThisFile++;
      } else {
        seenTargetLabel.set(key, true);
      }
    }
  }

  if (changesThisFile > 0) {
    fs.writeFileSync(edgesPath, JSON.stringify(edges, null, 2) + '\n');
    console.log(`${g}: deduped ${changesThisFile} label(s)`);
    totalDeduped += changesThisFile;
  }
}

console.log(`\nTotal: ${totalDeduped} duplicate labels removed across ${guidelineDirs.length} guidelines.`);
