import { TICK, TUMOR, PHASES, IMMUNE } from '../utils/constants.js';
import { getState, addToMessageLog } from './GameState.js';
import { tumorGrowthPhase, actionFeed, actionMutate, actionRecruit, actionRest } from './TumorCell.js';
import { immunePhase } from './ImmuneSystem.js';
import { eventPhase } from './EventSystem.js';
import { getDeathMessage, getWinMessage, getStatusMessage, getTombstoneEpitaph } from '../data/flavor.js';
import { saveGame, addToGraveyard, clearSave, saveBestRun } from '../utils/storage.js';

let tickTimer = null;
let onTickCallback = null;
let onGameOverCallback = null;

export function startEngine(onTick, onGameOver) {
  onTickCallback = onTick;
  onGameOverCallback = onGameOver;
  tickTimer = setInterval(processTick, TICK.INTERVAL_MS);
}

export function stopEngine() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

export function isRunning() {
  return tickTimer !== null;
}

export function togglePause() {
  const state = getState();
  if (!state || state.screen !== 'playing') return;
  state.paused = !state.paused;
  return state.paused;
}

function processTick() {
  const state = getState();
  if (!state || state.screen !== 'playing' || state.gameOver || state.paused) return;

  state.tick++;
  const allMessages = [];

  // Tutorial messages on specific ticks
  if (state.showTutorial) {
    const tutorialMsg = getTutorialMessage(state.tick, state);
    if (tutorialMsg) {
      allMessages.push(tutorialMsg);
      addToMessageLog(tutorialMsg, 'tutorial');
    }
    if (state.tick >= 8) state.showTutorial = false;
  }

  // 1. Tumor growth phase
  const tumorMsgs = tumorGrowthPhase(state);
  allMessages.push(...tumorMsgs);

  // 2. Immune phase (skip if player just rested — immune gets bonus)
  const immuneMsgs = immunePhase(state);
  allMessages.push(...immuneMsgs);

  // If player rested, immune gets an extra attack
  if (state.lastAction === 'rest') {
    const bonusMsgs = immunePhase(state);
    allMessages.push(...bonusMsgs);
    state.lastAction = null;
  }

  // 3. Event phase (therapies, random events)
  const eventMsgs = eventPhase(state);
  allMessages.push(...eventMsgs);

  // 4. Update phase
  updatePhase(state);

  // 5. Check win/death conditions
  const endResult = checkEndConditions(state);
  if (endResult) {
    handleGameEnd(state, endResult);
    return;
  }

  // 6. Apoptosis warning (improved — starts earlier, gives guidance)
  if (state.tumor.apoptosisResistance < 20) {
    if (state.tick >= 25 && state.tick <= 30) {
      const ticksLeft = 30 - state.tick;
      const msg = `⚠ CRITICAL: Apoptosis resistance ${Math.floor(state.tumor.apoptosisResistance)}/20! ${ticksLeft} ticks left! Use REST or get BCL2!`;
      allMessages.push(msg);
      addToMessageLog(msg, 'danger');
    } else if (state.tick >= 15 && state.tick <= 24) {
      const msg = `⚠ Apoptosis resistance low (${Math.floor(state.tumor.apoptosisResistance)}/20). REST gives +3. BCL2 mutation gives +50.`;
      allMessages.push(msg);
      addToMessageLog(msg, 'warning');
    }
  }

  // Status message
  const statusMsg = getStatusMessage(state);

  // Save periodically
  if (state.tick % 5 === 0) {
    saveGame(state);
  }

  state.notifications = allMessages;

  // Add important messages to log
  for (const msg of allMessages) {
    if (msg.includes('killed') || msg.includes('destroyed') || msg.includes('Mutation') ||
        msg.includes('therapy') || msg.includes('THERAPY') || msg.includes('⚠')) {
      // Already logged specific ones above; avoid duplicates
      if (!state.messageLog.some(m => m.text === msg)) {
        addToMessageLog(msg, msg.includes('killed') || msg.includes('destroyed') ? 'danger' : 'warning');
      }
    }
  }

  if (onTickCallback) {
    onTickCallback(state, allMessages, statusMsg);
  }
}

function getTutorialMessage(tick, state) {
  switch (tick) {
    case 1: return '💡 You are a DLBCL tumor cell. Grow, mutate, and evade the immune system!';
    case 3: return '💡 FEED secretes cytokines (costs 20 ATP). MUTATE acquires new powers (30 ATP).';
    case 5: return '💡 REST is free: +30 ATP & +3 apoptosis resistance, but immune system attacks twice!';
    case 7: return `💡 Get apoptosis resistance above 20 before tick 30 or you die! Currently: ${Math.floor(state.tumor.apoptosisResistance)}/20`;
    default: return null;
  }
}

function updatePhase(state) {
  if (state.tick <= PHASES.EARLY_END) {
    state.phase = 'early';
  } else if (state.tick <= PHASES.MID_END) {
    state.phase = 'mid';
  } else {
    state.phase = 'late';
  }
}

function checkEndConditions(state) {
  const { tumor, immune } = state;

  // Death: immune clearance
  if (tumor.cellCount <= 0) {
    return { won: false, cause: 'immuneClearance' };
  }

  // Death: apoptosis
  if (state.tick > 30 && tumor.apoptosisResistance < 20) {
    return { won: false, cause: 'apoptosis' };
  }

  // Win: metastatic escape
  if (tumor.cellCount >= TUMOR.WIN_THRESHOLD) {
    return { won: true, type: 'metastasis' };
  }

  // Win: T cell exhaustion
  if (immune.exhaustion >= IMMUNE.EXHAUSTION_WIN_THRESHOLD) {
    return { won: true, type: 'exhaustion' };
  }

  // Win: survived all therapies
  if (state.therapy.completedTherapies.length >= 4) {
    return { won: true, type: 'therapyResistance' };
  }

  return null;
}

function handleGameEnd(state, result) {
  state.gameOver = true;
  state.won = result.won;

  const runStats = {
    name: state.tumor.name,
    ticksSurvived: state.tick,
    cellsAtEnd: Math.max(0, state.tumor.cellCount),
    mutations: [...state.tumor.mutations],
    date: new Date().toISOString(),
  };

  if (result.won) {
    state.winType = result.type;
    state.screen = 'win';
    runStats.won = true;
    runStats.winType = result.type;
    saveBestRun(runStats);
  } else {
    state.gameOverCause = result.cause;
    state.screen = 'dead';
    runStats.won = false;
    runStats.causeOfDeath = result.cause;

    // Add to graveyard
    addToGraveyard({
      ...runStats,
      epitaph: getTombstoneEpitaph(),
    });
  }

  clearSave();
  stopEngine();

  if (onGameOverCallback) {
    const message = result.won
      ? getWinMessage(result.type)
      : getDeathMessage(result.cause);
    onGameOverCallback(state, message);
  }
}

// Public action dispatchers
export function performAction(actionType, extraData) {
  const state = getState();
  if (!state || state.screen !== 'playing' || state.gameOver || state.paused) return null;

  let result;
  switch (actionType) {
    case 'feed':
      result = actionFeed(state, extraData);
      state.lastAction = 'feed';
      break;
    case 'mutate':
      result = actionMutate(state);
      state.lastAction = 'mutate';
      break;
    case 'recruit':
      result = actionRecruit(state);
      state.lastAction = 'recruit';
      break;
    case 'rest':
      result = actionRest(state);
      state.lastAction = 'rest';
      break;
    default:
      return null;
  }

  // Log action results
  if (result) {
    addToMessageLog(result.message, result.success ? 'info' : 'warning');
  }

  if (onTickCallback) {
    onTickCallback(state, [result.message], null);
  }

  return result;
}
