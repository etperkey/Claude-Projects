import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';
import { DarkHumorSystem } from '../systems/DarkHumorSystem.js';

export default class ResearchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResearchScene' });
  }

  init() {
    this.gameState = this.registry.get('gameState');
    this.tooltip = null; // Reset tooltip reference

    // Safety check - if no gameState, go back to menu
    if (!this.gameState) {
      console.error('No gameState found, returning to menu');
      this.scene.start('MenuScene');
      return;
    }
  }

  create() {
    try {
      // Double check gameState exists
      if (!this.gameState) {
        console.error('gameState is null in ResearchScene create');
        this.scene.start('MenuScene');
        return;
      }

      const { width, height } = this.cameras.main;

      // Dark overlay
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

      // Main panel
      this.add.rectangle(width / 2, height / 2, 1000, 600, 0x1a1a2e, 0.98)
        .setStrokeStyle(3, 0x4ecdc4);

      // Title (with satirical subtitle)
      this.add.text(width / 2, 90, 'RESEARCH TREE', {
        fontFamily: 'Arial Black',
        fontSize: '36px',
        color: '#4ecdc4'
      }).setOrigin(0.5);

      this.add.text(width / 2, 125, '"Pending Congressional Approval"', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ff6b6b',
        fontStyle: 'italic'
      }).setOrigin(0.5);

      // Research points display
      this.add.image(width / 2 - 80, 150, 'research_point').setScale(1.5);
      this.rpText = this.add.text(width / 2 - 55, 142, `${this.gameState.researchPoints}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#a55eea',
        fontStyle: 'bold'
      });

      // Create research branches
      this.createResearchBranches(width, height);

      // Close button
      this.createCloseButton(width, height);
    } catch (error) {
      console.error('ResearchScene create error:', error);
      this.scene.start('LabScene');
    }
  }

  createResearchBranches(width, height) {
    // Satirical research descriptions
    const satiricalDescriptions = {
      'Cell Culture': 'Growing cells in dishes (Congress thinks we\'re making soup)',
      'Molecular Biology': 'Too small for senators to see, therefore suspicious',
      'Genomics': '"Basically just reading letters" - actual congressional quote',
      'Synthetic Biology': 'Playing God (pending regulatory approval)',
      'Analytical Chemistry': 'Measuring things politicians don\'t understand',
      'Organic Synthesis': 'Making molecules that already exist in nature (somehow evil)',
      'Mass Spectrometry': 'Very expensive scale (auditors hate this one)',
      'Medicinal Chemistry': 'Drug discovery (the legal kind, we promise)',
      'Classical Mechanics': 'Old science, therefore trustworthy to boomers',
      'Quantum Mechanics': 'Spooky action at a distance (defunded for being scary)',
      'Nuclear Physics': 'Not for weapons (please don\'t audit us)',
      'Particle Physics': 'Finding particles nobody asked for since 1964',
      'Lab Automation': 'Robots doing your job (RIF incoming)',
      'Robotics': 'Teaching machines to replace postdocs',
      'Machine Learning': 'Required buzzword for any grant application',
      'Quantum Computing': 'The word "quantum" adds $1M to any budget'
    };

    const branches = [
      {
        key: 'biology',
        name: 'Biology',
        color: 0x4ecdc4,
        icon: 'icon_biology',
        x: width / 2 - 350,
        nodes: [
          { name: 'Cell Culture', cost: 50, unlock: 'centrifuge', desc: satiricalDescriptions['Cell Culture'] },
          { name: 'Molecular Biology', cost: 150, unlock: 'pcr', desc: satiricalDescriptions['Molecular Biology'] },
          { name: 'Genomics', cost: 400, unlock: 'sequencer', desc: satiricalDescriptions['Genomics'] },
          { name: 'Synthetic Biology', cost: 1000, unlock: null, desc: satiricalDescriptions['Synthetic Biology'] }
        ]
      },
      {
        key: 'chemistry',
        name: 'Chemistry',
        color: 0xff6b6b,
        icon: 'icon_chemistry',
        x: width / 2 - 120,
        nodes: [
          { name: 'Analytical Chemistry', cost: 50, unlock: null, desc: satiricalDescriptions['Analytical Chemistry'] },
          { name: 'Organic Synthesis', cost: 150, unlock: null, desc: satiricalDescriptions['Organic Synthesis'] },
          { name: 'Mass Spectrometry', cost: 400, unlock: 'spectrometer', desc: satiricalDescriptions['Mass Spectrometry'] },
          { name: 'Medicinal Chemistry', cost: 1000, unlock: null, desc: satiricalDescriptions['Medicinal Chemistry'] }
        ]
      },
      {
        key: 'physics',
        name: 'Physics',
        color: 0xffd93d,
        icon: 'icon_physics',
        x: width / 2 + 120,
        nodes: [
          { name: 'Classical Mechanics', cost: 50, unlock: null, desc: satiricalDescriptions['Classical Mechanics'] },
          { name: 'Quantum Mechanics', cost: 150, unlock: null, desc: satiricalDescriptions['Quantum Mechanics'] },
          { name: 'Nuclear Physics', cost: 400, unlock: null, desc: satiricalDescriptions['Nuclear Physics'] },
          { name: 'Particle Physics', cost: 1000, unlock: 'accelerator', desc: satiricalDescriptions['Particle Physics'] }
        ]
      },
      {
        key: 'engineering',
        name: 'Engineering',
        color: 0x95e1d3,
        icon: 'icon_engineering',
        x: width / 2 + 350,
        nodes: [
          { name: 'Lab Automation', cost: 50, unlock: null, desc: satiricalDescriptions['Lab Automation'] },
          { name: 'Robotics', cost: 150, unlock: null, desc: satiricalDescriptions['Robotics'] },
          { name: 'Machine Learning', cost: 400, unlock: null, desc: satiricalDescriptions['Machine Learning'] },
          { name: 'Quantum Computing', cost: 1000, unlock: null, desc: satiricalDescriptions['Quantum Computing'] }
        ]
      }
    ];

    branches.forEach(branch => {
      // Branch header
      this.add.image(branch.x, 200, branch.icon).setScale(1.2);
      this.add.text(branch.x, 240, branch.name, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const currentLevel = this.gameState.research[branch.key].level;

      // Research nodes
      branch.nodes.forEach((node, i) => {
        const y = 300 + i * 80;
        const unlocked = i <= currentLevel;
        const canResearch = i === currentLevel && this.gameState.researchPoints >= node.cost;
        const completed = i < currentLevel;

        // Node background
        const nodeColor = completed ? branch.color : (unlocked ? 0x3d4a5a : 0x2d3a4a);
        const nodeRect = this.add.rectangle(branch.x, y, 180, 60, nodeColor, 0.8)
          .setStrokeStyle(2, unlocked ? branch.color : 0x555555)
          .setInteractive();

        // Node name
        this.add.text(branch.x, y - 12, node.name, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: unlocked ? '#ffffff' : '#666666'
        }).setOrigin(0.5);

        // Tooltip on hover (satirical description)
        nodeRect.on('pointerover', () => {
          if (!this.tooltip) {
            this.tooltip = this.add.text(width / 2, height - 85, node.desc || '', {
              fontFamily: 'Arial',
              fontSize: '14px',
              color: '#ffd93d',
              backgroundColor: '#1a1a2e',
              padding: { x: 12, y: 8 }
            }).setOrigin(0.5).setDepth(100);
          } else {
            this.tooltip.setText(node.desc || '');
            this.tooltip.setVisible(true);
          }
        });

        nodeRect.on('pointerout', () => {
          if (this.tooltip) {
            this.tooltip.setVisible(false);
          }
        });

        // Cost or status
        if (completed) {
          this.add.text(branch.x, y + 12, 'Completed', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#4ecdc4'
          }).setOrigin(0.5);
        } else if (unlocked) {
          const costText = this.add.text(branch.x, y + 12, `${node.cost} RP`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: canResearch ? '#a55eea' : '#ff6b6b'
          }).setOrigin(0.5);

          if (canResearch) {
            // Add purchase ability (already interactive from tooltip setup)
            nodeRect.on('pointerover', () => {
              nodeRect.setFillStyle(branch.color, 0.5);
            });
            nodeRect.on('pointerout', () => {
              nodeRect.setFillStyle(nodeColor, 0.8);
            });
            nodeRect.on('pointerdown', () => {
              this.purchaseResearch(branch.key, i, node);
            });
          }
        } else {
          this.add.text(branch.x, y + 12, 'Locked', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#666666'
          }).setOrigin(0.5);
        }

        // Unlock indicator
        if (node.unlock && !this.gameState.unlockedEquipment.includes(node.unlock)) {
          this.add.text(branch.x + 70, y, '!', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffd93d',
            fontStyle: 'bold'
          }).setOrigin(0.5);
        }
      });

      // Connection lines between nodes
      for (let i = 0; i < branch.nodes.length - 1; i++) {
        const y1 = 300 + i * 80 + 30;
        const y2 = 300 + (i + 1) * 80 - 30;
        const line = this.add.line(0, 0, branch.x, y1, branch.x, y2,
          i < this.gameState.research[branch.key].level ? branch.color : 0x555555);
        line.setLineWidth(2);
      }
    });
  }

  purchaseResearch(branchKey, level, node) {
    if (this.gameState.researchPoints >= node.cost) {
      this.gameState.researchPoints -= node.cost;
      this.gameState.research[branchKey].level = level + 1;
      this.gameState.stats.discoveryCount++;

      // Unlock equipment if applicable
      if (node.unlock && !this.gameState.unlockedEquipment.includes(node.unlock)) {
        this.gameState.unlockedEquipment.push(node.unlock);
        audioSystem.playResearchUnlock();
        this.showUnlockNotification(node.unlock);
      } else {
        audioSystem.playPurchase();
      }

      // Refresh scene
      this.scene.restart();
    }
  }

  showUnlockNotification(equipmentType) {
    const { width, height } = this.cameras.main;
    const names = {
      microscope: 'Fluorescence Microscope',
      centrifuge: 'Eppendorf Centrifuge',
      computer: 'Analysis Workstation',
      pcr: 'PCR Thermal Cycler',
      sequencer: 'Illumina DNA Sequencer',
      spectrometer: 'Mass Spectrometer',
      accelerator: 'Particle Accelerator'
    };

    const notification = this.add.text(width / 2, height - 100, `Unlocked: ${names[equipmentType]}!`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffd93d',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      y: height - 130,
      alpha: 0,
      duration: 3000,
      onComplete: () => notification.destroy()
    });
  }

  createCloseButton(width, height) {
    const closeBtn = this.add.rectangle(width / 2, height - 60, 150, 45, 0x4ecdc4)
      .setInteractive();

    this.add.text(width / 2, height - 60, 'Close', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeBtn.on('pointerover', () => {
      closeBtn.setFillStyle(0x3dbdb5);
      audioSystem.playHover();
    });
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x4ecdc4));
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.scene.start('LabScene');
    });
  }
}
