import { HE, CHEMOKINE } from '../utils/colors.js';

export function drawZones(ctx, gc) {
  if (!gc.visible) return;
  const alpha = gc.opacity;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Mantle zone ring
  drawMantle(ctx, gc);

  // GC ellipse background
  drawGCEllipse(ctx, gc);

  // DZ/LZ gradient boundary
  drawDZLZBoundary(ctx, gc);

  // Zone labels are drawn separately AFTER cells via drawZoneOverlayLabels
  ctx.restore();
}

/**
 * Draw zone labels AFTER cells so they're always visible on top.
 * Called from SimulationEngine.render() after cell drawing.
 */
export function drawZoneOverlayLabels(ctx, gc) {
  if (!gc.visible || gc.opacity < 0.5) return;
  ctx.save();
  ctx.globalAlpha = gc.opacity * 0.75;
  if (gc.rx !== _zoneLabelRx) {
    _zoneLabelRx = gc.rx;
    _zoneLabelFont = `bold ${Math.round(Math.min(gc.rx * 0.09, 26))}px sans-serif`;
  }
  ctx.font = _zoneLabelFont;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  drawZonePill(ctx, 'Light Zone', gc.cx + gc.rx * 0.85, gc.cy - gc.ry * 0.75, '#ffd54f', 'right');
  drawZonePill(ctx, 'Dark Zone', gc.cx + gc.rx * 0.85, gc.cy + gc.ry * 0.75, '#ce93d8', 'right');
  ctx.restore();
}

function drawMantle(ctx, gc) {
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.mantleRx, gc.mantleRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = HE.mantleZone;
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = HE.gcBorder;
  ctx.stroke();
}

function drawGCEllipse(ctx, gc) {
  // Light Zone (top) — lighter fill
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.rx, gc.ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Full LZ fill
  ctx.fillStyle = HE.lzBackground;
  ctx.fillRect(gc.cx - gc.rx, gc.cy - gc.ry, gc.rx * 2, gc.ry * 2);

  // DZ fill (bottom portion)
  ctx.fillStyle = HE.dzBackground;
  ctx.fillRect(gc.cx - gc.rx, gc.dzLzBoundaryY, gc.rx * 2, gc.cy + gc.ry - gc.dzLzBoundaryY);

  // Soft gradient at boundary
  const gradH = gc.ry * 0.15;
  const grad = ctx.createLinearGradient(0, gc.dzLzBoundaryY - gradH, 0, gc.dzLzBoundaryY + gradH);
  grad.addColorStop(0, 'rgba(232, 213, 240, 0)');
  grad.addColorStop(0.5, 'rgba(232, 213, 240, 0.5)');
  grad.addColorStop(1, 'rgba(232, 213, 240, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(gc.cx - gc.rx, gc.dzLzBoundaryY - gradH, gc.rx * 2, gradH * 2);

  ctx.restore();

  // GC border
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.rx, gc.ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = HE.gcBorder;
  ctx.stroke();
}

function drawDZLZBoundary(ctx, gc) {
  // Dashed line at DZ/LZ interface
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(180, 150, 200, 0.4)';
  ctx.lineWidth = 1;

  // Clip to GC ellipse
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.rx, gc.ry, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.beginPath();
  ctx.moveTo(gc.cx - gc.rx, gc.dzLzBoundaryY);
  ctx.lineTo(gc.cx + gc.rx, gc.dzLzBoundaryY);
  ctx.stroke();
  ctx.restore();
}

let _zoneLabelFont = '';
let _zoneLabelRx = 0;


/**
 * Draw a label with a semi-transparent dark background pill so it's
 * always readable even when cells overlap it.
 */
function drawZonePill(ctx, text, x, y, color, align) {
  const metrics = ctx.measureText(text);
  const padX = 8;
  const padY = 4;
  const w = metrics.width + padX * 2;
  const h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + padY * 2;
  let rx;
  if (align === 'right') rx = x - w;
  else if (align === 'left') rx = x;
  else rx = x - w / 2;
  const ry = y - h / 2;
  const cornerR = 5;
  // Text always centered within the pill
  const textX = rx + w / 2;

  // Dark background — high opacity for strong contrast
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * 0.9;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  roundRectPath(ctx, rx, ry, w, h, cornerR);
  ctx.fill();

  // Subtle colored border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = prevAlpha * 0.5;
  ctx.stroke();

  // Bright text — centered within the pill
  ctx.globalAlpha = prevAlpha;
  ctx.fillStyle = color;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'center';
  ctx.fillText(text, textX, y);
  ctx.textAlign = prevAlign;
}

function roundRectPath(ctx, x, y, w, h, r) {
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

export function drawChemokineGradients(ctx, gc) {
  if (!gc.visible || gc.opacity < 0.3) return;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.rx, gc.ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // CXCL12 gradient (DZ attractant — strongest at bottom, CXCR4-mediated)
  const cxcl12 = ctx.createLinearGradient(gc.cx, gc.cy - gc.ry, gc.cx, gc.cy + gc.ry);
  cxcl12.addColorStop(0, 'rgba(63, 81, 181, 0)');
  cxcl12.addColorStop(1, CHEMOKINE.cxcl12.color);
  ctx.fillStyle = cxcl12;
  ctx.fillRect(gc.cx - gc.rx, gc.cy - gc.ry, gc.rx * 2, gc.ry * 2);

  // CXCL13 gradient (LZ attractant — strongest at top, CXCR5-mediated)
  const cxcl13 = ctx.createLinearGradient(gc.cx, gc.cy - gc.ry, gc.cx, gc.cy + gc.ry);
  cxcl13.addColorStop(0, CHEMOKINE.cxcl13.color);
  cxcl13.addColorStop(1, 'rgba(255, 152, 0, 0)');
  ctx.fillStyle = cxcl13;
  ctx.fillRect(gc.cx - gc.rx, gc.cy - gc.ry, gc.rx * 2, gc.ry * 2);

  ctx.restore();

  // GGG gradient (confinement — high at periphery/blood, low near FDCs where GGT5 degrades it)
  const gggGrad = ctx.createRadialGradient(
    gc.cx, gc.cy, 0,
    gc.cx, gc.cy, gc.mantleRx * 1.6
  );
  gggGrad.addColorStop(0, 'rgba(76, 175, 80, 0)');
  gggGrad.addColorStop(0.2, 'rgba(76, 175, 80, 0)');
  gggGrad.addColorStop(0.5, 'rgba(76, 175, 80, 0.10)');
  gggGrad.addColorStop(0.7, 'rgba(76, 175, 80, 0.20)');
  gggGrad.addColorStop(0.85, 'rgba(76, 175, 80, 0.30)');
  gggGrad.addColorStop(1, CHEMOKINE.ggg.color);
  ctx.fillStyle = gggGrad;
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.mantleRx * 1.6, gc.mantleRy * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // S1P gradient (exit signal — radiates far outward into blood, ↑S1PR1 for egress)
  ctx.save();
  const s1pGrad = ctx.createRadialGradient(
    gc.cx, gc.cy, gc.rx * 0.5,
    gc.cx, gc.cy, gc.mantleRx * 1.8
  );
  s1pGrad.addColorStop(0, 'rgba(233, 30, 99, 0)');
  s1pGrad.addColorStop(0.3, 'rgba(233, 30, 99, 0.08)');
  s1pGrad.addColorStop(0.5, 'rgba(233, 30, 99, 0.16)');
  s1pGrad.addColorStop(0.7, 'rgba(233, 30, 99, 0.24)');
  s1pGrad.addColorStop(1, CHEMOKINE.s1p.color);
  ctx.fillStyle = s1pGrad;
  ctx.beginPath();
  ctx.ellipse(gc.cx, gc.cy, gc.mantleRx * 1.8, gc.mantleRy * 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Labels are drawn separately AFTER cells via drawChemokineOverlayLabels
  ctx.restore();
}

/**
 * Draw chemokine gradient labels AFTER cells so they're always visible.
 * Called from SimulationEngine.render() after cell drawing.
 */
export function drawChemokineOverlayLabels(ctx, gc, stageId) {
  if (!gc.visible || gc.opacity < 0.3) return;

  ctx.save();
  const labelSize = Math.round(Math.min(gc.rx * 0.09, 24));
  ctx.font = `bold ${labelSize}px sans-serif`;
  ctx.globalAlpha = 0.9;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // CXCL12 label in the DZ (where it's highest) — keep inside ellipse to avoid clipping
  drawZonePill(ctx, 'CXCL12 ↑ (DZ)', gc.cx - gc.rx * 0.45, gc.cy + gc.ry * 0.72, '#90caf9', 'left');

  // CXCL13 label in the LZ (where it's highest) — keep inside ellipse to avoid clipping
  drawZonePill(ctx, 'CXCL13 ↑ (LZ)', gc.cx - gc.rx * 0.45, gc.cy - gc.ry * 0.68, '#ffe082', 'left');

  // GGG confinement label — positioned outside GC in the blood
  drawZonePill(ctx, 'GGG ↑ periphery → P2RY8', gc.cx - gc.mantleRx * 1.35, gc.cy + gc.mantleRy * 0.6, '#a5d6a7', 'left');

  // FDC GGT5 degradation note — only show during stages that narrate about GGG
  // Chemokines track: stage 4 (DZ confinement) and stage 6 (LZ confinement with GGT5)
  if (stageId === 4 || stageId === 6) {
    const smallSize = Math.round(Math.min(gc.rx * 0.06, 16));
    ctx.font = `italic ${smallSize}px sans-serif`;
    ctx.globalAlpha = 0.8;
    drawZonePill(ctx, 'FDC: GGT5 degrades GGG', gc.cx, gc.cy - gc.ry * 0.55, '#c8e6c9', 'center');
    ctx.font = `bold ${labelSize}px sans-serif`;
    ctx.globalAlpha = 0.9;
  }

  // S1P egress label — positioned further out in the blood
  drawZonePill(ctx, 'S1P ↑ (egress: ↑S1PR1 / ↓S1PR2)', gc.cx + gc.mantleRx * 1.4, gc.cy - gc.mantleRy * 1.0, '#f8bbd0', 'right');

  ctx.restore();
}
