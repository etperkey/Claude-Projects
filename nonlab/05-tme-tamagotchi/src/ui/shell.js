// Tamagotchi shell — manages the device chrome, notification bar, and info row

let notificationEl = null;
let tickEl = null;
let phaseEl = null;
let alertEl = null;
let notifTimeout = null;
let messageLogEl = null;

export function initShell() {
  notificationEl = document.getElementById('notification');
  tickEl = document.getElementById('tick-display');
  phaseEl = document.getElementById('phase-display');
  alertEl = document.getElementById('alert-display');

  // Create message log element if it doesn't exist
  messageLogEl = document.getElementById('message-log');
  if (!messageLogEl) {
    messageLogEl = document.createElement('div');
    messageLogEl.id = 'message-log';
    // Insert after notification
    if (notificationEl && notificationEl.parentNode) {
      notificationEl.parentNode.insertBefore(messageLogEl, notificationEl);
    }
  }
}

export function showNotification(message, duration = 6000) {
  if (!notificationEl) return;
  notificationEl.textContent = message;
  notificationEl.style.color = '#8bc34a';

  if (notifTimeout) clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    notificationEl.textContent = '\u00A0';
  }, duration);
}

export function showWarningNotification(message) {
  if (!notificationEl) return;
  notificationEl.textContent = message;
  notificationEl.style.color = '#ff6644';

  if (notifTimeout) clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    notificationEl.textContent = '\u00A0';
  }, 8000);
}

export function updateMessageLog(messageLog) {
  if (!messageLogEl) return;
  if (!messageLog || messageLog.length === 0) {
    messageLogEl.innerHTML = '';
    return;
  }

  // Show last 3 messages
  const recent = messageLog.slice(-3);
  messageLogEl.innerHTML = recent.map((m, i) => {
    const opacity = 0.4 + (i / recent.length) * 0.6;
    const color = m.type === 'danger' ? '#ff6644' :
                  m.type === 'warning' ? '#ff8800' :
                  m.type === 'tutorial' ? '#88bbff' :
                  '#5a7a2a';
    return `<div style="opacity:${opacity};color:${color};font-size:6px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.text}</div>`;
  }).join('');
}

export function updateInfoRow(state) {
  if (!tickEl) return;

  tickEl.textContent = `Tick: ${state.tick}`;
  phaseEl.textContent = state.paused ? 'PAUSED' : `Phase: ${state.phase.charAt(0).toUpperCase() + state.phase.slice(1)}`;
  alertEl.textContent = `Alert: ${Math.floor(state.immune.alertLevel)}`;

  // Color code alert level
  const alert = state.immune.alertLevel;
  if (alert > 70) alertEl.style.color = '#ff4444';
  else if (alert > 40) alertEl.style.color = '#ff8800';
  else alertEl.style.color = '#7a4a9a';

  if (state.paused) {
    phaseEl.style.color = '#ffcc00';
  } else {
    phaseEl.style.color = '';
  }

  // Update message log
  updateMessageLog(state.messageLog);
}

export function setShellVisibility(playing) {
  const gauges = document.getElementById('gauges');
  const infoRow = document.getElementById('info-row');
  gauges.style.visibility = playing ? 'visible' : 'hidden';
  infoRow.style.visibility = playing ? 'visible' : 'hidden';
  if (messageLogEl) messageLogEl.style.visibility = playing ? 'visible' : 'hidden';
}
