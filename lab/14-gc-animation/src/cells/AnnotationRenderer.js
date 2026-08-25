import { CellType, CellState } from './CellTypes.js';
import { CELL_SIZES } from '../utils/constants.js';

const MAX_LABELS_PER_TYPE = 3;

/**
 * Track 1 — Mutation callouts: "AID → SHM", "CSR: IgM → IgG1", isotype badges
 */
export function drawMutationCallouts(ctx, entities, scale, tick) {
  ctx.save();
  const fontSize = Math.max(12, 13 * scale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let shmCount = 0;
  let csrCount = 0;
  let isotopeCount = 0;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];

    // "AID → SHM" on mutating cells
    if (e.state === CellState.Mutating && shmCount < MAX_LABELS_PER_TYPE) {
      const r = (CELL_SIZES[e.type] || 10) * scale;
      drawPill(ctx, 'AID \u2192 SHM', e.x, e.y - r - 16 * scale, '#ff9800', fontSize, scale);
      shmCount++;
    }

    // "CSR: IgM → {isotype}" on class-switching cells
    if (e.state === CellState.ClassSwitching && csrCount < MAX_LABELS_PER_TYPE) {
      const r = (CELL_SIZES[e.type] || 10) * scale;
      const iso = e.isotype || '?';
      drawPill(ctx, `CSR: IgM \u2192 ${iso}`, e.x, e.y - r - 16 * scale, '#00e5ff', fontSize, scale);
      csrCount++;
    }

    // Isotype badge on class-switched cells (small label below)
    if (e.isotype && e.state !== CellState.ClassSwitching && isotopeCount < MAX_LABELS_PER_TYPE) {
      const bTypes = [CellType.Centroblast, CellType.Centrocyte, CellType.Plasmablast, CellType.MemoryB];
      if (bTypes.includes(e.type)) {
        const r = (CELL_SIZES[e.type] || 10) * scale;
        const smallFont = Math.max(10, 11 * scale);
        ctx.font = `bold ${smallFont}px sans-serif`;
        drawPill(ctx, e.isotype, e.x, e.y + r + 12 * scale, '#00e5ff', smallFont, scale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        isotopeCount++;
      }
    }
  }

  ctx.restore();
}

/**
 * Transient Tfh label — shown on the Tfh approaching/helping the hero cell.
 * Called from both track renderers so it displays regardless of track.
 */
export function drawTfhLabels(ctx, entities, scale) {
  ctx.save();
  const fontSize = Math.max(12, 14 * scale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.type === CellType.Tfh && e._heroHelper) {
      const r = (CELL_SIZES.Tfh || 8) * scale;
      const label = e.state === CellState.ReceivingHelp ? 'Tfh: CD40L + IL-21' : 'Tfh';
      drawPill(ctx, label, e.x, e.y - r - 14 * scale, '#ce93d8', fontSize, scale);
    }
  }

  ctx.restore();
}

/**
 * Track 2 — Receptor labels: CXCR4+, CXCR5+, S1PR1↑, P2RY8
 * Large, high-contrast pills with dark backgrounds for maximum readability.
 */
export function drawReceptorLabels(ctx, entities, scale) {
  ctx.save();
  const fontSize = Math.max(12, 14 * scale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let dzCount = 0;
  let lzCount = 0;
  let migCount = 0;
  let exitCount = 0;
  let s1pr2Count = 0;
  let p2ry8Count = 0;
  const MAX_CONFINEMENT_LABELS = 4;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];

    // Centroblasts in DZ: "CXCR4+"
    if (e.type === CellType.Centroblast && e.zone === 'dz' &&
        e.state !== CellState.Migrating && dzCount < MAX_LABELS_PER_TYPE) {
      const r = CELL_SIZES.Centroblast * scale;
      drawPill(ctx, 'CXCR4\u207A', e.x, e.y - r - 14 * scale, '#64b5f6', fontSize, scale);
      dzCount++;
    }

    // Centrocytes in LZ: "CXCR5+"
    if (e.type === CellType.Centrocyte && e.zone === 'lz' &&
        e.state !== CellState.Migrating && lzCount < MAX_LABELS_PER_TYPE) {
      const r = CELL_SIZES.Centrocyte * scale;
      drawPill(ctx, 'CXCR5\u207A', e.x, e.y - r - 14 * scale, '#ffb74d', fontSize, scale);
      lzCount++;
    }

    // Migrating DZ→LZ: "CXCR4↓ CXCR5↑"
    if (e.state === CellState.Migrating && migCount < MAX_LABELS_PER_TYPE) {
      const isToLZ = e.type === CellType.Centrocyte;
      const r = (CELL_SIZES[e.type] || 10) * scale;
      const label = isToLZ ? 'CXCR4\u2193 CXCR5\u2191' : 'CXCR4\u2191 CXCR5\u2193';
      drawPill(ctx, label, e.x, e.y - r - 14 * scale, '#ce93d8', fontSize, scale);
      migCount++;
    }

    // Exiting cells: "S1PR1↑"
    if ((e.type === CellType.Plasmablast || e.type === CellType.MemoryB) &&
        e.state === CellState.Exiting && exitCount < MAX_LABELS_PER_TYPE) {
      const r = (CELL_SIZES[e.type] || 10) * scale;
      drawPill(ctx, 'S1PR1\u2191', e.x, e.y - r - 14 * scale, '#f48fb1', fontSize, scale);
      exitCount++;
    }

    // S1PR2 / P2RY8 confinement receptors — label several representative GC B cells
    const gcBTypes = [CellType.Centroblast, CellType.Centrocyte];
    if (gcBTypes.includes(e.type) && e.state === CellState.Idle) {
      if (s1pr2Count < MAX_CONFINEMENT_LABELS && (e.id % 3) === 0) {
        const r = (CELL_SIZES[e.type] || 10) * scale;
        const smallFont = Math.max(10, 11 * scale);
        ctx.font = `bold ${smallFont}px sans-serif`;
        drawPill(ctx, 'S1PR2', e.x, e.y + r + 12 * scale, '#f48fb1', smallFont, scale, 0.8);
        ctx.font = `bold ${fontSize}px sans-serif`;
        s1pr2Count++;
      } else if (p2ry8Count < MAX_CONFINEMENT_LABELS && (e.id % 3) === 1) {
        const r = (CELL_SIZES[e.type] || 10) * scale;
        const smallFont = Math.max(10, 11 * scale);
        ctx.font = `bold ${smallFont}px sans-serif`;
        drawPill(ctx, 'P2RY8', e.x, e.y + r + 12 * scale, '#a5d6a7', smallFont, scale, 0.8);
        ctx.font = `bold ${fontSize}px sans-serif`;
        p2ry8Count++;
      }
    }
  }

  ctx.restore();
}

/**
 * Draw a high-contrast pill label: dark rounded-rect background + bright text.
 * Ensures text is always readable over any cell/zone color.
 */
function drawPill(ctx, text, x, y, color, fontSize, scale, alpha) {
  const metrics = ctx.measureText(text);
  const padX = 6 * scale;
  const padY = 3 * scale;
  const w = metrics.width + padX * 2;
  const h = fontSize + padY * 2;
  const rx = x - w / 2;
  const ry = y - h / 2;
  const cornerR = 5 * scale;

  const a = alpha != null ? alpha : 1;

  // Dark background
  ctx.globalAlpha = 0.85 * a;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  roundRect(ctx, rx, ry, w, h, cornerR);
  ctx.fill();

  // Colored border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * scale;
  ctx.globalAlpha = 0.7 * a;
  ctx.stroke();

  // Bright text
  ctx.globalAlpha = 1 * a;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
