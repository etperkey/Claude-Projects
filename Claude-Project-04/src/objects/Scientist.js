import Phaser from 'phaser';

export default class Scientist extends Phaser.GameObjects.Container {
  constructor(scene, x, y, data) {
    super(scene, x, y);

    this.scene = scene;
    this.data = data;
    this.isSelected = false;
    this.assignedEquipment = null;
    this.wanderTarget = null;
    this.wanderTimer = 0;

    // Create sprite
    this.sprite = scene.add.image(0, 0, `scientist_${data.type}`);
    this.add(this.sprite);

    // Selection indicator
    this.selectionRing = scene.add.circle(0, 5, 20, 0x4ecdc4, 0)
      .setStrokeStyle(3, 0x4ecdc4);
    this.add(this.selectionRing);
    this.selectionRing.setVisible(false);

    // Name label
    this.nameLabel = scene.add.text(0, -35, data.name.split(' ').pop(), {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#1a1a2e88',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.add(this.nameLabel);

    // Level badge
    this.levelBadge = scene.add.text(12, -20, `Lv${data.level}`, {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#ffd93d',
      backgroundColor: '#1a1a2e',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5);
    this.add(this.levelBadge);

    // Working indicator (shown when assigned)
    this.workingIndicator = scene.add.text(0, 30, 'Working...', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#4ecdc4'
    }).setOrigin(0.5);
    this.add(this.workingIndicator);
    this.workingIndicator.setVisible(false);

    // Set size for click detection
    this.setSize(32, 48);
    this.setInteractive();

    // Add to scene
    scene.add.existing(this);

    // Start idle animation
    this.startIdleAnimation();

    // Start wandering if not assigned
    if (!data.assigned) {
      this.startWandering();
    }
  }

  startIdleAnimation() {
    this.scene.tweens.add({
      targets: this.sprite,
      y: -3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  startWandering() {
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000),
      callback: () => {
        if (!this.data.assigned && this.active) {
          this.wanderToNewPosition();
        }
      },
      loop: true
    });
  }

  wanderToNewPosition() {
    const targetX = Phaser.Math.Between(150, 1100);
    const targetY = Phaser.Math.Between(250, 550);

    // Flip sprite based on direction
    if (targetX < this.x) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: Phaser.Math.Between(1500, 3000),
      ease: 'Linear'
    });
  }

  select() {
    this.isSelected = true;
    this.selectionRing.setVisible(true);

    // Pulsing effect
    this.scene.tweens.add({
      targets: this.selectionRing,
      alpha: 0.3,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Show info tooltip
    this.showTooltip();
  }

  deselect() {
    this.isSelected = false;
    this.selectionRing.setVisible(false);
    this.scene.tweens.killTweensOf(this.selectionRing);
    this.selectionRing.setAlpha(1);
    this.selectionRing.setScale(1);

    this.hideTooltip();
  }

  showTooltip() {
    if (this.tooltip) return;

    const tooltipWidth = 180;
    const tooltipHeight = 120;

    this.tooltip = this.scene.add.container(0, -90);

    // Background
    const bg = this.scene.add.rectangle(0, 0, tooltipWidth, tooltipHeight, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x4ecdc4);
    this.tooltip.add(bg);

    // Name
    const name = this.scene.add.text(0, -45, this.data.name, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#4ecdc4',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tooltip.add(name);

    // Type
    const typeColors = {
      biologist: '#4ecdc4',
      chemist: '#ff6b6b',
      physicist: '#ffd93d',
      engineer: '#95e1d3'
    };
    const type = this.scene.add.text(0, -28, this.data.type.charAt(0).toUpperCase() + this.data.type.slice(1), {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: typeColors[this.data.type]
    }).setOrigin(0.5);
    this.tooltip.add(type);

    // Stats
    const stats = [
      { label: 'INT', value: this.data.stats.intelligence, y: -10 },
      { label: 'SPD', value: this.data.stats.speed, y: 5 },
      { label: 'LCK', value: this.data.stats.luck, y: 20 }
    ];

    stats.forEach(stat => {
      const statText = this.scene.add.text(-70, stat.y, `${stat.label}: ${stat.value}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff'
      });
      this.tooltip.add(statText);

      // Mini bar
      const barBg = this.scene.add.rectangle(30, stat.y + 5, 60, 6, 0x333333);
      const barFill = this.scene.add.rectangle(30 - 30 + (stat.value * 0.3), stat.y + 5, stat.value * 0.6, 6, 0x4ecdc4);
      this.tooltip.add(barBg);
      this.tooltip.add(barFill);
    });

    // Traits
    if (this.data.traits.length > 0) {
      const traitText = this.scene.add.text(0, 40, this.data.traits.map(t => t.name).join(', '), {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: '#ffd93d'
      }).setOrigin(0.5);
      this.tooltip.add(traitText);
    }

    this.add(this.tooltip);
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  assignTo(equipment) {
    this.data.assigned = equipment.data.slotIndex;
    this.assignedEquipment = equipment;

    // Move to equipment position
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: equipment.x - 50,
      y: equipment.y + 20,
      duration: 500,
      ease: 'Power2'
    });

    this.workingIndicator.setVisible(true);

    // Face the equipment
    this.sprite.setFlipX(false);
  }

  unassign() {
    this.data.assigned = null;
    this.assignedEquipment = null;
    this.workingIndicator.setVisible(false);

    // Start wandering again
    this.wanderToNewPosition();
  }

  levelUp() {
    this.data.level++;
    this.data.xp = 0;

    // Increase stats slightly
    this.data.stats.intelligence = Math.min(100, this.data.stats.intelligence + Phaser.Math.Between(1, 5));
    this.data.stats.speed = Math.min(100, this.data.stats.speed + Phaser.Math.Between(1, 5));
    this.data.stats.luck = Math.min(100, this.data.stats.luck + Phaser.Math.Between(1, 5));

    // Update level badge
    this.levelBadge.setText(`Lv${this.data.level}`);

    // Level up effect
    const levelUpText = this.scene.add.text(this.x, this.y - 50, 'LEVEL UP!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: levelUpText,
      y: levelUpText.y - 30,
      alpha: 0,
      duration: 1500,
      onComplete: () => levelUpText.destroy()
    });
  }

  getBounds() {
    return new Phaser.Geom.Rectangle(this.x - 16, this.y - 24, 32, 48);
  }
}
