const STORAGE_KEY = 'tme-tamagotchi-save';
const GRAVEYARD_KEY = 'tme-tamagotchi-graveyard';
const BEST_RUN_KEY = 'tme-tamagotchi-best-run';

export function saveGame(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadGraveyard() {
  try {
    const data = localStorage.getItem(GRAVEYARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function addToGraveyard(entry, maxEntries = 50) {
  const graveyard = loadGraveyard();
  graveyard.unshift(entry);
  if (graveyard.length > maxEntries) graveyard.length = maxEntries;
  try {
    localStorage.setItem(GRAVEYARD_KEY, JSON.stringify(graveyard));
  } catch (e) {
    console.warn('Failed to save graveyard:', e);
  }
}

export function saveBestRun(runStats) {
  try {
    const existing = loadBestRun();
    // Better run = more ticks survived (wins always beat non-wins)
    if (!existing ||
        (runStats.won && !existing.won) ||
        (runStats.won === existing.won && runStats.ticksSurvived > existing.ticksSurvived)) {
      localStorage.setItem(BEST_RUN_KEY, JSON.stringify(runStats));
    }
  } catch (e) {
    console.warn('Failed to save best run:', e);
  }
}

export function loadBestRun() {
  try {
    const data = localStorage.getItem(BEST_RUN_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}
