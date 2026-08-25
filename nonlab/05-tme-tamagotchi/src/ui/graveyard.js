// Graveyard display — pixel art tombstones with fallen tumor info
// Rendering is handled by CanvasRenderer; this module manages the data

import { loadGraveyard } from '../utils/storage.js';

export function getGraveyardData() {
  return loadGraveyard();
}

export function formatCauseOfDeath(cause) {
  const causes = {
    immuneClearance: 'Immune Clearance',
    apoptosis: 'Apoptosis',
    therapy: 'Therapy',
  };
  return causes[cause] || 'Unknown';
}

export function getGraveyardStats() {
  const entries = loadGraveyard();
  if (entries.length === 0) return null;

  const totalTicks = entries.reduce((sum, e) => sum + e.ticksSurvived, 0);
  const avgTicks = Math.floor(totalTicks / entries.length);
  const maxTicks = Math.max(...entries.map(e => e.ticksSurvived));
  const bestName = entries.find(e => e.ticksSurvived === maxTicks)?.name || 'Unknown';

  return {
    totalDeaths: entries.length,
    avgSurvival: avgTicks,
    longestSurvivor: { name: bestName, ticks: maxTicks },
  };
}
