// Button handler — connects 4 physical buttons to game actions
// Buttons relabel based on current screen context

let onAction = null;
let onSpecial = null; // for pause, mutation info, etc.

const els = {};

export function initButtons(actionCallback, specialCallback) {
  onAction = actionCallback;
  onSpecial = specialCallback;

  els.feed = document.getElementById('btn-feed');
  els.mutate = document.getElementById('btn-mutate');
  els.recruit = document.getElementById('btn-recruit');
  els.rest = document.getElementById('btn-rest');

  els.feed.addEventListener('click', () => dispatch('feed'));
  els.mutate.addEventListener('click', () => dispatch('mutate'));
  els.recruit.addEventListener('click', () => dispatch('recruit'));
  els.rest.addEventListener('click', () => dispatch('rest'));

  // Keyboard input
  document.addEventListener('keydown', (e) => {
    let handled = true;
    switch (e.key) {
      // Arrow keys: Up = feed (btn 1), Down = rest (btn 4)
      case 'ArrowUp':    case 'w': case 'W': dispatch('feed'); break;
      case 'ArrowDown':  case 's': case 'S': dispatch('rest'); break;
      // Enter / Right = mutate (select/confirm, btn 2)
      case 'Enter': case 'ArrowRight': case 'e': case 'E': dispatch('mutate'); break;
      // Escape / Left / Backspace = recruit (cancel/back, btn 3)
      case 'Escape': case 'ArrowLeft': case 'Backspace': case 'q': case 'Q': dispatch('recruit'); break;
      // Space = rest
      case ' ': dispatch('rest'); break;
      // Number keys
      case '1': dispatch('feed'); break;
      case '2': dispatch('mutate'); break;
      case '3': dispatch('recruit'); break;
      case '4': dispatch('rest'); break;
      // Special keys
      case 'p': case 'P': case '5': dispatchSpecial('pause'); break;
      case 'i': case 'I': case 'Tab': dispatchSpecial('mutationInfo'); break;
      case 'd': case 'D': dispatchSpecial('dropMutation'); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });
}

function dispatch(action) {
  if (onAction) onAction(action);
}

function dispatchSpecial(action) {
  if (onSpecial) onSpecial(action);
}

function setButton(el, label, cost, disabled = false) {
  el.querySelector('.label').textContent = label;
  el.querySelector('.cost').textContent = cost;
  el.disabled = disabled;
}

export function updateButtonStates(state) {
  if (!els.feed) return;

  switch (state.screen) {
    case 'title':
      setButton(els.feed, '▲ Up', '');
      setButton(els.mutate, 'Select', '');
      setButton(els.recruit, 'Select', '');
      setButton(els.rest, '▼ Down', '');
      break;

    case 'playing':
      if (state.paused) {
        setButton(els.feed, 'Feed', 'PAUSED', true);
        setButton(els.mutate, 'Mutate', 'PAUSED', true);
        setButton(els.recruit, 'Recruit', 'PAUSED', true);
        setButton(els.rest, 'Rest', 'PAUSED', true);
      } else {
        setButton(els.feed, 'Feed', '20 ATP', state.tumor.energy < 20);
        setButton(els.mutate, 'Mutate',
          state.tumor.mutateCooldown > 0 ? `${state.tumor.mutateCooldown}t CD` : '30 ATP',
          state.tumor.energy < 30 || state.tumor.mutateCooldown > 0);
        setButton(els.recruit, 'Recruit', `${state.tumor.cytokineStockpile}/10 CYT`,
          state.tumor.cytokineStockpile < 10);
        setButton(els.rest, 'Rest', 'free');
      }
      break;

    case 'cytokineMenu':
      setButton(els.feed, '▲ Prev', '');
      setButton(els.mutate, 'Pick', '');
      setButton(els.recruit, 'Cancel', '');
      setButton(els.rest, '▼ Next', '');
      break;

    case 'mutationInfo':
      setButton(els.feed, '▲ Prev', '');
      setButton(els.mutate, 'Back', '');
      setButton(els.recruit, 'Back', '');
      setButton(els.rest, '▼ Next', '');
      break;

    case 'dropMutation':
      setButton(els.feed, '▲ Prev', '');
      setButton(els.mutate, 'Drop!', '20 ATP');
      setButton(els.recruit, 'Cancel', '');
      setButton(els.rest, '▼ Next', '');
      break;

    case 'graveyard':
      setButton(els.feed, '◀ Prev', '');
      setButton(els.mutate, 'Back', '');
      setButton(els.recruit, 'Back', '');
      setButton(els.rest, 'Next ▶', '');
      break;

    case 'dead':
    case 'win':
    case 'about':
      setButton(els.feed, 'OK', '');
      setButton(els.mutate, 'OK', '');
      setButton(els.recruit, 'OK', '');
      setButton(els.rest, 'OK', '');
      break;

    default:
      setButton(els.feed, 'Feed', '');
      setButton(els.mutate, 'Mutate', '');
      setButton(els.recruit, 'Recruit', '');
      setButton(els.rest, 'Rest', '');
  }
}
