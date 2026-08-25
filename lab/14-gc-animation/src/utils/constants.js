// Zone geometry
export const GC_ELLIPSE = {
  radiusX: 0.32,  // fraction of canvas width (shrunk to give mantle more room)
  radiusY: 0.34,  // fraction of canvas height
  centerX: 0.5,
  centerY: 0.48,  // slightly above center to give DZ more room at bottom
  dzFraction: 0.45, // DZ is bottom 45% of the ellipse (was 40%)
};

export const MANTLE_THICKNESS = 0.05; // fraction of canvas width (thinner mantle)

// Cell sizes (in pixels at 1080p, scale with canvas)
export const CELL_SIZES = {
  FoB: 7,
  Centroblast: 13,
  Centrocyte: 9,
  Tfh: 8,
  FDC: 10,        // body only; arms extend further
  Plasmablast: 11,
  MemoryB: 7,
  Macrophage: 18,
  Apoptotic: 5,
};

export const FDC_ARM_LENGTH = 35;
export const FDC_ARM_COUNT = 6;

// Physics
export const BROWNIAN_STRENGTH = 0.3;
export const BASE_SPEED = 0.6;          // px per tick at 1x
export const COLLISION_RADIUS_MULT = 1.2;
export const MIGRATION_SPEED = 1.8;

// Simulation
export const MAX_BCELL_COUNT = 50;  // cap centroblasts+centrocytes to prevent lag
export const INITIAL_FOB_COUNT = 35;
export const INITIAL_FDC_COUNT = 5;
export const INITIAL_TFH_COUNT = 12;
export const INITIAL_MACROPHAGE_COUNT = 2;

// Timing (ticks at 60fps)
export const MITOSIS_DURATION = 90;
export const APOPTOSIS_DURATION = 120;
export const ENGULF_DURATION = 60;
export const STAGE_AUTO_DURATION = 360; // ticks per auto-advance

// Defaults for interactive parameters
export const DEFAULTS = {
  shmRate: 0.1,
  selectionStringency: 0.4,
  dzLzRatio: 0.4,
  tfhCount: 12,
  recycleProbability: 0.7,
  speed: 1.0,
};
