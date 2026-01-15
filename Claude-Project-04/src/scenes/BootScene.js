import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Initialize audio system
    audioSystem.init();
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Satirical loading messages (Trump/RFK Jr themed)
    const loadingMessages = [
      'Simulating DOGE audit...',
      'Calibrating RFK Jr suspicion levels...',
      'Generating presidential tweets...',
      'Loading alternative facts...',
      'Initializing Facebook peer review...',
      'Brewing raw milk...',
      'Compiling ivermectin studies...',
      'Defunding climate research...',
      'Scheduling loyalty oath signing...',
      'Consulting Joe Rogan archives...',
      'Flagging research as "wasteful"...',
      'Replacing scientists with podcasters...',
      'Making science great again...',
      'Investigating windmill cancer...',
      'Banning the word "climate"...',
      'Appointing MyPillow guy...',
    ];

    // Loading text with dark humor
    const loadingText = this.add.text(width / 2, height / 2 - 80, 'LAB TYCOON', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#4ecdc4',
      stroke: '#1a1a2e',
      strokeThickness: 4
    }).setOrigin(0.5);

    const subtitleText = this.add.text(width / 2, height / 2 - 40, 'Academic Survival Simulator', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ff6b6b'
    }).setOrigin(0.5);

    // Dynamic loading message
    const messageText = this.add.text(width / 2, height / 2 + 50, loadingMessages[0], {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Cycle through loading messages
    let messageIndex = 0;
    const messageTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        messageText.setText(loadingMessages[messageIndex]);
      },
      loop: true
    });

    // Progress bar background
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2, 320, 30);

    // Progress bar fill
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x4ecdc4, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 + 5, 310 * value, 20);
    });

    this.load.on('complete', () => {
      messageTimer.destroy();
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      subtitleText.destroy();
      messageText.destroy();
    });

    // Generate all game graphics procedurally
    this.createGameGraphics();
  }

  createGameGraphics() {
    // Create scientist sprites
    this.createScientistGraphics();

    // Create equipment sprites
    this.createEquipmentGraphics();

    // Create UI elements
    this.createUIGraphics();

    // Create lab tiles
    this.createLabTiles();

    // Create dark humor props
    this.createDarkHumorProps();
  }

  createScientistGraphics() {
    const colors = {
      biologist: { primary: 0x2d8a7b, secondary: 0x4ecdc4, coat: 0xf0f4f8 },
      chemist: { primary: 0xc73e3e, secondary: 0xff6b6b, coat: 0xf0f4f8 },
      physicist: { primary: 0xd4a829, secondary: 0xffd93d, coat: 0xf0f4f8 },
      engineer: { primary: 0x6bb895, secondary: 0x95e1d3, coat: 0xf0f4f8 }
    };

    Object.entries(colors).forEach(([type, palette]) => {
      // Create scientist sprite (32x48)
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });

      // Shadow
      graphics.fillStyle(0x000000, 0.2);
      graphics.fillEllipse(16, 46, 20, 6);

      // Legs with shoes
      graphics.fillStyle(0x2a2a3a, 1);
      graphics.fillRect(9, 40, 5, 6);
      graphics.fillRect(18, 40, 5, 6);
      // Shoes
      graphics.fillStyle(0x1a1a2a, 1);
      graphics.fillRoundedRect(8, 44, 6, 3, 1);
      graphics.fillRoundedRect(17, 44, 6, 3, 1);

      // Body (lab coat) with shading
      graphics.fillStyle(palette.coat, 1);
      graphics.fillRoundedRect(6, 18, 20, 24, 3);
      // Coat shadow
      graphics.fillStyle(0xd8dce0, 1);
      graphics.fillRect(6, 18, 6, 24);
      // Coat highlight
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(20, 18, 4, 20);

      // Arms
      graphics.fillStyle(palette.coat, 1);
      graphics.fillRoundedRect(3, 20, 5, 16, 2);
      graphics.fillRoundedRect(24, 20, 5, 16, 2);
      // Hands
      graphics.fillStyle(0xe8c4b8, 1);
      graphics.fillCircle(5, 36, 3);
      graphics.fillCircle(27, 36, 3);

      // Lab coat collar/accent
      graphics.fillStyle(palette.primary, 1);
      graphics.fillRect(6, 18, 20, 3);
      // Pocket
      graphics.fillStyle(palette.secondary, 0.6);
      graphics.fillRoundedRect(8, 30, 8, 6, 1);
      // Pen in pocket
      graphics.fillStyle(palette.primary, 1);
      graphics.fillRect(10, 28, 2, 6);

      // Neck
      graphics.fillStyle(0xe8c4b8, 1);
      graphics.fillRect(13, 14, 6, 5);

      // Head with more realistic shape
      graphics.fillStyle(0xf5d5c8, 1);
      graphics.fillRoundedRect(8, 2, 16, 14, 6);
      // Cheeks
      graphics.fillStyle(0xf0c4b8, 1);
      graphics.fillCircle(10, 10, 3);
      graphics.fillCircle(22, 10, 3);

      // Hair with depth
      graphics.fillStyle(palette.primary, 1);
      graphics.fillRoundedRect(7, 1, 18, 7, 3);
      graphics.fillStyle(palette.secondary, 0.5);
      graphics.fillRoundedRect(9, 2, 6, 4, 2);

      // Eyes with detail
      graphics.fillStyle(0xffffff, 1);
      graphics.fillEllipse(12, 9, 4, 3);
      graphics.fillEllipse(20, 9, 4, 3);
      graphics.fillStyle(0x3a3a4a, 1);
      graphics.fillCircle(12, 9, 2);
      graphics.fillCircle(20, 9, 2);
      // Eye highlights
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(13, 8, 1);
      graphics.fillCircle(21, 8, 1);

      // Eyebrows
      graphics.fillStyle(palette.primary, 0.8);
      graphics.fillRect(10, 5, 4, 1);
      graphics.fillRect(18, 5, 4, 1);

      // Mouth
      graphics.fillStyle(0xc9a090, 1);
      graphics.fillRoundedRect(13, 12, 6, 2, 1);

      // Glasses (optional detail)
      graphics.lineStyle(1, 0x4a4a5a, 0.8);
      graphics.strokeCircle(12, 9, 4);
      graphics.strokeCircle(20, 9, 4);
      graphics.lineBetween(16, 9, 16, 9);

      graphics.generateTexture(`scientist_${type}`, 32, 48);
      graphics.destroy();
    });

    // Create idle scientist for menu/hire
    const idleGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    idleGraphics.fillStyle(0x000000, 0.2);
    idleGraphics.fillEllipse(16, 46, 20, 6);

    // Legs
    idleGraphics.fillStyle(0x2a2a3a, 1);
    idleGraphics.fillRect(9, 40, 5, 6);
    idleGraphics.fillRect(18, 40, 5, 6);
    idleGraphics.fillStyle(0x1a1a2a, 1);
    idleGraphics.fillRoundedRect(8, 44, 6, 3, 1);
    idleGraphics.fillRoundedRect(17, 44, 6, 3, 1);

    // Lab coat
    idleGraphics.fillStyle(0xf0f4f8, 1);
    idleGraphics.fillRoundedRect(6, 18, 20, 24, 3);
    idleGraphics.fillStyle(0xd8dce0, 1);
    idleGraphics.fillRect(6, 18, 6, 24);

    // Arms
    idleGraphics.fillStyle(0xf0f4f8, 1);
    idleGraphics.fillRoundedRect(3, 20, 5, 16, 2);
    idleGraphics.fillRoundedRect(24, 20, 5, 16, 2);
    idleGraphics.fillStyle(0xe8c4b8, 1);
    idleGraphics.fillCircle(5, 36, 3);
    idleGraphics.fillCircle(27, 36, 3);

    // Collar
    idleGraphics.fillStyle(0x5a6a7a, 1);
    idleGraphics.fillRect(6, 18, 20, 3);

    // Neck and head
    idleGraphics.fillStyle(0xe8c4b8, 1);
    idleGraphics.fillRect(13, 14, 6, 5);
    idleGraphics.fillStyle(0xf5d5c8, 1);
    idleGraphics.fillRoundedRect(8, 2, 16, 14, 6);

    // Hair
    idleGraphics.fillStyle(0x4a3a2a, 1);
    idleGraphics.fillRoundedRect(7, 1, 18, 7, 3);

    // Eyes
    idleGraphics.fillStyle(0xffffff, 1);
    idleGraphics.fillEllipse(12, 9, 4, 3);
    idleGraphics.fillEllipse(20, 9, 4, 3);
    idleGraphics.fillStyle(0x3a3a4a, 1);
    idleGraphics.fillCircle(12, 9, 2);
    idleGraphics.fillCircle(20, 9, 2);

    // Mouth
    idleGraphics.fillStyle(0xc9a090, 1);
    idleGraphics.fillRoundedRect(13, 12, 6, 2, 1);

    idleGraphics.generateTexture('scientist_idle', 32, 48);
    idleGraphics.destroy();
  }

  createEquipmentGraphics() {
    // Microscope - detailed scientific microscope
    this.createMicroscope();

    // Centrifuge - spinning sample processor
    this.createCentrifuge();

    // Computer - lab workstation
    this.createComputer();

    // PCR Thermal Cycler - DNA amplification
    this.createPCR();

    // Gene Sequencer - DNA analysis machine
    this.createSequencer();

    // Mass Spectrometer - chemical analysis
    this.createSpectrometer();

    // Particle Accelerator - high-tech physics equipment
    this.createAccelerator();

    // Locked equipment placeholder
    this.createLockedEquipment();
  }

  createMicroscope() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillEllipse(32, 60, 40, 8);

    // Base platform - heavy metal base
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(8, 50, 48, 10, 3);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(10, 52, 44, 6, 2);

    // Stage platform
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRoundedRect(16, 38, 32, 8, 2);
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillRect(20, 40, 24, 4);

    // Stage adjustment knobs
    graphics.fillStyle(0x3ecdb4, 1);
    graphics.fillCircle(14, 44, 4);
    graphics.fillCircle(50, 44, 4);
    graphics.fillStyle(0x2dbc9f, 1);
    graphics.fillCircle(14, 44, 2);
    graphics.fillCircle(50, 44, 2);

    // Arm/pillar
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(28, 10, 8, 40, 2);
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRect(30, 12, 4, 36);

    // Eyepiece housing
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(22, 4, 20, 12, 4);

    // Eyepieces (binocular)
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillCircle(27, 6, 5);
    graphics.fillCircle(37, 6, 5);
    // Lens glass
    graphics.fillStyle(0x6ecfcf, 0.6);
    graphics.fillCircle(27, 6, 3);
    graphics.fillCircle(37, 6, 3);
    // Highlight
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(26, 5, 1);
    graphics.fillCircle(36, 5, 1);

    // Objective lenses (turret)
    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillCircle(32, 34, 6);
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillCircle(32, 34, 4);
    graphics.fillStyle(0x6ecfcf, 0.5);
    graphics.fillCircle(32, 34, 2);

    // Focus knobs
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillCircle(22, 30, 4);
    graphics.fillCircle(42, 30, 4);

    // LED indicator
    graphics.fillStyle(0x00ff88, 1);
    graphics.fillCircle(12, 54, 2);

    graphics.generateTexture('microscope', 64, 64);
    graphics.destroy();
  }

  createCentrifuge() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillEllipse(32, 60, 44, 8);

    // Base unit
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(6, 45, 52, 14, 4);
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRoundedRect(8, 47, 48, 10, 3);

    // Main body - cylindrical
    graphics.fillStyle(0xf0f4f8, 1);
    graphics.fillRoundedRect(10, 18, 44, 28, 6);
    // Side shading
    graphics.fillStyle(0xd8dce0, 1);
    graphics.fillRoundedRect(10, 18, 12, 28, 6);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(42, 22, 8, 20);

    // Lid with window
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(14, 12, 36, 8, 4);

    // Viewing window (circular)
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillCircle(32, 30, 14);
    graphics.fillStyle(0x2a3a4a, 1);
    graphics.fillCircle(32, 30, 12);
    // Rotor visible through window
    graphics.fillStyle(0xff6b6b, 0.8);
    graphics.fillCircle(32, 30, 8);
    graphics.fillStyle(0xc73e3e, 1);
    graphics.fillCircle(32, 30, 3);
    // Sample tubes
    graphics.fillStyle(0xffffff, 0.7);
    graphics.fillRect(28, 24, 2, 6);
    graphics.fillRect(34, 34, 2, 6);

    // Control panel
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(14, 48, 20, 8, 2);
    // Display
    graphics.fillStyle(0x00ff88, 0.8);
    graphics.fillRect(16, 50, 10, 4);
    // Speed indicator
    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(40, 52, 3);

    // Buttons
    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillCircle(48, 52, 3);

    graphics.generateTexture('centrifuge', 64, 64);
    graphics.destroy();
  }

  createComputer() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillEllipse(32, 60, 44, 8);

    // Desk surface
    graphics.fillStyle(0x5a4a3a, 1);
    graphics.fillRoundedRect(4, 50, 56, 10, 3);
    graphics.fillStyle(0x6a5a4a, 1);
    graphics.fillRect(6, 52, 52, 6);

    // Monitor stand
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(26, 42, 12, 10, 2);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(28, 44, 8, 6);

    // Monitor frame
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(8, 8, 48, 36, 4);

    // Screen bezel
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(10, 10, 44, 32, 3);

    // Screen
    graphics.fillStyle(0x0a1a2a, 1);
    graphics.fillRect(12, 12, 40, 28);

    // Screen content - data visualization
    graphics.fillStyle(0xffd93d, 0.8);
    graphics.fillRect(14, 14, 8, 2);
    graphics.fillRect(14, 18, 12, 2);
    graphics.fillRect(14, 22, 6, 2);
    // DNA helix graphic
    graphics.fillStyle(0x4ecdc4, 0.8);
    graphics.fillCircle(42, 20, 2);
    graphics.fillCircle(38, 24, 2);
    graphics.fillCircle(42, 28, 2);
    graphics.fillCircle(38, 32, 2);
    graphics.lineStyle(1, 0x4ecdc4, 0.6);
    graphics.lineBetween(38, 20, 42, 24);
    graphics.lineBetween(42, 24, 38, 28);
    graphics.lineBetween(38, 28, 42, 32);
    // Graph
    graphics.fillStyle(0xff6b6b, 0.7);
    graphics.fillRect(14, 30, 2, 6);
    graphics.fillRect(18, 28, 2, 8);
    graphics.fillRect(22, 32, 2, 4);
    graphics.fillRect(26, 26, 2, 10);

    // Power LED
    graphics.fillStyle(0x00ff88, 1);
    graphics.fillCircle(52, 38, 2);

    // Keyboard
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(12, 52, 30, 6, 2);
    graphics.fillStyle(0x3a3a4a, 1);
    for (let i = 0; i < 8; i++) {
      graphics.fillRect(14 + i * 3.5, 53, 2, 3);
    }

    // Mouse
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(46, 52, 8, 6, 3);

    graphics.generateTexture('computer', 64, 64);
    graphics.destroy();
  }

  createPCR() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillEllipse(32, 60, 44, 8);

    // Base unit
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(6, 48, 52, 12, 4);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(8, 50, 48, 8, 3);

    // Main body - Bio-Rad style thermal cycler
    graphics.fillStyle(0xd8dce0, 1);
    graphics.fillRoundedRect(8, 14, 48, 36, 4);
    // Side shading
    graphics.fillStyle(0xc8ccd0, 1);
    graphics.fillRoundedRect(8, 14, 14, 36, 4);
    graphics.fillStyle(0xf0f4f8, 1);
    graphics.fillRect(44, 18, 8, 28);

    // Lid (raised heating block cover)
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRoundedRect(12, 8, 40, 10, 3);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(14, 10, 36, 6);

    // Sample well grid (96-well plate visible)
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(14, 20, 36, 20, 2);
    // Wells grid
    graphics.fillStyle(0x4ecdc4, 0.6);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        graphics.fillCircle(18 + col * 6, 24 + row * 5, 2);
      }
    }

    // Control panel
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(14, 42, 28, 8, 2);
    // LCD display
    graphics.fillStyle(0x00aaff, 0.8);
    graphics.fillRect(16, 44, 16, 4);
    // Temperature display
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(17, 45, 4, 2);
    graphics.fillRect(23, 45, 6, 2);

    // Control buttons
    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillCircle(46, 46, 3);
    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(52, 46, 3);

    // Status LED
    graphics.fillStyle(0x00ff88, 1);
    graphics.fillCircle(52, 12, 2);

    graphics.generateTexture('pcr', 64, 64);
    graphics.destroy();
  }

  createSpectrometer() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillEllipse(32, 60, 50, 10);

    // Base platform - heavy industrial
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(2, 50, 60, 12, 4);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(4, 52, 56, 8);

    // Main body - Orbitrap style mass spec
    graphics.fillStyle(0xd8dce0, 1);
    graphics.fillRoundedRect(4, 12, 40, 40, 4);
    // Shading
    graphics.fillStyle(0xc8ccd0, 1);
    graphics.fillRoundedRect(4, 12, 12, 40, 4);
    graphics.fillStyle(0xf0f4f8, 1);
    graphics.fillRect(34, 16, 6, 32);

    // Ion source chamber (left side)
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillCircle(14, 28, 10);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillCircle(14, 28, 7);
    // Sample inlet
    graphics.fillStyle(0xff6b6b, 0.8);
    graphics.fillCircle(14, 28, 3);

    // Mass analyzer (center)
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(22, 18, 16, 24, 2);
    // Ion path visualization
    graphics.fillStyle(0xff6b6b, 0.6);
    graphics.fillRect(24, 29, 12, 2);
    graphics.fillStyle(0xffd93d, 0.4);
    graphics.fillCircle(26, 24, 2);
    graphics.fillCircle(30, 34, 2);
    graphics.fillCircle(34, 24, 2);

    // Detector unit (right tower)
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRoundedRect(46, 8, 14, 44, 4);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(48, 12, 10, 36);
    // Detector display
    graphics.fillStyle(0x00ff88, 0.8);
    graphics.fillRect(50, 14, 6, 8);
    // Peaks visualization
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(51, 18, 1, 3);
    graphics.fillRect(53, 16, 1, 5);
    graphics.fillRect(55, 19, 1, 2);

    // Control panel
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(8, 44, 30, 8, 2);
    graphics.fillStyle(0x00aaff, 0.8);
    graphics.fillRect(10, 46, 18, 4);

    // Vacuum pump indicator
    graphics.fillStyle(0xa55eea, 1);
    graphics.fillCircle(32, 48, 3);

    // Status LEDs
    graphics.fillStyle(0x00ff88, 1);
    graphics.fillCircle(50, 48, 2);
    graphics.fillStyle(0xffd93d, 1);
    graphics.fillCircle(56, 48, 2);

    graphics.generateTexture('spectrometer', 64, 64);
    graphics.destroy();
  }

  createSequencer() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillEllipse(32, 60, 48, 8);

    // Base platform
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(4, 52, 56, 8, 3);

    // Main unit body
    graphics.fillStyle(0xf0f4f8, 1);
    graphics.fillRoundedRect(6, 16, 52, 38, 4);
    // Shading
    graphics.fillStyle(0xd8dce0, 1);
    graphics.fillRoundedRect(6, 16, 14, 38, 4);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(46, 20, 8, 30);

    // Top accent strip
    graphics.fillStyle(0x95e1d3, 1);
    graphics.fillRect(6, 16, 52, 4);
    graphics.fillStyle(0x6bb895, 1);
    graphics.fillRect(6, 16, 52, 2);

    // Display panel
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRoundedRect(10, 22, 28, 16, 3);

    // DNA sequence display
    graphics.fillStyle(0x00ff88, 0.9);
    graphics.fillRect(12, 24, 2, 3);
    graphics.fillRect(15, 27, 2, 3);
    graphics.fillRect(18, 24, 2, 3);
    graphics.fillRect(21, 30, 2, 3);
    graphics.fillStyle(0xff6b6b, 0.9);
    graphics.fillRect(24, 26, 2, 3);
    graphics.fillRect(27, 24, 2, 3);
    graphics.fillRect(30, 28, 2, 3);
    graphics.fillRect(33, 24, 2, 3);

    // Sample loading area
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRoundedRect(42, 22, 12, 20, 2);
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRect(44, 24, 8, 16);
    // Sample tubes
    graphics.fillStyle(0x95e1d3, 0.8);
    graphics.fillRect(45, 26, 2, 12);
    graphics.fillRect(49, 26, 2, 12);

    // Control buttons
    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillCircle(16, 44, 4);
    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(28, 44, 4);
    graphics.fillStyle(0xffd93d, 1);
    graphics.fillCircle(40, 44, 4);

    // Status LEDs
    graphics.fillStyle(0x00ff88, 1);
    graphics.fillCircle(50, 44, 2);

    graphics.generateTexture('sequencer', 64, 64);
    graphics.destroy();
  }

  createAccelerator() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillEllipse(32, 60, 50, 10);

    // Base platform - industrial
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRoundedRect(2, 50, 60, 12, 4);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillRect(4, 52, 56, 8);
    // Vent grilles
    graphics.fillStyle(0x1a1a2a, 1);
    for (let i = 0; i < 6; i++) {
      graphics.fillRect(8 + i * 9, 54, 6, 1);
      graphics.fillRect(8 + i * 9, 56, 6, 1);
    }

    // Main ring structure
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillCircle(32, 30, 26);
    graphics.fillStyle(0x3a3a4a, 1);
    graphics.fillCircle(32, 30, 22);

    // Inner ring with particle beam path
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillCircle(32, 30, 18);
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillCircle(32, 30, 14);

    // Particle beam (glowing)
    graphics.fillStyle(0xa55eea, 0.8);
    graphics.fillCircle(32, 30, 10);
    graphics.fillStyle(0xc88efa, 0.6);
    graphics.fillCircle(32, 30, 6);
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(32, 30, 2);

    // Magnets around ring
    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(32, 8, 4);
    graphics.fillCircle(32, 52, 4);
    graphics.fillCircle(10, 30, 4);
    graphics.fillCircle(54, 30, 4);
    // Magnet details
    graphics.fillStyle(0xc73e3e, 1);
    graphics.fillCircle(32, 8, 2);
    graphics.fillCircle(32, 52, 2);
    graphics.fillCircle(10, 30, 2);
    graphics.fillCircle(54, 30, 2);

    // Detector arrays
    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillRect(18, 6, 4, 6);
    graphics.fillRect(42, 6, 4, 6);
    graphics.fillRect(18, 48, 4, 6);
    graphics.fillRect(42, 48, 4, 6);

    // Control cables
    graphics.lineStyle(2, 0xffd93d, 0.8);
    graphics.lineBetween(4, 30, 10, 30);
    graphics.lineBetween(54, 30, 60, 30);

    // Energy indicator
    graphics.fillStyle(0xa55eea, 1);
    for (let i = 0; i < 4; i++) {
      graphics.fillCircle(8 + i * 4, 58, 2);
    }

    graphics.generateTexture('accelerator', 64, 64);
    graphics.destroy();
  }

  createLockedEquipment() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    graphics.fillStyle(0x000000, 0.1);
    graphics.fillEllipse(32, 58, 36, 6);

    // Base
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillRoundedRect(8, 50, 48, 10, 3);

    // Main body (silhouette)
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillRoundedRect(12, 16, 40, 36, 6);

    // Lock icon
    graphics.fillStyle(0x5a5a5a, 1);
    graphics.fillRoundedRect(24, 26, 16, 14, 3);
    // Lock shackle
    graphics.lineStyle(4, 0x5a5a5a, 1);
    graphics.strokeCircle(32, 22, 6);
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillRect(28, 22, 8, 6);
    // Keyhole
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillCircle(32, 32, 3);
    graphics.fillRect(31, 32, 2, 5);

    // Question marks
    graphics.fillStyle(0x4a4a4a, 1);
    const qSize = 6;
    // Left ?
    graphics.fillRoundedRect(14, 20, qSize, qSize * 1.5, 2);
    // Right ?
    graphics.fillRoundedRect(44, 20, qSize, qSize * 1.5, 2);

    graphics.generateTexture('equipment_locked', 64, 64);
    graphics.destroy();
  }

  createUIGraphics() {
    // Button - more polished look
    const btnGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Button shadow
    btnGraphics.fillStyle(0x2d9485, 1);
    btnGraphics.fillRoundedRect(2, 4, 200, 50, 10);
    // Button body
    btnGraphics.fillStyle(0x4ecdc4, 1);
    btnGraphics.fillRoundedRect(0, 0, 200, 50, 10);
    // Highlight
    btnGraphics.fillStyle(0x6edfd6, 1);
    btnGraphics.fillRoundedRect(4, 4, 192, 20, 8);
    btnGraphics.generateTexture('button', 200, 54);
    btnGraphics.destroy();

    // Button hover - brighter
    const btnHoverGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    btnHoverGraphics.fillStyle(0x2dbc9f, 1);
    btnHoverGraphics.fillRoundedRect(2, 4, 200, 50, 10);
    btnHoverGraphics.fillStyle(0x3dbdb5, 1);
    btnHoverGraphics.fillRoundedRect(0, 0, 200, 50, 10);
    btnHoverGraphics.fillStyle(0x5dcfc6, 1);
    btnHoverGraphics.fillRoundedRect(4, 4, 192, 20, 8);
    btnHoverGraphics.generateTexture('button_hover', 200, 54);
    btnHoverGraphics.destroy();

    // Panel - modern glass effect
    const panelGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Shadow
    panelGraphics.fillStyle(0x000000, 0.3);
    panelGraphics.fillRoundedRect(4, 4, 300, 400, 15);
    // Main panel
    panelGraphics.fillStyle(0x1a1a2e, 0.95);
    panelGraphics.fillRoundedRect(0, 0, 300, 400, 15);
    // Border
    panelGraphics.lineStyle(2, 0x4ecdc4, 1);
    panelGraphics.strokeRoundedRect(0, 0, 300, 400, 15);
    // Inner highlight
    panelGraphics.lineStyle(1, 0x4ecdc4, 0.3);
    panelGraphics.strokeRoundedRect(4, 4, 292, 392, 12);
    panelGraphics.generateTexture('panel', 304, 404);
    panelGraphics.destroy();

    // Small panel
    const smallPanelGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    smallPanelGraphics.fillStyle(0x000000, 0.2);
    smallPanelGraphics.fillRoundedRect(2, 2, 200, 100, 10);
    smallPanelGraphics.fillStyle(0x1a1a2e, 0.95);
    smallPanelGraphics.fillRoundedRect(0, 0, 200, 100, 10);
    smallPanelGraphics.lineStyle(2, 0x4ecdc4, 1);
    smallPanelGraphics.strokeRoundedRect(0, 0, 200, 100, 10);
    smallPanelGraphics.generateTexture('panel_small', 202, 102);
    smallPanelGraphics.destroy();

    // Icon backgrounds - with gradients
    const branchData = [
      { name: 'biology', color1: 0x4ecdc4, color2: 0x2d8a7b },
      { name: 'chemistry', color1: 0xff6b6b, color2: 0xc73e3e },
      { name: 'physics', color1: 0xffd93d, color2: 0xd4a829 },
      { name: 'engineering', color1: 0x95e1d3, color2: 0x6bb895 }
    ];

    branchData.forEach(({ name, color1, color2 }) => {
      const iconGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      // Shadow
      iconGraphics.fillStyle(0x000000, 0.2);
      iconGraphics.fillCircle(26, 26, 24);
      // Main circle
      iconGraphics.fillStyle(color2, 1);
      iconGraphics.fillCircle(24, 24, 24);
      iconGraphics.fillStyle(color1, 1);
      iconGraphics.fillCircle(24, 24, 20);
      // Highlight
      iconGraphics.fillStyle(0xffffff, 0.3);
      iconGraphics.fillCircle(18, 18, 8);
      iconGraphics.generateTexture(`icon_${name}`, 50, 50);
      iconGraphics.destroy();
    });

    // Coin icon - shiny gold
    const coinGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Shadow
    coinGraphics.fillStyle(0x000000, 0.2);
    coinGraphics.fillCircle(14, 14, 12);
    // Coin edge
    coinGraphics.fillStyle(0xc7a020, 1);
    coinGraphics.fillCircle(12, 12, 12);
    // Coin face
    coinGraphics.fillStyle(0xffd93d, 1);
    coinGraphics.fillCircle(12, 12, 10);
    // $ symbol
    coinGraphics.fillStyle(0xc7a020, 1);
    coinGraphics.fillRect(10, 6, 4, 12);
    coinGraphics.fillRect(8, 8, 8, 2);
    coinGraphics.fillRect(8, 14, 8, 2);
    // Highlight
    coinGraphics.fillStyle(0xffed4a, 1);
    coinGraphics.fillCircle(9, 9, 4);
    coinGraphics.generateTexture('coin', 26, 26);
    coinGraphics.destroy();

    // Research point icon - crystal/gem
    const rpGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Shadow
    rpGraphics.fillStyle(0x000000, 0.2);
    rpGraphics.fillCircle(14, 14, 12);
    // Background circle
    rpGraphics.fillStyle(0x7a3eaa, 1);
    rpGraphics.fillCircle(12, 12, 12);
    rpGraphics.fillStyle(0xa55eea, 1);
    rpGraphics.fillCircle(12, 12, 10);
    // Crystal shape
    rpGraphics.fillStyle(0xffffff, 1);
    rpGraphics.fillTriangle(12, 4, 6, 14, 18, 14);
    rpGraphics.fillStyle(0xd8b8ff, 1);
    rpGraphics.fillTriangle(12, 4, 6, 14, 12, 14);
    rpGraphics.fillStyle(0xffffff, 0.8);
    rpGraphics.fillTriangle(12, 14, 6, 14, 9, 20);
    rpGraphics.fillTriangle(12, 14, 18, 14, 15, 20);
    // Sparkle
    rpGraphics.fillStyle(0xffffff, 0.8);
    rpGraphics.fillCircle(9, 8, 2);
    rpGraphics.generateTexture('research_point', 26, 26);
    rpGraphics.destroy();

    // Progress bar background
    const progBgGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    progBgGraphics.fillStyle(0x1a1a2a, 1);
    progBgGraphics.fillRoundedRect(0, 0, 100, 12, 6);
    progBgGraphics.lineStyle(1, 0x3a3a4a, 1);
    progBgGraphics.strokeRoundedRect(0, 0, 100, 12, 6);
    progBgGraphics.generateTexture('progress_bg', 100, 12);
    progBgGraphics.destroy();

    // Progress bar fill
    const progFillGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    progFillGraphics.fillStyle(0x4ecdc4, 1);
    progFillGraphics.fillRoundedRect(0, 0, 100, 12, 6);
    progFillGraphics.fillStyle(0x6edfd6, 1);
    progFillGraphics.fillRect(2, 2, 96, 4);
    progFillGraphics.generateTexture('progress_fill', 100, 12);
    progFillGraphics.destroy();
  }

  createLabTiles() {
    // Floor tile - realistic lab floor with subtle pattern
    const floorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Base color
    floorGraphics.fillStyle(0x3d4a5a, 1);
    floorGraphics.fillRect(0, 0, 64, 64);
    // Tile pattern
    floorGraphics.fillStyle(0x4a5a6a, 1);
    floorGraphics.fillRect(2, 2, 60, 60);
    // Subtle grid lines
    floorGraphics.lineStyle(1, 0x3a4a5a, 0.5);
    floorGraphics.strokeRect(0, 0, 64, 64);
    // Specular highlight
    floorGraphics.fillStyle(0x5a6a7a, 0.3);
    floorGraphics.fillRect(4, 4, 20, 20);
    // Grout lines
    floorGraphics.fillStyle(0x2d3a4a, 1);
    floorGraphics.fillRect(0, 0, 64, 2);
    floorGraphics.fillRect(0, 0, 2, 64);
    floorGraphics.generateTexture('floor_tile', 64, 64);
    floorGraphics.destroy();

    // Wall tile - industrial lab wall
    const wallGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Base
    wallGraphics.fillStyle(0x1a1a2e, 1);
    wallGraphics.fillRect(0, 0, 64, 64);
    // Wall panel
    wallGraphics.fillStyle(0x252538, 1);
    wallGraphics.fillRect(2, 2, 60, 60);
    // Vertical accent
    wallGraphics.fillStyle(0x2a2a4e, 1);
    wallGraphics.fillRect(4, 0, 8, 64);
    wallGraphics.fillRect(52, 0, 8, 64);
    // Horizontal band
    wallGraphics.fillStyle(0x4ecdc4, 0.3);
    wallGraphics.fillRect(0, 28, 64, 8);
    // Top trim
    wallGraphics.fillStyle(0x3a3a5e, 1);
    wallGraphics.fillRect(0, 60, 64, 4);
    wallGraphics.generateTexture('wall_tile', 64, 64);
    wallGraphics.destroy();

    // Equipment slot - clean placement indicator
    const slotGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Shadow
    slotGraphics.fillStyle(0x000000, 0.1);
    slotGraphics.fillRoundedRect(4, 4, 80, 80, 8);
    // Base
    slotGraphics.fillStyle(0x3d4a5a, 1);
    slotGraphics.fillRoundedRect(0, 0, 80, 80, 8);
    // Inner area
    slotGraphics.fillStyle(0x4a5a6a, 1);
    slotGraphics.fillRoundedRect(4, 4, 72, 72, 6);
    // Dashed border indicator
    slotGraphics.lineStyle(2, 0x4ecdc4, 0.4);
    slotGraphics.strokeRoundedRect(8, 8, 64, 64, 4);
    // Plus icon
    slotGraphics.fillStyle(0x4ecdc4, 0.3);
    slotGraphics.fillRect(36, 24, 8, 32);
    slotGraphics.fillRect(24, 36, 32, 8);
    slotGraphics.generateTexture('equipment_slot', 84, 84);
    slotGraphics.destroy();

    // Equipment slot hover - highlighted
    const slotHoverGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    slotHoverGraphics.fillStyle(0x000000, 0.15);
    slotHoverGraphics.fillRoundedRect(4, 4, 80, 80, 8);
    slotHoverGraphics.fillStyle(0x4d5a6a, 1);
    slotHoverGraphics.fillRoundedRect(0, 0, 80, 80, 8);
    slotHoverGraphics.fillStyle(0x5a6a7a, 1);
    slotHoverGraphics.fillRoundedRect(4, 4, 72, 72, 6);
    // Bright border
    slotHoverGraphics.lineStyle(3, 0x4ecdc4, 1);
    slotHoverGraphics.strokeRoundedRect(4, 4, 72, 72, 6);
    // Glowing plus icon
    slotHoverGraphics.fillStyle(0x4ecdc4, 0.6);
    slotHoverGraphics.fillRect(36, 24, 8, 32);
    slotHoverGraphics.fillRect(24, 36, 32, 8);
    slotHoverGraphics.generateTexture('equipment_slot_hover', 84, 84);
    slotHoverGraphics.destroy();
  }

  createDarkHumorProps() {
    // Exhausted scientist for main menu (slumped posture, bags under eyes)
    const exhaustedGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    exhaustedGraphics.fillStyle(0x000000, 0.2);
    exhaustedGraphics.fillEllipse(16, 46, 20, 6);

    // Legs (slightly bent, tired stance)
    exhaustedGraphics.fillStyle(0x2a2a3a, 1);
    exhaustedGraphics.fillRect(10, 40, 5, 6);
    exhaustedGraphics.fillRect(17, 40, 5, 6);
    exhaustedGraphics.fillStyle(0x1a1a2a, 1);
    exhaustedGraphics.fillRoundedRect(9, 44, 6, 3, 1);
    exhaustedGraphics.fillRoundedRect(16, 44, 6, 3, 1);

    // Lab coat (rumpled)
    exhaustedGraphics.fillStyle(0xe8ecf0, 1);
    exhaustedGraphics.fillRoundedRect(6, 18, 20, 24, 3);
    exhaustedGraphics.fillStyle(0xd0d4d8, 1);
    exhaustedGraphics.fillRect(6, 18, 6, 24);

    // Coffee stain on coat
    exhaustedGraphics.fillStyle(0x8b6914, 0.4);
    exhaustedGraphics.fillCircle(18, 32, 4);

    // Arms (slumped)
    exhaustedGraphics.fillStyle(0xe8ecf0, 1);
    exhaustedGraphics.fillRoundedRect(2, 22, 5, 14, 2);
    exhaustedGraphics.fillRoundedRect(25, 22, 5, 14, 2);
    exhaustedGraphics.fillStyle(0xe8c4b8, 1);
    exhaustedGraphics.fillCircle(4, 36, 3);
    exhaustedGraphics.fillCircle(28, 36, 3);

    // Collar (loosened tie)
    exhaustedGraphics.fillStyle(0x5a6a7a, 1);
    exhaustedGraphics.fillRect(6, 18, 20, 3);
    exhaustedGraphics.fillStyle(0xff6b6b, 1);
    exhaustedGraphics.fillRect(14, 18, 4, 8);

    // Neck
    exhaustedGraphics.fillStyle(0xe8c4b8, 1);
    exhaustedGraphics.fillRect(13, 14, 6, 5);

    // Head (slightly tilted, tired)
    exhaustedGraphics.fillStyle(0xf0d0c0, 1);
    exhaustedGraphics.fillRoundedRect(7, 2, 18, 14, 6);

    // Dark circles under eyes
    exhaustedGraphics.fillStyle(0xb8a0a8, 0.6);
    exhaustedGraphics.fillEllipse(11, 11, 4, 2);
    exhaustedGraphics.fillEllipse(21, 11, 4, 2);

    // Messy hair
    exhaustedGraphics.fillStyle(0x4a3a2a, 1);
    exhaustedGraphics.fillRoundedRect(6, 0, 20, 8, 3);
    exhaustedGraphics.fillStyle(0x5a4a3a, 1);
    exhaustedGraphics.fillRect(8, 2, 3, 4);
    exhaustedGraphics.fillRect(20, 1, 4, 5);

    // Tired eyes (half closed)
    exhaustedGraphics.fillStyle(0xffffff, 1);
    exhaustedGraphics.fillEllipse(11, 9, 3, 2);
    exhaustedGraphics.fillEllipse(21, 9, 3, 2);
    exhaustedGraphics.fillStyle(0x3a3a4a, 1);
    exhaustedGraphics.fillCircle(11, 9, 1);
    exhaustedGraphics.fillCircle(21, 9, 1);

    // Frown
    exhaustedGraphics.fillStyle(0xc9a090, 1);
    exhaustedGraphics.fillRoundedRect(12, 13, 8, 2, 1);

    // Glasses (askew)
    exhaustedGraphics.lineStyle(1, 0x4a4a5a, 0.8);
    exhaustedGraphics.strokeCircle(11, 9, 4);
    exhaustedGraphics.strokeCircle(21, 9, 4);

    exhaustedGraphics.generateTexture('scientist_exhausted', 32, 48);
    exhaustedGraphics.destroy();

    // Coffee cup (essential academic prop)
    const coffeeGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Cup shadow
    coffeeGraphics.fillStyle(0x000000, 0.15);
    coffeeGraphics.fillEllipse(12, 22, 10, 3);

    // Cup body
    coffeeGraphics.fillStyle(0xf0f0f0, 1);
    coffeeGraphics.fillRoundedRect(4, 6, 16, 16, 3);
    coffeeGraphics.fillStyle(0xd8d8d8, 1);
    coffeeGraphics.fillRect(4, 6, 5, 16);

    // Handle
    coffeeGraphics.lineStyle(3, 0xf0f0f0, 1);
    coffeeGraphics.strokeCircle(22, 12, 4);
    coffeeGraphics.fillStyle(0x16213e, 1);
    coffeeGraphics.fillRect(18, 8, 4, 10);

    // Coffee inside
    coffeeGraphics.fillStyle(0x4a2810, 1);
    coffeeGraphics.fillRect(6, 8, 12, 4);
    coffeeGraphics.fillStyle(0x6a3810, 0.5);
    coffeeGraphics.fillCircle(10, 9, 2);

    // Steam
    coffeeGraphics.fillStyle(0xffffff, 0.4);
    coffeeGraphics.fillCircle(8, 3, 2);
    coffeeGraphics.fillCircle(12, 2, 2);
    coffeeGraphics.fillCircle(15, 4, 2);

    // "World's Okayest PI" text area
    coffeeGraphics.fillStyle(0xff6b6b, 1);
    coffeeGraphics.fillRect(6, 12, 12, 6);

    coffeeGraphics.generateTexture('coffee_cup', 26, 24);
    coffeeGraphics.destroy();

    // Rejection letter stack
    const rejectionGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    rejectionGraphics.fillStyle(0x000000, 0.15);
    rejectionGraphics.fillEllipse(16, 30, 14, 4);

    // Stack of papers (multiple rejection letters)
    // Bottom papers (older, more crumpled)
    rejectionGraphics.fillStyle(0xd8d8c8, 1);
    rejectionGraphics.fillRoundedRect(2, 20, 24, 10, 1);
    rejectionGraphics.fillStyle(0xe0e0d0, 1);
    rejectionGraphics.fillRoundedRect(4, 16, 24, 10, 1);
    rejectionGraphics.fillStyle(0xe8e8d8, 1);
    rejectionGraphics.fillRoundedRect(3, 12, 24, 10, 1);

    // Top letter (most recent rejection)
    rejectionGraphics.fillStyle(0xf5f5e8, 1);
    rejectionGraphics.fillRoundedRect(2, 4, 26, 14, 2);

    // Red "REJECTED" stamp
    rejectionGraphics.fillStyle(0xff4444, 0.8);
    rejectionGraphics.fillRoundedRect(4, 8, 22, 6, 1);

    // Stamp text lines
    rejectionGraphics.fillStyle(0xaa2222, 1);
    rejectionGraphics.fillRect(6, 9, 18, 1);
    rejectionGraphics.fillRect(6, 11, 14, 1);

    // Some text lines on letter
    rejectionGraphics.fillStyle(0x888888, 0.6);
    rejectionGraphics.fillRect(4, 5, 12, 1);
    rejectionGraphics.fillRect(4, 15, 8, 1);

    // Red corner (angry fold)
    rejectionGraphics.fillStyle(0xff6b6b, 0.3);
    rejectionGraphics.fillTriangle(22, 4, 28, 4, 28, 10);

    rejectionGraphics.generateTexture('rejection_stack', 32, 32);
    rejectionGraphics.destroy();

    // Grant application form (bureaucratic nightmare)
    const grantFormGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Paper
    grantFormGraphics.fillStyle(0xf8f8f0, 1);
    grantFormGraphics.fillRoundedRect(0, 0, 28, 32, 2);

    // Header
    grantFormGraphics.fillStyle(0x4a5a6a, 1);
    grantFormGraphics.fillRect(2, 2, 24, 6);

    // Form lines
    grantFormGraphics.fillStyle(0xcccccc, 1);
    for (let i = 0; i < 5; i++) {
      grantFormGraphics.fillRect(3, 10 + i * 4, 22, 1);
    }

    // Checkboxes (all unchecked - requirements not met)
    grantFormGraphics.lineStyle(1, 0x888888, 1);
    grantFormGraphics.strokeRect(4, 10, 3, 3);
    grantFormGraphics.strokeRect(4, 14, 3, 3);
    grantFormGraphics.strokeRect(4, 18, 3, 3);

    // X marks (rejected items)
    grantFormGraphics.lineStyle(1, 0xff4444, 1);
    grantFormGraphics.lineBetween(4, 10, 7, 13);
    grantFormGraphics.lineBetween(7, 10, 4, 13);

    grantFormGraphics.generateTexture('grant_form', 28, 32);
    grantFormGraphics.destroy();

    // Broken dreams icon (cracked lightbulb)
    const dreamGraphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Bulb base
    dreamGraphics.fillStyle(0x888888, 1);
    dreamGraphics.fillRoundedRect(8, 20, 8, 6, 2);
    dreamGraphics.fillStyle(0x666666, 1);
    dreamGraphics.fillRect(9, 22, 6, 1);
    dreamGraphics.fillRect(9, 24, 6, 1);

    // Cracked bulb
    dreamGraphics.fillStyle(0xffd93d, 0.6);
    dreamGraphics.fillCircle(12, 12, 10);

    // Cracks
    dreamGraphics.lineStyle(2, 0x333333, 0.8);
    dreamGraphics.lineBetween(12, 4, 14, 12);
    dreamGraphics.lineBetween(14, 12, 10, 16);
    dreamGraphics.lineBetween(14, 12, 18, 14);

    // Dimmed glow (lost hope)
    dreamGraphics.fillStyle(0xffd93d, 0.2);
    dreamGraphics.fillCircle(12, 12, 12);

    dreamGraphics.generateTexture('broken_dream', 24, 28);
    dreamGraphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
