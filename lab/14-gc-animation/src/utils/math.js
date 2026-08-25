export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }

  normalize() {
    const len = this.length();
    return len > 0 ? this.scale(1 / len) : new Vec2(0, 0);
  }

  distTo(v) { return this.sub(v).length(); }
  dot(v) { return this.x * v.x + this.y * v.y; }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  clone() { return new Vec2(this.x, this.y); }
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Box-Muller with cached second variate
let _gaussianSpare = null;
let _hasSpare = false;

export function randomGaussian(mean = 0, stddev = 1) {
  if (_hasSpare) {
    _hasSpare = false;
    return mean + stddev * _gaussianSpare;
  }
  const u1 = Math.random();
  const u2 = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;
  _gaussianSpare = mag * Math.sin(angle);
  _hasSpare = true;
  return mean + stddev * mag * Math.cos(angle);
}

export function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomAngle() {
  return Math.random() * Math.PI * 2;
}

export function isInsideEllipse(px, py, cx, cy, rx, ry) {
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

export function randomPointInEllipse(cx, cy, rx, ry) {
  const angle = randomAngle();
  const r = Math.sqrt(Math.random());
  return new Vec2(cx + rx * r * Math.cos(angle), cy + ry * r * Math.sin(angle));
}

// Scratch buffer to avoid per-call allocation
const _scratchVec = { x: 0, y: 0 };

/**
 * Constrain point to inside an ellipse.
 * Returns a scratch object { x, y } — NOT a new allocation.
 * Caller must read x/y immediately; do NOT store the reference.
 */
export function constrainToEllipse(px, py, cx, cy, rx, ry) {
  const dx = px - cx;
  const dy = py - cy;
  const d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (d <= 1) {
    _scratchVec.x = px;
    _scratchVec.y = py;
  } else {
    const scale = 0.98 / Math.sqrt(d);
    _scratchVec.x = cx + dx * scale;
    _scratchVec.y = cy + dy * scale;
  }
  return _scratchVec;
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
