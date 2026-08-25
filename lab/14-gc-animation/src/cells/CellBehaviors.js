import { CellType, CellState } from './CellTypes.js';
import { MITOSIS_DURATION, APOPTOSIS_DURATION, ENGULF_DURATION, MAX_BCELL_COUNT } from '../utils/constants.js';
import { randomAngle } from '../utils/math.js';

/**
 * Per-type state machines. Called each tick for each entity.
 * Returns events for the simulation to handle.
 */
export function updateBehavior(entity, gc, params, tick, bcellCount) {
  const events = [];

  if (entity.stateTimer != null) {
    entity.stateTimer++;
  }

  switch (entity.type) {
    case CellType.Centroblast:
      events.push(...updateCentroblast(entity, gc, params, tick, bcellCount));
      break;
    case CellType.Centrocyte:
      events.push(...updateCentrocyte(entity, gc, params, tick));
      break;
    case CellType.Macrophage:
      events.push(...updateMacrophage(entity, gc, params, tick));
      break;
    case CellType.Apoptotic:
      events.push(...updateApoptotic(entity, tick));
      break;
    case CellType.Plasmablast:
    case CellType.MemoryB:
      events.push(...updateExiting(entity, gc));
      break;
  }

  // Decay sparks
  if (entity.sparks) {
    entity.sparks = entity.sparks.filter(s => tick - s.born < 30);
    if (entity.sparks.length === 0) entity.sparks = null;
  }

  // Decay glow
  if (entity.glowTimer != null) {
    entity.glowTimer--;
    if (entity.glowTimer <= 0) {
      entity.glow = false;
      entity.glowTimer = null;
    }
  }

  return events;
}

function updateCentroblast(e, gc, params, tick, bcellCount) {
  const events = [];

  if (e.state === CellState.Dividing) {
    if (e.stateTimer >= MITOSIS_DURATION) {
      e.state = CellState.Idle;
      e.stateTimer = null;

      // Only spawn daughter if under population cap
      if (bcellCount < MAX_BCELL_COUNT) {
        events.push({
          type: 'spawn',
          cellType: CellType.Centroblast,
          x: e.x + 15,
          y: e.y,
          zone: 'dz',
          affinity: e.affinity + (Math.random() - 0.5) * params.shmRate,
        });
      }
      e.divisionCooldown = 120 + Math.random() * 120;
    }
    return events;
  }

  if (e.state === CellState.Mutating) {
    if (e.stateTimer >= 45) {
      e.affinity += (Math.random() - 0.5) * params.shmRate * 2;
      e.affinity = Math.max(0, Math.min(1, e.affinity));
      e.state = CellState.Idle;
      e.stateTimer = null;

      // Record SHM event for tracking
      if (e.eventLog) {
        e.eventLog.push({ tick, type: 'shm', affinity: e.affinity });
      }
    }
    return events;
  }

  // CSR (class switch recombination) — happens occasionally during DZ phase
  if (e.state === CellState.ClassSwitching) {
    if (e.stateTimer >= 60) {
      e.state = CellState.Idle;
      e.stateTimer = null;
      e.isotype = e.pendingIsotype || 'IgG1';
      e.pendingIsotype = null;

      if (e.eventLog) {
        e.eventLog.push({ tick, type: 'csr', isotype: e.isotype });
      }
    }
    return events;
  }

  // Countdown to next division (only if under pop cap)
  if (e.divisionCooldown != null && bcellCount < MAX_BCELL_COUNT) {
    e.divisionCooldown -= 1;
    if (e.divisionCooldown <= 0) {
      e.state = CellState.Dividing;
      e.stateTimer = 0;
      e.divisionCooldown = null;
    }
  }

  return events;
}

function updateCentrocyte(e, gc, params, tick) {
  const events = [];

  if (e.state === CellState.TestingBCR) {
    if (e.stateTimer >= 60) {
      // Hero cell always passes selection (narrative continuity)
      const passes = e.isHero || e.affinity >= params.selectionStringency;
      if (passes) {
        e.state = CellState.Selected;
        e.glow = true;
        e.glowColor = 'rgba(76, 175, 80, 0.4)';
        e.glowRadius = 15;
        e.glowTimer = 90;
        e.stateTimer = 0;

        if (e.eventLog) {
          e.eventLog.push({ tick, type: 'selected', affinity: e.affinity });
        }
      } else {
        if (e.eventLog) {
          e.eventLog.push({ tick, type: 'apoptosis', affinity: e.affinity });
        }
        events.push({
          type: 'apoptose',
          entityId: e.id,
          x: e.x,
          y: e.y,
        });
      }
    }
    return events;
  }

  if (e.state === CellState.Selected) {
    if (e.stateTimer >= 90) {
      // Hero stays Selected in the LZ until stage 8 triggers recycling
      if (e.isHero && !e._recycleReady) {
        // Hold in Selected state — stage 8 setup will set _recycleReady
        return events;
      }
      const shouldRecycle = e.isHero
        ? !e.hasRecycled  // hero recycles once, then can differentiate
        : Math.random() < params.recycleProbability;
      if (shouldRecycle) {
        if (e.isHero) e.hasRecycled = true;
        if (e.eventLog) e.eventLog.push({ tick, type: 'recycle' });
        events.push({ type: 'recycle', entityId: e.id });
      } else {
        const exitType = Math.random() < 0.6 ? CellType.Plasmablast : CellType.MemoryB;
        if (e.eventLog) e.eventLog.push({ tick, type: 'differentiate', to: exitType });
        events.push({ type: 'differentiate', entityId: e.id, newType: exitType });
      }
    }
    return events;
  }

  return events;
}

function updateMacrophage(e, gc, params, tick) {
  if (e.state === CellState.Engulfing) {
    if (e.stateTimer >= ENGULF_DURATION) {
      e.state = CellState.Idle;
      e.stateTimer = null;
      e.engulfed = (e.engulfed || 0) + 1;
    }
  }
  return [];
}

function updateApoptotic(e, tick) {
  if (e.stateTimer >= APOPTOSIS_DURATION) {
    return [{ type: 'remove', entityId: e.id }];
  }
  return [];
}

function updateExiting(e, gc) {
  if (e.x < -50 || e.x > gc.width + 50 || e.y < -50 || e.y > gc.height + 50) {
    return [{ type: 'remove', entityId: e.id }];
  }
  return [];
}

// Trigger SHM sparks on a centroblast (enhanced = 8 sparks, tighter timing)
export function triggerSHM(entity, tick, enhanced) {
  entity.state = CellState.Mutating;
  entity.stateTimer = 0;
  entity.sparks = [];
  const count = enhanced ? 8 : 5;
  const delay = enhanced ? 2 : 3;
  for (let i = 0; i < count; i++) {
    entity.sparks.push({ angle: randomAngle(), born: tick + i * delay });
  }
}

// Trigger CSR (class switch recombination)
export function triggerCSR(entity, isotype = 'IgG1') {
  entity.state = CellState.ClassSwitching;
  entity.stateTimer = 0;
  entity.pendingIsotype = isotype;
}

export function triggerDivision(entity) {
  entity.state = CellState.Dividing;
  entity.stateTimer = 0;
}

export function triggerBCRTest(entity) {
  entity.state = CellState.TestingBCR;
  entity.stateTimer = 0;
}
