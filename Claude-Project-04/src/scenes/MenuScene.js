import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';
import { ContentData } from '../systems/ContentData.js';
import { gameState } from '../systems/GameState.js';

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

    // Background
    this.createBackground(width, height);

    // Dark humor tagline at top
    this.add.text(width / 2, 40, '"Where Dreams Go to Get Peer-Reviewed"', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.8);

    // Main Title
    this.add.text(width / 2, 100, 'LAB TYCOON', {
      fontFamily: 'Arial Black',
      fontSize: '72px',
      color: '#4ecdc4',
      stroke: '#1a1a2e',
      strokeThickness: 8
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 170, 'Academic Survival Simulator', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Random tagline
    this.add.text(width / 2, 205, ContentData.getRandomTagline(), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.9);

    // Animated scientist
    const scientist = this.add.image(width / 2, height / 2 - 20, 'scientist_exhausted').setScale(3);
    this.tweens.add({
      targets: scientist,
      y: scientist.y - 5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Coffee cup
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

    // Rejection letters
    const rejections = this.add.image(width / 2 - 70, height / 2 + 10, 'rejection_stack').setScale(2);
    this.tweens.add({
      targets: rejections,
      angle: -3,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Floating equipment
    this.createFloatingEquipment(width, height);

    // Flying money (leaving the lab)
    this.createFlyingMoney(width, height);

    // New Game button
    this.createButton(width / 2, height / 2 + 140, 'Enter Academia', () => {
      this.startNewGame();
    });

    // Continue button (if save exists)
    if (gameState.hasSave()) {
      this.createButton(width / 2, height / 2 + 205, 'Resume Suffering', () => {
        this.continueGame();
      });
    }

    // Warning at bottom
    this.add.text(width / 2, height - 80, ContentData.getRandomWarning(), {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Version
    this.add.text(width - 10, height - 10, 'v0.1 | Created by Eric Perkey | All Rights Reversed', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(1);

    // Beta/AI note
    this.add.text(width - 10, height - 25, 'BETA - AI Slop Game in Development', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ff6b6b',
      fontStyle: 'italic'
    }).setOrigin(1).setAlpha(0.7);

    // Music toggle
    this.createMusicToggle(width, height);

    // Click to enable audio prompt
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

  createBackground(width, height) {
    // Floor tiles
    for (let x = 0; x < width; x += 64) {
      for (let y = 0; y < height; y += 64) {
        this.add.image(x + 32, y + 32, 'floor_tile').setAlpha(0.3);
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

  createFlyingMoney(width, height) {
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

  startNewGame() {
    gameState.clearSave();
    gameState.initNew();
    this.scene.start('GameScene');
  }

  continueGame() {
    if (gameState.load()) {
      this.scene.start('GameScene');
    } else {
      this.startNewGame();
    }
  }
}
