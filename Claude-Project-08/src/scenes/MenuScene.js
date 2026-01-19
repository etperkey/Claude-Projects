// MenuScene - Main menu with bureaucratic nightmare aesthetic

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import ContentData from '../systems/ContentData.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background - harsh fluorescent office with scattered papers
    this.createBackground();

    // Scattered denial stamps in background
    this.createScatteredStamps();

    // Main "form" container for title
    const formBg = this.add.graphics();
    formBg.fillStyle(0xfefefe, 1);
    formBg.fillRect(width / 2 - 320, 60, 640, 260);
    formBg.lineStyle(3, 0x333333, 1);
    formBg.strokeRect(width / 2 - 320, 60, 640, 260);

    // Form header stripe
    formBg.fillStyle(0x8B0000, 1);
    formBg.fillRect(width / 2 - 320, 60, 640, 45);

    // Title as "form header"
    this.add.text(width / 2, 82, 'FORM ACE-001 | PATIENT INTAKE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Main title - typewriter style
    this.add.text(width / 2, 145, 'THE AMERICAN', {
      fontFamily: 'Courier New, monospace',
      fontSize: '42px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 195, 'CANCER EXPERIENCE', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '52px',
      color: '#8B0000'
    }).setOrigin(0.5);

    // Tagline in typewriter
    this.add.text(width / 2, 260, '>>> "The cancer is the easy part." <<<', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#333333'
    }).setOrigin(0.5);

    // Barcode at bottom of form
    this.createBarcode(width / 2 - 100, 290, 200, 20);

    // Menu buttons as form checkboxes/options
    const buttonY = 380;
    const buttonSpacing = 55;

    this.createFormButton(width / 2, buttonY, '☐ NEW DIAGNOSIS', () => {
      this.scene.start('DiagnosisScene');
    });

    if (gameState.hasSave()) {
      this.createFormButton(width / 2, buttonY + buttonSpacing, '☐ CONTINUE SUFFERING', () => {
        gameState.load();
        this.scene.start('GameScene');
      });
    }

    this.createFormButton(width / 2, buttonY + buttonSpacing * (gameState.hasSave() ? 2 : 1), '☐ INSURANCE STATUS', () => {
      this.showDifficultySelect();
    });

    // Bottom ticker - scrolling claims denied
    this.createDeniedTicker();

    // Statistics as fine print
    this.add.text(width / 2, height - 75, '* Based on real stories. All statistics are accurate.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 55, '* 67% of US bankruptcies are medical-related. 100M Americans have medical debt.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 30, '⚠ THIS GAME IS SATIRE. THE HEALTHCARE SYSTEM IS NOT. ⚠', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Harsh fluorescent white/yellow tint - like bad office lighting
    graphics.fillStyle(0xf5f5dc, 1);
    graphics.fillRect(0, 0, width, height);

    // Scattered paper effect
    graphics.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * width - 50;
      const y = Math.random() * height - 30;
      const rotation = (Math.random() - 0.5) * 0.4;

      graphics.save();
      graphics.fillRect(x, y, 80 + Math.random() * 40, 100 + Math.random() * 50);
      graphics.restore();
    }

    // Coffee stain rings
    graphics.fillStyle(0x8B4513, 0.15);
    graphics.fillCircle(150, 600, 45);
    graphics.fillStyle(0x8B4513, 0.1);
    graphics.fillCircle(850, 200, 35);

    // Grid lines like ruled paper
    graphics.lineStyle(1, 0xadd8e6, 0.2);
    for (let y = 0; y < height; y += 25) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  createScatteredStamps() {
    const stamps = ['DENIED', 'REJECTED', 'PENDING', 'PAST DUE', 'FINAL NOTICE'];
    const colors = [0x8B0000, 0xcc0000, 0xff6600, 0x8B0000, 0xcc0000];

    stamps.forEach((text, i) => {
      const x = 100 + Math.random() * 824;
      const y = 400 + Math.random() * 200;
      const rotation = (Math.random() - 0.5) * 0.6;

      const stamp = this.add.text(x, y, text, {
        fontFamily: 'Impact, sans-serif',
        fontSize: '28px',
        color: Phaser.Display.Color.IntegerToColor(colors[i]).rgba
      }).setOrigin(0.5).setRotation(rotation).setAlpha(0.25);
    });
  }

  createBarcode(x, y, width, height) {
    const graphics = this.add.graphics();
    let currentX = x;

    while (currentX < x + width) {
      const barWidth = Math.random() < 0.5 ? 2 : 4;
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(currentX, y, barWidth, height);
      currentX += barWidth + (Math.random() < 0.5 ? 1 : 2);
    }
  }

  createFormButton(x, y, text, callback) {
    const button = this.add.container(x, y);

    // Form field box
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(-180, -22, 360, 44);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-180, -22, 360, 44);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(360, 44);
    button.setInteractive();

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xffffe0, 1);
      bg.fillRect(-180, -22, 360, 44);
      bg.lineStyle(3, 0x8B0000, 1);
      bg.strokeRect(-180, -22, 360, 44);
      label.setText(text.replace('☐', '☑'));
      this.input.setDefaultCursor('pointer');
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xffffff, 1);
      bg.fillRect(-180, -22, 360, 44);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-180, -22, 360, 44);
      label.setText(text);
      this.input.setDefaultCursor('default');
    });

    button.on('pointerdown', callback);

    return button;
  }

  createDeniedTicker() {
    const width = this.cameras.main.width;
    const tickerY = 555;

    // Red "URGENT" banner
    const tickerBg = this.add.graphics();
    tickerBg.fillStyle(0x8B0000, 1);
    tickerBg.fillRect(0, tickerY - 18, width, 36);

    // Warning stripes on edges
    tickerBg.fillStyle(0xffcc00, 1);
    for (let i = 0; i < width; i += 40) {
      tickerBg.fillRect(i, tickerY - 18, 20, 4);
      tickerBg.fillRect(i, tickerY + 14, 20, 4);
    }

    // Get headlines as denied claims
    const headlines = ContentData.tickerHeadlines;
    const tickerText = 'CLAIM DENIED • ' + headlines.slice(0, 5).join(' • CLAIM DENIED • ');

    // Create scrolling text
    const ticker = this.add.text(width, tickerY, tickerText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Scroll animation
    this.tweens.add({
      targets: ticker,
      x: -ticker.width,
      duration: 35000,
      repeat: -1,
      onRepeat: () => {
        ticker.x = width;
      }
    });
  }

  showDifficultySelect() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Track all elements for cleanup
    const popupElements = [];

    // Overlay - like holding a form up to the light
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    popupElements.push(overlay);

    // Panel - insurance form style
    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(width / 2 - 310, 80, 620, 570);
    panel.lineStyle(3, 0x333333, 1);
    panel.strokeRect(width / 2 - 310, 80, 620, 570);
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(width / 2 - 310, 80, 620, 50);
    panel.setDepth(101);
    popupElements.push(panel);

    // Title
    const title = this.add.text(width / 2, 105, 'INSURANCE VERIFICATION FORM', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(title);

    // Subtitle
    const subtitle = this.add.text(width / 2, 155, 'SELECT YOUR COVERAGE TIER:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#333333'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(subtitle);

    // Cleanup function
    const closePopup = () => {
      popupElements.forEach(el => el.destroy());
    };

    // Difficulty options
    const difficulties = ContentData.difficulties;
    let yPos = 200;

    difficulties.forEach((diff) => {
      const option = this.createDifficultyOption(width / 2, yPos, diff, () => {
        gameState.resources.money = diff.startingMoney;
        gameState.resources.coverage = diff.startingCoverage;
        gameState.insurance.deductible = diff.deductible;
        gameState.insurance.maxOutOfPocket = diff.maxOOP;
        closePopup();
      });
      option.setDepth(102);
      popupElements.push(option);
      yPos += 105;
    });

    // Close button
    const closeBtn = this.add.text(width / 2 + 290, 95, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(103);
    popupElements.push(closeBtn);

    closeBtn.on('pointerdown', closePopup);
  }

  createDifficultyOption(x, y, diff, callback) {
    const container = this.add.container(x, y);

    // Checkbox form field style
    const bg = this.add.graphics();
    bg.fillStyle(0xf8f8f8, 1);
    bg.fillRect(-280, -40, 560, 85);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-280, -40, 560, 85);

    // Checkbox
    const checkbox = this.add.text(-260, -25, '☐', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#333333'
    });

    const name = this.add.text(-220, -30, diff.name.toUpperCase(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#8B0000',
      fontStyle: 'bold'
    });

    const desc = this.add.text(-220, -2, diff.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#333333',
      wordWrap: { width: 500 }
    });

    const stats = this.add.text(-220, 25,
      `Savings: $${diff.startingMoney.toLocaleString()} | Coverage: ${diff.startingCoverage}% | Deductible: $${diff.deductible.toLocaleString()}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    });

    container.add([bg, checkbox, name, desc, stats]);
    container.setSize(560, 85);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xffffe0, 1);
      bg.fillRect(-280, -40, 560, 85);
      bg.lineStyle(3, 0x8B0000, 1);
      bg.strokeRect(-280, -40, 560, 85);
      checkbox.setText('☑');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xf8f8f8, 1);
      bg.fillRect(-280, -40, 560, 85);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-280, -40, 560, 85);
      checkbox.setText('☐');
    });

    container.on('pointerdown', callback);

    return container;
  }
}
