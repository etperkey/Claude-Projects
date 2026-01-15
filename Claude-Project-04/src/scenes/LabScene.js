import Phaser from 'phaser';
import Scientist from '../objects/Scientist.js';
import Equipment from '../objects/Equipment.js';
import { audioSystem } from '../systems/AudioSystem.js';
import { DarkHumorSystem } from '../systems/DarkHumorSystem.js';

export default class LabScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LabScene' });
    this.scientists = [];
    this.equipment = [];
    this.selectedScientist = null;
    this.equipmentSlots = [];
    this.newsTickerText = null;
    this.crisisActive = false;
    this.timeEvents = []; // Track time events for cleanup
    this.shopOpen = false; // Track if shop popup is open
    this.shopElements = []; // Track shop elements for cleanup
  }

  create() {
    try {
      this.gameState = this.registry.get('gameState');

      // Safety check - if no gameState, go back to menu
      if (!this.gameState) {
        console.error('No gameState found, returning to menu');
        this.scene.start('MenuScene');
        return;
      }

      const { width, height } = this.cameras.main;

      // Reset all state on create for clean initialization
      this.scientists = [];
      this.equipment = [];
      this.equipmentSlots = [];
      this.selectedScientist = null;
      this.crisisActive = false;
      this.newsTickerText = null;
      this.timeEvents = [];
      this.shopOpen = false;
      this.shopElements = [];

      // Create lab floor
      this.createLabFloor(width, height);

      // Create equipment slots
      this.createEquipmentSlots();

      // Create UI
      this.createUI(width, height);

      // Load existing scientists and equipment
      this.loadGameObjects();

      // Update UI after loading (to show correct counts)
      this.updateUI();

      // Start game loop - store reference for cleanup
      const gameLoopEvent = this.time.addEvent({
        delay: 1000,
        callback: this.gameLoop,
        callbackScope: this,
        loop: true
      });
      this.timeEvents.push(gameLoopEvent);

      // Auto-save every 30 seconds
      const autoSaveEvent = this.time.addEvent({
        delay: 30000,
        callback: this.saveGame,
        callbackScope: this,
        loop: true
      });
      this.timeEvents.push(autoSaveEvent);

      // Input handling
      this.input.on('pointerdown', this.handleClick, this);

      // Clean up when scene shuts down
      this.events.once('shutdown', this.onShutdown, this);

      // Setup dark humor news ticker
      this.setupNewsTicker(width, height);

      // Random crisis events (every 45-90 seconds)
      const crisisEvent = this.time.addEvent({
        delay: Phaser.Math.Between(45000, 90000),
        callback: this.triggerRandomCrisis,
        callbackScope: this,
        loop: true
      });
      this.timeEvents.push(crisisEvent);

      // News ticker update (every 10 seconds)
      const tickerEvent = this.time.addEvent({
        delay: 10000,
        callback: this.updateNewsTicker,
        callbackScope: this,
        loop: true
      });
      this.timeEvents.push(tickerEvent);
    } catch (error) {
      console.error('LabScene create error:', error);
      this.scene.start('MenuScene');
    }
  }

  onShutdown() {
    try {
      // Clean up all time events
      if (this.timeEvents) {
        this.timeEvents.forEach(event => {
          if (event) event.destroy();
        });
        this.timeEvents = [];
      }

      // Clean up shop elements if shop is open
      if (this.shopElements && this.shopElements.length > 0) {
        this.shopElements.forEach(el => {
          if (el && el.destroy) el.destroy();
        });
        this.shopElements = [];
        this.shopOpen = false;
      }

      // Explicitly destroy all equipment (triggers their cleanup)
      if (this.equipment) {
        this.equipment.forEach(equip => {
          if (equip && equip.destroy) equip.destroy();
        });
        this.equipment = [];
      }

      // Explicitly destroy all scientists (triggers their cleanup)
      if (this.scientists) {
        this.scientists.forEach(sci => {
          if (sci && sci.destroy) sci.destroy();
        });
        this.scientists = [];
      }

      // Stop all tweens
      this.tweens.killAll();

      // Clean up event listeners
      this.input.off('pointerdown', this.handleClick, this);
    } catch (error) {
      console.error('LabScene shutdown error:', error);
    }
  }

  // Properly launch overlay scenes using start() for reliable initialization
  launchOverlay(sceneKey) {
    try {
      this.saveGame();
      // Use scene.start() which fully stops current scene and starts the new one
      this.scene.start(sceneKey);
    } catch (error) {
      console.error('Error launching overlay:', sceneKey, error);
    }
  }

  createLabFloor(width, height) {
    // Floor tiles
    for (let x = 0; x < width; x += 64) {
      for (let y = 100; y < height - 80; y += 64) {
        this.add.image(x + 32, y + 32, 'floor_tile');
      }
    }

    // Top wall
    for (let x = 0; x < width; x += 64) {
      this.add.image(x + 32, 50, 'wall_tile');
    }
  }

  createEquipmentSlots() {
    const slotPositions = [
      { x: 200, y: 200 },
      { x: 400, y: 200 },
      { x: 600, y: 200 },
      { x: 800, y: 200 },
      { x: 1000, y: 200 },
      { x: 200, y: 350 },
      { x: 400, y: 350 },
      { x: 600, y: 350 },
      { x: 800, y: 350 },
      { x: 1000, y: 350 },
      { x: 200, y: 500 },
      { x: 400, y: 500 },
      { x: 600, y: 500 },
      { x: 800, y: 500 },
      { x: 1000, y: 500 }
    ];

    slotPositions.forEach((pos, index) => {
      const slot = this.add.image(pos.x, pos.y, 'equipment_slot')
        .setInteractive()
        .setData('index', index)
        .setData('occupied', false);

      slot.on('pointerover', () => {
        if (!slot.getData('occupied')) {
          slot.setTexture('equipment_slot_hover');
        }
      });

      slot.on('pointerout', () => {
        if (!slot.getData('occupied')) {
          slot.setTexture('equipment_slot');
        }
      });

      slot.on('pointerdown', () => {
        if (!slot.getData('occupied')) {
          this.showEquipmentShop(slot);
        }
      });

      this.equipmentSlots.push(slot);
    });
  }

  createUI(width, height) {
    // Top bar background
    const topBar = this.add.rectangle(width / 2, 40, width, 80, 0x1a1a2e, 0.95);

    // Funding display
    this.add.image(30, 40, 'coin').setScale(1.2);
    this.fundingText = this.add.text(50, 32, `$${this.gameState.funding.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd93d',
      fontStyle: 'bold'
    });

    // Research points display
    this.add.image(220, 40, 'research_point').setScale(1.2);
    this.researchText = this.add.text(240, 32, `${this.gameState.researchPoints}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#a55eea',
      fontStyle: 'bold'
    });

    // Scientists count
    this.scientistCountText = this.add.text(380, 32, `Scientists: ${this.scientists.length}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    });

    // Menu buttons - use launchOverlay for proper scene management
    this.createMenuButton(width - 510, 40, 'Hire', () => {
      this.launchOverlay('HireScene');
    }, 0x4ecdc4);

    this.createMenuButton(width - 400, 40, 'Academia', () => {
      this.launchOverlay('AcademiaScene');
    }, 0xa55eea);

    this.createMenuButton(width - 290, 40, 'Research', () => {
      this.launchOverlay('ResearchScene');
    }, 0xffd93d);

    this.createMenuButton(width - 175, 40, 'Grants', () => {
      this.showGrantApplication();
    }, 0x95e1d3);

    this.createMenuButton(width - 60, 40, 'Menu', () => {
      this.showMenuConfirmation();
    }, 0xff6b6b);

    // Bottom bar for active experiments
    const bottomBar = this.add.rectangle(width / 2, height - 40, width, 80, 0x1a1a2e, 0.95);
    this.add.text(20, height - 55, 'Active Experiments:', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#4ecdc4'
    });

    this.experimentsContainer = this.add.container(200, height - 40);
  }

  createMenuButton(x, y, text, callback, color = 0x4ecdc4) {
    const btn = this.add.rectangle(x, y, 95, 40, color, 1)
      .setInteractive();

    const btnText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const hoverColor = Phaser.Display.Color.ValueToColor(color).darken(15).color;

    btn.on('pointerover', () => {
      btn.setFillStyle(hoverColor);
      audioSystem.playHover();
    });

    btn.on('pointerout', () => {
      btn.setFillStyle(color);
    });

    btn.on('pointerdown', () => {
      try {
        audioSystem.playClick();
        callback();
      } catch (e) {
        console.error('Button callback error:', e);
      }
    });
  }

  loadGameObjects() {
    // Load saved equipment
    this.gameState.equipment.forEach(equipData => {
      const slot = this.equipmentSlots[equipData.slotIndex];
      if (slot) {
        this.placeEquipment(slot, equipData.type, equipData);
      }
    });

    // Load saved scientists
    this.gameState.scientists.forEach(sciData => {
      this.addScientist(sciData);
    });
  }

  showEquipmentShop(slot) {
    // Prevent opening multiple shops
    if (this.shopOpen) return;
    this.shopOpen = true;
    this.shopElements = [];

    // Create shop panel
    const { width, height } = this.cameras.main;

    // Overlay - blocks clicks on scene below
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive()
      .setDepth(1000);
    this.shopElements.push(overlay);

    // Panel
    const panel = this.add.image(width / 2, height / 2, 'panel').setScale(1.5).setDepth(1001);
    this.shopElements.push(panel);

    // Items array to track popup elements for cleanup
    const items = [];

    // Title (with satirical subtitle)
    const title = this.add.text(width / 2, height / 2 - 165, 'Buy Equipment', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#4ecdc4',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1002);
    this.shopElements.push(title);

    const shopSubtitle = this.add.text(width / 2, height / 2 - 135, '"Depreciate this on your grant budget"', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(1002);
    items.push(shopSubtitle);

    const equipmentTypes = [
      { type: 'microscope', name: 'Fluorescence Microscope', cost: 15000, research: 'biology', desc: 'Zeiss Axio Observer (Why can\'t you just use your phone? - Congress)' },
      { type: 'centrifuge', name: 'Refrigerated Centrifuge', cost: 8000, research: 'biology', desc: 'Eppendorf 5430R (Fancy salad spinner - auditor notes)' },
      { type: 'computer', name: 'Analysis Workstation', cost: 5000, research: 'engineering', desc: 'Dell Precision Tower (Can\'t you just use Excel?)' },
      { type: 'pcr', name: 'PCR Thermal Cycler', cost: 25000, research: 'biology', desc: 'Bio-Rad CFX96 (The thing that apparently caused all the trouble)' },
      { type: 'sequencer', name: 'DNA Sequencer', cost: 100000, research: 'biology', desc: 'Illumina NextSeq 2000 (Too expensive, but you need it anyway)' },
      { type: 'spectrometer', name: 'Mass Spectrometer', cost: 150000, research: 'chemistry', desc: 'Thermo Fisher Orbitrap (Maintenance budget not included... ever)' },
      { type: 'accelerator', name: 'Particle Accelerator', cost: 500000, research: 'physics', desc: 'Compact Linear Collider (Congress asked if it creates black holes)' }
    ];

    equipmentTypes.forEach((equip, i) => {
      const unlocked = this.gameState.unlockedEquipment.includes(equip.type);
      const canAfford = this.gameState.funding >= equip.cost;
      const y = height / 2 - 80 + i * 55;

      // Equipment icon
      const icon = this.add.image(width / 2 - 150, y, unlocked ? equip.type : 'equipment_locked')
        .setScale(0.8).setDepth(1002);

      // Name
      const nameText = this.add.text(width / 2 - 100, y - 10, equip.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: unlocked ? '#ffffff' : '#666666'
      }).setDepth(1002);

      // Cost
      const costText = this.add.text(width / 2 - 100, y + 10, `$${equip.cost.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: canAfford && unlocked ? '#4ecdc4' : '#ff6b6b'
      }).setDepth(1002);

      // Buy button
      if (unlocked) {
        const buyBtn = this.add.rectangle(width / 2 + 120, y, 60, 30, canAfford ? 0x4ecdc4 : 0x666666)
          .setInteractive().setDepth(1002);
        const buyText = this.add.text(width / 2 + 120, y, 'Buy', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#1a1a2e'
        }).setOrigin(0.5).setDepth(1003);

        if (canAfford) {
          buyBtn.on('pointerdown', () => {
            this.buyEquipment(slot, equip);
            this.closeAllShopElements();
          });
        }

        items.push(buyBtn, buyText);
      } else {
        const lockText = this.add.text(width / 2 + 120, y, 'Locked', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#666666'
        }).setOrigin(0.5).setDepth(1002);
        items.push(lockText);
      }

      items.push(icon, nameText, costText);
    });

    // Close button
    const closeBtn = this.add.rectangle(width / 2, height / 2 + 170, 100, 40, 0xff6b6b)
      .setInteractive().setDepth(1002);
    const closeText = this.add.text(width / 2, height / 2 + 170, 'Close', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1003);

    closeBtn.on('pointerdown', () => {
      this.closeAllShopElements();
    });

    items.push(closeBtn, closeText);

    // Add all items to shopElements for cleanup
    items.forEach(item => this.shopElements.push(item));
  }

  closeAllShopElements() {
    this.shopOpen = false;
    if (this.shopElements) {
      this.shopElements.forEach(el => {
        if (el && el.destroy) el.destroy();
      });
      this.shopElements = [];
    }
  }

  closeShop(overlay, panel, title, items) {
    this.shopOpen = false;
    overlay.destroy();
    panel.destroy();
    title.destroy();
    items.forEach(item => {
      if (item && item.destroy) item.destroy();
    });
    this.shopElements = [];
  }

  buyEquipment(slot, equip) {
    if (this.gameState.funding >= equip.cost) {
      this.gameState.funding -= equip.cost;
      this.updateUI();
      this.placeEquipment(slot, equip.type);
      audioSystem.playPurchase();
    }
  }

  placeEquipment(slot, type, existingData = null) {
    const equipData = existingData || {
      type: type,
      slotIndex: slot.getData('index'),
      level: 1,
      condition: 100,
      assignedScientist: null,
      experimentProgress: 0
    };

    const equipment = new Equipment(this, slot.x, slot.y - 10, type, equipData);
    this.equipment.push(equipment);
    slot.setData('occupied', true);
    slot.setData('equipment', equipment);
    slot.setVisible(false);

    if (!existingData) {
      this.gameState.equipment.push(equipData);
    }
  }

  addScientist(sciData = null) {
    const type = sciData?.type || ['biologist', 'chemist', 'physicist', 'engineer'][Phaser.Math.Between(0, 3)];
    const data = sciData || {
      id: Date.now(),
      type: type,
      name: this.generateScientistName(type),
      stats: {
        intelligence: Phaser.Math.Between(50, 100),
        speed: Phaser.Math.Between(50, 100),
        luck: Phaser.Math.Between(50, 100)
      },
      traits: this.generateTraits(),
      level: 1,
      xp: 0,
      morale: 100,
      assigned: null
    };

    // Use saved position if available, otherwise random
    const startX = sciData?.x || Phaser.Math.Between(150, 1100);
    const startY = sciData?.y || Phaser.Math.Between(250, 550);

    const scientist = new Scientist(this, startX, startY, data);
    this.scientists.push(scientist);

    if (!sciData) {
      this.gameState.scientists.push(data);
    }

    this.updateUI();
    return scientist;
  }

  generateScientistName(type) {
    const scientists = {
      biologist: [
        'Dr. Charles Darwin', 'Dr. Gregor Mendel', 'Dr. Rosalind Franklin', 'Dr. Barbara McClintock',
        'Dr. Jennifer Doudna', 'Dr. Jane Goodall', 'Dr. Louis Pasteur', 'Dr. Alexander Fleming'
      ],
      chemist: [
        'Dr. Marie Curie', 'Dr. Linus Pauling', 'Dr. Dorothy Hodgkin', 'Dr. Antoine Lavoisier',
        'Dr. Dmitri Mendeleev', 'Dr. Carolyn Bertozzi', 'Dr. Frances Arnold', 'Dr. Alfred Nobel'
      ],
      physicist: [
        'Dr. Albert Einstein', 'Dr. Isaac Newton', 'Dr. Richard Feynman', 'Dr. Stephen Hawking',
        'Dr. Niels Bohr', 'Dr. Chien-Shiung Wu', 'Dr. Max Planck', 'Dr. Donna Strickland'
      ],
      engineer: [
        'Dr. Nikola Tesla', 'Dr. Grace Hopper', 'Dr. Alan Turing', 'Dr. Claude Shannon',
        'Dr. Katherine Johnson', 'Dr. Margaret Hamilton', 'Dr. Ada Lovelace', 'Dr. Geoffrey Hinton'
      ]
    };
    const typeScientists = scientists[type] || scientists.biologist;
    return typeScientists[Phaser.Math.Between(0, typeScientists.length - 1)];
  }

  generateTraits() {
    const allTraits = [
      { name: 'Night Owl', effect: 'speedBonus', value: 0.2 },
      { name: 'Perfectionist', effect: 'qualityBonus', value: 0.3 },
      { name: 'Quick Learner', effect: 'xpBonus', value: 0.5 },
      { name: 'Lucky', effect: 'luckBonus', value: 0.25 },
      { name: 'Efficient', effect: 'speedBonus', value: 0.15 }
    ];

    const numTraits = Phaser.Math.Between(0, 2);
    const traits = [];
    for (let i = 0; i < numTraits; i++) {
      const trait = allTraits[Phaser.Math.Between(0, allTraits.length - 1)];
      if (!traits.find(t => t.name === trait.name)) {
        traits.push(trait);
      }
    }
    return traits;
  }

  handleClick(pointer) {
    // Check if clicking on a scientist
    for (const scientist of this.scientists) {
      if (scientist.getBounds().contains(pointer.x, pointer.y)) {
        this.selectScientist(scientist);
        return;
      }
    }

    // Check if clicking on equipment with selected scientist
    if (this.selectedScientist) {
      for (const equip of this.equipment) {
        if (equip.getBounds().contains(pointer.x, pointer.y)) {
          this.assignScientistToEquipment(this.selectedScientist, equip);
          return;
        }
      }
      // Clicked elsewhere, deselect
      this.deselectScientist();
    }
  }

  selectScientist(scientist) {
    if (this.selectedScientist) {
      this.selectedScientist.deselect();
    }
    this.selectedScientist = scientist;
    scientist.select();
    audioSystem.playClick();
  }

  deselectScientist() {
    if (this.selectedScientist) {
      this.selectedScientist.deselect();
      this.selectedScientist = null;
    }
  }

  assignScientistToEquipment(scientist, equipment) {
    if (!equipment.data.assignedScientist) {
      scientist.assignTo(equipment);
      equipment.assignScientist(scientist);
      this.deselectScientist();
      audioSystem.playExperimentStart();
    }
  }

  gameLoop() {
    // Update all experiments from scientists
    this.equipment.forEach(equip => {
      if (equip.data.assignedScientist && equip.data.experimentProgress < 100) {
        const scientist = this.scientists.find(s => s.data.id === equip.data.assignedScientist);
        if (scientist) {
          const progressRate = (scientist.data.stats.speed / 100) * (equip.data.level * 0.5 + 0.5);
          equip.data.experimentProgress += progressRate * 2;
          equip.updateProgress();

          if (equip.data.experimentProgress >= 100) {
            this.completeExperiment(scientist, equip);
          }
        }
      }
    });

    // Process academic workers (the real labor force)
    this.processAcademicWorkers();

    // Update game time
    this.gameState.stats.playTime++;

    // Pay monthly stipends (every 30 game seconds = 1 month)
    if (this.gameState.stats.playTime % 30 === 0) {
      this.payStipends();
    }

    // Passive income from grants/discoveries
    const passiveIncome = this.gameState.stats.discoveryCount * 100;
    if (passiveIncome > 0) {
      this.gameState.funding += passiveIncome;
      this.updateUI();
    }
  }

  processAcademicWorkers() {
    if (!this.gameState.academia || this.gameState.academia.length === 0) return;

    const burnoutMessages = [
      'has questioned their life choices.',
      'cried in the bathroom for 20 minutes.',
      'is updating their LinkedIn.',
      'stared at the wall for an hour.',
      'considered becoming a barista.',
      'googled "is it too late to go to law school".',
      'had an existential crisis over failed PCR.',
      'sent a passive-aggressive email to their advisor.'
    ];

    const quitMessages = [
      'finally snapped and left academia forever.',
      'got a job at a tech company making 3x the salary.',
      'decided their mental health was worth more than a PhD.',
      'realized "passion" doesn\'t pay rent.',
      'left to "pursue other opportunities" (escaped).'
    ];

    // Track workers to remove (don't modify array during iteration)
    const workersToRemove = [];

    this.gameState.academia.forEach((worker) => {
      // Increase stress based on worker type
      worker.stress += (worker.stressRate || 1) * 0.5;
      worker.monthsWorked = (worker.monthsWorked || 0) + 1;

      // Decrease hope over time (reality sets in)
      if (worker.stats && worker.stats.hope > 5) {
        worker.stats.hope -= 0.1;
      }

      // Caffeine dependency increases
      if (worker.stats && worker.stats.caffeine < 100) {
        worker.stats.caffeine += 0.05;
      }

      // Generate research points based on productivity and stress
      const stressPenalty = Math.max(0, 1 - (worker.stress / 150));
      const intelligence = worker.stats?.intelligence || 50;
      const productivity = worker.productivity || 0.5;
      const output = productivity * stressPenalty * (intelligence / 100);
      this.gameState.researchPoints += output * 0.5;

      // Check for burnout events
      if (worker.stress > 80 && Math.random() < 0.02) {
        const msg = burnoutMessages[Phaser.Math.Between(0, burnoutMessages.length - 1)];
        this.showDarkHumorNotification(`${worker.name} ${msg}`);
        worker.burnout = (worker.burnout || 0) + 1;
      }

      // Check if worker quits (burnout threshold or hope depleted)
      const hope = worker.stats?.hope || 50;
      if (worker.stress > 100 || hope <= 5) {
        if (Math.random() < 0.1) {
          const msg = quitMessages[Phaser.Math.Between(0, quitMessages.length - 1)];
          this.showDarkHumorNotification(`${worker.name} ${msg}`, 0xff6b6b);
          workersToRemove.push(worker);
          this.gameState.stats.burnouts = (this.gameState.stats.burnouts || 0) + 1;
          this.gameState.stats.dreamsDestroyed = (this.gameState.stats.dreamsDestroyed || 0) + 1;
        }
      }
    });

    // Remove workers after iteration
    workersToRemove.forEach(worker => {
      const index = this.gameState.academia.indexOf(worker);
      if (index > -1) {
        this.gameState.academia.splice(index, 1);
      }
    });
  }

  payStipends() {
    if (!this.gameState.academia) return;

    let totalStipends = 0;
    this.gameState.academia.forEach(worker => {
      totalStipends += worker.stipend;
    });

    if (totalStipends > 0) {
      this.gameState.funding -= totalStipends;
      // Don't show notification for stipends - they're barely worth mentioning
    }
  }

  showDarkHumorNotification(message, color = 0xa55eea) {
    const { width } = this.cameras.main;
    const notification = this.add.text(width / 2, 120, message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#' + color.toString(16).padStart(6, '0'),
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: notification,
      y: 150,
      alpha: 0,
      duration: 4000,
      onComplete: () => notification.destroy()
    });
  }

  setupNewsTicker(width, height) {
    // News ticker background
    this.add.rectangle(width / 2, height - 12, width, 24, 0x0a0a1a, 0.95).setDepth(50);

    // "BREAKING" label
    this.add.rectangle(50, height - 12, 90, 20, 0xff0000).setDepth(51);
    this.add.text(50, height - 12, 'BREAKING', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);

    // News text
    this.newsTickerText = this.add.text(width + 100, height - 12, DarkHumorSystem.getRandomHeadline(), {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffdd00'
    }).setOrigin(0, 0.5).setDepth(51);

    // Animate ticker
    this.tweens.add({
      targets: this.newsTickerText,
      x: -800,
      duration: 20000,
      repeat: -1,
      onRepeat: () => {
        this.newsTickerText.setText(DarkHumorSystem.getRandomHeadline());
        this.newsTickerText.x = this.cameras.main.width + 100;
      }
    });
  }

  updateNewsTicker() {
    // Ticker updates automatically via tween onRepeat
  }

  triggerRandomCrisis() {
    if (this.crisisActive) return;

    // 30% chance of crisis each check
    if (Math.random() > 0.3) return;

    this.crisisActive = true;
    const crisis = DarkHumorSystem.getRandomCrisis();
    this.showCrisisPopup(crisis);
  }

  showCrisisPopup(crisis) {
    const { width, height } = this.cameras.main;
    const popupElements = [];

    // Helper to close popup safely
    const closePopup = () => {
      popupElements.forEach(el => {
        if (el && el.destroy) el.destroy();
      });
      this.crisisActive = false;
    };

    // Overlay - clicking it will also close (safety fallback)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive()
      .setDepth(2000);
    popupElements.push(overlay);

    // Safety: double-click overlay to force close
    let overlayClicks = 0;
    overlay.on('pointerdown', () => {
      overlayClicks++;
      if (overlayClicks >= 2) {
        closePopup();
        this.showDarkHumorNotification('Crisis dismissed (you clicked to skip)', 0xffd93d);
      }
    });

    // Panel
    const panel = this.add.rectangle(width / 2, height / 2, 550, 300, 0x1a0a0a, 0.98)
      .setStrokeStyle(3, 0xff4444)
      .setDepth(2001);
    popupElements.push(panel);

    // Alert icon
    const alert = this.add.text(width / 2, height / 2 - 110, '⚠️', {
      fontSize: '40px'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(alert);

    // Title
    const title = this.add.text(width / 2, height / 2 - 70, crisis.title, {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#ff4444'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(title);

    // Message
    const message = this.add.text(width / 2, height / 2 - 20, crisis.message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 480 },
      align: 'center'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(message);

    // Response buttons
    crisis.responses.forEach((response, i) => {
      const btnX = width / 2 - 120 + i * 240;
      const btnY = height / 2 + 60;

      const btn = this.add.rectangle(btnX, btnY, 200, 45, i === 0 ? 0x4ecdc4 : 0xff6b6b)
        .setInteractive()
        .setDepth(2002);
      popupElements.push(btn);

      const btnText = this.add.text(btnX, btnY, response.text, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(2003);
      popupElements.push(btnText);

      btn.on('pointerover', () => btn.setFillStyle(i === 0 ? 0x3dbdb5 : 0xe55a5a));
      btn.on('pointerout', () => btn.setFillStyle(i === 0 ? 0x4ecdc4 : 0xff6b6b));
      btn.on('pointerdown', () => {
        audioSystem.playClick();
        this.resolveCrisis(crisis, response, popupElements);
      });
    });

    // Effect preview
    let effectText = 'Impact: ';
    if (crisis.effect.funding) effectText += `$${crisis.effect.funding.toLocaleString()} `;
    if (crisis.effect.researchPoints) effectText += `${crisis.effect.researchPoints} RP`;

    const effect = this.add.text(width / 2, height / 2 + 110, effectText, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(effect);

    // X close button (top right corner) - applies effects and closes
    const closeX = this.add.text(width / 2 + 255, height / 2 - 130, 'X', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#ff6b6b'
    }).setOrigin(0.5).setDepth(2003).setInteractive();
    popupElements.push(closeX);

    closeX.on('pointerover', () => closeX.setColor('#ffffff'));
    closeX.on('pointerout', () => closeX.setColor('#ff6b6b'));
    closeX.on('pointerdown', () => {
      audioSystem.playClick();
      // Apply the crisis effects when closing with X
      if (crisis.effect.funding) {
        this.gameState.funding += crisis.effect.funding;
      }
      if (crisis.effect.researchPoints) {
        this.gameState.researchPoints += crisis.effect.researchPoints;
      }
      closePopup();
      this.showDarkHumorNotification('Crisis effects applied. No good options anyway.', 0xff6b6b);
      this.updateUI();
    });
  }

  resolveCrisis(crisis, response, popupElements) {
    // Apply effects
    if (crisis.effect.funding) {
      this.gameState.funding += crisis.effect.funding;
    }
    if (crisis.effect.researchPoints) {
      this.gameState.researchPoints += crisis.effect.researchPoints;
    }

    // Clean up popup safely
    popupElements.forEach(el => {
      if (el && el.destroy) el.destroy();
    });

    // Show result
    this.showDarkHumorNotification(response.result, 0xff6b6b);

    this.updateUI();
    this.crisisActive = false;
  }

  showGrantApplication() {
    const { width, height } = this.cameras.main;
    const popupElements = [];

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive()
      .setDepth(2000);
    popupElements.push(overlay);

    // Panel
    const panel = this.add.rectangle(width / 2, height / 2, 700, 480, 0x1a1a2e, 0.98)
      .setStrokeStyle(3, 0x95e1d3)
      .setDepth(2001);
    popupElements.push(panel);

    // Title
    const title = this.add.text(width / 2, height / 2 - 200, 'GRANT APPLICATION', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#95e1d3'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(title);

    // Satirical subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 170, '"Abandon hope, all ye who apply"', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(subtitle);

    // Get grant agencies from DarkHumorSystem
    const agencies = DarkHumorSystem.grantAgencies;

    // Display agency options
    agencies.forEach((agency, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const cardX = width / 2 - 160 + col * 320;
      const cardY = height / 2 - 100 + row * 70;

      // Card background
      const card = this.add.rectangle(cardX, cardY, 300, 60, 0x2d3a4a, 0.9)
        .setStrokeStyle(2, 0x3d4a5a)
        .setInteractive()
        .setDepth(2002);
      popupElements.push(card);

      // Agency name
      const nameText = this.add.text(cardX - 140, cardY - 15, agency.name, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setDepth(2003);
      popupElements.push(nameText);

      // Success rate and max amount
      const successRate = Math.round(agency.successRate * 100);
      const statsText = this.add.text(cardX - 140, cardY + 8,
        `Success: ${successRate}% | Max: $${agency.maxAmount.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: successRate > 15 ? '#4ecdc4' : (successRate > 5 ? '#ffd93d' : '#ff6b6b')
      }).setDepth(2003);
      popupElements.push(statsText);

      // Apply button
      const applyBtn = this.add.rectangle(cardX + 115, cardY, 60, 30, 0x4ecdc4)
        .setInteractive()
        .setDepth(2003);
      popupElements.push(applyBtn);

      const applyText = this.add.text(cardX + 115, cardY, 'Apply', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(2004);
      popupElements.push(applyText);

      card.on('pointerover', () => card.setFillStyle(0x3d4a5a));
      card.on('pointerout', () => card.setFillStyle(0x2d3a4a));

      applyBtn.on('pointerover', () => applyBtn.setFillStyle(0x3dbdb5));
      applyBtn.on('pointerout', () => applyBtn.setFillStyle(0x4ecdc4));
      applyBtn.on('pointerdown', () => {
        audioSystem.playClick();
        this.submitGrantApplication(agency, popupElements);
      });
    });

    // Application fee notice
    const feeNotice = this.add.text(width / 2, height / 2 + 170,
      'Application processing fee: $500 (non-refundable, obviously)', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(2002);
    popupElements.push(feeNotice);

    // Close button
    const closeBtn = this.add.rectangle(width / 2, height / 2 + 210, 120, 40, 0xff6b6b)
      .setInteractive()
      .setDepth(2002);
    popupElements.push(closeBtn);

    const closeText = this.add.text(width / 2, height / 2 + 210, 'Give Up', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2003);
    popupElements.push(closeText);

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xe55a5a));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xff6b6b));
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      popupElements.forEach(el => el.destroy());
    });
  }

  submitGrantApplication(agency, popupElements) {
    const applicationFee = 500;

    // Check if can afford application fee
    if (this.gameState.funding < applicationFee) {
      this.showDarkHumorNotification('Cannot afford application fee. The irony is not lost.', 0xff6b6b);
      return;
    }

    // Deduct application fee
    this.gameState.funding -= applicationFee;

    // Roll for success
    const roll = Math.random();
    const success = roll < agency.successRate;

    // Close popup
    popupElements.forEach(el => el.destroy());

    if (success) {
      // Award grant
      const awardAmount = Math.floor(agency.maxAmount * (0.5 + Math.random() * 0.5));
      this.gameState.funding += awardAmount;
      audioSystem.playPurchase();
      this.showDarkHumorNotification(
        `Grant Approved! ${agency.name} awards $${awardAmount.toLocaleString()}. (A miracle!)`,
        0x4ecdc4
      );
    } else {
      // Rejection with satirical reason
      const rejectionReason = DarkHumorSystem.getRandomRejection();
      audioSystem.playExperimentFail();
      this.showDarkHumorNotification(
        `REJECTED: ${rejectionReason}`,
        0xff6b6b
      );
    }

    this.updateUI();
  }

  completeExperiment(scientist, equipment) {
    // Calculate success chance based on scientist stats and equipment
    const baseChance = 0.5;
    const intelligenceBonus = scientist.data.stats.intelligence / 200;
    const luckBonus = scientist.data.stats.luck / 300;
    const equipmentBonus = equipment.data.level * 0.1;

    const successChance = Math.min(baseChance + intelligenceBonus + luckBonus + equipmentBonus, 0.95);
    const success = Math.random() < successChance;

    // Grant rewards - scale with equipment quality
    const baseReward = 2000 * equipment.data.level;
    const researchReward = 15 * equipment.data.level;

    if (success) {
      this.gameState.funding += baseReward;
      this.gameState.researchPoints += researchReward;
      this.gameState.stats.successfulExperiments++;

      // XP for scientist
      scientist.data.xp += 20;
      if (scientist.data.xp >= scientist.data.level * 100) {
        scientist.levelUp();
        audioSystem.playLevelUp();
      }

      audioSystem.playExperimentComplete();
      this.showNotification(`Experiment Success! +$${baseReward} +${researchReward} RP`, 0x4ecdc4);
    } else {
      this.gameState.funding += Math.floor(baseReward * 0.2);
      this.gameState.researchPoints += Math.floor(researchReward * 0.3);
      scientist.data.xp += 5;

      audioSystem.playExperimentFail();
      this.showNotification('Experiment Failed - Partial Results', 0xff6b6b);
    }

    this.gameState.stats.totalExperiments++;

    // Reset experiment
    equipment.data.experimentProgress = 0;
    equipment.updateProgress();

    // Unassign scientist
    scientist.unassign();
    equipment.unassignScientist();

    this.updateUI();
  }

  showNotification(message, color) {
    const { width } = this.cameras.main;
    const notification = this.add.text(width / 2, 100, message, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: `#${color.toString(16)}`,
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      y: 130,
      alpha: 0,
      duration: 2000,
      onComplete: () => notification.destroy()
    });
  }

  showMenuConfirmation() {
    const { width, height } = this.cameras.main;

    // Store popup elements for cleanup
    const popupElements = [];

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive()
      .setDepth(1000);
    popupElements.push(overlay);

    // Popup panel
    const panel = this.add.rectangle(width / 2, height / 2, 400, 200, 0x1a1a2e, 0.98)
      .setStrokeStyle(3, 0x4ecdc4)
      .setDepth(1001);
    popupElements.push(panel);

    // Title
    const title = this.add.text(width / 2, height / 2 - 60, 'Return to Menu?', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#4ecdc4'
    }).setOrigin(0.5).setDepth(1002);
    popupElements.push(title);

    // Message
    const message = this.add.text(width / 2, height / 2 - 15, 'Your progress will be saved.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1002);
    popupElements.push(message);

    // Helper to close popup
    const closePopup = () => {
      popupElements.forEach(el => el.destroy());
    };

    // Save & Exit button
    const saveBtn = this.add.rectangle(width / 2 - 80, height / 2 + 50, 140, 45, 0x4ecdc4)
      .setInteractive()
      .setDepth(1002);
    popupElements.push(saveBtn);

    const saveBtnText = this.add.text(width / 2 - 80, height / 2 + 50, 'Save & Exit', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1003);
    popupElements.push(saveBtnText);

    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x3dbdb5));
    saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x4ecdc4));
    saveBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.saveGame();
      closePopup();
      this.scene.start('MenuScene');
    });

    // Cancel button
    const cancelBtn = this.add.rectangle(width / 2 + 80, height / 2 + 50, 100, 45, 0xff6b6b)
      .setInteractive()
      .setDepth(1002);
    popupElements.push(cancelBtn);

    const cancelBtnText = this.add.text(width / 2 + 80, height / 2 + 50, 'Cancel', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1003);
    popupElements.push(cancelBtnText);

    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0xe55a5a));
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0xff6b6b));
    cancelBtn.on('pointerdown', () => {
      audioSystem.playClick();
      closePopup();
    });

    // Close on overlay click
    overlay.on('pointerdown', () => {
      closePopup();
    });
  }

  updateUI() {
    this.fundingText.setText(`$${this.gameState.funding.toLocaleString()}`);
    this.researchText.setText(`${Math.floor(this.gameState.researchPoints)}`);
    const academiaCount = this.gameState.academia ? this.gameState.academia.length : 0;
    this.scientistCountText.setText(`Staff: ${this.scientists.length} | "Trainees": ${academiaCount}`);
  }

  saveGame() {
    try {
      // Update scientist positions
      if (this.scientists && this.scientists.length > 0) {
        this.gameState.scientists = this.scientists.map(s => ({
          ...s.data,
          x: s.x,
          y: s.y
        }));
      }

      // Update equipment state
      if (this.equipment && this.equipment.length > 0) {
        this.gameState.equipment = this.equipment.map(e => ({
          ...e.data
        }));
      }

      // Update registry and localStorage
      this.registry.set('gameState', this.gameState);
      localStorage.setItem('labTycoonSave', JSON.stringify(this.gameState));
      console.log('Game saved!');
    } catch (e) {
      console.error('Error saving game:', e);
    }
  }
}
