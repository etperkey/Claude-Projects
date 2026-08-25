import { CellType, CellState } from '../cells/CellTypes.js';
import { triggerBCRTest } from '../cells/CellBehaviors.js';
import { CELL_SIZES, FDC_ARM_LENGTH } from '../utils/constants.js';

/**
 * Handles cell-cell interactions:
 * - Centrocytes testing BCR on FDCs
 * - Tfh cells helping selected centrocytes
 * - Macrophages engulfing apoptotic bodies
 * Optimized: squared-distance comparisons, no intermediate arrays.
 */
export class InteractionSystem {
  constructor() {
    this.interactionCooldowns = new Map();
  }

  update(entities, gc, params, scale, tick) {
    const events = [];

    // Pre-compute squared ranges
    const fdcRange2 = (FDC_ARM_LENGTH * scale * 0.8) ** 2;
    const tfhRange2 = (30 * scale) ** 2;
    const macEngulfRange2 = (CELL_SIZES.Macrophage * scale * 1.5) ** 2;
    const macChaseRange2 = (100 * scale) ** 2;

    const fdcs = entities.byType(CellType.FDC);

    // Centrocyte → FDC BCR testing
    const centrocytes = entities.byType(CellType.Centrocyte);
    for (let i = 0; i < centrocytes.length; i++) {
      const cc = centrocytes[i];
      if (cc.state !== CellState.Idle && cc.state !== CellState.Moving) continue;
      if (this.isOnCooldown(cc.id, tick)) continue;

      for (let j = 0; j < fdcs.length; j++) {
        const fdc = fdcs[j];
        const dx = cc.x - fdc.x;
        const dy = cc.y - fdc.y;
        if (dx * dx + dy * dy < fdcRange2) {
          triggerBCRTest(cc);
          cc.targetX = fdc.x + (Math.random() - 0.5) * 20;
          cc.targetY = fdc.y + (Math.random() - 0.5) * 20;
          this.setCooldown(cc.id, tick, 180);
          break;
        }
      }
    }

    // Tfh → selected centrocytes
    for (let i = 0; i < centrocytes.length; i++) {
      const sc = centrocytes[i];
      if (sc.state !== CellState.Selected || sc.tfhHelped) continue;

      const nearestTfh = entities.nearest(sc.x, sc.y, CellType.Tfh);
      if (!nearestTfh) continue;

      const dx = sc.x - nearestTfh.x;
      const dy = sc.y - nearestTfh.y;
      if (dx * dx + dy * dy < tfhRange2) {
        sc.tfhHelped = true;
        nearestTfh.state = CellState.ReceivingHelp;
        nearestTfh.stateTimer = 0;
        nearestTfh.targetX = sc.x + 10;
        nearestTfh.targetY = sc.y;
        // Use tick-based timer instead of setTimeout
        nearestTfh._helpEndTick = tick + 120;
      }
    }

    // Reset Tfh cells after help duration (tick-based)
    const tfhs = entities.byType(CellType.Tfh);
    for (let i = 0; i < tfhs.length; i++) {
      const t = tfhs[i];
      if (t._helpEndTick && tick >= t._helpEndTick) {
        t.state = CellState.Idle;
        t.stateTimer = null;
        t.targetX = null;
        t.targetY = null;
        t._helpEndTick = null;
      }
    }

    // Macrophage → apoptotic bodies
    const macrophages = entities.byType(CellType.Macrophage);
    for (let i = 0; i < macrophages.length; i++) {
      const mac = macrophages[i];
      if (mac.state !== CellState.Idle) continue;

      const nearest = entities.nearest(mac.x, mac.y, CellType.Apoptotic);
      if (!nearest) break;

      const dx = mac.x - nearest.x;
      const dy = mac.y - nearest.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < macEngulfRange2) {
        mac.state = CellState.Engulfing;
        mac.stateTimer = 0;
        events.push({ type: 'remove', entityId: nearest.id });
      } else if (dist2 < macChaseRange2) {
        mac.targetX = nearest.x;
        mac.targetY = nearest.y;
      }
    }

    return events;
  }

  setCooldown(id, tick, duration) {
    this.interactionCooldowns.set(id, tick + duration);
  }

  isOnCooldown(id, tick) {
    const until = this.interactionCooldowns.get(id);
    return until != null && tick < until;
  }
}
