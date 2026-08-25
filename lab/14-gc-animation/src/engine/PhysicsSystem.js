import { CellType, CellState } from '../cells/CellTypes.js';
import { CELL_SIZES, BROWNIAN_STRENGTH, BASE_SPEED, COLLISION_RADIUS_MULT, MIGRATION_SPEED } from '../utils/constants.js';
import { constrainToEllipse, randomGaussian } from '../utils/math.js';

/**
 * Handles movement, zone containment, collision avoidance, and Brownian motion.
 * Optimized: squared-distance comparisons, no per-entity allocations.
 */
export class PhysicsSystem {
  update(entities, gc, dt, scale) {
    const all = entities.all();

    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (e.type === CellType.FDC) continue;
      if (e.state === CellState.Apoptosing && e.type === CellType.Apoptotic) continue;

      if (e.targetX != null && e.targetY != null) {
        this.moveToward(e, e.targetX, e.targetY, dt, scale);
      }

      if (e.state === CellState.Idle || e.state === CellState.Moving) {
        this.brownian(e, dt, scale);
      }

      this.containToZone(e, gc, scale);
    }

    this.resolveCollisions(all, scale);
  }

  moveToward(e, tx, ty, dt, scale) {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist2 = dx * dx + dy * dy;

    if (dist2 < 4) {
      e.targetX = null;
      e.targetY = null;
      if (e.onArrival) {
        e.onArrival(e);
        e.onArrival = null;
      }
      return;
    }

    const dist = Math.sqrt(dist2);
    const speed = (e.state === CellState.Migrating ? MIGRATION_SPEED : BASE_SPEED) *
                  (e.speedMult || 1) * dt * scale;
    const move = Math.min(speed, dist);
    e.x += (dx / dist) * move;
    e.y += (dy / dist) * move;
  }

  brownian(e, dt, scale) {
    const strength = BROWNIAN_STRENGTH * scale * dt;
    e.x += randomGaussian(0, strength);
    e.y += randomGaussian(0, strength);
  }

  containToZone(e, gc, scale) {
    // Always clamp to canvas bounds (prevents off-screen drift)
    if (e.zone !== 'exit' && gc.width > 0) {
      const margin = 20 * scale;
      if (e.x < margin) e.x = margin;
      if (e.x > gc.width - margin) e.x = gc.width - margin;
      if (e.y < margin) e.y = margin;
      if (e.y > gc.height - margin) e.y = gc.height - margin;
    }

    if (!gc.visible || gc.opacity < 0.1) return;

    const zone = e.zone;
    if (zone === 'mantle') {
      if (gc.isInsideGC(e.x, e.y)) {
        const dx = e.x - gc.cx;
        const dy = e.y - gc.cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        e.x = gc.cx + dx / len * (gc.rx + 5 * scale);
        e.y = gc.cy + dy / len * (gc.ry + 5 * scale);
      }
      const mpt = constrainToEllipse(e.x, e.y, gc.cx, gc.cy, gc.mantleRx, gc.mantleRy);
      e.x = mpt.x;
      e.y = mpt.y;
    } else if (zone === 'dz') {
      const pt = constrainToEllipse(e.x, e.y, gc.cx, gc.cy, gc.rx * 0.95, gc.ry * 0.95);
      e.x = pt.x;
      e.y = pt.y;
      if (e.y < gc.dzLzBoundaryY + 3 * scale && e.state !== CellState.Migrating) {
        e.y = gc.dzLzBoundaryY + 3 * scale;
      }
    } else if (zone === 'lz') {
      const pt = constrainToEllipse(e.x, e.y, gc.cx, gc.cy, gc.rx * 0.95, gc.ry * 0.95);
      e.x = pt.x;
      e.y = pt.y;
      if (e.y > gc.dzLzBoundaryY - 3 * scale && e.state !== CellState.Migrating) {
        e.y = gc.dzLzBoundaryY - 3 * scale;
      }
    }
  }

  resolveCollisions(entities, scale) {
    // Pre-compute radii to avoid inner-loop lookups
    const len = entities.length;
    const radii = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const e = entities[i];
      radii[i] = e.type === CellType.FDC ? 0 : (CELL_SIZES[e.type] || 8) * scale * COLLISION_RADIUS_MULT;
    }

    for (let i = 0; i < len; i++) {
      if (radii[i] === 0) continue;
      const a = entities[i];
      const ra = radii[i];

      for (let j = i + 1; j < len; j++) {
        if (radii[j] === 0) continue;
        const b = entities[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = ra + radii[j];

        // Squared-distance fast reject
        const dist2 = dx * dx + dy * dy;
        const minDist2 = minDist * minDist;
        if (dist2 >= minDist2 || dist2 < 0.01) continue;

        // Only sqrt when we know there's a collision
        const dist = Math.sqrt(dist2);
        const overlap = (minDist - dist) * 0.25;
        const nx = dx / dist;
        const ny = dy / dist;

        if (!a.targetX && !b.targetX) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
  }
}
