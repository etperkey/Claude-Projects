// Animation system for sprites and particles

// Particle pool
const particles = [];
const MAX_PARTICLES = 50;

export function createParticle(x, y, color, type = 'fade') {
  if (particles.length >= MAX_PARTICLES) {
    particles.shift(); // remove oldest
  }
  particles.push({
    x, y, color, type,
    life: 1.0,
    dx: (Math.random() - 0.5) * 6,
    dy: (Math.random() - 0.5) * 6 - 3, // bias upward
    size: 1 + Math.floor(Math.random() * 2),
  });
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 2;
    p.x += p.dx * dt * 30;
    p.y += p.dy * dt * 30;

    if (p.type === 'rise') {
      p.dy -= dt * 2;
    }

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function getParticles() {
  return particles;
}

// Spawn burst of particles (for kills, mutations, etc.)
export function spawnBurst(x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    createParticle(x, y, color, 'fade');
  }
}

export function spawnKillParticles(x, y) {
  spawnBurst(x, y, '#ff4444', 3);
}

export function spawnMutationParticles(x, y) {
  spawnBurst(x, y, '#ffcc00', 8);
  spawnBurst(x, y, '#ff88ff', 4);
}

export function spawnHealParticles(x, y) {
  for (let i = 0; i < 3; i++) {
    createParticle(x, y, '#66ff88', 'rise');
  }
}

// Immune cell wandering positions
// Each immune cell gets a position that slowly orbits the tumor
export class CellAnimator {
  constructor() {
    this.immunePositions = {}; // cellId -> {x, y, angle, speed}
    this.nextId = 0;
  }

  ensurePositions(immuneCells, allyCount, centerX, centerY) {
    // Count total needed
    const needed = {};
    for (const [type, count] of Object.entries(immuneCells)) {
      const roundCount = Math.floor(count);
      for (let i = 0; i < roundCount; i++) {
        const key = `${type}_${i}`;
        if (!this.immunePositions[key]) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 75 + Math.random() * 100;
          this.immunePositions[key] = {
            type,
            angle,
            radius,
            speed: 0.3 + Math.random() * 0.5,
            wobble: Math.random() * Math.PI * 2,
          };
        }
        needed[key] = true;
      }
    }

    // Allies
    for (const [type, count] of Object.entries(allyCount)) {
      for (let i = 0; i < count; i++) {
        const key = `ally_${type}_${i}`;
        if (!this.immunePositions[key]) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 30 + Math.random() * 45;
          this.immunePositions[key] = {
            type,
            angle,
            radius,
            speed: 0.2 + Math.random() * 0.3,
            wobble: Math.random() * Math.PI * 2,
            isAlly: true,
          };
        }
        needed[key] = true;
      }
    }

    // Remove positions for cells that no longer exist
    for (const key of Object.keys(this.immunePositions)) {
      if (!needed[key]) delete this.immunePositions[key];
    }
  }

  update(dt, centerX, centerY) {
    for (const pos of Object.values(this.immunePositions)) {
      pos.angle += pos.speed * dt;
      pos.wobble += dt * 2;
    }
  }

  getPositions(centerX, centerY) {
    const result = [];
    for (const [key, pos] of Object.entries(this.immunePositions)) {
      const wobbleOffset = Math.sin(pos.wobble) * 8;
      const r = pos.radius + wobbleOffset;
      result.push({
        key,
        type: pos.type,
        isAlly: pos.isAlly || false,
        x: centerX + Math.cos(pos.angle) * r,
        y: centerY + Math.sin(pos.angle) * r,
      });
    }
    return result;
  }
}
