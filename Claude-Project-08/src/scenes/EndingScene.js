// EndingScene - Multiple endings based on player outcomes

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import ContentData from '../systems/ContentData.js';

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Get ending data
    const endingKey = gameState.ending || 'system_wins';
    const ending = ContentData.endings[endingKey] || ContentData.endings.system_wins;

    // Background based on ending
    this.createBackground(ending.color);

    // Ending content
    this.createEndingContent(ending);

    // Statistics
    this.createStatistics();

    // Buttons
    this.createButtons();
  }

  createBackground(color) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Dark bureaucratic background
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(0, 0, width, height);

    // Scattered faded papers
    graphics.fillStyle(0x333333, 0.3);
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * width - 50;
      const y = Math.random() * height - 30;
      graphics.fillRect(x, y, 70 + Math.random() * 30, 90 + Math.random() * 40);
    }

    // Subtle grid
    graphics.lineStyle(1, 0x333333, 0.2);
    for (let y = 0; y < height; y += 25) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  createEndingContent(ending) {
    const width = this.cameras.main.width;

    // "THE END" or similar
    this.add.text(width / 2, 80, 'CASE CLOSED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Ending title
    this.add.text(width / 2, 140, ending.title, {
      fontFamily: 'Impact, sans-serif',
      fontSize: '38px',
      color: ending.color,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    this.add.text(width / 2, 220, ending.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#cccccc',
      wordWrap: { width: 700 },
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);

    // Horizontal line
    const line = this.add.graphics();
    line.lineStyle(2, 0x8B0000, 1);
    line.lineBetween(width / 2 - 200, 290, width / 2 + 200, 290);
  }

  createStatistics() {
    const width = this.cameras.main.width;

    this.add.text(width / 2, 320, 'YOUR JOURNEY', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Calculate stats
    const stats = [
      { label: 'Days Survived', value: gameState.day },
      { label: 'Final Health', value: `${Math.round(gameState.resources.health)}%` },
      { label: 'Final Savings', value: `$${gameState.resources.money.toLocaleString()}` },
      { label: 'Total Debt Incurred', value: `$${gameState.finances.totalOwed.toLocaleString()}` },
      { label: 'Prior Auths Denied', value: gameState.insurance.priorAuthsDenied.length },
      { label: 'Prior Auths Approved', value: gameState.insurance.priorAuthsApproved.length },
      { label: 'Collection Calls Received', value: gameState.finances.collectionCalls },
      { label: 'Treatments Received', value: gameState.treatment.chemoCompleted +
          (gameState.treatment.surgeryCompleted ? 1 : 0) +
          gameState.treatment.radiationCompleted }
    ];

    // Display in two columns
    const col1X = width / 2 - 180;
    const col2X = width / 2 + 20;
    let y = 360;

    stats.forEach((stat, index) => {
      const x = index % 2 === 0 ? col1X : col2X;
      if (index % 2 === 0 && index > 0) y += 35;

      this.add.text(x, y, `${stat.label}:`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#888888'
      });

      this.add.text(x + 160, y, String(stat.value), {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
    });

    // Final message based on ending
    const messages = {
      remission_bankruptcy: 'You survived, but at what cost? This is the reality for millions of Americans.',
      death_by_denial: 'Insurance delays kill 45,000 Americans annually. You were one of them.',
      medical_tourism: 'Americans spend $11 billion annually on medical tourism. The system pushed you out.',
      american_dream: 'Less than 1% of cancer patients have this experience. You got incredibly lucky.',
      activist: 'Your rage might change the system. Or it might not. But at least you\'re fighting.',
      system_wins: 'The bureaucracy is designed to exhaust you into giving up. It worked.',
      against_all_odds: 'You beat the odds. Very few manage this. The system is still broken.',
      time_ran_out: 'Prior authorization delays contribute to 30% of cancer deaths.'
    };

    const finalMessage = messages[gameState.ending] || messages.system_wins;

    this.add.text(width / 2, 540, finalMessage, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#f39c12',
      fontStyle: 'italic',
      wordWrap: { width: 600 },
      align: 'center'
    }).setOrigin(0.5);

    // Real statistics
    this.add.text(width / 2, 600, 'REAL STATISTICS:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const realStats = [
      '67% of US bankruptcies are medical-related',
      '100 million Americans have medical debt',
      'US spends $4.5 trillion on healthcare with worst outcomes in developed world',
      'Insurance companies deny 17% of claims; some deny up to 80%'
    ];

    let statY = 625;
    realStats.forEach(stat => {
      this.add.text(width / 2, statY, `• ${stat}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#888888'
      }).setOrigin(0.5);
      statY += 18;
    });
  }

  createButtons() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Try again button
    this.createButton(width / 2 - 100, height - 50, 'NEW GAME', () => {
      gameState.reset();
      gameState.deleteSave();
      this.scene.start('MenuScene');
    });

    // Main menu button
    this.createButton(width / 2 + 100, height - 50, 'MAIN MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  createButton(x, y, text, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(-70, -20, 140, 40);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-70, -20, 140, 40);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(140, 40);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(-70, -20, 140, 40);
      this.input.setDefaultCursor('pointer');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(-70, -20, 140, 40);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-70, -20, 140, 40);
      this.input.setDefaultCursor('default');
    });

    container.on('pointerdown', callback);

    return container;
  }
}
