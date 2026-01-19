// NPCs.js - Non-player characters (doctors, insurance reps, etc.)

import ContentData from '../systems/ContentData.js';

export class Doctor {
  constructor(scene, x, y, name = 'Dr. Sarah Chen') {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.name = name;

    this.sprite = this.createSprite();
  }

  createSprite() {
    const container = this.scene.add.container(this.x, this.y);

    // Body
    const body = this.scene.add.graphics();
    body.fillStyle(0xffeaa7, 1);
    body.fillCircle(0, -30, 20); // Head
    body.fillStyle(0xffffff, 1);
    body.fillRoundedRect(-15, -5, 30, 50, 8); // White coat

    // Stethoscope
    const steth = this.scene.add.graphics();
    steth.lineStyle(3, 0x2d3436, 1);
    steth.beginPath();
    steth.moveTo(-5, 0);
    steth.lineTo(-5, 15);
    steth.lineTo(5, 15);
    steth.lineTo(5, 0);
    steth.strokePath();

    // Name tag
    const nameTag = this.scene.add.text(0, 55, this.name, {
      fontSize: '12px',
      color: '#2d3436',
      backgroundColor: '#ffffff',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5);

    container.add([body, steth, nameTag]);

    return container;
  }

  speak(message) {
    // Create speech bubble
    const bubble = this.scene.add.container(this.x + 80, this.y - 50);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(0, 0, 200, 60, 8);
    bg.lineStyle(2, 0x2d3436, 1);
    bg.strokeRoundedRect(0, 0, 200, 60, 8);

    const text = this.scene.add.text(10, 10, message, {
      fontSize: '11px',
      color: '#2d3436',
      wordWrap: { width: 180 }
    });

    bubble.add([bg, text]);

    // Auto-destroy after delay
    this.scene.time.delayedCall(4000, () => {
      this.scene.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 500,
        onComplete: () => bubble.destroy()
      });
    });

    return bubble;
  }

  destroy() {
    this.sprite.destroy();
  }
}

export class InsuranceRep {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.sprite = this.createSprite();
  }

  createSprite() {
    const container = this.scene.add.container(this.x, this.y);

    // Body (gray suit)
    const body = this.scene.add.graphics();
    body.fillStyle(0x636e72, 1);
    body.fillCircle(0, -30, 20); // Head
    body.fillStyle(0x2d3436, 1);
    body.fillRoundedRect(-15, -5, 30, 50, 8); // Suit

    // Tie
    const tie = this.scene.add.graphics();
    tie.fillStyle(0xdc3545, 1);
    tie.fillTriangle(0, 0, -5, 40, 5, 40);

    // Name tag
    const nameTag = this.scene.add.text(0, 55, 'Claims Dept.', {
      fontSize: '12px',
      color: '#636e72'
    }).setOrigin(0.5);

    container.add([body, tie, nameTag]);

    return container;
  }

  denyClai() {
    // Stamp animation
    const stamp = this.scene.add.text(this.x + 50, this.y - 30, 'DENIED', {
      fontSize: '24px',
      color: '#dc3545',
      fontStyle: 'bold'
    }).setOrigin(0.5).setRotation(-0.2).setScale(0);

    this.scene.tweens.add({
      targets: stamp,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1500, () => stamp.destroy());
      }
    });
  }

  speak(message) {
    const bubble = this.scene.add.container(this.x + 80, this.y - 50);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf8f9fa, 0.95);
    bg.fillRoundedRect(0, 0, 200, 60, 8);
    bg.lineStyle(2, 0x636e72, 1);
    bg.strokeRoundedRect(0, 0, 200, 60, 8);

    const text = this.scene.add.text(10, 10, message, {
      fontSize: '11px',
      color: '#2d3436',
      wordWrap: { width: 180 }
    });

    bubble.add([bg, text]);

    this.scene.time.delayedCall(4000, () => bubble.destroy());

    return bubble;
  }

  destroy() {
    this.sprite.destroy();
  }
}

export class CollectionAgent {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.sprite = this.createSprite();
  }

  createSprite() {
    const container = this.scene.add.container(this.x, this.y);

    // Menacing figure
    const body = this.scene.add.graphics();
    body.fillStyle(0x2d3436, 1);
    body.fillCircle(0, -30, 20); // Head
    body.fillRoundedRect(-18, -5, 36, 55, 8); // Body

    // Phone
    const phone = this.scene.add.graphics();
    phone.fillStyle(0x636e72, 1);
    phone.fillRect(20, -10, 8, 25);

    // Label
    const label = this.scene.add.text(0, 60, 'Collections', {
      fontSize: '12px',
      color: '#dc3545'
    }).setOrigin(0.5);

    container.add([body, phone, label]);

    return container;
  }

  call() {
    // Ring animation
    const ring = this.scene.add.text(this.x, this.y - 60, '📞 RING RING', {
      fontSize: '16px'
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: ring,
      y: this.y - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => ring.destroy()
    });
  }

  destroy() {
    this.sprite.destroy();
  }
}

export class Politician {
  constructor(scene, x, y, name, party) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.name = name;
    this.party = party;

    this.sprite = this.createSprite();
  }

  createSprite() {
    const container = this.scene.add.container(this.x, this.y);

    // Figure with flag pin
    const body = this.scene.add.graphics();
    body.fillStyle(0xfad390, 1);
    body.fillCircle(0, -30, 20);
    body.fillStyle(this.party === 'R' ? 0xdc3545 : 0x3498db, 1);
    body.fillRoundedRect(-15, -5, 30, 50, 8);

    // Flag pin
    const pin = this.scene.add.graphics();
    pin.fillStyle(0xdc3545, 1);
    pin.fillRect(-8, 5, 4, 3);
    pin.fillStyle(0xffffff, 1);
    pin.fillRect(-8, 8, 4, 3);
    pin.fillStyle(0x3498db, 1);
    pin.fillRect(-8, 11, 4, 3);

    const nameTag = this.scene.add.text(0, 55, this.name, {
      fontSize: '10px',
      color: '#2d3436'
    }).setOrigin(0.5);

    container.add([body, pin, nameTag]);

    return container;
  }

  tweet(message) {
    const tweet = this.scene.add.container(this.x + 100, this.y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1da1f2, 1);
    bg.fillRoundedRect(0, 0, 220, 80, 8);

    const handle = this.scene.add.text(10, 8, `@${this.name.replace(/\s/g, '')}`, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const text = this.scene.add.text(10, 25, message, {
      fontSize: '11px',
      color: '#ffffff',
      wordWrap: { width: 200 }
    });

    tweet.add([bg, handle, text]);

    return tweet;
  }

  destroy() {
    this.sprite.destroy();
  }
}

// Factory function for creating NPCs
export function createNPC(scene, type, x, y, options = {}) {
  switch (type) {
    case 'doctor':
      return new Doctor(scene, x, y, options.name);
    case 'insurance':
      return new InsuranceRep(scene, x, y);
    case 'collector':
      return new CollectionAgent(scene, x, y);
    case 'politician':
      return new Politician(scene, x, y, options.name, options.party);
    default:
      console.warn(`Unknown NPC type: ${type}`);
      return null;
  }
}
