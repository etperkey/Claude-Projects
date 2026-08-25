// Inline pixel art data — no external assets needed
// Each sprite is an array of rows, each row is an array of hex color strings (or null for transparent)

// Tumor blob — 8x8, 2 frames for wiggle animation
export const TUMOR_SPRITES = [
  // Frame 0
  [
    [null,    null,    '#8844aa', '#8844aa', '#8844aa', '#8844aa', null,    null],
    [null,    '#8844aa', '#aa66cc', '#aa66cc', '#aa66cc', '#aa66cc', '#8844aa', null],
    ['#8844aa', '#aa66cc', '#cc88ee', '#cc88ee', '#cc88ee', '#cc88ee', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#cc88ee', '#ffffff', '#cc88ee', '#ffffff', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#cc88ee', '#cc88ee', '#cc88ee', '#cc88ee', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#cc88ee', '#cc88ee', '#cc88ee', '#cc88ee', '#aa66cc', '#8844aa'],
    [null,    '#8844aa', '#aa66cc', '#aa66cc', '#aa66cc', '#aa66cc', '#8844aa', null],
    [null,    null,    '#8844aa', '#8844aa', '#8844aa', '#8844aa', null,    null],
  ],
  // Frame 1 (squished)
  [
    [null,    null,    null,    '#8844aa', '#8844aa', null,    null,    null],
    [null,    '#8844aa', '#8844aa', '#aa66cc', '#aa66cc', '#8844aa', '#8844aa', null],
    ['#8844aa', '#aa66cc', '#cc88ee', '#cc88ee', '#cc88ee', '#cc88ee', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#cc88ee', '#ffffff', '#cc88ee', '#ffffff', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#cc88ee', '#cc88ee', '#cc88ee', '#cc88ee', '#aa66cc', '#8844aa'],
    ['#8844aa', '#aa66cc', '#aa66cc', '#cc88ee', '#cc88ee', '#aa66cc', '#aa66cc', '#8844aa'],
    [null,    '#8844aa', '#aa66cc', '#aa66cc', '#aa66cc', '#aa66cc', '#8844aa', null],
    [null,    null,    '#8844aa', '#8844aa', '#8844aa', '#8844aa', null,    null],
  ],
];

// Big tumor (when cellCount > 3000) — 12x12, 2 frames
export const TUMOR_BIG_SPRITES = [
  // Frame 0
  generateBigTumor(false),
  // Frame 1
  generateBigTumor(true),
];

function generateBigTumor(squished) {
  const s = squished;
  const _ = null;
  const d = '#6a2288'; // dark
  const m = '#8844aa'; // mid
  const l = '#aa66cc'; // light
  const h = '#cc88ee'; // highlight
  const w = '#ffffff'; // eye white
  return [
    [_, _, _,  d, d, d, d, d, d,  _, _, _],
    [_, _,  d, m, m, m, m, m, m, d, _, _],
    [_,  d, m, l, l, l, l, l, l, m, d, _],
    [ d, m, l, h, h, h, h, h, h, l, m, d],
    [ d, m, l, h, w, h, h, w, h, l, m, d],
    [ d, m, l, h, h, h, h, h, h, l, m, d],
    [ d, m, l, h, h, s?l:h, s?l:h, h, h, l, m, d],
    [ d, m, l, l, h, h, h, h, l, l, m, d],
    [ d, m, l, l, l, l, l, l, l, l, m, d],
    [_,  d, m, m, l, l, l, l, m, m, d, _],
    [_, _,  d, m, m, m, m, m, m, d, _, _],
    [_, _, _,  d, d, d, d, d, d,  _, _, _],
  ];
}

// Immune cell sprites — 4x4 simple colored shapes
export const IMMUNE_SPRITES = {
  cd8: { // Red T-shape
    pixels: [
      ['#ff4444', '#ff4444', '#ff4444', '#ff4444'],
      [null,      '#ff6666', '#ff6666', null],
      [null,      '#ff6666', '#ff6666', null],
      [null,      '#ff4444', '#ff4444', null],
    ],
  },
  nk: { // Orange star
    pixels: [
      [null,      '#ff8800', null,      null],
      ['#ff8800', '#ffaa44', '#ff8800', null],
      [null,      '#ff8800', null,      null],
      [null,      null,      null,      null],
    ],
  },
  m1: { // Yellow circle
    pixels: [
      [null,      '#ffcc00', '#ffcc00', null],
      ['#ffcc00', '#ffee44', '#ffee44', '#ffcc00'],
      ['#ffcc00', '#ffee44', '#ffee44', '#ffcc00'],
      [null,      '#ffcc00', '#ffcc00', null],
    ],
  },
  dc: { // Blue diamond
    pixels: [
      [null,      '#44aaff', null,      null],
      ['#44aaff', '#66ccff', '#44aaff', null],
      [null,      '#44aaff', null,      null],
      [null,      null,      null,      null],
    ],
  },
  // Ally sprites (green tones)
  m2: {
    pixels: [
      [null,      '#44bb44', '#44bb44', null],
      ['#44bb44', '#66dd66', '#66dd66', '#44bb44'],
      ['#44bb44', '#66dd66', '#66dd66', '#44bb44'],
      [null,      '#44bb44', '#44bb44', null],
    ],
  },
  treg: {
    pixels: [
      ['#66dd66', '#66dd66', '#66dd66', '#66dd66'],
      [null,      '#88ee88', '#88ee88', null],
      [null,      '#88ee88', '#88ee88', null],
      [null,      '#66dd66', '#66dd66', null],
    ],
  },
  mdsc: {
    pixels: [
      ['#88ee88', null,      null,      '#88ee88'],
      [null,      '#aaff99', '#aaff99', null],
      [null,      '#aaff99', '#aaff99', null],
      ['#88ee88', null,      null,      '#88ee88'],
    ],
  },
};

// Tombstone sprite 16x16
export const TOMBSTONE_SPRITE = [
  [null, null, null, null, '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', null, null, null, null],
  [null, null, null, '#666', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#666', null, null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#666', null, null],
  [null, null, '#666', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#888', '#666', null, null],
  [null, null, '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', null, null],
  [null, null, null, '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', '#666', null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, '#443322', null, null, null, null, null, null, null, null, null, null, null, null, '#443322', null],
  ['#443322', '#554433', '#443322', null, null, null, null, null, null, null, null, null, '#443322', '#554433', '#443322', null],
  ['#332211', '#443322', '#332211', '#2a5a2a', '#3a7a3a', '#2a5a2a', '#3a7a3a', '#2a5a2a', '#3a7a3a', '#2a5a2a', '#3a7a3a', '#2a5a2a', '#332211', '#443322', '#332211', null],
];

// Skull/crossbones for death screen (8x8)
export const SKULL_SPRITE = [
  [null,    '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', null],
  ['#fff',  '#fff', '#000', '#fff', '#fff', '#000', '#fff', '#fff'],
  ['#fff',  '#fff', '#000', '#fff', '#fff', '#000', '#fff', '#fff'],
  ['#fff',  '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff'],
  [null,    '#fff', '#fff', '#000', '#000', '#fff', '#fff', null],
  [null,    null,   '#fff', '#fff', '#fff', '#fff', null,   null],
  [null,    '#fff', '#000', '#fff', '#fff', '#000', '#fff', null],
  [null,    '#000', '#fff', '#000', '#000', '#fff', '#000', null],
];

// Trophy for win screen (8x8)
export const TROPHY_SPRITE = [
  [null,    '#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700', null],
  ['#ffd700','#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffd700'],
  ['#ffd700','#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffd700'],
  [null,    '#ffd700', '#ffee55', '#ffee55', '#ffee55', '#ffee55', '#ffd700', null],
  [null,    null,      '#ffd700', '#ffee55', '#ffee55', '#ffd700', null,      null],
  [null,    null,      null,      '#ffd700', '#ffd700', null,      null,      null],
  [null,    null,      '#ffd700', '#ffd700', '#ffd700', '#ffd700', null,      null],
  [null,    '#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700', '#ffd700', null],
];
