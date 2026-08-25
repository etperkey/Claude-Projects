// Screen management — title, death, win overlays
// These are rendered on the canvas by CanvasRenderer, but we manage state transitions here

import { loadGraveyard } from '../utils/storage.js';
import { MUTATIONS } from '../data/mutations.js';

export function setupTitleScreen(state) {
  state.screen = 'title';
  state._menuIndex = 0;
}

export function handleTitleInput(state, action) {
  // Menu navigation
  if (action === 'feed' || action === 'rest') {
    // Navigate up/down
    const dir = action === 'rest' ? 1 : -1;
    state._menuIndex = ((state._menuIndex || 0) + dir + 3) % 3;
    return 'navigate';
  }
  if (action === 'mutate' || action === 'recruit') {
    // Select
    const idx = state._menuIndex || 0;
    if (idx === 0) return 'newGame';
    if (idx === 1) return 'graveyard';
    if (idx === 2) return 'about';
  }
  return null;
}

export function setupGraveyardScreen(state) {
  state.screen = 'graveyard';
  state._graveyardEntries = loadGraveyard();
  state._graveyardPage = 0;
}

export function handleGraveyardInput(state, action) {
  const entries = state._graveyardEntries || [];
  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(entries.length / perPage));

  if (action === 'feed') {
    // Previous page
    state._graveyardPage = Math.max(0, (state._graveyardPage || 0) - 1);
    return 'navigate';
  }
  if (action === 'rest') {
    // Next page
    state._graveyardPage = Math.min(totalPages - 1, (state._graveyardPage || 0) + 1);
    return 'navigate';
  }
  if (action === 'mutate' || action === 'recruit') {
    return 'back';
  }
  return null;
}

export function handleDeathInput() {
  return 'title';
}

export function handleWinInput() {
  return 'title';
}

export function handleAboutInput() {
  return 'title';
}

export function setupCytokineMenu(state) {
  state.screen = 'cytokineMenu';
  state._cytokineIndex = 0;
}

export function handleCytokineInput(state, action) {
  if (action === 'feed') {
    // Previous
    state._cytokineIndex = ((state._cytokineIndex || 0) - 1 + 4) % 4;
    return 'navigate';
  }
  if (action === 'rest') {
    // Next
    state._cytokineIndex = ((state._cytokineIndex || 0) + 1) % 4;
    return 'navigate';
  }
  if (action === 'mutate') {
    // Select
    const ids = ['il6', 'il10', 'tgfb', 'vegf'];
    return { select: ids[state._cytokineIndex || 0] };
  }
  if (action === 'recruit') {
    return 'cancel';
  }
  return null;
}

// Mutation info screen — browse acquired mutations
export function setupMutationInfoScreen(state) {
  if (state.tumor.mutations.length === 0) return false;
  state.screen = 'mutationInfo';
  state._mutationInfoIndex = 0;
  return true;
}

export function handleMutationInfoInput(state, action) {
  const count = state.tumor.mutations.length;
  if (count === 0) return 'back';

  if (action === 'feed') {
    state._mutationInfoIndex = ((state._mutationInfoIndex || 0) - 1 + count) % count;
    return 'navigate';
  }
  if (action === 'rest') {
    state._mutationInfoIndex = ((state._mutationInfoIndex || 0) + 1) % count;
    return 'navigate';
  }
  if (action === 'recruit') {
    return 'back';
  }
  if (action === 'mutate') {
    return 'back';
  }
  return null;
}

// Drop mutation screen — select a mutation to discard
export function setupDropMutationScreen(state) {
  if (state.tumor.mutations.length === 0) return false;
  state.screen = 'dropMutation';
  state._dropMutationIndex = 0;
  return true;
}

export function handleDropMutationInput(state, action) {
  const count = state.tumor.mutations.length;
  if (count === 0) return 'back';

  if (action === 'feed') {
    state._dropMutationIndex = ((state._dropMutationIndex || 0) - 1 + count) % count;
    return 'navigate';
  }
  if (action === 'rest') {
    state._dropMutationIndex = ((state._dropMutationIndex || 0) + 1) % count;
    return 'navigate';
  }
  if (action === 'mutate') {
    // Confirm drop
    const mutId = state.tumor.mutations[state._dropMutationIndex || 0];
    return { drop: mutId };
  }
  if (action === 'recruit') {
    return 'back';
  }
  return null;
}
