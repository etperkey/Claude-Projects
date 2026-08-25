import { getState, resetState, setState, loadState } from './game/GameState.js';
import { startEngine, stopEngine, performAction, togglePause } from './game/GameEngine.js';
import { actionDropMutation } from './game/TumorCell.js';
import { CanvasRenderer } from './render/CanvasRenderer.js';
import { spawnMutationParticles, spawnKillParticles, spawnHealParticles } from './render/animations.js';
import { initGauges, updateGauges } from './ui/gauges.js';
import { initButtons, updateButtonStates } from './ui/buttons.js';
import { initShell, showNotification, showWarningNotification, updateInfoRow, setShellVisibility } from './ui/shell.js';
import {
  setupTitleScreen, handleTitleInput,
  setupGraveyardScreen, handleGraveyardInput,
  handleDeathInput, handleWinInput, handleAboutInput,
  setupCytokineMenu, handleCytokineInput,
  setupMutationInfoScreen, handleMutationInfoInput,
  setupDropMutationScreen, handleDropMutationInput,
} from './ui/screens.js';
import { loadGame, clearSave } from './utils/storage.js';
import { initAudio, playSound } from './audio/sound.js';

let renderer = null;

function init() {
  // Initialize UI
  initGauges();
  initShell();

  // Initialize canvas renderer
  const canvas = document.getElementById('game-canvas');
  renderer = new CanvasRenderer(canvas);

  // Initialize audio
  initAudio();

  // Check for saved game
  const saved = loadGame();
  if (saved && saved.screen === 'playing' && !saved.gameOver) {
    // Ensure new state fields exist on loaded saves
    if (!saved.messageLog) saved.messageLog = [];
    if (saved.paused === undefined) saved.paused = false;
    if (saved.showTutorial === undefined) saved.showTutorial = false;
    setState(saved);
    startPlaying();
  } else {
    const state = resetState();
    setupTitleScreen(state);
    setShellVisibility(false);
  }

  // Start render loop
  renderer.startRenderLoop(getState);

  // Initialize buttons with both action and special callbacks
  initButtons(handleAction, handleSpecial);

  // Initial UI update
  updateUI();
}

function handleSpecial(action) {
  const state = getState();
  if (!state) return;

  switch (action) {
    case 'pause':
      if (state.screen === 'playing') {
        const paused = togglePause();
        if (paused) {
          showNotification('⏸ PAUSED — Press P to resume. I=Info, D=Drop mutation');
          playSound('click');
        } else {
          showNotification('▶ Resumed!');
          playSound('click');
        }
        updateUI();
      }
      break;
    case 'mutationInfo':
      if (state.screen === 'playing' && !state.paused) {
        if (setupMutationInfoScreen(state)) {
          playSound('click');
          updateUI();
        } else {
          showWarningNotification('No mutations acquired yet!');
        }
      }
      break;
    case 'dropMutation':
      if (state.screen === 'playing' && !state.paused) {
        if (setupDropMutationScreen(state)) {
          playSound('click');
          updateUI();
        } else {
          showWarningNotification('No mutations to drop!');
        }
      }
      break;
  }
}

function handleAction(action) {
  const state = getState();
  if (!state) return;

  playSound('click');

  switch (state.screen) {
    case 'title':
      handleTitleAction(state, action);
      break;
    case 'playing':
      if (state.paused) {
        showWarningNotification('Game is paused. Press P to resume.');
        return;
      }
      handlePlayingAction(state, action);
      break;
    case 'cytokineMenu':
      handleCytokineAction(state, action);
      break;
    case 'mutationInfo':
      handleMutationInfoAction(state, action);
      break;
    case 'dropMutation':
      handleDropMutationAction(state, action);
      break;
    case 'dead':
      handleDeathInput();
      returnToTitle();
      break;
    case 'win':
      handleWinInput();
      returnToTitle();
      break;
    case 'graveyard':
      handleGraveyardAction(state, action);
      break;
    case 'about':
      handleAboutInput();
      returnToTitle();
      break;
  }

  updateUI();
}

function handleTitleAction(state, action) {
  const result = handleTitleInput(state, action);
  if (result === 'newGame') {
    startNewGame();
  } else if (result === 'graveyard') {
    setupGraveyardScreen(state);
  } else if (result === 'about') {
    state.screen = 'about';
  }
  // 'navigate' just updates the menu, handled by render
}

function handlePlayingAction(state, action) {
  if (action === 'feed') {
    // Open cytokine sub-menu
    setupCytokineMenu(state);
    return;
  }

  const result = performAction(action);
  if (result) {
    if (result.success) {
      playSound(action);
      if (result.mutation) {
        spawnMutationParticles(240, 216);
        playSound('mutation');
      }
      if (result.allyType) {
        spawnHealParticles(240, 216);
      }
      showNotification(result.message);
    } else {
      showWarningNotification(result.message);
      playSound('fail');
    }
  }
}

function handleCytokineAction(state, action) {
  const result = handleCytokineInput(state, action);
  if (result === 'cancel') {
    state.screen = 'playing';
  } else if (result === 'navigate') {
    // Just updates index
  } else if (result && result.select) {
    state.screen = 'playing';
    const feedResult = performAction('feed', result.select);
    if (feedResult) {
      if (feedResult.success) {
        playSound('feed');
        spawnHealParticles(240, 216);
        showNotification(feedResult.message);
      } else {
        showWarningNotification(feedResult.message);
        playSound('fail');
      }
    }
  }
}

function handleMutationInfoAction(state, action) {
  const result = handleMutationInfoInput(state, action);
  if (result === 'back') {
    state.screen = 'playing';
  }
  // 'navigate' just updates index
}

function handleDropMutationAction(state, action) {
  const result = handleDropMutationInput(state, action);
  if (result === 'back') {
    state.screen = 'playing';
  } else if (result && result.drop) {
    const dropResult = actionDropMutation(state, result.drop);
    state.screen = 'playing';
    if (dropResult.success) {
      showWarningNotification(dropResult.message);
      renderer.shake(2);
      playSound('damage');
    } else {
      showWarningNotification(dropResult.message);
      playSound('fail');
    }
  }
  // 'navigate' just updates index
}

function handleGraveyardAction(state, action) {
  const result = handleGraveyardInput(state, action);
  if (result === 'back') {
    returnToTitle();
  }
}

function startNewGame() {
  clearSave();
  const state = resetState();
  startPlaying();
  showNotification(`${state.tumor.name} has entered the lymph node!`);
  playSound('start');
}

function startPlaying() {
  const state = getState();
  state.screen = 'playing';
  setShellVisibility(true);

  startEngine(
    // onTick
    (state, messages, statusMsg) => {
      updateUI();
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.includes('killed') || lastMsg.includes('destroyed')) {
          showWarningNotification(lastMsg);
          renderer.shake(2);
          playSound('damage');
        } else if (lastMsg.includes('⚠') || lastMsg.includes('WARNING') || lastMsg.includes('CRITICAL')) {
          showWarningNotification(lastMsg);
          playSound('warning');
        } else {
          showNotification(statusMsg || lastMsg);
        }
      } else if (statusMsg) {
        showNotification(statusMsg);
      }
    },
    // onGameOver
    (state, message) => {
      updateUI();
      showNotification(message, 10000);
      if (state.won) {
        playSound('win');
      } else {
        playSound('death');
        renderer.shake(5);
      }
    }
  );
}

function returnToTitle() {
  stopEngine();
  const state = resetState();
  setupTitleScreen(state);
  setShellVisibility(false);
}

function updateUI() {
  const state = getState();
  if (!state) return;

  // Always update buttons (labels change per screen)
  updateButtonStates(state);

  if (state.screen === 'playing' || state.screen === 'cytokineMenu' ||
      state.screen === 'mutationInfo' || state.screen === 'dropMutation') {
    updateGauges(state);
    updateInfoRow(state);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
