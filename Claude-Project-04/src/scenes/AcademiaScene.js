import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';

export default class AcademiaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AcademiaScene' });
    this.candidates = [];
  }

  init() {
    this.gameState = this.registry.get('gameState');
    this.candidates = []; // Reset candidates array

    if (!this.gameState) {
      console.error('No gameState found, returning to menu');
      this.scene.start('MenuScene');
      return;
    }

    // Initialize academia array if not exists
    if (!this.gameState.academia) {
      this.gameState.academia = [];
    }
  }

  create() {
    try {
      if (!this.gameState) {
        this.scene.start('MenuScene');
        return;
      }

      const { width, height } = this.cameras.main;

      // Dark overlay
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

      // Main panel
      this.add.rectangle(width / 2, height / 2, 950, 620, 0x1a1a2e, 0.98)
        .setStrokeStyle(3, 0xa55eea);

      // Title with dark humor
      this.add.text(width / 2, 85, 'ACADEMIC "OPPORTUNITIES"', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#a55eea'
      }).setOrigin(0.5);

      // Subtitle
      this.add.text(width / 2, 115, '"Building the future workforce, one unpaid hour at a time"', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888',
        fontStyle: 'italic'
      }).setOrigin(0.5);

      // Budget display
      this.add.image(width / 2 - 100, 150, 'coin').setScale(1.2);
      this.add.text(width / 2 - 75, 142, `$${this.gameState.funding.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffd93d',
        fontStyle: 'bold'
      });

      // Worker count
      const academiaCount = this.gameState.academia ? this.gameState.academia.length : 0;
      this.add.text(width / 2 + 50, 142, `"Trainees": ${academiaCount}/20`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      });

      // Generate candidates
      this.generateCandidates();

      // Display candidates
      this.displayCandidates(width, height);

      // Buttons
      this.createCloseButton(width, height);
      this.createRefreshButton(width, height);

      // Dark humor disclaimer
      this.add.text(width / 2, height - 25, '* "Stipends" are not wages. Benefits include "experience" and "exposure".', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#666666',
        fontStyle: 'italic'
      }).setOrigin(0.5);
    } catch (error) {
      console.error('AcademiaScene create error:', error);
      this.scene.start('LabScene');
    }
  }

  generateCandidates() {
    this.candidates = [];

    const workerTypes = [
      {
        type: 'undergrad',
        title: 'Undergraduate Researcher',
        description: '"Gains valuable experience" (unpaid labor)',
        stipend: 0,
        workHours: '10-20 hrs/week (officially)',
        realHours: 25,
        productivity: 0.3,
        stressRate: 0.5,
        duration: '1-2 semesters',
        color: 0x4ecdc4,
        darkQuote: '"This will look great on grad school apps!" - You, lying'
      },
      {
        type: 'masters',
        title: 'Master\'s Student',
        description: 'Pays $60K tuition to pipette for you',
        stipend: 0,
        workHours: '20 hrs/week (in theory)',
        realHours: 35,
        productivity: 0.5,
        stressRate: 0.7,
        duration: '2 years of debt',
        color: 0x95e1d3,
        darkQuote: '"At least it\'s not a PhD" - Coping mechanism'
      },
      {
        type: 'phd',
        title: 'PhD Candidate',
        description: '6-8 years of "training" below poverty line',
        stipend: 2500,
        workHours: '40 hrs/week (LOL)',
        realHours: 65,
        productivity: 0.8,
        stressRate: 1.0,
        duration: '6-8 years (median)',
        color: 0xffd93d,
        darkQuote: '"I\'ll finish next year" - Said every year since 2019'
      },
      {
        type: 'postdoc',
        title: 'Postdoctoral Fellow',
        description: 'PhD + 5 years exp = less than Costco cashier',
        stipend: 4500,
        workHours: 'All of them',
        realHours: 70,
        productivity: 1.0,
        stressRate: 1.2,
        duration: '2-6 years (career purgatory)',
        color: 0xff6b6b,
        darkQuote: '"Any day now a faculty position will open" - Age 42'
      },
      {
        type: 'adjunct',
        title: 'Adjunct Professor',
        description: 'PhD teaching 4 classes for $3K each, no benefits',
        stipend: 1000,
        workHours: 'Per course (x4 courses)',
        realHours: 50,
        productivity: 0.6,
        stressRate: 1.5,
        duration: 'Semester to semester',
        color: 0xa55eea,
        darkQuote: '"At least I\'m still in academia" - From their car'
      },
      {
        type: 'visiting',
        title: 'Visiting Scholar',
        description: 'Works for visa status, university pays nothing',
        stipend: 0,
        workHours: 'Whatever keeps visa valid',
        realHours: 55,
        productivity: 0.9,
        stressRate: 1.3,
        duration: 'Until visa expires',
        color: 0x6ecfcf,
        darkQuote: '"If I leave, I get deported" - Leverage, academic style'
      }
    ];

    // Generate 4 random candidates
    for (let i = 0; i < 4; i++) {
      const template = workerTypes[Phaser.Math.Between(0, workerTypes.length - 1)];
      const traits = this.generateTraits(template.type);

      this.candidates.push({
        id: Date.now() + i,
        ...template,
        name: this.generateName(),
        stats: {
          intelligence: Phaser.Math.Between(40, 95),
          desperation: Phaser.Math.Between(60, 100), // How badly they need this
          caffeine: Phaser.Math.Between(50, 100),    // Coffee dependency
          hope: Phaser.Math.Between(10, 80)          // Decreases over time
        },
        traits: traits,
        stress: 0,
        burnout: 0,
        papers: 0,
        monthsWorked: 0,
        assigned: null
      });
    }
  }

  generateName() {
    const firstNames = [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
      'Sam', 'Jamie', 'Drew', 'Sage', 'Reese', 'Finley', 'Rowan', 'Emerson',
      'Skyler', 'Parker', 'Charlie', 'Hayden', 'Dakota', 'River', 'Phoenix'
    ];
    const lastNames = [
      'Chen', 'Smith', 'Garcia', 'Patel', 'Kim', 'Nguyen', 'Singh', 'Brown',
      'Lee', 'Johnson', 'Martinez', 'Anderson', 'Thomas', 'Jackson', 'White',
      'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen'
    ];
    return `${firstNames[Phaser.Math.Between(0, firstNames.length - 1)]} ${lastNames[Phaser.Math.Between(0, lastNames.length - 1)]}`;
  }

  generateTraits(type) {
    const allTraits = [
      // Mental health dystopia
      { name: 'Imposter Syndrome', effect: 'stressBonus', value: 0.3, desc: '+30% stress gain', icon: '😰' },
      { name: 'Stockholm Syndrome', effect: 'loyaltyBonus', value: 0.5, desc: 'Thinks abuse is mentorship', icon: '🙃' },
      { name: 'Anxiety Spiral', effect: 'stressBonus', value: 0.5, desc: 'Every email triggers panic', icon: '😱' },
      { name: 'Depression (Untreated)', effect: 'productivityPenalty', value: -0.2, desc: 'Insurance doesn\'t cover therapy', icon: '🌑' },
      { name: 'Dissociation Expert', effect: 'stressResist', value: 0.3, desc: 'Has learned to feel nothing', icon: '😶' },

      // Exploitation traits
      { name: 'Can\'t Say No', effect: 'exploitBonus', value: 0.5, desc: 'Will work weekends if asked', icon: '😅' },
      { name: 'Workaholic', effect: 'hoursBonus', value: 0.5, desc: 'Lab is only identity left', icon: '💀' },
      { name: 'Perfectionist', effect: 'qualityBonus', value: 0.3, desc: 'Never publishes (not good enough)', icon: '✨' },
      { name: 'Savior Complex', effect: 'overtimeBonus', value: 0.4, desc: '"If I don\'t do it, no one will"', icon: '🦸' },

      // Survival traits
      { name: 'Ramen Budget', effect: 'costReduction', value: 0.3, desc: 'Hasn\'t eaten vegetables in months', icon: '🍜' },
      { name: 'Car Sleeper', effect: 'costReduction', value: 0.5, desc: 'Rent > Stipend', icon: '🚗' },
      { name: 'Food Bank Regular', effect: 'costReduction', value: 0.4, desc: 'PhD + SNAP benefits', icon: '📦' },
      { name: 'Side Hustle', effect: 'distraction', value: 0.2, desc: 'Drives Uber between experiments', icon: '🚕' },

      // Coping mechanisms
      { name: 'Coffee Addict', effect: 'caffeineBonus', value: 0.4, desc: '8 cups/day minimum', icon: '☕' },
      { name: 'Functioning Alcoholic', effect: 'stressCoping', value: 0.3, desc: 'Wine after every rejection', icon: '🍷' },
      { name: 'Doom Scroller', effect: 'procrastination', value: 0.3, desc: 'Reads Twitter instead of papers', icon: '📱' },
      { name: 'Emotional Eater', effect: 'stressCoping', value: 0.2, desc: 'Stress = vending machine', icon: '🍫' },

      // Career delusion
      { name: 'Eternal Optimist', effect: 'hopeDecay', value: -0.2, desc: 'Still believes tenure exists', icon: '🌈' },
      { name: 'Sunk Cost Prisoner', effect: 'retention', value: 0.9, desc: '"8 years in, can\'t quit now"', icon: '⛓️' },
      { name: 'Industry Curious', effect: 'flightRisk', value: 0.4, desc: 'Has LinkedIn open in another tab', icon: '🚪' },
      { name: 'Delusional', effect: 'hopePersist', value: 0.5, desc: 'Thinks they\'ll get that faculty job', icon: '🤡' },

      // Toxic productivity
      { name: 'Night Owl', effect: 'nightBonus', value: 0.3, desc: 'Best ideas at 3 AM (worst decisions too)', icon: '🦉' },
      { name: 'Weekend Warrior', effect: 'weekendWork', value: 0.4, desc: 'What\'s a "day off"?', icon: '📅' },
      { name: 'Vacation Guilt', effect: 'noTimeOff', value: 0.5, desc: 'Takes laptop on honeymoon', icon: '🏖️' },
      { name: 'Email Addiction', effect: 'alwaysOn', value: 0.3, desc: 'Checks inbox at 2 AM, 4 AM, 6 AM...', icon: '📧' }
    ];

    // PhD and postdocs get more traits (more time to develop issues)
    const numTraits = type === 'postdoc' ? 3 : type === 'phd' ? 2 : 1;
    const traits = [];
    const usedIndices = new Set();

    for (let i = 0; i < numTraits; i++) {
      let index;
      do {
        index = Phaser.Math.Between(0, allTraits.length - 1);
      } while (usedIndices.has(index));
      usedIndices.add(index);
      traits.push(allTraits[index]);
    }

    return traits;
  }

  displayCandidates(width, height) {
    const typeColors = {
      undergrad: { bg: 0x1e4a4a, border: 0x4ecdc4, label: 'FREE LABOR', borderStr: '#4ecdc4' },
      masters: { bg: 0x1e4a3a, border: 0x95e1d3, label: 'PAYS YOU', borderStr: '#95e1d3' },
      phd: { bg: 0x4a3a1e, border: 0xffd93d, label: 'INDENTURED', borderStr: '#ffd93d' },
      postdoc: { bg: 0x4a1e1e, border: 0xff6b6b, label: 'DESPERATE', borderStr: '#ff6b6b' },
      adjunct: { bg: 0x3a1e4a, border: 0xa55eea, label: 'EXPLOITED', borderStr: '#a55eea' },
      visiting: { bg: 0x1e3a4a, border: 0x6ecfcf, label: 'VISA HOSTAGE', borderStr: '#6ecfcf' }
    };

    // Default color fallback
    const defaultColors = { bg: 0x3d4a5a, border: 0x6b7280, label: 'UNKNOWN', borderStr: '#6b7280' };

    this.candidates.forEach((candidate, i) => {
      try {
        const cardX = width / 2 - 220 + (i % 2) * 440;
        const cardY = 300 + Math.floor(i / 2) * 200;
        const colors = typeColors[candidate.type] || defaultColors;

        // Card background
        const card = this.add.rectangle(cardX, cardY, 400, 175, colors.bg, 0.95)
          .setStrokeStyle(2, colors.border);

        // Type label with dark humor
        this.add.text(cardX - 180, cardY - 78, colors.label, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: colors.borderStr,
          fontStyle: 'bold'
        });

      // Title
      this.add.text(cardX - 180, cardY - 60, candidate.title, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      });

      // Name
      this.add.text(cardX - 180, cardY - 40, candidate.name, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#aaaaaa'
      });

      // Dark description (with word wrap)
      this.add.text(cardX - 180, cardY - 20, candidate.description, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888',
        fontStyle: 'italic',
        wordWrap: { width: 280 }
      });

      // Stats with dark humor labels
      const stats = [
        { label: 'INT', value: candidate.stats.intelligence, color: '#4ecdc4', tip: 'Wasted potential' },
        { label: 'DESP', value: candidate.stats.desperation, color: '#ff6b6b', tip: 'Desperation level' },
        { label: 'CAFF', value: candidate.stats.caffeine, color: '#ffd93d', tip: 'Coffee dependency' },
        { label: 'HOPE', value: candidate.stats.hope, color: '#a55eea', tip: 'Will decrease' }
      ];

      stats.forEach((stat, j) => {
        const statX = cardX - 180 + j * 55;
        const statY = cardY + 10;

        this.add.text(statX, statY, stat.label, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#666666'
        });

        this.add.text(statX, statY + 14, `${stat.value}`, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: stat.color,
          fontStyle: 'bold'
        });
      });

      // Traits (truncate long names to prevent overflow)
      if (candidate.traits.length > 0) {
        candidate.traits.forEach((trait, j) => {
          // Truncate trait name to max 14 chars
          const shortName = trait.name.length > 14 ? trait.name.substring(0, 12) + '..' : trait.name;
          this.add.text(cardX - 180 + j * 120, cardY + 45, `${trait.icon}${shortName}`, {
            fontFamily: 'Arial',
            fontSize: '9px',
            color: '#ffd93d',
            backgroundColor: '#2d3a4a',
            padding: { x: 3, y: 2 }
          });
        });
      }

      // Hours and "stipend"
      this.add.text(cardX - 180, cardY + 68, `Hours: ${candidate.workHours}`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888'
      });

      // Cost display
      const costText = candidate.stipend === 0
        ? 'Cost: FREE! (priceless exploitation)'
        : `"Stipend": $${candidate.stipend}/mo`;

      this.add.text(cardX + 20, cardY + 68, costText, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: candidate.stipend === 0 ? '#4ecdc4' : '#ff6b6b'
      });

      // Recruit button
      const canRecruit = this.gameState.academia.length < 20;
      const btnText = candidate.stipend === 0 ? 'Exploit' : 'Recruit';

      const recruitBtn = this.add.rectangle(cardX + 160, cardY - 50, 70, 30,
        canRecruit ? colors.border : 0x666666)
        .setInteractive();

      this.add.text(cardX + 160, cardY - 50, btnText, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      if (canRecruit) {
        recruitBtn.on('pointerover', () => recruitBtn.setFillStyle(0xffffff));
        recruitBtn.on('pointerout', () => recruitBtn.setFillStyle(colors.border));
        recruitBtn.on('pointerdown', () => this.recruitWorker(candidate));
      }
      } catch (err) {
        console.error('Error displaying candidate:', candidate, err);
      }
    });
  }

  recruitWorker(candidate) {
    if (this.gameState.academia.length < 20) {
      audioSystem.playHire();

      // Add dark humor notification
      const messages = [
        `${candidate.name} has joined your lab! Their dreams are now your resource.`,
        `${candidate.name} signed their life away. Welcome aboard!`,
        `Another bright mind enters the academic meat grinder.`,
        `${candidate.name} chose passion over financial stability.`,
        `${candidate.name}'s parents are "so proud" of their unpaid researcher.`
      ];

      // Set position
      candidate.x = Phaser.Math.Between(150, 1100);
      candidate.y = Phaser.Math.Between(250, 550);

      this.gameState.academia.push(candidate);

      // Return to lab scene
      this.scene.start('LabScene');
    }
  }

  showDarkNotification(message) {
    const { width, height } = this.cameras.main;

    const notification = this.add.text(width / 2, height - 80, message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#4a1e4a',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: notification,
      y: height - 100,
      alpha: 0,
      duration: 4000,
      onComplete: () => notification.destroy()
    });
  }

  createRefreshButton(width, height) {
    const refreshBtn = this.add.rectangle(width / 2 - 100, height - 60, 160, 40, 0xffd93d)
      .setInteractive();

    this.add.text(width / 2 - 100, height - 60, 'New Applicants', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    refreshBtn.on('pointerover', () => refreshBtn.setFillStyle(0xf0c800));
    refreshBtn.on('pointerout', () => refreshBtn.setFillStyle(0xffd93d));
    refreshBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.scene.restart();
    });
  }

  createCloseButton(width, height) {
    const closeBtn = this.add.rectangle(width / 2 + 100, height - 60, 120, 40, 0xa55eea)
      .setInteractive();

    this.add.text(width / 2 + 100, height - 60, 'Close', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeBtn.on('pointerover', () => {
      closeBtn.setFillStyle(0x8844cc);
      audioSystem.playHover();
    });
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xa55eea));
    closeBtn.on('pointerdown', () => {
      audioSystem.playClick();
      this.scene.start('LabScene');
    });
  }
}
