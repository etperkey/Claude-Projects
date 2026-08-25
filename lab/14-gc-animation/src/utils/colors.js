// Diversified cell palette — vivid, high-contrast colors for instant distinction
export const HE = {
  // Zone backgrounds
  dzBackground: '#e8d5f0',
  lzBackground: '#fef3e0',
  mantleZone: '#f5eef8',
  gcBorder: '#c9a8d8',

  // Interaction highlights
  glowGreen: '#4caf50',
  glowRed: '#f44336',
  glowGold: '#ffc107',
  selectionGlow: 'rgba(76, 175, 80, 0.4)',
  apoptosisGrey: '#9e9e9e',

  // Background
  slideBackground: '#faf6f0',
};

// Per-cell-type color schemes — VIVID, high saturation for visibility
export const CELL_COLORS = {
  FoB: {
    nucleus: '#37474f',       // dark blue-grey
    cytoplasm: '#78909c',     // medium blue-grey (much darker than before)
    outline: '#263238',
  },
  Centroblast: {
    nucleus: '#1a237e',       // deep indigo
    nucleusLight: '#3949ab',
    cytoplasm: '#5c6bc0',     // saturated indigo-blue
    cytoplasmOuter: 'rgba(92, 107, 192, 0.7)',
  },
  Centrocyte: {
    nucleus: '#6a1b9a',       // vivid purple
    nucleusLight: '#9c27b0',
    cytoplasm: '#ce93d8',     // medium purple
  },
  Tfh: {
    nucleus: '#c62828',       // vivid red
    nucleusLight: '#ef5350',
    cytoplasm: '#ef9a9a',     // salmon pink
  },
  FDC: {
    body: '#e65100',          // deep orange
    bodyLight: '#ff9800',
    arm: '#bf360c',           // brown-red
    armWidth: 2.5,
    antigen: '#d50000',       // bright red dots
    nucleus: '#ffe0b2',       // pale orange center
  },
  Plasmablast: {
    nucleus: '#00695c',       // deep teal
    nucleusLight: '#00897b',
    cytoplasm: '#4db6ac',     // vivid teal
    cytoplasmOuter: 'rgba(77, 182, 172, 0.8)',
    hof: 'rgba(255, 255, 255, 0.7)',
    chromatin: '#80cbc4',
  },
  MemoryB: {
    nucleus: '#1b5e20',       // deep green
    nucleusLight: '#2e7d32',
    cytoplasm: '#66bb6a',     // vivid green
  },
  Macrophage: {
    nucleus: '#4e342e',       // dark brown
    cytoplasm: '#bcaaa4',     // medium tan
    debris: '#9c27b0',        // purple debris
  },
  Apoptotic: {
    outer: '#757575',         // medium grey
    inner: '#212121',         // near-black core
  },
};

// Tracked cell highlight
export const TRACK = {
  ring: '#ffd600',
  ringAlpha: 0.8,
  pulse: 'rgba(255, 214, 0, 0.3)',
  shmSpark: '#ff6d00',       // orange sparks for SHM
  csrFlash: '#00e5ff',       // cyan flash for CSR
};

// Chemokine/signaling gradient colors
export const CHEMOKINE = {
  cxcl12: { color: 'rgba(63, 81, 181, 0.35)', label: 'CXCL12 (DZ)', zone: 'dz' },
  cxcl13: { color: 'rgba(255, 152, 0, 0.35)', label: 'CXCL13 (LZ)', zone: 'lz' },
  s1p:    { color: 'rgba(233, 30, 99, 0.38)',  label: 'S1P (exit)', zone: 'exit' },
  ggg:    { color: 'rgba(76, 175, 80, 0.40)',  label: 'GGG (confinement)', zone: 'periphery' },
};
