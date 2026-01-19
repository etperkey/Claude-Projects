// DiagnosisScene - Character creation and diagnosis method

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import ContentData from '../systems/ContentData.js';

export default class DiagnosisScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DiagnosisScene' });
    this.currentStep = 0;
    this.selections = {};
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Reset game state
    gameState.reset();

    // Background
    this.createBackground();

    // Container for step content
    this.stepContainer = this.add.container(0, 0);

    // Progress indicator
    this.createProgressIndicator();

    // Start with first step
    this.showStep(0);
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Harsh hospital fluorescent lighting
    graphics.fillStyle(0xf0f8f0, 1);
    graphics.fillRect(0, 0, width, height);

    // Floor tile pattern
    graphics.fillStyle(0xe8e8e8, 0.5);
    for (let x = 0; x < width; x += 60) {
      for (let y = 0; y < height; y += 60) {
        if ((x + y) % 120 === 0) {
          graphics.fillRect(x, y, 60, 60);
        }
      }
    }

    // Waiting room chair silhouettes in background
    graphics.fillStyle(0x333333, 0.05);
    for (let x = 100; x < width - 100; x += 150) {
      graphics.fillRect(x, height - 100, 80, 50);
      graphics.fillRect(x + 10, height - 130, 60, 30);
    }
  }

  createProgressIndicator() {
    const width = this.cameras.main.width;
    const steps = ['1. Diagnosis', '2. Cancer Type', '3. Insurance', '4. Begin'];

    this.progressContainer = this.add.container(width / 2, 40);

    // Form progress bar background
    const bgBar = this.add.graphics();
    bgBar.fillStyle(0xffffff, 1);
    bgBar.fillRect(-320, -15, 640, 40);
    bgBar.lineStyle(2, 0x333333, 1);
    bgBar.strokeRect(-320, -15, 640, 40);
    this.progressContainer.add(bgBar);

    steps.forEach((step, index) => {
      const x = (index - 1.5) * 160;

      // Checkbox style
      const checkbox = this.add.text(x - 30, 0, index === 0 ? '☑' : '☐', {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: index === 0 ? '#008000' : '#333333'
      }).setOrigin(0.5);
      checkbox.name = `circle_${index}`;
      this.progressContainer.add(checkbox);

      // Label
      const label = this.add.text(x + 20, 0, step, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: index === 0 ? '#008000' : '#666666'
      }).setOrigin(0, 0.5);
      label.name = `label_${index}`;
      this.progressContainer.add(label);
    });
  }

  updateProgressIndicator(step) {
    this.progressContainer.list.forEach(item => {
      if (item.name && item.name.startsWith('circle_')) {
        const index = parseInt(item.name.split('_')[1]);
        item.setText(index <= step ? '☑' : '☐');
        item.setColor(index <= step ? '#008000' : '#333333');
      }
      if (item.name && item.name.startsWith('label_')) {
        const index = parseInt(item.name.split('_')[1]);
        item.setColor(index <= step ? '#008000' : '#666666');
      }
    });
  }

  showStep(step) {
    this.stepContainer.removeAll(true);
    this.currentStep = step;
    this.updateProgressIndicator(step);

    const width = this.cameras.main.width;

    switch (step) {
      case 0:
        this.showDiagnosisStep();
        break;
      case 1:
        this.showCancerTypeStep();
        break;
      case 2:
        this.showInsuranceStep();
        break;
      case 3:
        this.showSummaryStep();
        break;
    }
  }

  showDiagnosisStep() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Form header
    const formBg = this.add.graphics();
    formBg.fillStyle(0xffffff, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 60);
    formBg.fillStyle(0x8B0000, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 25);
    this.stepContainer.add(formBg);

    const sectionTitle = this.add.text(width / 2, 92, 'SECTION 1: INITIAL DIAGNOSIS METHOD', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.stepContainer.add(sectionTitle);

    // Title
    const title = this.add.text(width / 2, 120, 'How was your cancer discovered?', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepContainer.add(title);

    // Subtitle
    const subtitle = this.add.text(width / 2, 145, '(Selection affects starting health, time, and financial status)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    }).setOrigin(0.5);
    this.stepContainer.add(subtitle);

    // Options
    const options = [
      {
        id: 'screening',
        title: 'Routine Screening',
        description: 'Caught it early during a checkup. Better prognosis, more time.',
        effects: 'Health: 80 | Time: 400 days | Hope: 80',
        icon: '🩺'
      },
      {
        id: 'symptoms',
        title: 'Noticed Symptoms',
        description: 'Something felt wrong. You waited a bit before going in.',
        effects: 'Health: 60 | Time: 300 days | Hope: 65',
        icon: '😰'
      },
      {
        id: 'emergency',
        title: 'Emergency Room',
        description: 'Collapsed or had severe symptoms. Late discovery.',
        effects: 'Health: 40 | Time: 180 days | Hope: 50',
        icon: '🚑'
      }
    ];

    let yPos = 250;
    options.forEach(opt => {
      const card = this.createOptionCard(width / 2, yPos, opt, () => {
        this.selections.diagnosisMethod = opt.id;
        this.applyDiagnosisEffects(opt.id);
        this.showStep(1);
      });
      this.stepContainer.add(card);
      yPos += 130;
    });
  }

  applyDiagnosisEffects(method) {
    switch (method) {
      case 'screening':
        gameState.player.diagnosisMethod = 'screening';
        gameState.resources.health = 80;
        gameState.resources.time = 400;
        gameState.resources.hope = 80;
        break;
      case 'symptoms':
        gameState.player.diagnosisMethod = 'symptoms';
        gameState.resources.health = 60;
        gameState.resources.time = 300;
        gameState.resources.hope = 65;
        break;
      case 'emergency':
        gameState.player.diagnosisMethod = 'emergency';
        gameState.resources.health = 40;
        gameState.resources.time = 180;
        gameState.resources.hope = 50;
        // ER bills start immediately
        gameState.addBill('Emergency Room Visit', 12500, 30);
        break;
    }
  }

  showCancerTypeStep() {
    const width = this.cameras.main.width;

    // Form header
    const formBg = this.add.graphics();
    formBg.fillStyle(0xffffff, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 60);
    formBg.fillStyle(0x8B0000, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 25);
    this.stepContainer.add(formBg);

    const sectionTitle = this.add.text(width / 2, 92, 'SECTION 2: CANCER CLASSIFICATION', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.stepContainer.add(sectionTitle);

    // Title
    const title = this.add.text(width / 2, 120, 'Select your cancer type:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepContainer.add(title);

    const subtitle = this.add.text(width / 2, 145, '(Different cancers have different treatment costs and prognoses)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    }).setOrigin(0.5);
    this.stepContainer.add(subtitle);

    // Cancer type options in a grid
    const types = ContentData.cancerTypes;
    const cols = 3;
    const startX = width / 2 - 280;
    const startY = 200;

    types.forEach((type, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * 200;
      const y = startY + row * 140;

      const card = this.createCancerCard(x, y, type, () => {
        this.selections.cancerType = type.name;
        gameState.player.cancerType = type.name.toLowerCase();
        this.showStep(2);
      });
      this.stepContainer.add(card);
    });
  }

  showInsuranceStep() {
    const width = this.cameras.main.width;

    // Form header
    const formBg = this.add.graphics();
    formBg.fillStyle(0xffffff, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 60);
    formBg.fillStyle(0x8B0000, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 25);
    this.stepContainer.add(formBg);

    const sectionTitle = this.add.text(width / 2, 92, 'SECTION 3: INSURANCE VERIFICATION', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.stepContainer.add(sectionTitle);

    // Title
    const title = this.add.text(width / 2, 120, 'Select your insurance provider:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepContainer.add(title);

    const subtitle = this.add.text(width / 2, 145, '(They all deny claims. Some are just worse about it.)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666'
    }).setOrigin(0.5);
    this.stepContainer.add(subtitle);

    const providers = [
      { name: 'UnitedHealth', denial: 'High', slogan: '"Helping people live healthier lives."' },
      { name: 'Anthem', denial: 'Medium', slogan: '"Your health is our priority."' },
      { name: 'Cigna', denial: 'Medium', slogan: '"Together, all the way."' },
      { name: 'Aetna', denial: 'Medium', slogan: '"You don\'t join us. We join you."' },
      { name: 'Humana', denial: 'Low', slogan: '"Human care."' },
      { name: 'None', denial: 'N/A', slogan: '"Good luck."' }
    ];

    let yPos = 210;
    const cols = 2;
    providers.forEach((prov, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = width / 2 - 200 + col * 280;
      const y = yPos + row * 100;

      const card = this.createInsuranceCard(x, y, prov, () => {
        this.selections.insurance = prov.name;
        gameState.insurance.provider = prov.name;
        if (prov.name === 'None') {
          gameState.resources.coverage = 0;
        }
        this.showStep(3);
      });
      this.stepContainer.add(card);
    });
  }

  showSummaryStep() {
    const width = this.cameras.main.width;

    // Form header
    const formBg = this.add.graphics();
    formBg.fillStyle(0xffffff, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 60);
    formBg.fillStyle(0x8B0000, 1);
    formBg.fillRect(width / 2 - 320, 80, 640, 25);
    this.stepContainer.add(formBg);

    const sectionTitle = this.add.text(width / 2, 92, 'SECTION 4: PATIENT SUMMARY', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.stepContainer.add(sectionTitle);

    // Title
    const title = this.add.text(width / 2, 120, 'Review your diagnosis:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepContainer.add(title);

    // Summary panel
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRect(width / 2 - 250, 160, 500, 340);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(width / 2 - 250, 160, 500, 340);
    this.stepContainer.add(panel);

    // Summary content
    const summaryText = [
      `DIAGNOSIS METHOD: ${this.selections.diagnosisMethod?.toUpperCase() || 'N/A'}`,
      `CANCER TYPE: ${this.selections.cancerType?.toUpperCase() || 'N/A'}`,
      `INSURANCE PROVIDER: ${this.selections.insurance?.toUpperCase() || 'N/A'}`,
      '',
      '--- STARTING RESOURCES ---',
      `HEALTH: ${gameState.resources.health}%`,
      `SAVINGS: $${gameState.resources.money.toLocaleString()}`,
      `COVERAGE: ${gameState.resources.coverage}%`,
      `HOPE: ${gameState.resources.hope}%`,
      `TIME REMAINING: ${gameState.resources.time} days`,
      '',
      gameState.finances.bills.length > 0 ?
        `OUTSTANDING BILLS: $${gameState.finances.totalOwed.toLocaleString()}` : ''
    ];

    let yPos = 185;
    summaryText.forEach(line => {
      if (line) {
        const text = this.add.text(width / 2, yPos, line, {
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          color: line.includes('---') ? '#8B0000' : '#333333'
        }).setOrigin(0.5);
        this.stepContainer.add(text);
      }
      yPos += 26;
    });

    // Warning text
    const warning = this.add.text(width / 2, 520, '>>> The fight begins. Good luck. You\'ll need it. <<<', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepContainer.add(warning);

    // Begin button
    const beginBtn = this.createButton(width / 2, 580, 'SUBMIT & BEGIN', () => {
      gameState.phase = 'insurance';
      this.scene.start('GameScene');
    });
    this.stepContainer.add(beginBtn);
  }

  createOptionCard(x, y, option, callback) {
    const container = this.add.container(x, y);

    // Form field style
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(-310, -45, 620, 90);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-310, -45, 620, 90);

    // Radio button
    const radio = this.add.text(-280, 0, '○', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#333333'
    }).setOrigin(0.5);

    const icon = this.add.text(-230, 0, option.icon, {
      fontSize: '32px'
    }).setOrigin(0.5);

    const title = this.add.text(-180, -20, option.title.toUpperCase(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const desc = this.add.text(-180, 5, option.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#666666',
      wordWrap: { width: 450 }
    }).setOrigin(0, 0.5);

    const effects = this.add.text(-180, 28, option.effects, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#8B0000'
    }).setOrigin(0, 0.5);

    container.add([bg, radio, icon, title, desc, effects]);
    container.setSize(620, 90);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xffffe0, 1);
      bg.fillRect(-310, -45, 620, 90);
      bg.lineStyle(3, 0x8B0000, 1);
      bg.strokeRect(-310, -45, 620, 90);
      radio.setText('●');
      radio.setColor('#008000');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xffffff, 1);
      bg.fillRect(-310, -45, 620, 90);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-310, -45, 620, 90);
      radio.setText('○');
      radio.setColor('#333333');
    });

    container.on('pointerdown', callback);

    return container;
  }

  createCancerCard(x, y, type, callback) {
    const container = this.add.container(x, y);

    // Medical chart style
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(0, 0, 180, 110);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(0, 0, 180, 110);

    // Header bar
    bg.fillStyle(0x4169e1, 1);
    bg.fillRect(0, 0, 180, 28);

    // Checkbox
    const checkbox = this.add.text(10, 55, '○', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#333333'
    });

    const name = this.add.text(90, 14, type.name.toUpperCase(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const severity = this.add.text(40, 50, `Severity: ${type.severity}x`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: type.severity > 1 ? '#8B0000' : '#006400'
    });

    const cost = this.add.text(40, 75, `Cost Factor: ${type.treatmentCostMultiplier}x`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#333333'
    });

    container.add([bg, checkbox, name, severity, cost]);
    container.setSize(180, 110);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xffffe0, 1);
      bg.fillRect(0, 0, 180, 110);
      bg.lineStyle(3, 0x8B0000, 1);
      bg.strokeRect(0, 0, 180, 110);
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(0, 0, 180, 28);
      checkbox.setText('●');
      checkbox.setColor('#008000');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xffffff, 1);
      bg.fillRect(0, 0, 180, 110);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(0, 0, 180, 110);
      bg.fillStyle(0x4169e1, 1);
      bg.fillRect(0, 0, 180, 28);
      checkbox.setText('○');
      checkbox.setColor('#333333');
    });

    container.on('pointerdown', callback);

    return container;
  }

  createInsuranceCard(x, y, provider, callback) {
    const container = this.add.container(x, y);

    // Insurance card style
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(-125, -38, 250, 76);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-125, -38, 250, 76);

    // Company color stripe
    const stripeColor = provider.name === 'None' ? 0x666666 : 0x003366;
    bg.fillStyle(stripeColor, 1);
    bg.fillRect(-125, -38, 250, 22);

    // Checkbox
    const checkbox = this.add.text(-105, 8, '○', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#333333'
    });

    const name = this.add.text(0, -27, provider.name.toUpperCase(), {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const slogan = this.add.text(-80, 10, provider.slogan, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#666666',
      fontStyle: 'italic'
    });

    container.add([bg, checkbox, name, slogan]);
    container.setSize(250, 76);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xffffe0, 1);
      bg.fillRect(-125, -38, 250, 76);
      bg.lineStyle(3, 0x8B0000, 1);
      bg.strokeRect(-125, -38, 250, 76);
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(-125, -38, 250, 22);
      checkbox.setText('●');
      checkbox.setColor('#008000');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xffffff, 1);
      bg.fillRect(-125, -38, 250, 76);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-125, -38, 250, 76);
      bg.fillStyle(stripeColor, 1);
      bg.fillRect(-125, -38, 250, 22);
      checkbox.setText('○');
      checkbox.setColor('#333333');
    });

    container.on('pointerdown', callback);

    return container;
  }

  createButton(x, y, text, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x8B0000, 1);
    bg.fillRect(-130, -25, 260, 50);
    bg.lineStyle(3, 0x333333, 1);
    bg.strokeRect(-130, -25, 260, 50);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(260, 50);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xcc0000, 1);
      bg.fillRect(-130, -25, 260, 50);
      bg.lineStyle(3, 0x333333, 1);
      bg.strokeRect(-130, -25, 260, 50);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(-130, -25, 260, 50);
      bg.lineStyle(3, 0x333333, 1);
      bg.strokeRect(-130, -25, 260, 50);
    });

    container.on('pointerdown', callback);

    return container;
  }
}
