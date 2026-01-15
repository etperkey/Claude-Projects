import Phaser from 'phaser';
import { audioSystem } from '../systems/AudioSystem.js';

export default class Equipment extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type, data) {
    super(scene, x, y);

    this.scene = scene;
    this.type = type;
    this.data = data;
    this.assignedScientist = null;

    // Equipment names
    const names = {
      microscope: 'Microscope',
      centrifuge: 'Centrifuge',
      computer: 'Computer',
      pcr: 'PCR Machine',
      sequencer: 'Gene Sequencer',
      spectrometer: 'Mass Spec',
      accelerator: 'Particle Accelerator'
    };

    // Create sprite
    this.sprite = scene.add.image(0, 0, type);
    this.add(this.sprite);

    // Glow effect when active
    this.glow = scene.add.circle(0, 10, 40, 0x4ecdc4, 0);
    this.add(this.glow);
    this.sendToBack(this.glow);

    // Name label
    this.nameLabel = scene.add.text(0, -45, names[type], {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#1a1a2e99',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.add(this.nameLabel);

    // Level indicator
    this.levelText = scene.add.text(30, -30, `Lv${data.level}`, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffd93d',
      backgroundColor: '#1a1a2e',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);
    this.add(this.levelText);

    // Progress bar background
    this.progressBg = scene.add.rectangle(0, 45, 60, 8, 0x333333);
    this.add(this.progressBg);

    // Progress bar fill
    this.progressFill = scene.add.rectangle(-30, 45, 0, 8, 0x4ecdc4);
    this.progressFill.setOrigin(0, 0.5);
    this.add(this.progressFill);

    // Progress percentage text
    this.progressText = scene.add.text(0, 45, '', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.add(this.progressText);

    // Condition indicator
    this.conditionBar = scene.add.rectangle(0, 55, data.condition * 0.6, 4, this.getConditionColor(data.condition));
    this.add(this.conditionBar);

    // Status text
    this.statusText = scene.add.text(0, 65, 'Idle', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#888888'
    }).setOrigin(0.5);
    this.add(this.statusText);

    // Set size for click detection
    this.setSize(64, 64);
    this.setInteractive();

    // Add hover effects
    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onHoverEnd, this);

    // Add to scene
    scene.add.existing(this);

    // Update display
    this.updateProgress();

    // Start idle animation
    this.startIdleAnimation();
  }

  startIdleAnimation() {
    // Subtle floating animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: -2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  onHover() {
    this.sprite.setTint(0xaaffaa);
    this.showUpgradeInfo();
  }

  onHoverEnd() {
    this.sprite.clearTint();
    this.hideUpgradeInfo();
  }

  showUpgradeInfo() {
    if (this.upgradeInfo) return;

    const upgradeCost = this.getUpgradeCost();
    const gameState = this.scene.registry.get('gameState');
    const canAfford = gameState.funding >= upgradeCost;

    this.upgradeInfo = this.scene.add.container(70, 0);

    // Background
    const bg = this.scene.add.rectangle(0, 0, 100, 60, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x4ecdc4)
      .setInteractive();
    this.upgradeInfo.add(bg);

    // Upgrade text
    const text = this.scene.add.text(0, -15, `Upgrade Lv${this.data.level + 1}`, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#4ecdc4'
    }).setOrigin(0.5);
    this.upgradeInfo.add(text);

    // Cost
    const cost = this.scene.add.text(0, 5, `$${upgradeCost.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: canAfford ? '#4ecdc4' : '#ff6b6b'
    }).setOrigin(0.5);
    this.upgradeInfo.add(cost);

    // Upgrade button
    const btn = this.scene.add.rectangle(0, 25, 60, 20, canAfford ? 0x4ecdc4 : 0x666666)
      .setInteractive();
    this.upgradeInfo.add(btn);

    const btnText = this.scene.add.text(0, 25, 'Upgrade', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#1a1a2e'
    }).setOrigin(0.5);
    this.upgradeInfo.add(btnText);

    if (canAfford) {
      btn.on('pointerdown', () => this.upgrade());
    }

    this.add(this.upgradeInfo);
  }

  hideUpgradeInfo() {
    if (this.upgradeInfo) {
      this.upgradeInfo.destroy();
      this.upgradeInfo = null;
    }
  }

  getUpgradeCost() {
    return 500 * Math.pow(2, this.data.level);
  }

  upgrade() {
    const cost = this.getUpgradeCost();
    const gameState = this.scene.registry.get('gameState');

    if (gameState.funding >= cost) {
      gameState.funding -= cost;
      this.data.level++;
      this.levelText.setText(`Lv${this.data.level}`);
      audioSystem.playEquipmentUpgrade();

      // Visual feedback
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.sprite.setScale(1);
        }
      });

      // Update UI
      this.scene.updateUI();
      this.hideUpgradeInfo();
    }
  }

  getConditionColor(condition) {
    if (condition > 70) return 0x4ecdc4;
    if (condition > 30) return 0xffd93d;
    return 0xff6b6b;
  }

  assignScientist(scientist) {
    this.data.assignedScientist = scientist.data.id;
    this.assignedScientist = scientist;
    this.statusText.setText('Working');
    this.statusText.setColor('#4ecdc4');

    // Start glow effect
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  unassignScientist() {
    this.data.assignedScientist = null;
    this.assignedScientist = null;
    this.statusText.setText('Idle');
    this.statusText.setColor('#888888');

    // Stop glow
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0);
  }

  updateProgress() {
    const progress = this.data.experimentProgress;
    const fillWidth = (progress / 100) * 60;

    this.progressFill.setSize(fillWidth, 8);

    if (progress > 0) {
      this.progressText.setText(`${Math.floor(progress)}%`);
    } else {
      this.progressText.setText('');
    }

    // Update condition display
    this.conditionBar.setSize(this.data.condition * 0.6, 4);
    this.conditionBar.setFillStyle(this.getConditionColor(this.data.condition));
  }

  getBounds() {
    return new Phaser.Geom.Rectangle(this.x - 32, this.y - 32, 64, 64);
  }
}
