import { CellType, CellState } from './CellTypes.js';
import { CELL_COLORS, TRACK } from '../utils/colors.js';
import { CELL_SIZES, FDC_ARM_LENGTH, FDC_ARM_COUNT } from '../utils/constants.js';

const TAU = Math.PI * 2;
const C = CELL_COLORS;

/**
 * Draw a single cell entity on the canvas.
 * Diversified color palette — each cell type is instantly distinguishable.
 */
export function drawCell(ctx, entity, scale, tick, trackedId, trackVisuals) {
  const { type, x, y, state } = entity;
  const isTracked = entity.id === trackedId;

  const needsSave = state === CellState.Apoptosing || entity.glow || isTracked;
  if (needsSave) ctx.save();

  if (state === CellState.Apoptosing) {
    ctx.globalAlpha = Math.max(0.1, 1 - (entity.stateTimer || 0) / 120);
  }

  if (entity.glow) {
    drawGlow(ctx, x, y, entity.glowColor || '#4caf50', entity.glowRadius || 20 * scale);
  }

  // Tracked cell: pulsing yellow ring behind the cell
  if (isTracked) {
    const pulse = 0.7 + 0.3 * Math.sin(tick * 0.08);
    const r = (CELL_SIZES[type] || 10) * scale + 6 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.strokeStyle = TRACK.ring;
    ctx.lineWidth = 2.5 * scale;
    ctx.globalAlpha = pulse * TRACK.ringAlpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  switch (type) {
    case CellType.FoB: drawFoB(ctx, x, y, scale); break;
    case CellType.Centroblast: drawCentroblast(ctx, x, y, scale, entity, tick); break;
    case CellType.Centrocyte: drawCentrocyte(ctx, x, y, scale, entity); break;
    case CellType.Tfh: drawTfh(ctx, x, y, scale); break;
    case CellType.FDC: drawFDC(ctx, x, y, scale, entity, tick); break;
    case CellType.Plasmablast: drawPlasmablast(ctx, x, y, scale); break;
    case CellType.MemoryB: drawMemoryB(ctx, x, y, scale); break;
    case CellType.Macrophage: drawMacrophage(ctx, x, y, scale, entity); break;
    case CellType.Apoptotic: drawApoptotic(ctx, x, y, scale, entity, tick); break;
  }

  // SHM sparks (orange) — enhanced in mutations track
  if (state === CellState.Mutating && entity.sparks) {
    const enhanced = trackVisuals && trackVisuals.enhanceSHM;
    drawSparks(ctx, x, y, scale, entity.sparks, tick, TRACK.shmSpark, enhanced);
  }

  // CSR flash (cyan) — enhanced in mutations track
  if (state === CellState.ClassSwitching && entity.stateTimer != null) {
    const enhanced = trackVisuals && trackVisuals.enhanceCSR;
    drawCSRFlash(ctx, x, y, scale, entity.stateTimer, enhanced, entity.isotype);
  }

  if (needsSave) ctx.restore();
}

function drawGlow(ctx, x, y, color, radius) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

// FoB: blue-grey, small, quiescent
function drawFoB(ctx, x, y, s) {
  const r = CELL_SIZES.FoB * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.FoB.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = C.FoB.outline;
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.75, 0, TAU);
  ctx.fillStyle = C.FoB.nucleus;
  ctx.fill();
}

// Centroblast: deep indigo nucleus, blue cytoplasm, large
function drawCentroblast(ctx, x, y, s, entity, tick) {
  const r = CELL_SIZES.Centroblast * s;

  if (entity.state === CellState.Dividing) {
    drawMitosis(ctx, x, y, r, s, entity);
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.Centroblast.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#0d1257';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  const nr = r * 0.65;
  ctx.beginPath();
  ctx.arc(x, y, nr, 0, TAU);
  ctx.fillStyle = C.Centroblast.nucleus;
  ctx.fill();
  // Lighter center highlight
  ctx.beginPath();
  ctx.arc(x - nr * 0.2, y - nr * 0.2, nr * 0.35, 0, TAU);
  ctx.fillStyle = C.Centroblast.nucleusLight;
  ctx.fill();
}

function drawMitosis(ctx, x, y, r, s, entity) {
  const progress = (entity.stateTimer || 0) / 90;
  const sep = r * 0.8 * Math.min(progress * 2, 1);

  for (const sign of [-1, 1]) {
    const dx = x + sign * sep;
    const dr = r * (0.85 + 0.15 * progress);
    ctx.beginPath();
    ctx.arc(dx, y, dr * 0.8, 0, TAU);
    ctx.fillStyle = C.Centroblast.cytoplasm;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx, y, dr * 0.45, 0, TAU);
    ctx.fillStyle = C.Centroblast.nucleus;
    ctx.fill();
  }

  if (progress < 0.8) {
    const bridgeWidth = r * 0.3 * (1 - progress / 0.8);
    ctx.beginPath();
    ctx.ellipse(x, y, sep, bridgeWidth, 0, 0, TAU);
    ctx.fillStyle = C.Centroblast.cytoplasmOuter;
    ctx.fill();
  }
}

// Centrocyte: purple, irregular/cleaved nucleus
function drawCentrocyte(ctx, x, y, s, entity) {
  const r = CELL_SIZES.Centrocyte * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.Centrocyte.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#4a0072';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();

  const nr = r * 0.65;
  ctx.beginPath();
  const seed = entity.id || 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU;
    const indent = (i === 2 || i === 3) ? 0.3 : 0;
    const rr = nr * (1 - indent);
    const px = x + rr * Math.cos(angle + seed * 0.1);
    const py = y + rr * Math.sin(angle + seed * 0.1);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = C.Centrocyte.nucleus;
  ctx.fill();
}

// Tfh: red nucleus, pink cytoplasm (T cell = red)
function drawTfh(ctx, x, y, s) {
  const r = CELL_SIZES.Tfh * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.Tfh.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#8e0000';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();

  const offset = r * 0.2;
  ctx.beginPath();
  ctx.arc(x + offset, y - offset, r * 0.55, 0, TAU);
  ctx.fillStyle = C.Tfh.nucleus;
  ctx.fill();
}

// FDC: orange stellate cell with antigen-bearing dendrites
function drawFDC(ctx, x, y, s, entity, tick) {
  const bodyR = CELL_SIZES.FDC * s;
  const armLen = FDC_ARM_LENGTH * s;

  ctx.lineWidth = C.FDC.armWidth * s;
  ctx.strokeStyle = C.FDC.arm;

  const arms = entity.armAngles || [];
  for (let i = 0; i < FDC_ARM_COUNT; i++) {
    const baseAngle = arms[i] || (i / FDC_ARM_COUNT) * TAU;
    const wave = Math.sin(tick * 0.02 + i * 1.5) * 0.08;
    const angle = baseAngle + wave;

    const tipX = x + armLen * Math.cos(angle);
    const tipY = y + armLen * Math.sin(angle);
    const cpX = x + armLen * 0.5 * Math.cos(angle + 0.2);
    const cpY = y + armLen * 0.5 * Math.sin(angle + 0.2);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tipX, tipY, 2.5 * s, 0, TAU);
    ctx.fillStyle = C.FDC.antigen;
    ctx.fill();

    const bx = x + armLen * 0.6 * Math.cos(angle);
    const by = y + armLen * 0.6 * Math.sin(angle);
    for (const bSign of [-1, 1]) {
      const bAngle = angle + bSign * 0.5;
      const bLen = armLen * 0.3;
      const btx = bx + bLen * Math.cos(bAngle);
      const bty = by + bLen * Math.sin(bAngle);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(btx, bty);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(btx, bty, 1.5 * s, 0, TAU);
      ctx.fillStyle = C.FDC.antigen;
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.arc(x, y, bodyR, 0, TAU);
  ctx.fillStyle = C.FDC.body;
  ctx.fill();
  ctx.strokeStyle = '#7f3300';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, bodyR * 0.4, 0, TAU);
  ctx.fillStyle = C.FDC.nucleus;
  ctx.fill();
}

// Plasmablast: teal, eccentric nucleus, clock-face chromatin
function drawPlasmablast(ctx, x, y, s) {
  const r = CELL_SIZES.Plasmablast * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.Plasmablast.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#00413a';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Perinuclear hof
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y + r * 0.1, r * 0.25, 0, TAU);
  ctx.fillStyle = C.Plasmablast.hof;
  ctx.fill();

  // Eccentric nucleus
  const nx = r * 0.25, ny = -r * 0.15, nr = r * 0.45;
  ctx.beginPath();
  ctx.arc(x + nx, y + ny, nr, 0, TAU);
  ctx.fillStyle = C.Plasmablast.nucleus;
  ctx.fill();

  // Clock-face chromatin
  ctx.strokeStyle = C.Plasmablast.chromatin;
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.moveTo(x + nx, y + ny);
    ctx.lineTo(x + nx + nr * 0.8 * Math.cos(a), y + ny + nr * 0.8 * Math.sin(a));
    ctx.stroke();
  }
}

// Memory B: green, small, exiting
function drawMemoryB(ctx, x, y, s) {
  const r = CELL_SIZES.MemoryB * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.MemoryB.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#0a3d0c';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, TAU);
  ctx.fillStyle = C.MemoryB.nucleus;
  ctx.fill();
}

// Macrophage: brown nucleus, pale tan, large
function drawMacrophage(ctx, x, y, s, entity) {
  const r = CELL_SIZES.Macrophage * s * (entity.engulfed ? 1.15 : 1);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = C.Macrophage.cytoplasm;
  ctx.fill();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  if (entity.engulfed) {
    const debrisCount = Math.min(entity.engulfed, 5);
    for (let i = 0; i < debrisCount; i++) {
      const da = (i / debrisCount) * TAU + 0.3;
      ctx.beginPath();
      ctx.arc(x + r * 0.4 * Math.cos(da), y + r * 0.4 * Math.sin(da), 2.5 * s, 0, TAU);
      ctx.fillStyle = C.Macrophage.debris;
      ctx.fill();
    }
  }

  // Kidney-shaped nucleus
  const nr = r * 0.4;
  ctx.beginPath();
  ctx.arc(x - nr * 0.3, y, nr, 0.3, Math.PI + 0.3);
  ctx.quadraticCurveTo(x + nr * 0.3, y, x - nr * 0.3 + nr * Math.cos(0.3), y - nr * Math.sin(0.3));
  ctx.fillStyle = C.Macrophage.nucleus;
  ctx.fill();
}

// Apoptotic: grey fragments
function drawApoptotic(ctx, x, y, s, entity, tick) {
  const r = CELL_SIZES.Apoptotic * s;
  const progress = (entity.stateTimer || 0) / 120;
  const fragments = entity.fragments || 3;
  const fragSizes = entity.fragSizes;

  for (let i = 0; i < fragments; i++) {
    const angle = (i / fragments) * TAU + tick * 0.01;
    const dist = r * progress * 1.5;
    const fr = r * (1 - progress * 0.3) * (fragSizes ? fragSizes[i] : 0.8);
    const fx = x + dist * Math.cos(angle);
    const fy = y + dist * Math.sin(angle);

    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, TAU);
    ctx.fillStyle = C.Apoptotic.outer;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.6, 0, TAU);
    ctx.fillStyle = C.Apoptotic.inner;
    ctx.fill();
  }
}

function drawSparks(ctx, x, y, s, sparks, tick, color, enhanced) {
  const sparkRadius = enhanced ? 5 * s : 2.5 * s;
  const sparkLife = enhanced ? 40 : 30;
  for (let i = 0; i < sparks.length; i++) {
    const spark = sparks[i];
    const age = tick - spark.born;
    if (age > sparkLife || age < 0) continue;
    const alpha = enhanced ? Math.min(1, 1.3 - age / sparkLife) : 1 - age / sparkLife;
    const dist = age * (enhanced ? 1.0 : 0.8);
    const sx = x + dist * Math.cos(spark.angle);
    const sy = y + dist * Math.sin(spark.angle);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, sparkRadius, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// CSR flash — expanding cyan ring (enhanced: larger, slower fade, isotype label)
function drawCSRFlash(ctx, x, y, s, timer, enhanced, isotype) {
  const maxTicks = enhanced ? 90 : 60;
  const progress = timer / maxTicks; // 0→1
  if (progress > 1) return;
  const baseR = enhanced ? 15 * s : 10 * s;
  const expandR = enhanced ? 45 * s : 25 * s;
  const r = baseR + expandR * progress;
  const alpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = TRACK.csrFlash;
  ctx.lineWidth = (enhanced ? 4 : 3) * s * (1 - progress * 0.5);
  ctx.globalAlpha = alpha;
  ctx.stroke();

  // Enhanced: show isotype label at ring center
  if (enhanced && isotype && progress < 0.6) {
    const fontSize = Math.max(10, 12 * s);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = TRACK.csrFlash;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha * 1.2;
    ctx.fillText(isotype, x, y - r * 0.3);
  }

  ctx.globalAlpha = 1;
}
