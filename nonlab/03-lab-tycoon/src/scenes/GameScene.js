import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';
import { ContentData } from '../systems/ContentData.js';
import { gameState } from '../systems/GameState.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.panels = {};
    this.equipmentSlots = [];
    this.scientists = [];
    this.equipmentSprites = [];
    this.scientistSprites = [];
    this.academiaSprites = [];
    this.activeGrants = []; // Grants being worked on
    this.availableGrants = []; // Grant opportunities currently available
  }

  create() {
    const { width, height } = this.cameras.main;
    this.gameWidth = width;
    this.gameHeight = height;

    // Create lab environment
    this.createLabBackground();

    // Create equipment slots
    this.createEquipmentSlots();

    // Create UI
    this.createTopBar();
    this.createMenuButtons();
    this.createNewsTicker();

    // Create panel container (for modal overlays)
    this.panelContainer = this.add.container(0, 0).setDepth(1000);

    // Initialize panels (lazy load)
    this.activePanel = null;

    // Create academia worker display area
    this.createAcademiaDisplay();

    // Load existing equipment and scientists from state
    this.loadFromState();

    // Initialize available grant opportunities
    this.initializeGrantOpportunities();

    // Start game loop
    this.gameLoopTimer = this.time.addEvent({
      delay: 1000,
      callback: this.gameLoop,
      callbackScope: this,
      loop: true
    });

    // Auto-save timer
    this.saveTimer = this.time.addEvent({
      delay: 30000,
      callback: () => gameState.save(),
      callbackScope: this,
      loop: true
    });

    // Listen for state changes
    gameState.addListener(this.onStateChange.bind(this));

    // Initial UI update
    this.updateUI();
  }

  createLabBackground() {
    const { width, height } = this.cameras.main;

    // Floor tiles - start below the taller top bar
    for (let x = 0; x < width; x += 64) {
      for (let y = 120; y < height - 50; y += 64) {
        this.add.image(x + 32, y + 32, 'floor_tile').setAlpha(0.4);
      }
    }

    // Lab wall at top
    for (let x = 0; x < width; x += 64) {
      this.add.image(x + 32, 145, 'lab_wall').setAlpha(0.6);
    }

    // Some decorative props
    this.add.image(80, 200, 'bookshelf').setScale(1.2).setAlpha(0.5);
    this.add.image(width - 80, 200, 'whiteboard').setScale(1.2).setAlpha(0.5);

    // === DARK HUMOR DECORATIONS ===

    // Sad motivational posters on the walls
    const sadPosters = [
      { x: 200, y: 165, text: '"Hang in there"\n(like your career)', color: '#ff6b6b' },
      { x: 400, y: 165, text: '"Follow your dreams"\n(to poverty)', color: '#ffd93d' },
      { x: 550, y: 165, text: '"Success is a journey"\n(that never ends)', color: '#888888' },
    ];

    sadPosters.forEach(poster => {
      // Poster background
      const bg = this.add.rectangle(poster.x, poster.y, 80, 40, 0x2a2a4e, 0.9);
      // Poster text
      this.add.text(poster.x, poster.y, poster.text, {
        fontFamily: 'Arial',
        fontSize: '7px',
        color: poster.color,
        align: 'center'
      }).setOrigin(0.5);
    });

    // Cobwebs in corners
    this.add.text(10, 125, '🕸️', { fontSize: '24px' }).setAlpha(0.4);
    this.add.text(width - 35, 125, '🕸️', { fontSize: '24px' }).setAlpha(0.4).setFlipX(true);

    // Skull decoration (memento mori for academia)
    this.add.text(width - 60, 170, '💀', { fontSize: '20px' }).setAlpha(0.5);
    this.add.text(width - 60, 195, 'Tenure\nDreams', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#666666',
      align: 'center'
    }).setOrigin(0.5, 0);

    // Broken dreams corner
    this.add.text(30, height - 200, '📜', { fontSize: '16px' }).setAlpha(0.4);
    this.add.text(30, height - 175, 'Rejected\nGrants', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#666666',
      align: 'center'
    }).setOrigin(0.5, 0);

    // Coffee stain (essential lab decoration)
    const coffeeStain = this.add.circle(650, 380, 15, 0x4a3728, 0.3);

    // Random "OVERDUE" stamp
    this.add.text(width - 150, height - 180, 'OVERDUE', {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#ff0000'
    }).setAlpha(0.2).setRotation(-0.2);

    // Dreams crushed counter
    this.dreamsCrushedText = this.add.text(width - 120, height - 150, '💔 Dreams: 0', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#666666'
    }).setAlpha(0.6);
  }

  createEquipmentSlots() {
    // Equipment slots positioned on the right side of the lab
    const slotPositions = [
      { x: 750, y: 220 },
      { x: 900, y: 220 },
      { x: 1050, y: 220 },
      { x: 750, y: 340 },
      { x: 900, y: 340 },
      { x: 1050, y: 340 },
      { x: 825, y: 460 }
    ];

    slotPositions.forEach((pos, index) => {
      const slot = this.add.image(pos.x, pos.y, 'equipment_slot')
        .setScale(1.5)
        .setAlpha(0.6)
        .setInteractive();

      slot.slotIndex = index;

      slot.on('pointerover', () => {
        if (!gameState.getEquipmentBySlot(index)) {
          slot.setAlpha(0.9);
          audioSystem.playHover();
        }
      });

      slot.on('pointerout', () => {
        if (!gameState.getEquipmentBySlot(index)) {
          slot.setAlpha(0.6);
        }
      });

      slot.on('pointerdown', () => {
        if (!gameState.getEquipmentBySlot(index)) {
          audioSystem.playClick();
          this.showShopPanel(index);
        }
      });

      this.equipmentSlots.push(slot);
    });
  }

  createTopBar() {
    const { width } = this.cameras.main;

    // Top bar background - taller to fit two rows
    this.add.rectangle(width / 2, 55, width, 110, 0x1a1a2e, 0.95).setDepth(100);

    // === ROW 1: Main resources ===
    // Funding display
    this.add.image(30, 30, 'money_icon').setScale(1.2).setDepth(101);
    this.fundingText = this.add.text(55, 30, '$50,000', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#4ecdc4',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(101);

    // Research points display
    this.add.image(220, 30, 'research_icon').setScale(1.2).setDepth(101);
    this.researchText = this.add.text(245, 30, '0 RP', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(101);

    // Scientists count
    this.add.image(400, 30, 'scientist_icon').setScale(1.2).setDepth(101);
    this.scientistCountText = this.add.text(425, 30, '0/10', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setDepth(101);

    // Equipment count
    this.add.text(520, 30, 'Equip:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888888'
    }).setOrigin(0, 0.5).setDepth(101);
    this.equipmentCountText = this.add.text(575, 30, '0/7', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setDepth(101);

    // === ROW 2: Income/Expense breakdown ===
    // Cash flow indicator
    this.add.text(30, 70, 'Cash Flow:', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0, 0.5).setDepth(101);

    this.cashFlowText = this.add.text(110, 70, '+$0/s', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#4ecdc4'
    }).setOrigin(0, 0.5).setDepth(101);

    // Expense breakdown
    this.expenseText = this.add.text(200, 70, '(Salaries: $0 | Maintenance: $0)', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0, 0.5).setDepth(101);

    // Research flow indicator
    this.add.text(450, 70, 'Research:', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0, 0.5).setDepth(101);

    this.researchFlowText = this.add.text(525, 70, '+0 RP/s', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd93d'
    }).setOrigin(0, 0.5).setDepth(101);

    // Working scientists indicator
    this.workingText = this.add.text(620, 70, '(0 working)', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0, 0.5).setDepth(101);
  }

  createMenuButtons() {
    const { width } = this.cameras.main;
    const buttonY = 55;
    const buttons = [
      { x: width - 380, text: 'Hire', action: () => this.showHirePanel() },
      { x: width - 280, text: 'Research', action: () => this.showResearchPanel() },
      { x: width - 170, text: 'Academia', action: () => this.showAcademiaPanel() },
      { x: width - 70, text: 'Grants', action: () => this.showGrantPanel() }
    ];

    buttons.forEach(btn => {
      const button = this.add.rectangle(btn.x, buttonY, 90, 40, 0x4ecdc4, 0.8)
        .setInteractive()
        .setDepth(101);

      const text = this.add.text(btn.x, buttonY, btn.text, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(102);

      button.on('pointerover', () => {
        button.setFillStyle(0x5dded5, 1);
        audioSystem.playHover();
      });

      button.on('pointerout', () => {
        button.setFillStyle(0x4ecdc4, 0.8);
      });

      button.on('pointerdown', () => {
        audioSystem.playClick();
        btn.action();
      });
    });
  }

  createAcademiaDisplay() {
    const { width, height } = this.cameras.main;

    // Academia section label at bottom-left
    this.add.text(20, height - 90, 'ADMIN STAFF:', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'bold'
    }).setDepth(50);

    // Grant bonus display
    this.grantBonusText = this.add.text(130, height - 90, '+0% grant success', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#666666'
    }).setDepth(50);
  }

  placeAcademiaSprite(workerData) {
    const { height } = this.cameras.main;

    // Position academia workers at the bottom
    const baseX = 40 + (this.academiaSprites.length % 8) * 70;
    const baseY = height - 130;

    // Create desk
    const desk = this.add.rectangle(baseX, baseY + 15, 50, 20, 0x5a4a3a, 0.8);

    // Worker sprite (reuse scientist graphic with different tint)
    const sprite = this.add.image(baseX, baseY, 'scientist_working').setScale(1.2);
    sprite.setTint(this.getWorkerTint(workerData.type));
    sprite.workerId = workerData.id;
    sprite.workerType = workerData.type;
    sprite.workerName = workerData.name;
    sprite.workerSkill = workerData.skill;

    // Type label
    const typeLabel = this.add.text(baseX, baseY + 30, this.getWorkerShortName(workerData.type), {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    // Small working animation
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 2,
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Make clickable for firing
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      audioSystem.playClick();
      this.showAcademiaWorkerPanel(workerData.id);
    });

    // Store references
    sprite.desk = desk;
    sprite.typeLabel = typeLabel;
    this.academiaSprites.push(sprite);

    // Update grant bonus display
    this.updateGrantBonusDisplay();
  }

  getWorkerTint(type) {
    const tints = {
      'grant_writer': 0xffd93d,
      'lab_manager': 0x4ecdc4,
      'technician': 0x95e1d3,
      'admin': 0xa55eea
    };
    return tints[type] || 0xffffff;
  }

  getWorkerShortName(type) {
    const names = {
      'grant_writer': 'Writer',
      'lab_manager': 'Manager',
      'technician': 'Tech',
      'admin': 'Admin'
    };
    return names[type] || type;
  }

  initializeGrantOpportunities() {
    // Start with 3 random grant opportunities
    const allAgencies = ContentData.getGrantAgencies();
    for (let i = 0; i < 3; i++) {
      this.addNewGrantOpportunity(allAgencies);
    }
  }

  addNewGrantOpportunity(allAgencies) {
    // Pick a random agency not already in available grants
    const availableAgencyNames = this.availableGrants.map(g => g.agency.name);
    const unusedAgencies = allAgencies.filter(a => !availableAgencyNames.includes(a.name));

    if (unusedAgencies.length === 0) return null;

    const agency = unusedAgencies[Math.floor(Math.random() * unusedAgencies.length)];
    const duration = 60 + Math.floor(Math.random() * 60); // 60-120 seconds availability

    const opportunity = {
      id: Date.now() + Math.random(),
      agency: agency,
      timeRemaining: duration,
      totalTime: duration
    };

    this.availableGrants.push(opportunity);
    return opportunity;
  }

  processGrantOpportunities() {
    const allAgencies = ContentData.getGrantAgencies();

    // Process expiration
    for (let i = this.availableGrants.length - 1; i >= 0; i--) {
      const grant = this.availableGrants[i];
      grant.timeRemaining--;

      if (grant.timeRemaining <= 0) {
        this.availableGrants.splice(i, 1);
      }
    }

    // Random chance to add new opportunity (if under max)
    if (this.availableGrants.length < 4 && Math.random() < 0.03) { // ~3% per second
      const newGrant = this.addNewGrantOpportunity(allAgencies);
      if (newGrant) {
        this.showNotification(`New grant: ${newGrant.agency.name}!`, '#ffd93d');
      }
    }
  }

  updateDreamsCrushed() {
    const state = gameState.get();
    if (!state || !this.dreamsCrushedText) return;

    const crushed = state.stats.dreamsDestroyed || 0;
    this.dreamsCrushedText.setText(`💔 Dreams: ${crushed}`);

    // Flash effect
    this.tweens.add({
      targets: this.dreamsCrushedText,
      alpha: 1,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.dreamsCrushedText.setAlpha(0.6)
    });
  }

  updateGrantBonusDisplay() {
    const state = gameState.get();
    if (!state) return;

    // Calculate grant bonus from grant writers
    let totalBonus = 0;
    state.academia.forEach(worker => {
      if (worker.type === 'grant_writer') {
        totalBonus += worker.skill * 2; // Each skill point = 2% bonus
      }
    });

    if (this.grantBonusText) {
      this.grantBonusText.setText(`+${totalBonus}% grant success`);
      this.grantBonusText.setColor(totalBonus > 0 ? '#ffd93d' : '#666666');
    }
  }

  createNewsTicker() {
    const { width, height } = this.cameras.main;

    // News bar background
    this.add.rectangle(width / 2, height - 25, width, 50, 0x1a1a2e, 0.9).setDepth(100);

    // Breaking news label
    this.add.text(10, height - 25, 'NEWS:', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(101);

    // News text - with word wrap to prevent overflow
    this.newsText = this.add.text(70, height - 25, ContentData.getRandomHeadline(), {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: width - 100 }
    }).setOrigin(0, 0.5).setDepth(101);

    // Cycle news every 10 seconds
    this.time.addEvent({
      delay: 10000,
      callback: () => {
        this.tweens.add({
          targets: this.newsText,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            this.newsText.setText(ContentData.getRandomHeadline());
            this.tweens.add({
              targets: this.newsText,
              alpha: 1,
              duration: 500
            });
          }
        });
      },
      loop: true
    });
  }

  loadFromState() {
    const state = gameState.get();
    if (!state) return;

    // Load equipment
    state.equipment.forEach(equip => {
      this.placeEquipmentSprite(equip.slotIndex, equip.type);
    });

    // Load scientists
    state.scientists.forEach(sci => {
      this.placeScientistSprite(sci);
    });

    // Load academia workers
    state.academia.forEach(worker => {
      this.placeAcademiaSprite(worker);
    });
  }

  placeEquipmentSprite(slotIndex, type) {
    const slot = this.equipmentSlots[slotIndex];
    if (!slot) return;

    const sprite = this.add.image(slot.x, slot.y, type).setScale(2);
    sprite.slotIndex = slotIndex;
    sprite.equipmentType = type;

    // Make interactive for info
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      audioSystem.playClick();
      this.showEquipmentInfo(slotIndex, type);
    });

    // Idle animation
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 3,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.equipmentSprites.push(sprite);

    // Hide slot
    slot.setVisible(false);

    // Reassign scientists to new equipment
    this.reassignScientists();
  }

  placeScientistSprite(scientistData) {
    // Try to assign scientist to an unoccupied equipment slot
    const state = gameState.get();
    let assignedSlot = null;
    let baseX, baseY;

    // Find an unoccupied equipment slot
    for (let i = 0; i < this.equipmentSlots.length; i++) {
      const equipment = state.equipment.find(e => e.slotIndex === i);
      if (equipment) {
        // Check if any scientist is already assigned to this slot
        const alreadyAssigned = this.scientistSprites.some(s => s.assignedSlot === i);
        if (!alreadyAssigned) {
          assignedSlot = i;
          break;
        }
      }
    }

    if (assignedSlot !== null) {
      // Position near the assigned equipment
      const slot = this.equipmentSlots[assignedSlot];
      baseX = slot.x - 50; // Stand to the left of the equipment
      baseY = slot.y + 20;
    } else {
      // No equipment available - stand in idle area (left side)
      const idleCount = this.scientistSprites.filter(s => s.assignedSlot === null).length;
      baseX = 100 + (idleCount % 4) * 80;
      baseY = 250 + Math.floor(idleCount / 4) * 100;
    }

    const textureKey = scientistData.exhausted ? 'scientist_exhausted' : 'scientist_working';
    const sprite = this.add.image(baseX, baseY, textureKey).setScale(1.5);
    sprite.scientistId = scientistData.id;
    sprite.assignedSlot = assignedSlot;

    // Status indicator background
    const statusBg = this.add.rectangle(baseX, baseY + 35, 70, 16, 0x1a1a2e, 0.9);
    statusBg.scientistId = scientistData.id;

    // Status text - show what they're working on
    const statusLabel = assignedSlot !== null ? 'Working' : 'Idle';
    const statusColor = assignedSlot !== null ? '#4ecdc4' : '#888888';
    const statusText = this.add.text(baseX, baseY + 35, statusLabel, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: statusColor
    }).setOrigin(0.5);
    statusText.scientistId = scientistData.id;

    // Store references for updates
    sprite.statusBg = statusBg;
    sprite.statusText = statusText;

    // Idle animation
    this.tweens.add({
      targets: [sprite, statusBg, statusText],
      y: '-=4',
      duration: 1500 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Make interactive - click to show detailed info panel
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      audioSystem.playClick();
      this.showScientistPanel(scientistData.id);
    });

    this.scientistSprites.push(sprite);
  }

  updateUI() {
    const state = gameState.get();
    if (!state) return;

    this.fundingText.setText(`$${state.funding.toLocaleString()}`);
    this.researchText.setText(`${state.researchPoints} RP`);
    this.scientistCountText.setText(`${state.scientists.length}/10`);
    this.equipmentCountText.setText(`Equipment: ${state.equipment.length}/7`);

    // Color code funding
    if (state.funding < 5000) {
      this.fundingText.setColor('#ff6b6b');
    } else if (state.funding < 15000) {
      this.fundingText.setColor('#ffd93d');
    } else {
      this.fundingText.setColor('#4ecdc4');
    }
  }

  onStateChange(state) {
    this.updateUI();
  }

  gameLoop() {
    const state = gameState.get();
    if (!state) return;

    // Update play time
    gameState.incrementStat('playTime', 1);

    // === Calculate expenses (reduced by 25% for less grueling economy) ===
    const scientistSalary = state.scientists.length * 150; // Was 200
    const maintenanceCost = state.equipment.length * 75;   // Was 100
    const academiaSalary = state.academia.length * 110;    // Was 150
    const totalExpense = scientistSalary + maintenanceCost + academiaSalary;

    // === Process active grant applications ===
    this.processActiveGrants();

    // === Process grant opportunity rotation ===
    this.processGrantOpportunities();

    // === Process research from scientists (only those at equipment) ===
    let totalOutput = 0;
    let workingCount = 0;
    let idleCount = 0;

    state.scientists.forEach((sci, index) => {
      // Check if this scientist is assigned to equipment
      const sprite = this.scientistSprites.find(s => s.scientistId === sci.id);
      const isAssigned = sprite && sprite.assignedSlot !== null;

      if (!sci.exhausted) {
        if (isAssigned) {
          workingCount++;

          // Calculate output based on scientist skill
          let output = sci.skill * 0.5;

          // Get bonus from their assigned equipment
          const assignedEquip = state.equipment.find(e => e.slotIndex === sprite.assignedSlot);
          if (assignedEquip) {
            const equipData = ContentData.getEquipmentData(assignedEquip.type);
            if (equipData) {
              output *= (1 + equipData.bonus / 100);
            }
          }

          totalOutput += output;

          // Show working particles for this scientist
          this.showWorkingEffect(index);

          // Random exhaustion (only for working scientists)
          if (Math.random() < 0.001) {
            sci.exhausted = true;
            sci.exhaustionTime = 60;
            gameState.incrementStat('burnouts');
            this.showNotification(`${sci.name} burned out!`, '#ff6b6b');
          }
        } else {
          idleCount++;
        }
      } else {
        // Recovery
        sci.exhaustionTime--;
        if (sci.exhaustionTime <= 0) {
          sci.exhausted = false;
          this.showNotification(`${sci.name} recovered!`, '#4ecdc4');
        }
      }
    });

    // Add research points
    const researchGained = Math.floor(totalOutput);
    if (researchGained > 0) {
      gameState.addResearchPoints(researchGained);
    }

    // Apply expenses (no passive income - grants are the only income source)
    if (totalExpense > 0) {
      gameState.spendFunding(totalExpense);
    }

    // === Update flow displays ===
    const netCashFlow = -totalExpense;
    this.cashFlowText.setText(`-$${totalExpense}/s`);
    this.cashFlowText.setColor(totalExpense > 0 ? '#ff6b6b' : '#4ecdc4');

    let expenseBreakdown = `(Scientists: -$${scientistSalary}`;
    if (maintenanceCost > 0) expenseBreakdown += ` | Equip: -$${maintenanceCost}`;
    if (academiaSalary > 0) expenseBreakdown += ` | Staff: -$${academiaSalary}`;
    expenseBreakdown += ')';
    this.expenseText.setText(expenseBreakdown);

    this.researchFlowText.setText(`+${researchGained} RP/s`);
    this.researchFlowText.setColor(researchGained > 0 ? '#ffd93d' : '#666666');

    const workingLabel = idleCount > 0
      ? `(${workingCount} working, ${idleCount} idle)`
      : `(${workingCount} working)`;
    this.workingText.setText(workingLabel);
    this.workingText.setColor(workingCount > 0 ? '#4ecdc4' : '#666666');

    // Random crisis chance
    if (Math.random() < 0.002) {
      this.triggerCrisis();
    }

    // Random dark popup events (more frequent than crisis, less severe)
    if (Math.random() < 0.008) {
      this.showRandomDarkEvent();
    }

    // Update scientist sprites
    this.updateScientistSprites();
  }

  showWorkingEffect(scientistIndex) {
    if (scientistIndex >= this.scientistSprites.length) return;

    const sprite = this.scientistSprites[scientistIndex];
    if (!sprite || !sprite.active) return;

    // Create a small particle effect above the scientist
    const particle = this.add.circle(
      sprite.x + Phaser.Math.Between(-10, 10),
      sprite.y - 20,
      3,
      0xffd93d,
      0.8
    );

    // Animate it floating up and fading
    this.tweens.add({
      targets: particle,
      y: particle.y - 30,
      alpha: 0,
      scale: 0.5,
      duration: 800,
      onComplete: () => particle.destroy()
    });
  }

  updateScientistSprites() {
    const state = gameState.get();
    if (!state) return;

    this.scientistSprites.forEach(sprite => {
      const sci = state.scientists.find(s => s.id === sprite.scientistId);
      if (sci) {
        sprite.setTexture(sci.exhausted ? 'scientist_exhausted' : 'scientist_working');

        // Update status text
        if (sprite.statusText) {
          if (sci.exhausted) {
            sprite.statusText.setText('Burned Out');
            sprite.statusText.setColor('#ff6b6b');
          } else {
            sprite.statusText.setText('Working');
            sprite.statusText.setColor('#4ecdc4');
          }
        }
      }
    });
  }

  triggerCrisis() {
    const crisis = ContentData.getRandomCrisis();
    this.showCrisisPanel(crisis);
  }

  showRandomDarkEvent() {
    const darkEvents = [
      // Political dark humor
      { text: 'RFK Jr just tweeted about your lab. Brace yourself.', color: '#ff6b6b', icon: '🧠' },
      { text: 'DOGE flagged your coffee budget as "wasteful."', color: '#ffd93d', icon: '☕' },
      { text: 'Trump called science "overrated" in a rally. Again.', color: '#ff6b6b', icon: '🎺' },
      { text: 'A congressman asked if you could "science faster."', color: '#888888', icon: '🏛️' },
      { text: 'RFK Jr wants to know why your chemicals have "so many syllables."', color: '#ff6b6b', icon: '💊' },
      { text: 'New HHS memo: "Have you tried essential oils?"', color: '#ffd93d', icon: '🌿' },
      { text: 'Your grant reviewer is a Joe Rogan fan. Godspeed.', color: '#ff6b6b', icon: '🎙️' },
      { text: 'Someone on Facebook debunked your research.', color: '#888888', icon: '📱' },
      { text: 'Alex Jones mentioned your work. Hide.', color: '#ff6b6b', icon: '📢' },
      { text: 'A MAGA influencer called you "part of the problem."', color: '#ff6b6b', icon: '🧢' },
      { text: 'RFK Jr confused your centrifuge for a "vaccine machine."', color: '#ffd93d', icon: '🧪' },
      { text: 'New executive order: Science must "feel right."', color: '#ff6b6b', icon: '📋' },

      // Academia dark humor
      { text: 'A grad student just asked if hope is real. You lied.', color: '#888888', icon: '😢' },
      { text: 'Your postdoc\'s antidepressants ran out. HR doesn\'t care.', color: '#888888', icon: '💊' },
      { text: 'Someone crying in the bathroom. It might be you.', color: '#666666', icon: '🚽' },
      { text: 'A PhD just realized industry pays 3x more.', color: '#ffd93d', icon: '💡' },
      { text: 'Adjunct professor spotted sleeping in car. Again.', color: '#888888', icon: '🚗' },
      { text: 'Lab meeting at 7am because your PI "is a morning person."', color: '#ff6b6b', icon: '⏰' },
      { text: 'Someone\'s imposter syndrome activated. Everyone\'s.', color: '#888888', icon: '🎭' },
      { text: 'The wellness webinar didn\'t help. Shocking.', color: '#666666', icon: '🧘' },
      { text: 'A reviewer asked for "just one more experiment."', color: '#ff6b6b', icon: '🔬' },
      { text: 'Your advisor is on a beach. You\'re here. Forever.', color: '#888888', icon: '🏖️' },
      { text: 'Grad student food pyramid: ramen, coffee, despair.', color: '#888888', icon: '🍜' },
      { text: 'The "pizza party" is actually sad news in disguise.', color: '#ffd93d', icon: '🍕' },
      { text: 'HR sent a "gratitude journaling" link instead of a raise.', color: '#888888', icon: '📝' },
      { text: 'Your 10-year postdoc just hit 11 years.', color: '#888888', icon: '🎂' },
      { text: 'Someone whispered "industry" and three people flinched.', color: '#ffd93d', icon: '🚪' },

      // General dark humor
      { text: 'The lab fridge has grown sentient. It judges you.', color: '#4ecdc4', icon: '🧫' },
      { text: 'Your equipment started making "that sound" again.', color: '#ffd93d', icon: '⚠️' },
      { text: 'The building manager doesn\'t know what you do. Neither do you anymore.', color: '#888888', icon: '🏢' },
      { text: 'A pipe burst. Nobody is surprised.', color: '#888888', icon: '💧' },
      { text: 'The coffee machine died. Productivity will follow.', color: '#ff6b6b', icon: '☠️' },
      { text: 'Dreams: crushed. But you knew that already.', color: '#888888', icon: '💔' },
    ];

    const event = darkEvents[Math.floor(Math.random() * darkEvents.length)];
    this.showDarkPopup(event.icon, event.text, event.color);
  }

  showDarkPopup(icon, message, color) {
    const { width, height } = this.cameras.main;

    // Create popup container
    const popup = this.add.container(width / 2, height / 2 - 100).setDepth(600);

    // Background
    const bg = this.add.rectangle(0, 0, 500, 60, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, parseInt(color.replace('#', '0x')));
    popup.add(bg);

    // Icon
    const iconText = this.add.text(-220, 0, icon, {
      fontSize: '28px'
    }).setOrigin(0.5);
    popup.add(iconText);

    // Message
    const msgText = this.add.text(10, 0, message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: color,
      wordWrap: { width: 380 }
    }).setOrigin(0.5);
    popup.add(msgText);

    // Animate in
    popup.setAlpha(0);
    popup.y += 50;
    this.tweens.add({
      targets: popup,
      alpha: 1,
      y: popup.y - 50,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Animate out after delay
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: popup,
        alpha: 0,
        y: popup.y - 30,
        duration: 500,
        onComplete: () => popup.destroy()
      });
    });
  }

  showNotification(message, color = '#4ecdc4') {
    const { width } = this.cameras.main;
    const notif = this.add.text(width / 2, 120, message, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: color,
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: notif,
      y: 150,
      alpha: 0,
      duration: 3000,
      onComplete: () => notif.destroy()
    });
  }

  // ==================== PANEL METHODS ====================

  closeActivePanel() {
    if (this.activePanel) {
      this.panelContainer.removeAll(true);
      this.activePanel = null;
    }
  }

  createPanelBase(title) {
    const { width, height } = this.cameras.main;

    // Dim background
    const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();
    dimBg.on('pointerdown', () => this.closeActivePanel());
    this.panelContainer.add(dimBg);

    // Panel background
    const panelBg = this.add.rectangle(width / 2, height / 2, 800, 500, 0x16213e, 1)
      .setStrokeStyle(3, 0x4ecdc4);
    this.panelContainer.add(panelBg);

    // Block clicks on panel from closing
    panelBg.setInteractive();

    // Title
    const titleText = this.add.text(width / 2, height / 2 - 220, title, {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#4ecdc4'
    }).setOrigin(0.5);
    this.panelContainer.add(titleText);

    // Close button
    const closeBtn = this.add.text(width / 2 + 370, height / 2 - 230, 'X', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#ff6b6b'
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.closeActivePanel();
    });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff8888'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ff6b6b'));
    this.panelContainer.add(closeBtn);

    return { panelBg, titleText };
  }

  showShopPanel(targetSlot) {
    this.closeActivePanel();
    this.activePanel = 'shop';

    const { width, height } = this.cameras.main;
    this.createPanelBase('Equipment Shop');

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 180, '"Buy now, justify later"', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.panelContainer.add(subtitle);

    // Equipment list
    const equipment = ContentData.getAllEquipment();
    const state = gameState.get();

    let yOffset = -120;
    equipment.forEach((equip, index) => {
      const isUnlocked = state.unlockedEquipment.includes(equip.type);
      const canAfford = state.funding >= equip.cost;

      // Equipment row
      const rowBg = this.add.rectangle(width / 2, height / 2 + yOffset, 700, 60,
        isUnlocked ? 0x2a2a4e : 0x1a1a3e, 1);
      this.panelContainer.add(rowBg);

      // Icon
      const icon = this.add.image(width / 2 - 300, height / 2 + yOffset, equip.type)
        .setScale(1.5)
        .setAlpha(isUnlocked ? 1 : 0.4);
      this.panelContainer.add(icon);

      // Name
      const nameText = this.add.text(width / 2 - 220, height / 2 + yOffset - 10, equip.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: isUnlocked ? '#ffffff' : '#666666',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(nameText);

      // Description
      const descText = this.add.text(width / 2 - 220, height / 2 + yOffset + 12,
        isUnlocked ? `+${equip.bonus}% research speed` : `Requires ${equip.unlockText}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#aaaaaa'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(descText);

      // Cost
      const costText = this.add.text(width / 2 + 200, height / 2 + yOffset, `$${equip.cost.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: canAfford ? '#4ecdc4' : '#ff6b6b'
      }).setOrigin(0.5);
      this.panelContainer.add(costText);

      // Buy button
      if (isUnlocked) {
        const buyBtn = this.add.rectangle(width / 2 + 300, height / 2 + yOffset, 80, 35,
          canAfford ? 0x4ecdc4 : 0x666666, 1)
          .setInteractive();
        this.panelContainer.add(buyBtn);

        const buyText = this.add.text(width / 2 + 300, height / 2 + yOffset, 'BUY', {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#1a1a2e',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.panelContainer.add(buyText);

        if (canAfford) {
          buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x5dded5, 1));
          buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x4ecdc4, 1));
          buyBtn.on('pointerdown', () => {
            audioSystem.playClick();
            this.buyEquipment(equip, targetSlot);
          });
        }
      }

      yOffset += 70;
    });
  }

  buyEquipment(equip, slotIndex) {
    if (gameState.spendFunding(equip.cost)) {
      const equipmentData = {
        type: equip.type,
        slotIndex: slotIndex,
        purchaseTime: Date.now()
      };
      gameState.addEquipment(equipmentData);
      this.placeEquipmentSprite(slotIndex, equip.type);
      this.showNotification(`Purchased ${equip.name}!`, '#4ecdc4');
      gameState.save();
      this.closeActivePanel();
    }
  }

  showHirePanel() {
    this.closeActivePanel();
    this.activePanel = 'hire';

    const { width, height } = this.cameras.main;
    this.createPanelBase('Hire Scientists');

    const subtitle = this.add.text(width / 2, height / 2 - 180,
      '"Fresh graduates! Dreams not yet crushed!"', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.panelContainer.add(subtitle);

    // Generate candidates
    const candidates = [];
    for (let i = 0; i < 4; i++) {
      candidates.push(ContentData.generateScientist());
    }

    let yOffset = -100;
    candidates.forEach((sci, index) => {
      const cost = 5000 + sci.skill * 1000;
      const state = gameState.get();
      const canAfford = state.funding >= cost;
      const canHire = state.scientists.length < 10;

      // Row background
      const rowBg = this.add.rectangle(width / 2, height / 2 + yOffset, 700, 80, 0x2a2a4e, 1);
      this.panelContainer.add(rowBg);

      // Scientist icon
      const icon = this.add.image(width / 2 - 300, height / 2 + yOffset, 'scientist_working')
        .setScale(1.5);
      this.panelContainer.add(icon);

      // Name and type - truncate if too long
      const displayName = sci.name.length > 25 ? sci.name.substring(0, 22) + '...' : sci.name;
      const nameText = this.add.text(width / 2 - 220, height / 2 + yOffset - 22,
        `${displayName}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(nameText);

      // Type badge
      const typeText = this.add.text(width / 2 - 220, height / 2 + yOffset - 2,
        sci.type, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#4ecdc4'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(typeText);

      // Traits - limit display
      const traitDisplay = sci.traits.slice(0, 2).join(', ');
      const traitsText = this.add.text(width / 2 - 220, height / 2 + yOffset + 15,
        traitDisplay, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(traitsText);

      // Skill bar instead of text
      const skillBarBg = this.add.rectangle(width / 2 + 80, height / 2 + yOffset, 80, 12, 0x1a1a2e);
      this.panelContainer.add(skillBarBg);
      const skillBarFill = this.add.rectangle(width / 2 + 40, height / 2 + yOffset, (sci.skill / 10) * 80, 12, 0x4ecdc4);
      skillBarFill.setOrigin(0, 0.5);
      this.panelContainer.add(skillBarFill);
      const skillLabel = this.add.text(width / 2 + 130, height / 2 + yOffset, `${sci.skill}/10`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(skillLabel);

      // Cost
      const costText = this.add.text(width / 2 + 200, height / 2 + yOffset,
        `$${cost.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: canAfford ? '#4ecdc4' : '#ff6b6b'
      }).setOrigin(0.5);
      this.panelContainer.add(costText);

      // Hire button
      const hireBtn = this.add.rectangle(width / 2 + 300, height / 2 + yOffset, 80, 35,
        (canAfford && canHire) ? 0x4ecdc4 : 0x666666, 1)
        .setInteractive();
      this.panelContainer.add(hireBtn);

      const hireText = this.add.text(width / 2 + 300, height / 2 + yOffset, 'HIRE', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.panelContainer.add(hireText);

      if (canAfford && canHire) {
        hireBtn.on('pointerover', () => hireBtn.setFillStyle(0x5dded5, 1));
        hireBtn.on('pointerout', () => hireBtn.setFillStyle(0x4ecdc4, 1));
        hireBtn.on('pointerdown', () => {
          audioSystem.playClick();
          this.hireScientist(sci, cost);
        });
      }

      yOffset += 90;
    });
  }

  hireScientist(scientist, cost) {
    if (gameState.spendFunding(cost)) {
      scientist.id = Date.now() + Math.random();
      scientist.exhausted = false;
      scientist.exhaustionTime = 0;
      gameState.addScientist(scientist);
      this.placeScientistSprite(scientist);
      this.showNotification(`Hired ${scientist.name}!`, '#4ecdc4');
      gameState.save();
      this.closeActivePanel();
    }
  }

  showResearchPanel() {
    this.closeActivePanel();
    this.activePanel = 'research';

    const { width, height } = this.cameras.main;
    this.createPanelBase('Research Tree');

    const subtitle = this.add.text(width / 2, height / 2 - 180,
      '"Knowledge is power. Power is funding. Funding is gone."', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.panelContainer.add(subtitle);

    const state = gameState.get();
    const branches = ['biology', 'chemistry', 'physics', 'engineering'];
    const branchData = ContentData.getResearchBranches();

    let xOffset = -280;
    branches.forEach(branch => {
      const data = branchData[branch];
      const currentLevel = state.research[branch].level;
      const nextLevel = currentLevel + 1;
      const cost = nextLevel * 500;
      const canAfford = state.researchPoints >= cost;

      // Branch column
      const colBg = this.add.rectangle(width / 2 + xOffset, height / 2 + 20, 160, 350, 0x2a2a4e, 1);
      this.panelContainer.add(colBg);

      // Branch name
      const nameText = this.add.text(width / 2 + xOffset, height / 2 - 130, data.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: data.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.panelContainer.add(nameText);

      // Current level
      const levelText = this.add.text(width / 2 + xOffset, height / 2 - 100,
        `Level ${currentLevel}/5`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.panelContainer.add(levelText);

      // Progress bar
      const barBg = this.add.rectangle(width / 2 + xOffset, height / 2 - 70, 120, 15, 0x1a1a2e);
      this.panelContainer.add(barBg);
      const barFill = this.add.rectangle(width / 2 + xOffset - 60 + (currentLevel / 5) * 60,
        height / 2 - 70, (currentLevel / 5) * 120, 15, parseInt(data.color.replace('#', '0x')));
      barFill.setOrigin(0, 0.5);
      this.panelContainer.add(barFill);

      // Description
      const descText = this.add.text(width / 2 + xOffset, height / 2,
        data.levels[Math.min(currentLevel, 4)] || 'Maxed!', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#aaaaaa',
        wordWrap: { width: 140 },
        align: 'center'
      }).setOrigin(0.5);
      this.panelContainer.add(descText);

      // Upgrade button
      if (currentLevel < 5) {
        const upgradeBtn = this.add.rectangle(width / 2 + xOffset, height / 2 + 120, 120, 40,
          canAfford ? 0x4ecdc4 : 0x666666, 1)
          .setInteractive();
        this.panelContainer.add(upgradeBtn);

        const upgradeCostText = this.add.text(width / 2 + xOffset, height / 2 + 120,
          `${cost} RP`, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#1a1a2e',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.panelContainer.add(upgradeCostText);

        if (canAfford) {
          upgradeBtn.on('pointerover', () => upgradeBtn.setFillStyle(0x5dded5, 1));
          upgradeBtn.on('pointerout', () => upgradeBtn.setFillStyle(0x4ecdc4, 1));
          upgradeBtn.on('pointerdown', () => {
            audioSystem.playClick();
            this.upgradeResearch(branch, nextLevel, cost);
          });
        }
      }

      xOffset += 190;
    });
  }

  upgradeResearch(branch, level, cost) {
    if (gameState.spendResearchPoints(cost)) {
      gameState.upgradeResearch(branch, level);

      // Check for equipment unlocks
      const unlocks = ContentData.getResearchUnlocks(branch, level);
      if (unlocks) {
        unlocks.forEach(type => {
          gameState.unlockEquipment(type);
          this.showNotification(`Unlocked: ${type}!`, '#ffd93d');
        });
      }

      this.showNotification(`${branch} upgraded to level ${level}!`, '#4ecdc4');
      gameState.save();
      this.closeActivePanel();
      this.showResearchPanel(); // Refresh
    }
  }

  showAcademiaPanel() {
    this.closeActivePanel();
    this.activePanel = 'academia';

    const { width, height } = this.cameras.main;
    this.createPanelBase('Academia');

    const subtitle = this.add.text(width / 2, height / 2 - 180,
      '"Those who can\'t do... administrate."', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.panelContainer.add(subtitle);

    // Show current workers and hire options
    const workerTypes = ContentData.getAcademiaWorkerTypes();
    const state = gameState.get();

    let yOffset = -100;
    workerTypes.forEach(type => {
      const cost = type.baseCost;
      const canAfford = state.funding >= cost;
      const canHire = state.academia.length < 20;

      const rowBg = this.add.rectangle(width / 2, height / 2 + yOffset, 700, 70, 0x2a2a4e, 1);
      this.panelContainer.add(rowBg);

      // Type name
      const nameText = this.add.text(width / 2 - 320, height / 2 + yOffset - 15, type.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(nameText);

      // Description - with word wrap
      const descText = this.add.text(width / 2 - 320, height / 2 + yOffset + 10, type.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#aaaaaa',
        wordWrap: { width: 350 }
      }).setOrigin(0, 0.5);
      this.panelContainer.add(descText);

      // Cost
      const costText = this.add.text(width / 2 + 200, height / 2 + yOffset,
        `$${cost.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: canAfford ? '#4ecdc4' : '#ff6b6b'
      }).setOrigin(0.5);
      this.panelContainer.add(costText);

      // Hire button
      const hireBtn = this.add.rectangle(width / 2 + 300, height / 2 + yOffset, 80, 35,
        (canAfford && canHire) ? 0x4ecdc4 : 0x666666, 1)
        .setInteractive();
      this.panelContainer.add(hireBtn);

      const hireText = this.add.text(width / 2 + 300, height / 2 + yOffset, 'HIRE', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.panelContainer.add(hireText);

      if (canAfford && canHire) {
        hireBtn.on('pointerover', () => hireBtn.setFillStyle(0x5dded5, 1));
        hireBtn.on('pointerout', () => hireBtn.setFillStyle(0x4ecdc4, 1));
        hireBtn.on('pointerdown', () => {
          audioSystem.playClick();
          this.hireAcademiaWorker(type, cost);
        });
      }

      yOffset += 80;
    });
  }

  hireAcademiaWorker(type, cost) {
    if (gameState.spendFunding(cost)) {
      const worker = {
        id: Date.now() + Math.random(),
        type: type.key,
        name: ContentData.getRandomAcademiaName(),
        skill: Math.floor(Math.random() * 5) + 3,
        traits: ContentData.getRandomTraits(2)
      };
      gameState.addAcademiaWorker(worker);
      this.placeAcademiaSprite(worker);
      this.showNotification(`Hired ${worker.name} as ${type.name}!`, '#4ecdc4');
      if (type.key === 'grant_writer') {
        this.showNotification(`(+${worker.skill * 2}% grant success bonus)`, '#ffd93d');
      }
      gameState.save();
      this.closeActivePanel();
    }
  }

  showGrantPanel() {
    this.closeActivePanel();
    this.activePanel = 'grant';

    const { width, height } = this.cameras.main;
    this.createPanelBase('Grant Applications');

    const state = gameState.get();

    // Calculate grant writer bonus
    let grantWriterBonus = 0;
    state.academia.forEach(worker => {
      if (worker.type === 'grant_writer') {
        grantWriterBonus += worker.skill * 2;
      }
    });

    const subtitle = this.add.text(width / 2, height / 2 - 180,
      '"Please give us money. Please. PLEASE."', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.panelContainer.add(subtitle);

    // Count grant writers and check availability
    const grantWriters = state.academia.filter(w => w.type === 'grant_writer');
    const busyWriterIds = this.activeGrants.map(g => g.assignedWriterId).filter(id => id);
    const availableWriters = grantWriters.filter(w => !busyWriterIds.includes(w.id));
    const busyWriters = grantWriters.filter(w => busyWriterIds.includes(w.id));

    // Show grant writer status
    let writerInfo;
    if (grantWriters.length === 0) {
      writerInfo = 'No writers hired (45s per grant, no bonus)';
    } else if (availableWriters.length === 0) {
      writerInfo = `All ${grantWriters.length} writer(s) busy - wait for grants to finish`;
    } else {
      writerInfo = `${availableWriters.length}/${grantWriters.length} writer(s) available`;
    }

    const bonusText = this.add.text(width / 2, height / 2 - 155, writerInfo, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: availableWriters.length > 0 ? '#4ecdc4' : (grantWriters.length > 0 ? '#ffd93d' : '#888888'),
      fontStyle: availableWriters.length > 0 ? 'bold' : 'normal'
    }).setOrigin(0.5);
    this.panelContainer.add(bonusText);

    // Show available grants (time-limited opportunities)
    if (this.availableGrants.length === 0) {
      const noGrantsText = this.add.text(width / 2, height / 2, 'No grant opportunities available right now.\nCheck back soon!', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#888888',
        align: 'center'
      }).setOrigin(0.5);
      this.panelContainer.add(noGrantsText);
      return;
    }

    let yOffset = -100;
    this.availableGrants.forEach(opportunity => {
      const agency = opportunity.agency;

      const rowBg = this.add.rectangle(width / 2, height / 2 + yOffset, 700, 65, 0x2a2a4e, 1);
      this.panelContainer.add(rowBg);

      // Time remaining indicator (urgency bar)
      const timePercent = opportunity.timeRemaining / opportunity.totalTime;
      const urgencyColor = timePercent > 0.5 ? 0x4ecdc4 : timePercent > 0.25 ? 0xffd93d : 0xff6b6b;
      const urgencyBar = this.add.rectangle(width / 2 - 350, height / 2 + yOffset, 8, 55 * timePercent, urgencyColor);
      urgencyBar.setOrigin(0.5, 1);
      urgencyBar.y += 27;
      this.panelContainer.add(urgencyBar);

      // Agency name - truncate if needed
      const displayAgency = agency.name.length > 28 ? agency.name.substring(0, 25) + '...' : agency.name;
      const nameText = this.add.text(width / 2 - 320, height / 2 + yOffset - 12, displayAgency, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(nameText);

      // Show base success rate (writer bonus added when assigned)
      const successColor = agency.successRate >= 20 ? '#4ecdc4' : agency.successRate >= 10 ? '#ffd93d' : '#ff6b6b';
      const rateDisplay = availableWriters.length > 0
        ? `${agency.successRate}% base (+writer bonus)`
        : `${agency.successRate}% success`;
      const statsText = this.add.text(width / 2 - 320, height / 2 + yOffset + 10,
        rateDisplay, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: successColor
      }).setOrigin(0, 0.5);
      this.panelContainer.add(statsText);

      // Award range
      const awardText = this.add.text(width / 2 + 50, height / 2 + yOffset - 8,
        `$${(agency.minAward/1000).toFixed(0)}K - $${(agency.maxAward/1000).toFixed(0)}K`, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      this.panelContainer.add(awardText);

      // Time remaining
      const timeColor = timePercent > 0.5 ? '#4ecdc4' : timePercent > 0.25 ? '#ffd93d' : '#ff6b6b';
      const timeText = this.add.text(width / 2 + 50, height / 2 + yOffset + 10,
        `${opportunity.timeRemaining}s left`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: timeColor
      }).setOrigin(0, 0.5);
      this.panelContainer.add(timeText);

      // Apply button
      const canApply = availableWriters.length > 0 || grantWriters.length === 0;
      const applyBtn = this.add.rectangle(width / 2 + 300, height / 2 + yOffset, 80, 35,
        canApply ? 0x4ecdc4 : 0x666666, 1)
        .setInteractive();
      this.panelContainer.add(applyBtn);

      const applyText = this.add.text(width / 2 + 300, height / 2 + yOffset, 'APPLY', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.panelContainer.add(applyText);

      if (canApply) {
        applyBtn.on('pointerover', () => applyBtn.setFillStyle(0x5dded5, 1));
        applyBtn.on('pointerout', () => applyBtn.setFillStyle(0x4ecdc4, 1));
        applyBtn.on('pointerdown', () => {
          audioSystem.playClick();
          this.applyForGrantOpportunity(opportunity);
        });
      }

      yOffset += 72;
    });
  }

  applyForGrantOpportunity(opportunity) {
    const state = gameState.get();
    const agency = opportunity.agency;

    // Find an available grant writer (not already working on a grant)
    const grantWriters = state.academia.filter(w => w.type === 'grant_writer');
    const busyWriterIds = this.activeGrants.map(g => g.assignedWriterId).filter(id => id);
    const availableWriter = grantWriters.find(w => !busyWriterIds.includes(w.id));

    // Remove opportunity from available list (claimed)
    const oppIndex = this.availableGrants.findIndex(g => g.id === opportunity.id);
    if (oppIndex !== -1) {
      this.availableGrants.splice(oppIndex, 1);
    }

    if (grantWriters.length === 0) {
      // No grant writers - can still apply but takes longer
      this.closeActivePanel();

      const baseTime = 45; // Longer without a writer
      const grantApplication = {
        id: Date.now(),
        agency: agency,
        timeRemaining: baseTime,
        totalTime: baseTime,
        successRate: agency.successRate,
        grantWriterBonus: 0,
        assignedWriterId: null,
        assignedWriterName: null
      };

      this.activeGrants.push(grantApplication);
      this.showNotification(`Started grant application (${baseTime}s)`, '#ffd93d');
      this.showNotification(`No writers - doing it yourself!`, '#888888');
      this.updateGrantProgressDisplay();
      gameState.save();
      return;
    }

    if (!availableWriter) {
      // All writers are busy - shouldn't happen due to UI check but handle it
      this.showNotification(`All grant writers are busy!`, '#ff6b6b');
      return;
    }

    this.closeActivePanel();

    // Assign this writer to the grant
    const workTime = Math.max(10, 30 - availableWriter.skill * 2); // Better skill = faster
    const successBonus = availableWriter.skill * 2;
    const successRate = Math.min(agency.successRate + successBonus, 95);

    const grantApplication = {
      id: Date.now(),
      agency: agency,
      timeRemaining: workTime,
      totalTime: workTime,
      successRate: successRate,
      grantWriterBonus: successBonus,
      assignedWriterId: availableWriter.id,
      assignedWriterName: availableWriter.name
    };

    this.activeGrants.push(grantApplication);
    this.showNotification(`${availableWriter.name} started grant (${workTime}s)`, '#ffd93d');
    this.showNotification(`+${successBonus}% success from their skill`, '#4ecdc4');

    this.updateGrantProgressDisplay();
    gameState.save();
  }

  processActiveGrants() {
    const state = gameState.get();
    if (!state) return;

    // Count grant writers for work animation
    let hasGrantWriters = state.academia.some(w => w.type === 'grant_writer');

    // Process each active grant
    for (let i = this.activeGrants.length - 1; i >= 0; i--) {
      const grant = this.activeGrants[i];
      grant.timeRemaining--;

      // Show grant writers working periodically
      if (hasGrantWriters && grant.timeRemaining % 3 === 0) {
        this.showGrantWritersWorking();
      }

      // Grant complete
      if (grant.timeRemaining <= 0) {
        this.resolveGrant(grant);
        this.activeGrants.splice(i, 1);
      }
    }

    // Update display
    this.updateGrantProgressDisplay();
  }

  resolveGrant(grant) {
    const success = Math.random() * 100 < grant.successRate;

    if (success) {
      const award = Phaser.Math.Between(grant.agency.minAward, grant.agency.maxAward);
      gameState.addFunding(award);
      this.showNotification(`GRANT APPROVED! +$${award.toLocaleString()}`, '#4ecdc4');
      if (grant.grantWriterBonus > 0) {
        this.showNotification(`Writers helped! (+${grant.grantWriterBonus}% bonus)`, '#ffd93d');
      }
    } else {
      const reason = ContentData.getRandomRejection();
      this.showNotification(`Grant rejected: "${reason}"`, '#ff6b6b');
      gameState.incrementStat('dreamsDestroyed');
    }

    gameState.save();
  }

  updateGrantProgressDisplay() {
    // Remove old progress displays
    if (this.grantProgressTexts) {
      this.grantProgressTexts.forEach(t => t.destroy());
    }
    this.grantProgressTexts = [];

    const { width, height } = this.cameras.main;

    // Show active grants in top right area
    this.activeGrants.forEach((grant, index) => {
      const y = 115 + index * 25;
      const progress = 1 - (grant.timeRemaining / grant.totalTime);

      // Background bar
      const barBg = this.add.rectangle(width - 150, y, 200, 18, 0x1a1a2e, 0.9).setDepth(150);
      this.grantProgressTexts.push(barBg);

      // Progress bar
      const barFill = this.add.rectangle(width - 250, y, progress * 200, 18, 0xffd93d, 0.8).setDepth(151);
      barFill.setOrigin(0, 0.5);
      this.grantProgressTexts.push(barFill);

      // Text - show writer name if assigned
      const writerLabel = grant.assignedWriterName ? grant.assignedWriterName.split(' ')[0] : 'You';
      const label = this.add.text(width - 250, y, `${writerLabel}: ${grant.timeRemaining}s`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setDepth(152);
      this.grantProgressTexts.push(label);
    });

    // Update grant bonus display to show active work
    if (this.grantBonusText && this.activeGrants.length > 0) {
      this.grantBonusText.setText(`Working on ${this.activeGrants.length} grant(s)...`);
      this.grantBonusText.setColor('#ffd93d');
    } else if (this.grantBonusText) {
      this.updateGrantBonusDisplay();
    }
  }

  showGrantWritersWorking() {
    // Animate grant writers
    this.academiaSprites.forEach(sprite => {
      const state = gameState.get();
      const worker = state.academia.find(w => w.id === sprite.workerId);
      if (worker && worker.type === 'grant_writer') {
        // Small paper particle
        const paper = this.add.rectangle(
          sprite.x + Phaser.Math.Between(-10, 10),
          sprite.y - 10,
          6, 8, 0xf0f0f0, 0.8
        );
        this.tweens.add({
          targets: paper,
          y: paper.y - 30,
          alpha: 0,
          duration: 600,
          onComplete: () => paper.destroy()
        });
      }
    });
  }

  showCrisisPanel(crisis) {
    this.closeActivePanel();
    this.activePanel = 'crisis';

    const { width, height } = this.cameras.main;
    this.createPanelBase('CRISIS!');

    // Crisis title
    const crisisTitle = this.add.text(width / 2, height / 2 - 150, crisis.title, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panelContainer.add(crisisTitle);

    // Crisis description
    const crisisDesc = this.add.text(width / 2, height / 2 - 80, crisis.description, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: 600 },
      align: 'center'
    }).setOrigin(0.5);
    this.panelContainer.add(crisisDesc);

    // Response options
    let yOffset = 20;
    crisis.responses.forEach((response, index) => {
      const responseBtn = this.add.rectangle(width / 2, height / 2 + yOffset, 500, 50, 0x2a2a4e, 1)
        .setInteractive()
        .setStrokeStyle(2, 0x4ecdc4);
      this.panelContainer.add(responseBtn);

      const responseText = this.add.text(width / 2, height / 2 + yOffset, response.text, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.panelContainer.add(responseText);

      responseBtn.on('pointerover', () => responseBtn.setFillStyle(0x3a3a5e, 1));
      responseBtn.on('pointerout', () => responseBtn.setFillStyle(0x2a2a4e, 1));
      responseBtn.on('pointerdown', () => {
        audioSystem.playClick();
        this.resolveCrisis(response.effect);
      });

      yOffset += 70;
    });
  }

  resolveCrisis(effect) {
    gameState.applyCrisisEffect(effect);

    if (effect.funding) {
      const sign = effect.funding >= 0 ? '+' : '';
      this.showNotification(`Funding: ${sign}$${effect.funding.toLocaleString()}`,
        effect.funding >= 0 ? '#4ecdc4' : '#ff6b6b');
    }

    if (effect.researchPoints) {
      const sign = effect.researchPoints >= 0 ? '+' : '';
      this.showNotification(`Research: ${sign}${effect.researchPoints} RP`,
        effect.researchPoints >= 0 ? '#ffd93d' : '#ff6b6b');
    }

    gameState.save();
    this.closeActivePanel();
  }

  showEquipmentInfo(slotIndex, type) {
    const equipData = ContentData.getEquipmentData(type);
    if (!equipData) return;

    // Simple info notification for now
    this.showNotification(`${equipData.name}: +${equipData.bonus}% research speed`, '#4ecdc4');
  }

  showScientistPanel(scientistId) {
    const state = gameState.get();
    const scientist = state.scientists.find(s => s.id === scientistId);
    if (!scientist) return;

    this.closeActivePanel();
    this.activePanel = 'scientist-info';

    const { width, height } = this.cameras.main;

    // Dim background
    const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();
    dimBg.on('pointerdown', () => this.closeActivePanel());
    this.panelContainer.add(dimBg);

    // Smaller panel for scientist info
    const panelBg = this.add.rectangle(width / 2, height / 2, 450, 320, 0x16213e, 1)
      .setStrokeStyle(3, 0x4ecdc4);
    this.panelContainer.add(panelBg);
    panelBg.setInteractive();

    // Title
    const displayName = scientist.name.length > 25 ? scientist.name.substring(0, 22) + '...' : scientist.name;
    const titleText = this.add.text(width / 2, height / 2 - 120, displayName, {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#4ecdc4'
    }).setOrigin(0.5);
    this.panelContainer.add(titleText);

    // Close button
    const closeBtn = this.add.text(width / 2 + 200, height / 2 - 140, 'X', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#ff6b6b'
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.closeActivePanel();
    });
    this.panelContainer.add(closeBtn);

    // Scientist sprite
    const sprite = this.scientistSprites.find(s => s.scientistId === scientistId);
    const isAssigned = sprite && sprite.assignedSlot !== null;

    // Type
    this.panelContainer.add(this.add.text(width / 2, height / 2 - 80, scientist.type, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5));

    // Skill bar
    this.panelContainer.add(this.add.text(width / 2 - 100, height / 2 - 45, 'Skill:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0, 0.5));

    const skillBarBg = this.add.rectangle(width / 2 + 20, height / 2 - 45, 120, 16, 0x1a1a2e);
    this.panelContainer.add(skillBarBg);
    const skillBarFill = this.add.rectangle(width / 2 - 40, height / 2 - 45, (scientist.skill / 10) * 120, 16, 0x4ecdc4);
    skillBarFill.setOrigin(0, 0.5);
    this.panelContainer.add(skillBarFill);
    this.panelContainer.add(this.add.text(width / 2 + 100, height / 2 - 45, `${scientist.skill}/10`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0, 0.5));

    // Status
    const statusText = scientist.exhausted ? 'BURNED OUT' : (isAssigned ? 'Working at equipment' : 'Idle (no equipment)');
    const statusColor = scientist.exhausted ? '#ff6b6b' : (isAssigned ? '#4ecdc4' : '#ffd93d');
    this.panelContainer.add(this.add.text(width / 2, height / 2 - 10, statusText, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: statusColor,
      fontStyle: 'bold'
    }).setOrigin(0.5));

    // Traits
    if (scientist.traits && scientist.traits.length > 0) {
      this.panelContainer.add(this.add.text(width / 2, height / 2 + 25, scientist.traits.join(', '), {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5));
    }

    // Salary info
    this.panelContainer.add(this.add.text(width / 2, height / 2 + 55, 'Salary: $150/second', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ff6b6b'
    }).setOrigin(0.5));

    // Fire button
    const fireBtn = this.add.rectangle(width / 2, height / 2 + 110, 150, 45, 0xff6b6b, 1)
      .setInteractive()
      .setStrokeStyle(2, 0xff4444);
    this.panelContainer.add(fireBtn);

    const fireText = this.add.text(width / 2, height / 2 + 110, 'FIRE', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.panelContainer.add(fireText);

    fireBtn.on('pointerover', () => fireBtn.setFillStyle(0xff4444, 1));
    fireBtn.on('pointerout', () => fireBtn.setFillStyle(0xff6b6b, 1));
    fireBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.fireScientist(scientistId, scientist.name);
    });
  }

  fireScientist(scientistId, name) {
    // Remove from state
    gameState.removeScientist(scientistId);

    // Remove sprite
    const spriteIndex = this.scientistSprites.findIndex(s => s.scientistId === scientistId);
    if (spriteIndex !== -1) {
      const sprite = this.scientistSprites[spriteIndex];
      if (sprite.statusBg) sprite.statusBg.destroy();
      if (sprite.statusText) sprite.statusText.destroy();
      sprite.destroy();
      this.scientistSprites.splice(spriteIndex, 1);
    }

    // Dark firing messages
    const firingMessages = [
      `${name} has been "released to pursue other opportunities."`,
      `${name}'s dreams: crushed. Your budget: slightly better.`,
      `${name} joins the 94% who leave academia. Smart.`,
      `Fired ${name}. They'll be happier in industry anyway.`,
      `${name} is now someone else's problem. Congrats.`,
      `${name} asked for a raise. You gave them freedom instead.`,
      `${name} will tell their therapist about this.`,
      `${name}'s imposter syndrome was right all along.`,
    ];
    const msg = firingMessages[Math.floor(Math.random() * firingMessages.length)];
    this.showNotification(msg, '#ff6b6b');
    gameState.incrementStat('dreamsDestroyed');
    this.updateDreamsCrushed();
    gameState.save();
    this.closeActivePanel();

    // Reassign remaining scientists to equipment
    this.reassignScientists();
  }

  reassignScientists() {
    const state = gameState.get();
    if (!state) return;

    // Rebuild scientist positions based on available equipment
    this.scientistSprites.forEach(sprite => {
      if (sprite.statusBg) sprite.statusBg.destroy();
      if (sprite.statusText) sprite.statusText.destroy();
      sprite.destroy();
    });
    this.scientistSprites = [];

    // Re-place all scientists
    state.scientists.forEach(sci => {
      this.placeScientistSprite(sci);
    });
  }

  showScientistInfo(scientist) {
    // Legacy - redirect to panel
    this.showScientistPanel(scientist.id);
  }

  showAcademiaWorkerPanel(workerId) {
    const state = gameState.get();
    const worker = state.academia.find(w => w.id === workerId);
    if (!worker) return;

    this.closeActivePanel();
    this.activePanel = 'academia-info';

    const { width, height } = this.cameras.main;

    // Dim background
    const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive();
    dimBg.on('pointerdown', () => this.closeActivePanel());
    this.panelContainer.add(dimBg);

    // Smaller panel for worker info
    const panelBg = this.add.rectangle(width / 2, height / 2, 400, 280, 0x16213e, 1)
      .setStrokeStyle(3, this.getWorkerTint(worker.type));
    this.panelContainer.add(panelBg);
    panelBg.setInteractive();

    // Get type data
    const typeData = ContentData.getAcademiaWorkerTypes().find(t => t.key === worker.type);
    const typeName = typeData ? typeData.name : worker.type;

    // Title
    const displayName = worker.name.length > 20 ? worker.name.substring(0, 17) + '...' : worker.name;
    const titleText = this.add.text(width / 2, height / 2 - 100, displayName, {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.panelContainer.add(titleText);

    // Close button
    const closeBtn = this.add.text(width / 2 + 175, height / 2 - 120, 'X', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#ff6b6b'
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.closeActivePanel();
    });
    this.panelContainer.add(closeBtn);

    // Type
    this.panelContainer.add(this.add.text(width / 2, height / 2 - 65, typeName, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#' + this.getWorkerTint(worker.type).toString(16).padStart(6, '0')
    }).setOrigin(0.5));

    // Skill
    this.panelContainer.add(this.add.text(width / 2, height / 2 - 35, `Skill: ${worker.skill}/10`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5));

    // Effect description
    let effectText = 'General admin duties';
    if (worker.type === 'grant_writer') {
      effectText = `+${worker.skill * 2}% grant success bonus`;
    } else if (worker.type === 'lab_manager') {
      effectText = 'Equipment cost reduction (coming soon)';
    } else if (worker.type === 'technician') {
      effectText = 'Equipment efficiency boost (coming soon)';
    }
    this.panelContainer.add(this.add.text(width / 2, height / 2, effectText, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#4ecdc4'
    }).setOrigin(0.5));

    // Salary info
    this.panelContainer.add(this.add.text(width / 2, height / 2 + 35, 'Salary: $110/second', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ff6b6b'
    }).setOrigin(0.5));

    // Fire button
    const fireBtn = this.add.rectangle(width / 2, height / 2 + 90, 140, 40, 0xff6b6b, 1)
      .setInteractive()
      .setStrokeStyle(2, 0xff4444);
    this.panelContainer.add(fireBtn);

    const fireText = this.add.text(width / 2, height / 2 + 90, 'FIRE', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.panelContainer.add(fireText);

    fireBtn.on('pointerover', () => fireBtn.setFillStyle(0xff4444, 1));
    fireBtn.on('pointerout', () => fireBtn.setFillStyle(0xff6b6b, 1));
    fireBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.fireAcademiaWorker(workerId, worker.name);
    });
  }

  fireAcademiaWorker(workerId, name) {
    // Remove from state
    gameState.removeAcademiaWorker(workerId);

    // Remove sprite
    const spriteIndex = this.academiaSprites.findIndex(s => s.workerId === workerId);
    if (spriteIndex !== -1) {
      const sprite = this.academiaSprites[spriteIndex];
      if (sprite.desk) sprite.desk.destroy();
      if (sprite.typeLabel) sprite.typeLabel.destroy();
      sprite.destroy();
      this.academiaSprites.splice(spriteIndex, 1);
    }

    // Dark firing messages for admin staff
    const adminFireMessages = [
      `${name} has been "restructured out of existence."`,
      `${name} learned academia eats its own.`,
      `Fired ${name}. The paperwork will haunt someone else now.`,
      `${name}'s LinkedIn is about to get very active.`,
      `${name} finally escaped. Lucky them.`,
      `${name} is free. You are still here.`,
    ];
    const msg = adminFireMessages[Math.floor(Math.random() * adminFireMessages.length)];
    this.showNotification(msg, '#ff6b6b');
    gameState.incrementStat('dreamsDestroyed');
    this.updateDreamsCrushed();
    gameState.save();
    this.closeActivePanel();

    // Update grant bonus display
    this.updateGrantBonusDisplay();
  }

  shutdown() {
    // Clean up listeners
    gameState.removeListener(this.onStateChange.bind(this));

    // Stop timers
    if (this.gameLoopTimer) this.gameLoopTimer.remove();
    if (this.saveTimer) this.saveTimer.remove();
  }
}
