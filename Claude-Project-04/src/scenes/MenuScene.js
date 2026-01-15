import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Start music on first interaction
    this.input.once('pointerdown', () => {
      audioSystem.resume();
      audioSystem.startMusic();
    });

    // Background with animated particles
    this.createBackground(width, height);

    // Dark humor tagline at top
    this.add.text(width / 2, 40, '"Where Dreams Go to Get Peer-Reviewed"', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.8);

    // Main Title with strikethrough joke
    this.add.text(width / 2, 100, 'LAB TYCOON', {
      fontFamily: 'Arial Black',
      fontSize: '72px',
      color: '#4ecdc4',
      stroke: '#1a1a2e',
      strokeThickness: 8
    }).setOrigin(0.5);

    // Satirical subtitle
    this.add.text(width / 2, 170, 'Academic Survival Simulator', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Dark humor tagline (Trump/RFK Jr era + Academia Dystopia themed)
    const taglines = [
      // Political satire
      '"Do Your Own Research" - New NIH Motto',
      'Now with 94% more DOGE audits!',
      'RFK Jr Approved* (*not scientifically)',
      '"Nobody knows more about science than me" - You Know Who',
      'Make Academia Great Again!',
      'Defunded by popular demand!',
      // Academia dystopia
      'Where PhDs Go to Become Adjuncts!',
      '7 Years of Poverty: A Simulation',
      'Publish or Perish (Mostly Perish)',
      '"Just One More Revision" - Your Advisor',
      'Experience Real Academic Exploitation!',
      'Featuring Authentic Imposter Syndrome!',
      'Now With 200% More Unpaid Labor!',
      'Tenure: The Myth, The Legend',
      'Simulating Poverty Since 2024',
      'Your Student Loans Will Never Be Paid',
      '"Almost Ready to Graduate" - Year 12',
      'Where Dreams Go to Get Rejected'
    ];
    const selectedTagline = taglines[Phaser.Math.Between(0, taglines.length - 1)];

    this.add.text(width / 2, 205, selectedTagline, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.9);

    // Animated scientist (looking tired)
    const scientist = this.add.image(width / 2, height / 2 - 20, 'scientist_exhausted').setScale(3);
    this.tweens.add({
      targets: scientist,
      y: scientist.y - 5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Coffee cup floating near scientist
    const coffee = this.add.image(width / 2 + 60, height / 2 - 40, 'coffee_cup').setScale(2);
    this.tweens.add({
      targets: coffee,
      y: coffee.y - 8,
      angle: 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Stack of rejection letters
    const rejections = this.add.image(width / 2 - 70, height / 2 + 10, 'rejection_stack').setScale(2);
    this.tweens.add({
      targets: rejections,
      angle: -3,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Equipment icons floating around (with sad context)
    this.createFloatingEquipment(width, height);

    // Floating dollar signs (going away from lab)
    this.createFlyingMoney(width, height);

    // New Game button
    this.createButton(width / 2, height / 2 + 140, 'Enter Academia', () => {
      this.startNewGame();
    });

    // Continue button (if save exists)
    const hasSave = localStorage.getItem('labTycoonSave');
    if (hasSave) {
      this.createButton(width / 2, height / 2 + 205, 'Resume Suffering', () => {
        this.continueGame();
      });
    }

    // Satirical warnings at bottom (political + academia dystopia themed)
    const warnings = [
      // Political
      '* Side effects may include: DOGE audits, presidential tweets, and existential dread',
      '* Grant funding subject to change based on who the President is mad at today',
      '* This game has not been reviewed by RFK Jr (thank God)',
      '* Not endorsed by any actual government agency (they have been defunded)',
      // Academia dystopia
      '* No graduate students were paid a living wage in the making of this game',
      '* Side effects may include: poverty, imposter syndrome, and questioning all life choices',
      '* Adjunct professors depicted are based on real exploitation. This is not satire.',
      '* Your advisor has not responded to your email. They will never respond.',
      '* The faculty job you applied for received 847 applications',
      '* Warning: Game accurately simulates academic mental health crisis',
      '* Stipends depicted have not been adjusted for inflation since 1997',
      '* Any resemblance to your actual PhD experience is intentional and we are sorry',
      '* The tenure track position has been converted to 3 adjunct positions',
      '* Your student loans are accruing interest as you read this'
    ];
    const selectedWarning = warnings[Phaser.Math.Between(0, warnings.length - 1)];

    this.add.text(width / 2, height - 80, selectedWarning, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Version with rotating edition names
    const editions = [
      'v1.0.0 (Unfunded Edition)',
      'v1.0.0 (Adjunct Poverty Edition)',
      'v1.0.0 (Tenure Denied Edition)',
      'v1.0.0 (Reviewer #2 Was Mean Edition)',
      'v1.0.0 (Dreams Crushed Edition)',
      'v1.0.0 (Student Loan Accruing Edition)'
    ];
    const selectedEdition = editions[Phaser.Math.Between(0, editions.length - 1)];
    this.add.text(width - 10, height - 10, selectedEdition, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#666666'
    }).setOrigin(1);

    // Music toggle button
    this.createMusicToggle(width, height);

    // Click anywhere prompt
    const clickPrompt = this.add.text(width / 2, height - 50, 'Click anywhere to enable audio (and your suffering)', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#4ecdc4'
    }).setOrigin(0.5).setAlpha(0.7);

    this.tweens.add({
      targets: clickPrompt,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      clickPrompt.destroy();
    });
  }

  createFlyingMoney(width, height) {
    // Dollar signs floating away (representing funding leaving)
    for (let i = 0; i < 5; i++) {
      const dollar = this.add.text(
        Phaser.Math.Between(100, width - 100),
        Phaser.Math.Between(250, 450),
        '$',
        {
          fontFamily: 'Arial Black',
          fontSize: '24px',
          color: '#ffd93d'
        }
      ).setAlpha(0.4);

      this.tweens.add({
        targets: dollar,
        x: dollar.x + Phaser.Math.Between(-100, 100),
        y: -50,
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        onRepeat: () => {
          dollar.x = Phaser.Math.Between(100, width - 100);
          dollar.y = Phaser.Math.Between(400, 500);
          dollar.alpha = 0.4;
        }
      });
    }
  }

  createMusicToggle(width, height) {
    const musicBtn = this.add.rectangle(50, height - 40, 80, 30, 0x4ecdc4, 0.8)
      .setInteractive();

    this.musicText = this.add.text(50, height - 40, 'Music: ON', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#1a1a2e'
    }).setOrigin(0.5);

    musicBtn.on('pointerdown', () => {
      audioSystem.playClick();
      const isPlaying = audioSystem.toggleMusic();
      this.musicText.setText(isPlaying ? 'Music: ON' : 'Music: OFF');
      musicBtn.setFillStyle(isPlaying ? 0x4ecdc4 : 0x666666, 0.8);
    });
  }

  createBackground(width, height) {
    // Create gradient effect with tiles
    for (let x = 0; x < width; x += 64) {
      for (let y = 0; y < height; y += 64) {
        const tile = this.add.image(x + 32, y + 32, 'floor_tile');
        tile.setAlpha(0.3);
      }
    }

    // Floating particles
    for (let i = 0; i < 30; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 5),
        0x4ecdc4,
        0.3
      );

      this.tweens.add({
        targets: particle,
        y: particle.y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, width);
          particle.y = height + 10;
          particle.alpha = 0.3;
        }
      });
    }
  }

  createFloatingEquipment(width, height) {
    const equipment = ['microscope', 'centrifuge', 'computer', 'sequencer'];
    const positions = [
      { x: 150, y: 350 },
      { x: width - 150, y: 350 },
      { x: 200, y: 550 },
      { x: width - 200, y: 550 }
    ];

    positions.forEach((pos, i) => {
      const equip = this.add.image(pos.x, pos.y, equipment[i]).setScale(1.5).setAlpha(0.6);
      this.tweens.add({
        targets: equip,
        y: pos.y - 15,
        angle: 5,
        duration: 2000 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  createButton(x, y, text, callback) {
    const button = this.add.image(x, y, 'button').setInteractive();
    const buttonText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.on('pointerover', () => {
      button.setTexture('button_hover');
      audioSystem.playHover();
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    button.on('pointerout', () => {
      button.setTexture('button');
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    button.on('pointerdown', () => {
      audioSystem.playClick();
      this.tweens.add({
        targets: [button, buttonText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });

    return button;
  }

  startNewGame() {
    // Clear any existing save
    localStorage.removeItem('labTycoonSave');

    // Initialize game state
    this.registry.set('gameState', {
      funding: 50000,
      researchPoints: 0,
      scientists: [],
      equipment: [],
      research: {
        biology: { level: 0, progress: 0 },
        chemistry: { level: 0, progress: 0 },
        physics: { level: 0, progress: 0 },
        engineering: { level: 0, progress: 0 }
      },
      experiments: [],
      unlockedEquipment: ['microscope', 'computer'],
      academia: [],
      stats: {
        totalExperiments: 0,
        successfulExperiments: 0,
        discoveryCount: 0,
        playTime: 0,
        burnouts: 0,
        dreamsDestroyed: 0
      }
    });

    this.scene.start('LabScene');
  }

  continueGame() {
    try {
      const saveData = JSON.parse(localStorage.getItem('labTycoonSave'));
      this.registry.set('gameState', saveData);
      this.scene.start('LabScene');
    } catch (e) {
      console.error('Failed to load save:', e);
      this.startNewGame();
    }
  }
}
