// TreatmentScene - Hospital visits, chemo, surgery

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import insuranceSystem from '../systems/InsuranceSystem.js';
import ContentData from '../systems/ContentData.js';

export default class TreatmentScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TreatmentScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background - hospital aesthetic
    this.createBackground();

    // Title
    this.add.text(width / 2, 30, 'MEMORIAL GENERAL HOSPITAL', {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 60, 'Oncology Department', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#666666'
    }).setOrigin(0.5);

    // Main panels
    this.createTreatmentStatusPanel();
    this.createAvailableTreatmentsPanel();
    this.createDoctorPanel();

    // Back button
    this.createBackButton();
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

  createTreatmentStatusPanel() {
    const panelX = 20;
    const panelY = 90;
    const panelWidth = 300;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 250);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 250);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'TREATMENT STATUS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const treatment = gameState.treatment;

    const stats = [
      `Oncologist: ${treatment.oncologist || 'Not assigned'}`,
      `Treatment Plan: ${treatment.treatmentPlan || 'None'}`,
      '',
      `Chemo Sessions: ${treatment.chemoCompleted}/${treatment.chemoCycles || 0}`,
      `Surgery: ${treatment.surgeryCompleted ? 'Complete' : treatment.surgeryScheduled ? 'Scheduled' : 'Not scheduled'}`,
      `Radiation: ${treatment.radiationCompleted}/${treatment.radiationSessions || 0}`,
      '',
      `Health: ${gameState.resources.health}%`,
      `Time Remaining: ${gameState.resources.time} days`
    ];

    let yOffset = 50;
    stats.forEach(stat => {
      if (stat) {
        this.add.text(panelX + 15, panelY + yOffset, stat, {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: stat.includes('Health') && gameState.resources.health < 30 ? '#8B0000' : '#1a1a1a'
        });
      }
      yOffset += 22;
    });
  }

  createAvailableTreatmentsPanel() {
    const panelX = 340;
    const panelY = 90;
    const panelWidth = 350;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 450);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 450);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'AVAILABLE TREATMENTS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const treatments = ContentData.treatments;

    let yOffset = 50;
    treatments.forEach(treatment => {
      // Check if approved by insurance
      const isApproved = gameState.insurance.priorAuthsApproved.some(
        p => p.treatment === treatment.name
      );
      const isPending = gameState.insurance.priorAuthsPending.some(
        p => p.treatment === treatment.name
      );

      this.createTreatmentCard(panelX + 15, panelY + yOffset, panelWidth - 30, treatment, isApproved, isPending);
      yOffset += 80;
    });
  }

  createTreatmentCard(x, y, width, treatment, isApproved, isPending) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    let bgColor = isApproved ? 0xd4edda : isPending ? 0xfff3cd : 0xf8d7da;
    let borderColor = isApproved ? 0x28a745 : isPending ? 0xffc107 : 0x8B0000;

    bg.fillStyle(bgColor, 1);
    bg.fillRect(0, 0, width, 70);
    bg.lineStyle(1, borderColor, 1);
    bg.strokeRect(0, 0, width, 70);

    // Treatment name
    const name = this.add.text(10, 8, treatment.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    });

    // Stats
    const stats = this.add.text(10, 28,
      `Health: +${treatment.healthGain} | Sessions: ${treatment.sessions} | Time: ${treatment.timeCost} days`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#666666'
    });

    // Cost
    const patientCost = insuranceSystem.calculatePatientCost(treatment.cost, true);
    const costText = this.add.text(10, 48,
      isApproved ?
        `Your cost: $${patientCost.toLocaleString()} (Insurance covers rest)` :
        isPending ?
          'Awaiting prior authorization...' :
          `Full cost: $${treatment.cost.toLocaleString()} (Not approved)`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: isApproved ? '#155724' : isPending ? '#856404' : '#8B0000'
    });

    container.add([bg, name, stats, costText]);

    // Start treatment button (only if approved)
    if (isApproved) {
      const startBtn = this.add.text(width - 10, 35, 'START →', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#28a745',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

      startBtn.on('pointerover', () => startBtn.setColor('#1e7e34'));
      startBtn.on('pointerout', () => startBtn.setColor('#28a745'));
      startBtn.on('pointerdown', () => this.startTreatment(treatment));

      container.add(startBtn);
    }

    return container;
  }

  startTreatment(treatment) {
    // Calculate patient cost
    const patientCost = insuranceSystem.calculatePatientCost(treatment.cost, true);

    // Check if patient can afford
    if (gameState.resources.money < patientCost) {
      this.showMessage('Insufficient funds. Visit billing to discuss payment options.', '#dc3545');
      return;
    }

    // Apply treatment
    gameState.modifyMoney(-patientCost, `Treatment: ${treatment.name}`);
    gameState.modifyHealth(treatment.healthGain, `Treatment: ${treatment.name}`);
    gameState.modifyHope(treatment.hopeCost, `Treatment side effects`);
    gameState.advanceDay(treatment.timeCost);

    // Update treatment tracking
    if (treatment.name.includes('Chemo')) {
      gameState.treatment.chemoCycles = treatment.sessions;
      gameState.treatment.chemoCompleted++;
      gameState.treatment.treatmentPlan = 'Chemotherapy';
    } else if (treatment.name.includes('Surgery')) {
      gameState.treatment.surgeryCompleted = true;
      gameState.treatment.treatmentPlan = 'Surgery';
    } else if (treatment.name.includes('Radiation')) {
      gameState.treatment.radiationSessions = treatment.sessions;
      gameState.treatment.radiationCompleted++;
      gameState.treatment.treatmentPlan = 'Radiation';
    } else if (treatment.name.includes('Immuno')) {
      gameState.treatment.treatmentPlan = 'Immunotherapy';
    }

    // Add bill for the treatment
    gameState.addBill(`${treatment.name} - Patient Responsibility`, patientCost);

    // Show treatment result
    this.showTreatmentResult(treatment, patientCost);
  }

  showTreatmentResult(treatment, cost) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Track all elements for cleanup
    const popupElements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    popupElements.push(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 150, 400, 300);
    panel.lineStyle(3, 0x333333, 1);
    panel.strokeRect(width / 2 - 200, height / 2 - 150, 400, 300);
    panel.fillStyle(0x28a745, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 150, 400, 45);
    panel.setDepth(101);
    popupElements.push(panel);

    const title = this.add.text(width / 2, height / 2 - 128, 'TREATMENT COMPLETE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(title);

    const details = this.add.text(width / 2, height / 2 - 30, [
      `Treatment: ${treatment.name}`,
      '',
      `Health Gained: +${treatment.healthGain}`,
      `Time Spent: ${treatment.timeCost} days`,
      `Cost Billed: $${cost.toLocaleString()}`,
      '',
      `Current Health: ${Math.round(gameState.resources.health)}%`,
      `Days Remaining: ${gameState.resources.time}`
    ].join('\n'), {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#1a1a1a',
      align: 'center'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(details);

    // Continue button
    const continueBtn = this.add.container(width / 2, height / 2 + 100);
    continueBtn.setDepth(102);
    popupElements.push(continueBtn);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a1a, 1);
    btnBg.fillRect(-60, -20, 120, 40);
    btnBg.lineStyle(2, 0x333333, 1);
    btnBg.strokeRect(-60, -20, 120, 40);

    const btnLabel = this.add.text(0, 0, 'CONTINUE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    continueBtn.add([btnBg, btnLabel]);
    continueBtn.setSize(120, 40);
    continueBtn.setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x8B0000, 1);
      btnBg.fillRect(-60, -20, 120, 40);
    });

    continueBtn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a1a, 1);
      btnBg.fillRect(-60, -20, 120, 40);
      btnBg.lineStyle(2, 0x333333, 1);
      btnBg.strokeRect(-60, -20, 120, 40);
    });

    continueBtn.on('pointerdown', () => {
      popupElements.forEach(el => el.destroy());
      this.scene.restart();
    });
  }

  showMessage(message, color) {
    const width = this.cameras.main.width;

    const msg = this.add.text(width / 2, 650, message, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: color,
      backgroundColor: '#fefefe',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      duration: 3000,
      onComplete: () => msg.destroy()
    });
  }

  createDoctorPanel() {
    const panelX = 710;
    const panelY = 90;
    const panelWidth = 294;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 250);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 250);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'YOUR ONCOLOGIST', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    if (!gameState.treatment.oncologist) {
      gameState.treatment.oncologist = 'Dr. Sarah Chen';
      gameState.treatment.oncologistInNetwork = true;
    }

    // Doctor info
    this.add.text(panelX + 15, panelY + 50, gameState.treatment.oncologist, {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    });

    this.add.text(panelX + 15, panelY + 75, 'Board Certified Oncologist', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#666666'
    });

    const networkStatus = gameState.treatment.oncologistInNetwork ?
      '✓ In-Network' : '✗ Out-of-Network';
    const networkColor = gameState.treatment.oncologistInNetwork ?
      '#28a745' : '#8B0000';

    this.add.text(panelX + 15, panelY + 100, networkStatus, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: networkColor
    });

    // Doctor quote
    this.add.text(panelX + 15, panelY + 140,
      '"I recommend aggressive treatment.\nUnfortunately, your insurance\nmay not agree."', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#666666',
      fontStyle: 'italic',
      lineSpacing: 5
    });

    // Next appointment
    this.add.text(panelX + 15, panelY + 210, 'Next available: 3 weeks', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#856404'
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
