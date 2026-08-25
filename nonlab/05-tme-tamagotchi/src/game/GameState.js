import { TUMOR, STATS, CYTOKINES as CYT_CONST, IMMUNE } from '../utils/constants.js';
import { generateTumorName } from '../data/flavor.js';

// Centralized state singleton
export function createInitialState() {
  return {
    screen: 'title', // 'title' | 'playing' | 'dead' | 'win' | 'graveyard' | 'about' | 'cytokineMenu' | 'mutationInfo' | 'dropMutation'
    tumor: {
      name: generateTumorName(),
      cellCount: TUMOR.INITIAL_CELLS,
      energy: TUMOR.INITIAL_ATP,
      maxEnergy: TUMOR.MAX_ATP,
      immunosuppression: STATS.INITIAL_IMMUNOSUPPRESSION,
      angiogenesis: STATS.INITIAL_ANGIOGENESIS,
      apoptosisResistance: STATS.INITIAL_APOPTOSIS_RESISTANCE,
      mutations: [],       // array of mutation IDs
      maxMutationSlots: 4,
      mutateCooldown: 0,   // ticks remaining
      allies: { m2: 0, treg: 0, mdsc: 0 },
      cytokineStockpile: CYT_CONST.INITIAL_STOCKPILE,
      recentCytokines: [], // last 3 cytokines used
      infiltration: 0,
    },
    immune: {
      alertLevel: 0,
      cells: { cd8: 0, nk: 0, m1: 0, dc: 0 },
      exhaustion: 0,
    },
    therapy: {
      pdl1Disabled: false,
      venetoclaxActive: false,
      carTActive: false,
      rchopActive: false,
      activeTherapies: [],   // { id, ticksRemaining }
      completedTherapies: [],
      warningTherapy: null,  // { id, ticksUntil }
    },
    tick: 0,
    phase: 'early', // 'early' | 'mid' | 'late'
    notifications: [],
    messageLog: [],       // last N messages for persistent display
    lastAction: null,
    gameOver: false,
    gameOverCause: null,
    won: false,
    winType: null,
    paused: false,
    showTutorial: true,   // show tutorial tips on first ticks
    _mutationInfoIndex: 0,
    _dropMutationIndex: 0,
  };
}

let gameState = null;

export function getState() {
  return gameState;
}

export function setState(newState) {
  gameState = newState;
}

export function resetState() {
  gameState = createInitialState();
  return gameState;
}

// Serialize for save
export function serializeState() {
  return JSON.parse(JSON.stringify(gameState));
}

// Load from save
export function loadState(data) {
  gameState = data;
}

// Add message to the log (keeps last 4)
export function addToMessageLog(msg, type = 'info') {
  if (!gameState) return;
  gameState.messageLog.push({ text: msg, type, tick: gameState.tick });
  if (gameState.messageLog.length > 4) gameState.messageLog.shift();
}
