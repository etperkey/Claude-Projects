import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';

export default class HireScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HireScene' });
    this.candidates = [];
  }

  init() {
    this.gameState = this.registry.get('gameState');
    this.candidates = []; // Reset candidates array

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
        this.scene.start('MenuScene');
        return;
      }

      const { width, height } = this.cameras.main;

      // Dark overlay
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

      // Main panel
      this.add.rectangle(width / 2, height / 2, 900, 550, 0x1a1a2e, 0.98)
        .setStrokeStyle(3, 0x4ecdc4);

      // Title with satirical subtitle
      this.add.text(width / 2, 100, 'HIRE SCIENTISTS', {
        fontFamily: 'Arial Black',
        fontSize: '36px',
        color: '#4ecdc4'
      }).setOrigin(0.5);

      // Rotating dark taglines
      const darkTaglines = [
        '"Will Work for Grant Money"',
        '"Exploiting Dreams Since 1088 AD"',
        '"Where PhDs Come to Die"',
        '"Cheaper Than Automation (For Now)"',
        '"Why Pay Living Wages?"',
        '"Fresh Meat for the Academic Mill"',
        '"Your Suffering, Our Publications"',
        '"H-Index > Human Rights"'
      ];
      const selectedTagline = darkTaglines[Phaser.Math.Between(0, darkTaglines.length - 1)];

      this.add.text(width / 2, 135, selectedTagline, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ff6b6b',
        fontStyle: 'italic'
      }).setOrigin(0.5);

      // Funding display
      this.add.image(width / 2 - 80, 160, 'coin').setScale(1.2);
      this.fundingText = this.add.text(width / 2 - 55, 152, `$${this.gameState.funding.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffd93d',
        fontStyle: 'bold'
      });

      // Current scientists count
      this.add.text(width / 2 + 50, 152, `Scientists: ${this.gameState.scientists.length}/10`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      });

      // Generate candidates
      this.generateCandidates();

      // Display candidates
      this.displayCandidates(width, height);

      // Close button
      this.createCloseButton(width, height);

      // Refresh button
      this.createRefreshButton(width, height);
    } catch (error) {
      console.error('HireScene create error:', error);
      this.scene.start('LabScene');
    }
  }

  generateCandidates() {
    this.candidates = [];
    const types = ['biologist', 'chemist', 'physicist', 'engineer'];
    const typeNames = {
      biologist: 'Biologist',
      chemist: 'Chemist',
      physicist: 'Physicist',
      engineer: 'Engineer'
    };

    for (let i = 0; i < 4; i++) {
      const type = types[Phaser.Math.Between(0, 3)];
      const quality = Phaser.Math.Between(1, 3); // 1 = common, 2 = rare, 3 = legendary

      // Scientist salary costs (annual, simplified for game)
      const baseCost = 5000;
      const qualityMultiplier = quality === 3 ? 4 : quality === 2 ? 2 : 1;

      this.candidates.push({
        id: Date.now() + i,
        type: type,
        typeName: typeNames[type],
        name: this.generateName(type),
        stats: {
          intelligence: this.generateStat(quality),
          speed: this.generateStat(quality),
          luck: this.generateStat(quality)
        },
        traits: this.generateTraits(quality),
        cost: baseCost * qualityMultiplier,
        quality: quality,
        level: 1,
        xp: 0,
        morale: 100,
        assigned: null
      });
    }
  }

  generateStat(quality) {
    const min = quality === 3 ? 70 : quality === 2 ? 50 : 30;
    const max = quality === 3 ? 100 : quality === 2 ? 85 : 70;
    return Phaser.Math.Between(min, max);
  }

  generateName(type) {
    // Famous scientists organized by field
    const scientists = {
      biologist: [
        'Dr. Charles Darwin', 'Dr. Gregor Mendel', 'Dr. Rosalind Franklin', 'Dr. Barbara McClintock',
        'Dr. James Watson', 'Dr. Francis Crick', 'Dr. Jennifer Doudna', 'Dr. Craig Venter',
        'Dr. Jane Goodall', 'Dr. Rachel Carson', 'Dr. Louis Pasteur', 'Dr. Alexander Fleming',
        'Dr. Carl Linnaeus', 'Dr. Ernst Mayr', 'Dr. E.O. Wilson', 'Dr. Sydney Brenner',
        'Dr. Emmanuelle Charpentier', 'Dr. Tu Youyou', 'Dr. Katalin Karikó', 'Dr. Shinya Yamanaka'
      ],
      chemist: [
        'Dr. Marie Curie', 'Dr. Linus Pauling', 'Dr. Dorothy Hodgkin', 'Dr. Antoine Lavoisier',
        'Dr. Dmitri Mendeleev', 'Dr. Robert Boyle', 'Dr. Carolyn Bertozzi', 'Dr. Ahmed Zewail',
        'Dr. Michael Faraday', 'Dr. Alfred Nobel', 'Dr. Fritz Haber', 'Dr. Glenn Seaborg',
        'Dr. Irène Joliot-Curie', 'Dr. Ada Yonath', 'Dr. Frances Arnold', 'Dr. Gertrude Elion',
        'Dr. Frederick Sanger', 'Dr. John Dalton', 'Dr. Rosalind Franklin', 'Dr. K. Barry Sharpless'
      ],
      physicist: [
        'Dr. Albert Einstein', 'Dr. Isaac Newton', 'Dr. Richard Feynman', 'Dr. Stephen Hawking',
        'Dr. Niels Bohr', 'Dr. Werner Heisenberg', 'Dr. Chien-Shiung Wu', 'Dr. Max Planck',
        'Dr. Erwin Schrödinger', 'Dr. Paul Dirac', 'Dr. Enrico Fermi', 'Dr. Murray Gell-Mann',
        'Dr. Donna Strickland', 'Dr. Andrea Ghez', 'Dr. Jocelyn Bell Burnell', 'Dr. Lise Meitner',
        'Dr. John Bardeen', 'Dr. Ernest Rutherford', 'Dr. J. Robert Oppenheimer', 'Dr. Kip Thorne'
      ],
      engineer: [
        'Dr. Nikola Tesla', 'Dr. Grace Hopper', 'Dr. Alan Turing', 'Dr. Claude Shannon',
        'Dr. Wernher von Braun', 'Dr. Katherine Johnson', 'Dr. Tim Berners-Lee', 'Dr. Vint Cerf',
        'Dr. Margaret Hamilton', 'Dr. Hedy Lamarr', 'Dr. John von Neumann', 'Dr. Dennis Ritchie',
        'Dr. Ada Lovelace', 'Dr. Charles Babbage', 'Dr. James Watt', 'Dr. Robert Noyce',
        'Dr. Gordon Moore', 'Dr. Fei-Fei Li', 'Dr. Geoffrey Hinton', 'Dr. Demis Hassabis'
      ]
    };

    const typeScientists = scientists[type] || scientists.biologist;
    return typeScientists[Phaser.Math.Between(0, typeScientists.length - 1)];
  }

  generateTraits(quality) {
    // Mix of positive and dystopian academia traits
    const allTraits = [
      // "Positive" traits (survival mechanisms)
      { name: 'Night Owl', effect: 'speedBonus', value: 0.2, desc: '+20% speed (sleeps under desk)', icon: '🦉' },
      { name: 'Perfectionist', effect: 'qualityBonus', value: 0.3, desc: '+30% success (endless revisions)', icon: '✨' },
      { name: 'Quick Learner', effect: 'xpBonus', value: 0.5, desc: '+50% XP (reads papers during lunch)', icon: '📚' },
      { name: 'Lucky', effect: 'luckBonus', value: 0.25, desc: '+25% luck (knows a reviewer)', icon: '🍀' },
      { name: 'Efficient', effect: 'speedBonus', value: 0.15, desc: '+15% speed (skips meetings)', icon: '⚡' },
      { name: 'Genius', effect: 'intelligenceBonus', value: 0.25, desc: '+25% INT (insufferable at parties)', icon: '🧠' },
      { name: 'Grant Whisperer', effect: 'fundingBonus', value: 0.2, desc: 'Uses correct buzzwords', icon: '💰' },
      { name: 'Coffee Immune', effect: 'speedBonus', value: 0.1, desc: 'Functional at 3AM', icon: '☕' },

      // Exploitation traits
      { name: 'Adjunct Brain', effect: 'costReduction', value: 0.5, desc: 'Accepts poverty wages', icon: '💸' },
      { name: 'Visa Hostage', effect: 'retention', value: 0.9, desc: 'Cannot leave (legally)', icon: '🛂' },
      { name: 'Sunk Cost', effect: 'retention', value: 0.8, desc: '10 years in, cannot quit now', icon: '⛓️' },
      { name: 'Passion Exploited', effect: 'costReduction', value: 0.3, desc: '"Does it for the science"', icon: '❤️' },

      // Mental health dystopia
      { name: 'Imposter', effect: 'qualityBonus', value: -0.1, desc: 'Thinks everyone else is smarter', icon: '🎭' },
      { name: 'Burnout Resistant', effect: 'stressCap', value: 0.7, desc: 'Already dead inside', icon: '🔥' },
      { name: 'Anxiety Engine', effect: 'speedBonus', value: 0.25, desc: 'Fear is a great motivator', icon: '😰' },
      { name: 'Dissociated', effect: 'stressCoping', value: 0.5, desc: 'Emotionally detached (coping)', icon: '👻' },

      // Coping mechanisms
      { name: 'Functional Alcoholic', effect: 'stressCoping', value: 0.3, desc: 'Wine after every rejection', icon: '🍷' },
      { name: 'Gym Bro', effect: 'stressCoping', value: 0.4, desc: 'Lifts instead of crying', icon: '💪' },
      { name: 'Therapy Veteran', effect: 'stressCoping', value: 0.5, desc: '$200/week well spent', icon: '🛋️' },
      { name: 'Car Sleeper', effect: 'costReduction', value: 0.4, desc: 'Rent costs more than stipend', icon: '🚗' },

      // Career delusion
      { name: 'Tenure Track', effect: 'moraleBonus', value: 0.3, desc: 'Still has hope (somehow)', icon: '🌟' },
      { name: 'Delusional', effect: 'hopePersist', value: 0.5, desc: 'Thinks they will get a faculty job', icon: '🤡' },
      { name: 'Industry Backup', effect: 'stressResist', value: 0.25, desc: 'Pharma recruiter on speed dial', icon: '🏭' },
      { name: 'Alt-Ac Curious', effect: 'flightRisk', value: 0.3, desc: 'Googles "leaving academia" weekly', icon: '🚪' },

      // Toxic productivity
      { name: 'Reviewer #3', effect: 'qualityBonus', value: -0.15, desc: 'Rejects own papers by habit', icon: '❌' },
      { name: 'Conference Addict', effect: 'luckBonus', value: 0.15, desc: 'Networking is their cardio', icon: '✈️' },
      { name: 'Email at 2AM', effect: 'speedBonus', value: 0.15, desc: 'No work-life boundary', icon: '📧' },
      { name: 'Workaholic', effect: 'speedBonus', value: 0.3, desc: 'Lab is their only home', icon: '🏠' },

      // Food insecurity
      { name: 'Food Bank Regular', effect: 'costReduction', value: 0.35, desc: 'PhD + SNAP benefits', icon: '📦' },
      { name: 'Free Pizza Hunter', effect: 'costReduction', value: 0.2, desc: 'Attends every seminar for food', icon: '🍕' },
      { name: 'Ramen Connoisseur', effect: 'costReduction', value: 0.25, desc: '$0.20/meal diet', icon: '🍜' }
    ];

    const numTraits = quality === 3 ? 2 : quality === 2 ? 1 : Phaser.Math.Between(0, 1);
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
    const qualityColors = {
      1: { bg: 0x3d4a5a, border: 0x6b7280, label: 'Adjunct (Disposable)', labelColor: '#9ca3af', subtitle: 'No benefits, no future' },
      2: { bg: 0x1e3a5f, border: 0x3b82f6, label: 'Postdoc (Exploited)', labelColor: '#60a5fa', subtitle: 'Still "training" at 35' },
      3: { bg: 0x4a1d4a, border: 0xa855f7, label: 'Tenure Track (Endangered)', labelColor: '#c084fc', subtitle: 'Unicorn sighting confirmed' }
    };

    const typeColors = {
      biologist: 0x4ecdc4,
      chemist: 0xff6b6b,
      physicist: 0xffd93d,
      engineer: 0x95e1d3
    };

    this.candidates.forEach((candidate, i) => {
      const cardX = width / 2 - 320 + (i % 2) * 330;
      const cardY = 310 + Math.floor(i / 2) * 200;
      const quality = qualityColors[candidate.quality];

      // Card background
      const card = this.add.rectangle(cardX, cardY, 300, 180, quality.bg, 0.95)
        .setStrokeStyle(3, quality.border);

      // Quality label
      this.add.text(cardX - 130, cardY - 80, quality.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: quality.labelColor,
        fontStyle: 'bold'
      });

      // Scientist sprite
      this.add.image(cardX - 100, cardY, `scientist_${candidate.type}`).setScale(2);

      // Type indicator
      const typeIndicator = this.add.rectangle(cardX - 100, cardY + 45, 60, 20, typeColors[candidate.type], 0.8);
      this.add.text(cardX - 100, cardY + 45, candidate.typeName, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#1a1a2e'
      }).setOrigin(0.5);

      // Name (truncate if too long)
      const displayName = candidate.name.length > 22 ? candidate.name.substring(0, 20) + '...' : candidate.name;
      this.add.text(cardX + 20, cardY - 70, displayName, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      });

      // Stats
      const stats = [
        { label: 'INT', value: candidate.stats.intelligence, color: '#4ecdc4' },
        { label: 'SPD', value: candidate.stats.speed, color: '#ffd93d' },
        { label: 'LCK', value: candidate.stats.luck, color: '#a55eea' }
      ];

      stats.forEach((stat, j) => {
        const statY = cardY - 40 + j * 25;
        this.add.text(cardX - 15, statY, stat.label, {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#888888'
        });

        // Stat bar background
        this.add.rectangle(cardX + 70, statY + 6, 80, 10, 0x333333);

        // Stat bar fill
        this.add.rectangle(cardX + 30 + (stat.value * 0.4), statY + 6, stat.value * 0.8, 10,
          Phaser.Display.Color.HexStringToColor(stat.color).color);

        this.add.text(cardX + 120, statY, `${stat.value}`, {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: stat.color
        });
      });

      // Traits with icons (truncate long names)
      if (candidate.traits.length > 0) {
        const traitsY = cardY + 40;
        candidate.traits.forEach((trait, j) => {
          // Truncate trait name to fit in card (max ~12 chars)
          const shortName = trait.name.length > 12 ? trait.name.substring(0, 10) + '..' : trait.name;
          const traitText = trait.icon ? `${trait.icon}${shortName}` : shortName;
          this.add.text(cardX - 20 + j * 90, traitsY, traitText, {
            fontFamily: 'Arial',
            fontSize: '9px',
            color: '#ffd93d',
            backgroundColor: '#2d3a4a',
            padding: { x: 3, y: 2 }
          });
        });
      }

      // Cost and hire button
      const canAfford = this.gameState.funding >= candidate.cost;
      const canHire = this.gameState.scientists.length < 10;

      this.add.text(cardX - 15, cardY + 65, `$${candidate.cost.toLocaleString()}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: canAfford ? '#4ecdc4' : '#ff6b6b',
        fontStyle: 'bold'
      });

      const hireBtn = this.add.rectangle(cardX + 95, cardY + 70, 70, 30,
        canAfford && canHire ? 0x4ecdc4 : 0x666666)
        .setInteractive();

      this.add.text(cardX + 95, cardY + 70, 'Hire', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      if (canAfford && canHire) {
        hireBtn.on('pointerover', () => hireBtn.setFillStyle(0x3dbdb5));
        hireBtn.on('pointerout', () => hireBtn.setFillStyle(0x4ecdc4));
        hireBtn.on('pointerdown', () => this.hireScientist(candidate, i));
      }
    });
  }

  hireScientist(candidate, index) {
    if (this.gameState.funding >= candidate.cost && this.gameState.scientists.length < 10) {
      this.gameState.funding -= candidate.cost;
      audioSystem.playHire();

      // Add to lab scene
      const startX = Phaser.Math.Between(150, 1100);
      const startY = Phaser.Math.Between(250, 550);
      candidate.x = startX;
      candidate.y = startY;

      this.gameState.scientists.push(candidate);

      // Return to lab scene
      this.scene.start('LabScene');
    }
  }

  createRefreshButton(width, height) {
    const refreshCost = 1000;
    const canAfford = this.gameState.funding >= refreshCost;

    const refreshBtn = this.add.rectangle(width / 2 - 100, height - 60, 150, 45,
      canAfford ? 0xffd93d : 0x666666)
      .setInteractive();

    this.add.text(width / 2 - 100, height - 60, `Refresh ($${refreshCost})`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (canAfford) {
      refreshBtn.on('pointerover', () => refreshBtn.setFillStyle(0xf0c800));
      refreshBtn.on('pointerout', () => refreshBtn.setFillStyle(0xffd93d));
      refreshBtn.on('pointerdown', () => {
        this.gameState.funding -= refreshCost;
        this.scene.restart();
      });
    }
  }

  createCloseButton(width, height) {
    const closeBtn = this.add.rectangle(width / 2 + 100, height - 60, 150, 45, 0x4ecdc4)
      .setInteractive();

    this.add.text(width / 2 + 100, height - 60, 'Close', {
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
