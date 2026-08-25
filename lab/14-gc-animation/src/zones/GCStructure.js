import { GC_ELLIPSE, MANTLE_THICKNESS } from '../utils/constants.js';
import { isInsideEllipse, randomPointInEllipse, Vec2 } from '../utils/math.js';

/**
 * Manages GC geometry. Values are cached on resize() / setDzFraction()
 * to avoid recomputation every frame access.
 */
export class GCStructure {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.dzFraction = GC_ELLIPSE.dzFraction;
    this.visible = false;
    this.opacity = 0;

    // Cached pixel values (set in _recompute)
    this.cx = 0;
    this.cy = 0;
    this.rx = 0;
    this.ry = 0;
    this.mantleRx = 0;
    this.mantleRy = 0;
    this.dzLzBoundaryY = 0;
  }

  _recompute() {
    this.cx = this.width * GC_ELLIPSE.centerX;
    this.cy = this.height * GC_ELLIPSE.centerY;
    this.rx = this.width * GC_ELLIPSE.radiusX;
    this.ry = this.height * GC_ELLIPSE.radiusY;
    this.mantleRx = this.rx + this.width * MANTLE_THICKNESS;
    this.mantleRy = this.ry + this.height * MANTLE_THICKNESS;
    this.dzLzBoundaryY = this.cy + this.ry * (1 - 2 * this.dzFraction);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this._recompute();
  }

  isInsideGC(x, y) {
    return isInsideEllipse(x, y, this.cx, this.cy, this.rx, this.ry);
  }

  isInsideMantle(x, y) {
    return isInsideEllipse(x, y, this.cx, this.cy, this.mantleRx, this.mantleRy) &&
           !this.isInsideGC(x, y);
  }

  isInDZ(x, y) {
    return this.isInsideGC(x, y) && y > this.dzLzBoundaryY;
  }

  isInLZ(x, y) {
    return this.isInsideGC(x, y) && y <= this.dzLzBoundaryY;
  }

  randomDZPoint() {
    // Center of DZ region — bias distribution toward DZ center
    const dzCenterY = (this.dzLzBoundaryY + this.cy + this.ry) / 2;
    const dzHalfHeight = (this.cy + this.ry - this.dzLzBoundaryY) / 2;
    for (let i = 0; i < 100; i++) {
      // Generate in a sub-ellipse centered on the DZ
      const pt = randomPointInEllipse(this.cx, dzCenterY, this.rx * 0.7, dzHalfHeight * 0.8);
      if (this.isInsideGC(pt.x, pt.y) && pt.y > this.dzLzBoundaryY) return pt;
    }
    return new Vec2(this.cx, dzCenterY);
  }

  randomLZPoint() {
    // Center of LZ region
    const lzCenterY = (this.cy - this.ry + this.dzLzBoundaryY) / 2;
    const lzHalfHeight = (this.dzLzBoundaryY - (this.cy - this.ry)) / 2;
    for (let i = 0; i < 100; i++) {
      const pt = randomPointInEllipse(this.cx, lzCenterY, this.rx * 0.7, lzHalfHeight * 0.8);
      if (this.isInsideGC(pt.x, pt.y) && pt.y <= this.dzLzBoundaryY) return pt;
    }
    return new Vec2(this.cx, lzCenterY);
  }

  randomMantlePoint() {
    for (let i = 0; i < 100; i++) {
      const pt = randomPointInEllipse(this.cx, this.cy, this.mantleRx, this.mantleRy);
      if (!this.isInsideGC(pt.x, pt.y)) return pt;
    }
    return new Vec2(this.cx + this.mantleRx * 0.9, this.cy);
  }

  exitPoint() {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    return new Vec2(
      this.cx + this.mantleRx * 1.2 * Math.cos(angle),
      this.cy + this.mantleRy * 1.2 * Math.sin(angle)
    );
  }

  setDzFraction(frac) {
    this.dzFraction = frac;
    this._recompute();
  }
}
