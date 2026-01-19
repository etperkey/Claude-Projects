// BootScene - Asset generation and loading

import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Initializing Healthcare System...', {
      font: '20px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2 + 25, '0%', {
      font: '18px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Loading progress
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00a896, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
      percentText.setText(parseInt(value * 100) + '%');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Generate all placeholder graphics
    this.generateAssets();
  }

  generateAssets() {
    // Generate button graphics
    this.generateButton('button', 200, 50, 0x00a896);
    this.generateButton('button-hover', 200, 50, 0x00d4aa);
    this.generateButton('button-danger', 200, 50, 0xdc3545);
    this.generateButton('button-warning', 200, 50, 0xffc107);

    // Generate panel backgrounds
    this.generatePanel('panel', 400, 300, 0x2d3436, 0.9);
    this.generatePanel('panel-dark', 400, 300, 0x1a1a2e, 0.95);
    this.generatePanel('panel-light', 400, 300, 0xf8f9fa, 0.9);

    // Generate resource bar backgrounds
    this.generateResourceBar('health-bar', 0xe74c3c);
    this.generateResourceBar('money-bar', 0x27ae60);
    this.generateResourceBar('coverage-bar', 0x3498db);
    this.generateResourceBar('hope-bar', 0xf39c12);
    this.generateResourceBar('time-bar', 0x9b59b6);

    // Generate icons
    this.generateIcon('icon-health', 0xe74c3c, '♥');
    this.generateIcon('icon-money', 0x27ae60, '$');
    this.generateIcon('icon-coverage', 0x3498db, '🛡');
    this.generateIcon('icon-hope', 0xf39c12, '☀');
    this.generateIcon('icon-time', 0x9b59b6, '⏰');

    // Generate document graphics
    this.generateDocument('denial-letter', 0xf8f9fa, 0xdc3545);
    this.generateDocument('bill', 0xf8f9fa, 0x343a40);
    this.generateDocument('form', 0xf8f9fa, 0x007bff);

    // Generate character sprites
    this.generateCharacter('patient', 0x74b9ff);
    this.generateCharacter('doctor', 0xffeaa7);
    this.generateCharacter('insurance-rep', 0x636e72);
    this.generateCharacter('collector', 0x2d3436);

    // Generate logo
    this.generateLogo();
  }

  generateButton(key, width, height, color) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, 8);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  generatePanel(key, width, height, color, alpha) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(0, 0, width, height, 12);
    graphics.lineStyle(2, 0x00a896, 1);
    graphics.strokeRoundedRect(0, 0, width, height, 12);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  generateResourceBar(key, color) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Background
    graphics.fillStyle(0x2d3436, 1);
    graphics.fillRoundedRect(0, 0, 150, 20, 4);

    // Foreground (full bar)
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(2, 2, 146, 16, 3);

    graphics.generateTexture(key, 150, 20);
    graphics.destroy();
  }

  generateIcon(key, color, symbol) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  generateDocument(key, bgColor, accentColor) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Paper background
    graphics.fillStyle(bgColor, 1);
    graphics.fillRect(0, 0, 200, 260);

    // Header bar
    graphics.fillStyle(accentColor, 1);
    graphics.fillRect(0, 0, 200, 40);

    // Fake text lines
    graphics.fillStyle(0xcccccc, 1);
    for (let i = 0; i < 8; i++) {
      graphics.fillRect(15, 55 + i * 25, 170, 8);
    }

    // Border
    graphics.lineStyle(2, 0x333333, 1);
    graphics.strokeRect(0, 0, 200, 260);

    graphics.generateTexture(key, 200, 260);
    graphics.destroy();
  }

  generateCharacter(key, color) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Simple character silhouette
    graphics.fillStyle(color, 1);

    // Head
    graphics.fillCircle(32, 20, 18);

    // Body
    graphics.fillRoundedRect(16, 40, 32, 50, 8);

    graphics.generateTexture(key, 64, 96);
    graphics.destroy();
  }

  generateLogo() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Hospital cross with dollar sign overlay
    graphics.fillStyle(0xdc3545, 1);

    // Horizontal bar
    graphics.fillRect(20, 45, 80, 30);
    // Vertical bar
    graphics.fillRect(45, 20, 30, 80);

    // Dollar sign in center (represented as circle)
    graphics.fillStyle(0x27ae60, 1);
    graphics.fillCircle(60, 60, 15);

    graphics.generateTexture('logo', 120, 120);
    graphics.destroy();
  }

  create() {
    // Transition to menu
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
