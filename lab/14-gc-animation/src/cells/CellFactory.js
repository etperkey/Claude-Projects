import { CellType, CellState, CellDefaults } from './CellTypes.js';
import { FDC_ARM_COUNT } from '../utils/constants.js';
import { randomAngle } from '../utils/math.js';

/**
 * Create cell entities with correct initial state and properties.
 */
export function createCell(type, x, y, overrides = {}) {
  const defaults = CellDefaults[type] || {};

  const entity = {
    type,
    state: CellState.Idle,
    x,
    y,
    zone: defaults.zone || 'lz',
    affinity: 0.5,
    speedMult: defaults.speed || 0.5,
    targetX: null,
    targetY: null,
    onArrival: null,
    glow: false,
    glowColor: null,
    glowRadius: null,
    glowTimer: null,
    stateTimer: null,
    sparks: null,
    ...overrides,
  };

  // Type-specific initialization
  switch (type) {
    case CellType.Centroblast:
      entity.divisionCooldown = 90 + Math.random() * 120;
      break;
    case CellType.FDC:
      entity.armAngles = [];
      for (let i = 0; i < FDC_ARM_COUNT; i++) {
        entity.armAngles.push((i / FDC_ARM_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3);
      }
      break;
    case CellType.Macrophage:
      entity.engulfed = 0;
      break;
    case CellType.Apoptotic:
      entity.state = CellState.Apoptosing;
      entity.stateTimer = 0;
      entity.fragments = 3 + Math.floor(Math.random() * 3);
      // Pre-compute fragment sizes so render is deterministic
      entity.fragSizes = [];
      for (let i = 0; i < entity.fragments; i++) {
        entity.fragSizes.push(0.6 + Math.random() * 0.4);
      }
      break;
  }

  return entity;
}

export function createFoB(gc) {
  const pt = gc.randomMantlePoint();
  return createCell(CellType.FoB, pt.x, pt.y);
}

export function createCentroblast(gc, affinity = 0.5) {
  const pt = gc.randomDZPoint();
  return createCell(CellType.Centroblast, pt.x, pt.y, { affinity });
}

export function createCentrocyte(gc, affinity = 0.5) {
  const pt = gc.randomLZPoint();
  return createCell(CellType.Centrocyte, pt.x, pt.y, { affinity });
}

export function createFDC(gc) {
  const pt = gc.randomLZPoint();
  return createCell(CellType.FDC, pt.x, pt.y);
}

export function createTfh(gc) {
  const pt = gc.randomLZPoint();
  return createCell(CellType.Tfh, pt.x, pt.y);
}

export function createMacrophage(gc) {
  const pt = gc.randomLZPoint();
  return createCell(CellType.Macrophage, pt.x, pt.y);
}

export function createPlasmablast(x, y, affinity) {
  const exitTarget = { zone: 'exit' };
  return createCell(CellType.Plasmablast, x, y, { affinity, ...exitTarget });
}

export function createMemoryB(x, y, affinity) {
  const exitTarget = { zone: 'exit' };
  return createCell(CellType.MemoryB, x, y, { affinity, ...exitTarget });
}

export function createApoptotic(x, y) {
  return createCell(CellType.Apoptotic, x, y);
}
