export const CellType = {
  FoB: 'FoB',
  Centroblast: 'Centroblast',
  Centrocyte: 'Centrocyte',
  Tfh: 'Tfh',
  FDC: 'FDC',
  Plasmablast: 'Plasmablast',
  MemoryB: 'MemoryB',
  Macrophage: 'Macrophage',
  Apoptotic: 'Apoptotic',
};

// States each cell type can be in
export const CellState = {
  Idle: 'idle',
  Moving: 'moving',
  Dividing: 'dividing',
  Mutating: 'mutating',
  Migrating: 'migrating',         // crossing DZ→LZ or LZ→DZ
  TestingBCR: 'testingBCR',       // centrocyte touching FDC
  ReceivingHelp: 'receivingHelp', // centrocyte conjugated with Tfh
  Selected: 'selected',           // survived selection
  Apoptosing: 'apoptosing',
  Engulfing: 'engulfing',         // macrophage eating
  Exiting: 'exiting',             // leaving GC
  Activating: 'activating',       // FoB → activated
  ClassSwitching: 'classSwitching', // IgH DSB / CSR event
};

// Default properties per cell type
export const CellDefaults = {
  [CellType.FoB]: {
    zone: 'mantle',
    speed: 0.5,
    ncRatio: 0.8,  // nuclear:cytoplasm ratio (high = mostly nucleus)
  },
  [CellType.Centroblast]: {
    zone: 'dz',
    speed: 0.4,
    ncRatio: 0.7,
  },
  [CellType.Centrocyte]: {
    zone: 'lz',
    speed: 0.6,
    ncRatio: 0.65,
  },
  [CellType.Tfh]: {
    zone: 'lz',
    speed: 0.3,
    ncRatio: 0.5,
  },
  [CellType.FDC]: {
    zone: 'lz',
    speed: 0,     // stationary
    ncRatio: 0.3,
  },
  [CellType.Plasmablast]: {
    zone: 'exit',
    speed: 1.0,
    ncRatio: 0.4,
  },
  [CellType.MemoryB]: {
    zone: 'exit',
    speed: 0.8,
    ncRatio: 0.7,
  },
  [CellType.Macrophage]: {
    zone: 'lz',
    speed: 0.2,
    ncRatio: 0.3,
  },
  [CellType.Apoptotic]: {
    zone: 'lz',
    speed: 0,
    ncRatio: 1.0,
  },
};
