// InsuranceScene - Prior authorization battles and denials

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import insuranceSystem from '../systems/InsuranceSystem.js';
import ContentData from '../systems/ContentData.js';

export default class InsuranceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InsuranceScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background - sterile corporate office
    this.createBackground();

    // Title
    this.add.text(width / 2, 30, `${gameState.insurance.provider} - Member Services`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Slogan
    this.add.text(width / 2, 60, '"Helping people live healthier lives"', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Main panels
    this.createStatusPanel();
    this.createPriorAuthPanel();
    this.createDenialsPanel();

    // Back button
    this.createBackButton();

    // Hold music indicator
    this.createHoldMusicIndicator();
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Harsh fluorescent office lighting
    graphics.fillStyle(0xf5f5dc, 1);
    graphics.fillRect(0, 0, width, height);

    // Scattered paper effect
    graphics.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width - 50;
      const y = Math.random() * height - 30;
      graphics.fillRect(x, y, 70 + Math.random() * 30, 90 + Math.random() * 40);
    }

    // Grid lines like ruled paper
    graphics.lineStyle(1, 0xadd8e6, 0.15);
    for (let y = 0; y < height; y += 25) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  createStatusPanel() {
    const panelX = 20;
    const panelY = 90;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, 300, 200);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, 300, 200);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, 300, 35);

    this.add.text(panelX + 15, panelY + 10, 'YOUR COVERAGE STATUS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const stats = [
      `Plan: ${gameState.insurance.plan}`,
      `Deductible: $${gameState.insurance.deductible.toLocaleString()}`,
      `Deductible Met: $${gameState.insurance.deductibleMet.toLocaleString()}`,
      `Out-of-Pocket Max: $${gameState.insurance.maxOutOfPocket.toLocaleString()}`,
      `OOP Spent: $${gameState.insurance.outOfPocketSpent.toLocaleString()}`,
      `Coverage Level: ${gameState.resources.coverage}%`
    ];

    let yOffset = 50;
    stats.forEach(stat => {
      this.add.text(panelX + 15, panelY + yOffset, stat, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#1a1a1a'
      });
      yOffset += 25;
    });
  }

  createPriorAuthPanel() {
    const panelX = 340;
    const panelY = 90;
    const panelWidth = 330;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 300);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 300);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'SUBMIT PRIOR AUTHORIZATION', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Treatment options to request auth for
    const treatments = ContentData.treatments;

    let yOffset = 50;
    treatments.forEach(treatment => {
      // Check if already pending or approved
      const isPending = gameState.insurance.priorAuthsPending.some(
        p => p.treatment === treatment.name
      );
      const isApproved = gameState.insurance.priorAuthsApproved.some(
        p => p.treatment === treatment.name
      );

      const btn = this.createTreatmentButton(
        panelX + 15,
        panelY + yOffset,
        panelWidth - 30,
        treatment,
        isPending,
        isApproved
      );
      yOffset += 50;
    });
  }

  createTreatmentButton(x, y, width, treatment, isPending, isApproved) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();

    let bgColor = 0xf8f8f8;
    let borderColor = 0x333333;
    let textColor = '#1a1a1a';
    let statusText = `$${treatment.cost.toLocaleString()}`;

    if (isPending) {
      bgColor = 0xfff3cd;
      borderColor = 0xffc107;
      statusText = 'PENDING';
    } else if (isApproved) {
      bgColor = 0xd4edda;
      borderColor = 0x28a745;
      statusText = 'APPROVED';
    }

    bg.fillStyle(bgColor, 1);
    bg.fillRect(0, 0, width, 42);
    bg.lineStyle(1, borderColor, 1);
    bg.strokeRect(0, 0, width, 42);

    const name = this.add.text(10, 12, treatment.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: textColor
    });

    const status = this.add.text(width - 10, 12, statusText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: isPending ? '#856404' : isApproved ? '#155724' : '#666666'
    }).setOrigin(1, 0);

    container.add([bg, name, status]);

    if (!isPending && !isApproved) {
      container.setSize(width, 42);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0xffffe0, 1);
        bg.fillRect(0, 0, width, 42);
        bg.lineStyle(2, 0x8B0000, 1);
        bg.strokeRect(0, 0, width, 42);
        this.input.setDefaultCursor('pointer');
      });

      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0xf8f8f8, 1);
        bg.fillRect(0, 0, width, 42);
        bg.lineStyle(1, 0x333333, 1);
        bg.strokeRect(0, 0, width, 42);
        this.input.setDefaultCursor('default');
      });

      container.on('pointerdown', () => {
        this.submitPriorAuth(treatment);
      });
    }

    return container;
  }

  submitPriorAuth(treatment) {
    insuranceSystem.submitPriorAuth(treatment);

    // Hope cost for dealing with paperwork
    gameState.modifyHope(-5, 'Filing prior authorization paperwork');

    // Advance time (paperwork takes time)
    gameState.advanceDay(1);

    // Refresh scene
    this.scene.restart();
  }

  createDenialsPanel() {
    const panelX = 690;
    const panelY = 90;
    const panelWidth = 314;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 300);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 300);

    // Header stripe - red for denials
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'DENIED CLAIMS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const denials = gameState.insurance.priorAuthsDenied;

    if (denials.length === 0) {
      this.add.text(panelX + 15, panelY + 50, 'No denials yet.\n\n(Don\'t worry, there will be.)', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#666666',
        fontStyle: 'italic'
      });
    } else {
      let yOffset = 45;
      denials.slice(0, 4).forEach(denial => {
        this.createDenialCard(panelX + 10, panelY + yOffset, panelWidth - 20, denial);
        yOffset += 60;
      });
    }
  }

  createDenialCard(x, y, width, denial) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0xfce4e4, 1);
    bg.fillRect(0, 0, width, 55);
    bg.lineStyle(1, 0x8B0000, 1);
    bg.strokeRect(0, 0, width, 55);

    const name = this.add.text(8, 8, denial.treatment, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#8B0000',
      fontStyle: 'bold'
    });

    const reason = this.add.text(8, 26, denial.denialReason, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#666666',
      wordWrap: { width: width - 70 }
    });

    // Appeal button
    if (denial.appealCount < denial.maxAppeals) {
      const appealBtn = this.add.text(width - 8, 40, `APPEAL (${denial.maxAppeals - denial.appealCount} left)`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#0066cc'
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

      appealBtn.on('pointerover', () => appealBtn.setColor('#003366'));
      appealBtn.on('pointerout', () => appealBtn.setColor('#0066cc'));
      appealBtn.on('pointerdown', () => {
        insuranceSystem.appealDenial(denial.id);
        this.scene.restart();
      });

      container.add(appealBtn);
    }

    container.add([bg, name, reason]);
    return container;
  }

  createHoldMusicIndicator() {
    const width = this.cameras.main.width;

    // Hold time tracker
    const holdTime = Math.floor(Math.random() * 45) + 15;

    const holdPanel = this.add.container(width / 2, 680);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.95);
    bg.fillRect(-250, -30, 500, 60);
    bg.lineStyle(2, 0x8B0000, 1);
    bg.strokeRect(-250, -30, 500, 60);

    const icon = this.add.text(-220, 0, '📞', { fontSize: '24px' }).setOrigin(0.5);

    const text = this.add.text(-180, -8, `Current hold time: ${holdTime} minutes`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#ffffff'
    });

    const subtext = this.add.text(-180, 12, 'Your call is important to us. Please stay on the line.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#888888',
      fontStyle: 'italic'
    });

    holdPanel.add([bg, icon, text, subtext]);

    // Pulsing animation
    this.tweens.add({
      targets: icon,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  createBackButton() {
    const backBtn = this.add.container(80, 740);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(-60, -20, 120, 40);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-60, -20, 120, 40);

    const label = this.add.text(0, 0, '← BACK', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    backBtn.add([bg, label]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(-60, -20, 120, 40);
      this.input.setDefaultCursor('pointer');
    });

    backBtn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(-60, -20, 120, 40);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-60, -20, 120, 40);
      this.input.setDefaultCursor('default');
    });

    backBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
