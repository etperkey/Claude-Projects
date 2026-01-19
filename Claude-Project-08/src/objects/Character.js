// Character.js - Player character representation

import gameState from '../systems/GameState.js';

export default class Character {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Create visual representation
    this.sprite = this.createSprite();

    // Status indicators
    this.statusIndicators = [];
  }

  createSprite() {
    const container = this.scene.add.container(this.x, this.y);

    // Body
    const body = this.scene.add.graphics();
    body.fillStyle(0x74b9ff, 1);
    body.fillCircle(0, -30, 20); // Head
    body.fillRoundedRect(-15, -5, 30, 50, 8); // Body

    // Hospital gown
    const gown = this.scene.add.graphics();
    gown.fillStyle(0xa8e6cf, 1);
    gown.fillRoundedRect(-18, 0, 36, 45, 5);

    // IV pole
    const iv = this.scene.add.graphics();
    iv.lineStyle(2, 0x888888, 1);
    iv.lineBetween(25, -40, 25, 30);
    iv.fillStyle(0xffffff, 1);
    iv.fillRect(20, -45, 10, 15); // IV bag

    container.add([body, gown, iv]);

    return container;
  }

  updateStatus() {
    // Clear old indicators
    this.statusIndicators.forEach(ind => ind.destroy());
    this.statusIndicators = [];

    let yOffset = -80;

    // Health indicator
    if (gameState.resources.health < 50) {
      const healthWarning = this.scene.add.text(this.x, this.y + yOffset, '⚠️ LOW HEALTH', {
        fontSize: '12px',
        color: '#e74c3c'
      }).setOrigin(0.5);
      this.statusIndicators.push(healthWarning);
      yOffset -= 20;
    }

    // Treatment status
    if (gameState.treatment.treatmentPlan) {
      const treatmentText = this.scene.add.text(this.x, this.y + yOffset,
        `💊 ${gameState.treatment.treatmentPlan}`, {
        fontSize: '12px',
        color: '#27ae60'
      }).setOrigin(0.5);
      this.statusIndicators.push(treatmentText);
    }
  }

  // Animate receiving treatment
  animateTreatment(type) {
    if (type === 'chemo') {
      // Shake effect
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.x - 5,
        duration: 100,
        yoyo: true,
        repeat: 5
      });
    } else if (type === 'surgery') {
      // Fade and return
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.3,
        duration: 1000,
        yoyo: true
      });
    }
  }

  // Animate hope loss
  animateHopeLoss() {
    // Slouch animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.y + 10,
      duration: 500,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  destroy() {
    this.sprite.destroy();
    this.statusIndicators.forEach(ind => ind.destroy());
  }
}
