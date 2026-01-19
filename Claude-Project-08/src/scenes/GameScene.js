// GameScene - Main gameplay hub

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import eventSystem from '../systems/EventSystem.js';
import newsSystem from '../systems/NewsSystem.js';
import insuranceSystem from '../systems/InsuranceSystem.js';
import ContentData from '../systems/ContentData.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.createBackground();

    // UI Panels
    this.createResourcePanel();
    this.createActionPanel();
    this.createEventPanel();
    this.createStatusPanel();

    // Event listener
    this.eventDisplay = null;

    // Start game loop
    this.setupGameLoop();

    // Check for initial events
    this.checkForEvents();
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Desk surface - worn wood grain look
    graphics.fillStyle(0x5c4033, 1);
    graphics.fillRect(0, 0, width, height);

    // Wood grain lines
    graphics.lineStyle(1, 0x4a3728, 0.5);
    for (let y = 0; y < height; y += 8 + Math.random() * 4) {
      const wobble = Math.sin(y * 0.1) * 20;
      graphics.lineBetween(wobble, y, width + wobble, y);
    }

    // Scattered paper shadows
    graphics.fillStyle(0x000000, 0.2);
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      graphics.fillRect(x + 5, y + 5, 150, 180);
    }

    // Coffee ring stains
    graphics.lineStyle(3, 0x3d2817, 0.3);
    graphics.strokeCircle(890, 650, 40);
    graphics.strokeCircle(100, 500, 35);
  }

  createResourcePanel() {
    const panelX = 20;
    const panelY = 20;

    // Panel background - sticky note / form paper style
    const panel = this.add.graphics();
    panel.fillStyle(0xfffacd, 1); // Pale yellow like a sticky note
    panel.fillRect(panelX, panelY, 280, 210);
    // Torn edge effect on bottom
    panel.fillStyle(0xfffacd, 1);
    for (let x = panelX; x < panelX + 280; x += 10) {
      panel.fillTriangle(x, panelY + 210, x + 5, panelY + 215 + Math.random() * 5, x + 10, panelY + 210);
    }
    // Shadow
    panel.fillStyle(0x000000, 0.15);
    panel.fillRect(panelX + 5, panelY + 5, 280, 210);

    // Push pin
    panel.fillStyle(0xcc0000, 1);
    panel.fillCircle(panelX + 140, panelY + 8, 8);
    panel.fillStyle(0x990000, 1);
    panel.fillCircle(panelX + 140, panelY + 8, 4);

    // Title - handwritten style
    this.add.text(panelX + 15, panelY + 20, 'PATIENT STATUS:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#333333',
      fontStyle: 'bold'
    });

    // Resource bars
    this.resourceBars = {};
    const resources = [
      { key: 'health', label: 'HEALTH', color: 0xcc0000, icon: '♥' },
      { key: 'money', label: 'SAVINGS', color: 0x228b22, icon: '$' },
      { key: 'coverage', label: 'COVERAGE', color: 0x4169e1, icon: '■' },
      { key: 'hope', label: 'HOPE', color: 0xdaa520, icon: '★' },
      { key: 'time', label: 'TIME LEFT', color: 0x800080, icon: '⧖' }
    ];

    let yOffset = 50;
    resources.forEach(res => {
      this.createResourceBar(panelX + 15, panelY + yOffset, res);
      yOffset += 30;
    });

    // Day counter - calendar style
    this.dayText = this.add.text(panelX + 200, panelY + 185, `DAY ${gameState.day}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#8B0000',
      fontStyle: 'bold'
    });
  }

  createResourceBar(x, y, resource) {
    // Label - typewriter style
    this.add.text(x, y, `${resource.icon} ${resource.label}:`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#333333'
    });

    // Background bar - hand-drawn box style
    const bgBar = this.add.graphics();
    bgBar.fillStyle(0xffffff, 1);
    bgBar.fillRect(x + 85, y - 1, 130, 14);
    bgBar.lineStyle(1, 0x333333, 1);
    bgBar.strokeRect(x + 85, y - 1, 130, 14);

    // Foreground bar
    const fgBar = this.add.graphics();
    this.resourceBars[resource.key] = { bar: fgBar, color: resource.color, x: x + 86, y: y };

    // Value text
    const valueText = this.add.text(x + 220, y, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#333333'
    });
    this.resourceBars[resource.key].text = valueText;

    this.updateResourceBar(resource.key);
  }

  updateResourceBar(key) {
    const bar = this.resourceBars[key];
    if (!bar) return;

    let value, maxValue, displayValue;

    if (key === 'money') {
      value = Math.max(0, gameState.resources.money);
      maxValue = 100000;
      displayValue = `$${gameState.resources.money.toLocaleString()}`;
    } else if (key === 'time') {
      value = gameState.resources.time;
      maxValue = 400;
      displayValue = `${gameState.resources.time}d`;
    } else {
      value = gameState.resources[key];
      maxValue = 100;
      displayValue = `${Math.round(value)}%`;
    }

    const percentage = Math.min(1, Math.max(0, value / maxValue));
    const barWidth = 128 * percentage;

    bar.bar.clear();
    bar.bar.fillStyle(bar.color, 1);
    bar.bar.fillRect(bar.x, bar.y, barWidth, 12);

    bar.text.setText(displayValue);

    // Color warning for low resources
    if (percentage < 0.25 && key !== 'money') {
      bar.text.setColor('#cc0000');
    } else {
      bar.text.setColor('#333333');
    }
  }

  updateAllResourceBars() {
    Object.keys(this.resourceBars).forEach(key => this.updateResourceBar(key));
    this.dayText.setText(`Day ${gameState.day}`);
  }

  createActionPanel() {
    const panelX = 20;
    const panelY = 250;
    const width = 280;

    // Panel background - clipboard style
    const panel = this.add.graphics();

    // Clipboard board
    panel.fillStyle(0x654321, 1);
    panel.fillRect(panelX - 5, panelY - 25, width + 10, 300);

    // Clip at top
    panel.fillStyle(0x8B4513, 1);
    panel.fillRect(panelX + 100, panelY - 35, 80, 25);
    panel.fillStyle(0xcd853f, 1);
    panel.fillRect(panelX + 110, panelY - 30, 60, 15);

    // Paper on clipboard
    panel.fillStyle(0xffffff, 1);
    panel.fillRect(panelX, panelY, width, 265);

    // Red margin line
    panel.lineStyle(1, 0xffcccc, 1);
    panel.lineBetween(panelX + 30, panelY, panelX + 30, panelY + 265);

    // Blue horizontal lines
    panel.lineStyle(1, 0xadd8e6, 0.5);
    for (let y = panelY + 35; y < panelY + 265; y += 20) {
      panel.lineBetween(panelX + 5, y, panelX + width - 5, y);
    }

    // Title - handwritten
    this.add.text(panelX + 35, panelY + 10, 'TO DO:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#333333',
      fontStyle: 'bold'
    });

    // Action buttons as checkbox items
    const actions = [
      { label: 'Call Insurance', scene: 'InsuranceScene', icon: '☐' },
      { label: 'Visit Hospital', scene: 'TreatmentScene', icon: '☐' },
      { label: 'Pay Bills (?)', scene: 'BillingScene', icon: '☐' },
      { label: 'Wait (1 Day)', action: 'wait', icon: '☐' },
      { label: 'Save Progress', action: 'save', icon: '☐' }
    ];

    let yOffset = 40;
    actions.forEach(action => {
      this.createActionButton(panelX + 35, panelY + yOffset, width - 50, action);
      yOffset += 42;
    });
  }

  createActionButton(x, y, width, action) {
    const container = this.add.container(x, y);

    // No background - just text on lined paper
    const checkbox = this.add.text(0, 0, action.icon, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#333333'
    });

    const label = this.add.text(25, 2, action.label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#333333'
    });

    container.add([checkbox, label]);
    container.setSize(width, 30);
    container.setInteractive();

    container.on('pointerover', () => {
      checkbox.setText('☑');
      checkbox.setColor('#008000');
      label.setColor('#008000');
      this.input.setDefaultCursor('pointer');
    });

    container.on('pointerout', () => {
      checkbox.setText('☐');
      checkbox.setColor('#333333');
      label.setColor('#333333');
      this.input.setDefaultCursor('default');
    });

    container.on('pointerdown', () => {
      if (action.scene) {
        this.scene.start(action.scene);
      } else if (action.action === 'wait') {
        this.advanceDay();
      } else if (action.action === 'save') {
        this.saveGame();
      }
    });
  }

  createEventPanel() {
    const panelX = 320;
    const panelY = 20;
    const width = 480;
    const height = 500;

    // Panel background - manila folder with documents
    const panel = this.add.graphics();

    // Folder tab
    panel.fillStyle(0xf4a460, 1);
    panel.fillRect(panelX + 50, panelY - 20, 120, 25);

    // Folder body
    panel.fillStyle(0xdeb887, 1);
    panel.fillRect(panelX, panelY, width, height);

    // Shadow
    panel.fillStyle(0x000000, 0.1);
    panel.fillRect(panelX + 5, panelY + 5, width, height);

    // Inner paper
    panel.fillStyle(0xffffff, 1);
    panel.fillRect(panelX + 15, panelY + 15, width - 30, height - 30);

    // Folder label
    this.add.text(panelX + 60, panelY - 15, 'CASE FILE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#333333',
      fontStyle: 'bold'
    });

    // Title - stamped header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x8B0000, 1);
    headerBg.fillRect(panelX + 20, panelY + 20, width - 40, 30);

    this.add.text(panelX + width / 2, panelY + 35, 'CURRENT STATUS REPORT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Event container
    this.eventContainer = this.add.container(panelX + 30, panelY + 65);

    // Show initial status
    this.showStatusMessage();
  }

  showStatusMessage() {
    this.eventContainer.removeAll(true);

    const messages = [];

    // Phase-specific messages
    if (gameState.phase === 'insurance') {
      messages.push({ text: '> Oncologist has recommended treatment plan.', urgent: false });
      messages.push({ text: '> REQUIRED: Submit prior authorization forms.', urgent: true });
    }

    // Pending prior auths
    if (gameState.insurance.priorAuthsPending.length > 0) {
      messages.push({ text: `> [PENDING] ${gameState.insurance.priorAuthsPending.length} prior auth(s) awaiting review`, urgent: false });
    }

    // Denied prior auths
    if (gameState.insurance.priorAuthsDenied.length > 0) {
      messages.push({ text: `> [DENIED] ${gameState.insurance.priorAuthsDenied.length} prior auth(s) rejected`, urgent: true });
    }

    // Outstanding bills
    if (gameState.finances.totalOwed > 0) {
      messages.push({ text: `> AMOUNT DUE: $${gameState.finances.totalOwed.toLocaleString()}`, urgent: gameState.finances.totalOwed > 10000 });
    }

    // Treatment status
    if (gameState.treatment.treatmentPlan) {
      messages.push({ text: `> Treatment: ${gameState.treatment.treatmentPlan} in progress`, urgent: false });
    } else {
      messages.push({ text: '> WARNING: No active treatment - disease progressing', urgent: true });
    }

    // Low resource warnings
    if (gameState.resources.health < 30) {
      messages.push({ text: '>>> CRITICAL: HEALTH DANGEROUSLY LOW <<<', urgent: true });
    }
    if (gameState.resources.hope < 30) {
      messages.push({ text: '>>> WARNING: PATIENT MORALE FAILING <<<', urgent: true });
    }
    if (gameState.resources.time < 60) {
      messages.push({ text: '>>> URGENT: PROGNOSIS TIME LIMITED <<<', urgent: true });
    }

    let yOffset = 0;
    messages.forEach(msg => {
      const text = this.add.text(0, yOffset, msg.text, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: msg.urgent ? '#8B0000' : '#333333',
        wordWrap: { width: 420 }
      });
      this.eventContainer.add(text);
      yOffset += 28;
    });
  }

  createStatusPanel() {
    const panelX = 820;
    const panelY = 20;
    const width = 184;
    const height = 500;

    // Panel background - newspaper clipping board
    const panel = this.add.graphics();

    // Cork board background
    panel.fillStyle(0xd2691e, 1);
    panel.fillRect(panelX, panelY, width, height);

    // Cork texture dots
    panel.fillStyle(0xc4721a, 0.5);
    for (let i = 0; i < 100; i++) {
      const x = panelX + Math.random() * width;
      const y = panelY + Math.random() * height;
      panel.fillCircle(x, y, 2);
    }

    // Frame
    panel.lineStyle(4, 0x8b4513, 1);
    panel.strokeRect(panelX, panelY, width, height);

    // Title card pinned at top
    panel.fillStyle(0xffffff, 1);
    panel.fillRect(panelX + 20, panelY + 10, width - 40, 30);

    // Pin
    panel.fillStyle(0xff0000, 1);
    panel.fillCircle(panelX + width / 2, panelY + 15, 6);

    this.add.text(panelX + width / 2, panelY + 25, 'NEWS', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '14px',
      color: '#333333'
    }).setOrigin(0.5);

    // News container
    this.newsContainer = this.add.container(panelX + 10, panelY + 50);
    this.updateNewsFeed();
  }

  updateNewsFeed() {
    this.newsContainer.removeAll(true);

    const headlines = ContentData.tickerHeadlines.slice(0, 5);
    let yOffset = 0;

    headlines.forEach((headline, index) => {
      // Newspaper clipping style
      const clipping = this.add.graphics();
      clipping.fillStyle(0xf5f5dc, 1);
      clipping.fillRect(0, yOffset, 164, 70);

      // Torn edges
      clipping.fillStyle(0xf5f5dc, 1);
      for (let x = 0; x < 164; x += 8) {
        clipping.fillTriangle(x, yOffset + 70, x + 4, yOffset + 73 + Math.random() * 3, x + 8, yOffset + 70);
      }

      // Slight rotation for realism
      const rotation = (Math.random() - 0.5) * 0.1;

      const text = this.add.text(5, yOffset + 5, headline, {
        fontFamily: 'Times New Roman, serif',
        fontSize: '9px',
        color: '#1a1a1a',
        wordWrap: { width: 155 }
      });

      // Pin at corner
      clipping.fillStyle(0xffcc00, 1);
      clipping.fillCircle(82 + Math.random() * 20, yOffset + 5, 4);

      this.newsContainer.add(clipping);
      this.newsContainer.add(text);
      yOffset += 85;
    });
  }

  setupGameLoop() {
    // Check for ending conditions on update
    this.time.addEvent({
      delay: 1000,
      callback: this.checkEndingConditions,
      callbackScope: this,
      loop: true
    });
  }

  advanceDay() {
    gameState.advanceDay(1);
    this.updateAllResourceBars();

    // Process prior authorizations
    const processed = insuranceSystem.processPriorAuths();
    if (processed.length > 0) {
      this.showProcessedAuths(processed);
    }

    // Check for random events
    this.checkForEvents();

    // Check ending conditions
    this.checkEndingConditions();
  }

  checkForEvents() {
    const events = eventSystem.checkEvents();

    if (events.length > 0) {
      this.showEvent(events[0]);
    } else {
      this.showStatusMessage();
    }

    // Check for breaking news
    const news = newsSystem.checkBreakingNews();
    if (news) {
      this.showBreakingNews(news);
    }
  }

  showEvent(event) {
    this.eventContainer.removeAll(true);

    // Event title
    const title = this.add.text(0, 0, `>>> ${event.title.toUpperCase()} <<<`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#8B0000',
      fontStyle: 'bold'
    });
    this.eventContainer.add(title);

    // Event description
    const desc = this.add.text(0, 30, event.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#333333',
      wordWrap: { width: 420 }
    });
    this.eventContainer.add(desc);

    // Apply effects
    if (event.effects) {
      eventSystem.applyEventEffects(event);
      this.updateAllResourceBars();

      // Show effects
      let effectText = 'IMPACT: ';
      if (event.effects.health) effectText += `Health ${event.effects.health > 0 ? '+' : ''}${event.effects.health} `;
      if (event.effects.hope) effectText += `Hope ${event.effects.hope > 0 ? '+' : ''}${event.effects.hope} `;
      if (event.effects.coverage) effectText += `Coverage ${event.effects.coverage > 0 ? '+' : ''}${event.effects.coverage} `;
      if (event.effects.money) effectText += `Money ${event.effects.money > 0 ? '+$' : '-$'}${Math.abs(event.effects.money)} `;

      const effects = this.add.text(0, 70, effectText, {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#cc6600'
      });
      this.eventContainer.add(effects);
    }

    // Dismiss button
    const dismissBtn = this.createSmallButton(0, 110, 'CONTINUE', () => {
      this.showStatusMessage();
    });
    this.eventContainer.add(dismissBtn);
  }

  showBreakingNews(news) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Track all popup elements
    const popupElements = [];

    // Overlay - make interactive to block clicks
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    popupElements.push(overlay);

    // News panel
    const panel = this.add.graphics();
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(width / 2 - 300, height / 2 - 150, 600, 300);
    panel.lineStyle(4, 0xffcc00, 1);
    panel.strokeRect(width / 2 - 300, height / 2 - 150, 600, 300);
    panel.setDepth(101);
    popupElements.push(panel);

    const formatted = newsSystem.formatHeadline(news);

    // Source
    const source = this.add.text(width / 2, height / 2 - 120, formatted.source, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(source);

    // Main text
    const mainText = this.add.text(width / 2, height / 2 - 30, formatted.text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 550 },
      align: 'center'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(mainText);

    // Subtext if exists
    if (formatted.subtext) {
      const subtext = this.add.text(width / 2, height / 2 + 40, formatted.subtext, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#ffcccc',
        wordWrap: { width: 550 },
        align: 'center'
      }).setOrigin(0.5).setDepth(102);
      popupElements.push(subtext);
    }

    // Apply effects
    newsSystem.applyNewsEffects(news);
    this.updateAllResourceBars();

    // Cleanup function
    const closePopup = () => {
      popupElements.forEach(el => el.destroy());
    };

    // Dismiss button
    const dismissContainer = this.add.container(width / 2, height / 2 + 100);
    dismissContainer.setDepth(103);
    popupElements.push(dismissContainer);

    const dismissBg = this.add.graphics();
    dismissBg.fillStyle(0xffffff, 1);
    dismissBg.fillRect(-60, -20, 120, 40);

    const dismissLabel = this.add.text(0, 0, 'DISMISS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    dismissContainer.add([dismissBg, dismissLabel]);
    dismissContainer.setSize(120, 40);
    dismissContainer.setInteractive({ useHandCursor: true });

    dismissContainer.on('pointerdown', closePopup);
  }

  showProcessedAuths(processed) {
    processed.forEach(result => {
      if (!result.approved) {
        // Show denial popup
        this.showDenialPopup(result);
      }
    });
  }

  showDenialPopup(result) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Track all popup elements
    const popupElements = [];

    // Overlay - make interactive to block clicks
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    popupElements.push(overlay);

    // Panel - denial letter style
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 150, 400, 300);
    panel.lineStyle(4, 0x8B0000, 1);
    panel.strokeRect(width / 2 - 200, height / 2 - 150, 400, 300);
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 150, 400, 40);
    panel.setDepth(101);
    popupElements.push(panel);

    // Header text
    const header = this.add.text(width / 2, height / 2 - 130, 'CLAIM DENIED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(header);

    // DENIED stamp
    const stamp = this.add.text(width / 2 + 100, height / 2 - 50, 'DENIED', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '36px',
      color: '#8B0000'
    }).setOrigin(0.5).setDepth(102).setRotation(-0.3).setAlpha(0.7);
    popupElements.push(stamp);

    // Details
    const details = this.add.text(width / 2, height / 2 - 20,
      `Treatment: ${result.request.treatment}\n\nReason: ${result.reason}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#333333',
      wordWrap: { width: 360 },
      align: 'center'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(details);

    // Cleanup function
    const closePopup = () => {
      popupElements.forEach(el => el.destroy());
    };

    // Appeal button
    const appealBtn = this.createPopupButton(width / 2 - 80, height / 2 + 90, 'APPEAL', () => {
      insuranceSystem.appealDenial(result.request.id);
      closePopup();
      this.updateAllResourceBars();
      this.showStatusMessage();
    });
    appealBtn.setDepth(103);
    popupElements.push(appealBtn);

    // Close button
    const closeBtn = this.createPopupButton(width / 2 + 80, height / 2 + 90, 'CLOSE', closePopup);
    closeBtn.setDepth(103);
    popupElements.push(closeBtn);
  }

  createSmallButton(x, y, text, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x00a896, 1);
    bg.fillRoundedRect(0, 0, 100, 30, 4);

    const label = this.add.text(50, 15, text, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(100, 30);
    container.setInteractive();

    container.on('pointerdown', callback);

    return container;
  }

  createPopupButton(x, y, text, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2d3436, 1);
    bg.fillRoundedRect(-50, -15, 100, 30, 4);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(100, 30);
    container.setInteractive();

    container.on('pointerdown', callback);

    return container;
  }

  saveGame() {
    gameState.save();

    // Show save confirmation
    const width = this.cameras.main.width;
    const saveMsg = this.add.text(width / 2, 550, 'Game Saved', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#00a896'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: saveMsg,
      alpha: 0,
      duration: 2000,
      onComplete: () => saveMsg.destroy()
    });
  }

  checkEndingConditions() {
    const ending = gameState.calculateEnding();

    if (ending !== 'ongoing') {
      gameState.triggerEnding(ending);
      this.scene.start('EndingScene');
    }
  }
}
