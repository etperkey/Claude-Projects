/**
 * Entity CRUD and spatial queries.
 * Each entity is a plain object with { id, type, state, x, y, ... }.
 * Uses cached arrays and type indexes to avoid per-frame allocations.
 */
export class EntityManager {
  constructor() {
    this.entities = new Map();
    this.nextId = 1;
    this._allCache = null;       // cached flat array, invalidated on add/remove
    this._typeIndex = new Map(); // Map<type, Set<entity>>
  }

  _invalidate() {
    this._allCache = null;
  }

  add(entity) {
    const id = this.nextId++;
    entity.id = id;
    this.entities.set(id, entity);

    // Update type index
    let set = this._typeIndex.get(entity.type);
    if (!set) {
      set = new Set();
      this._typeIndex.set(entity.type, set);
    }
    set.add(entity);

    this._invalidate();
    return entity;
  }

  remove(id) {
    const entity = this.entities.get(id);
    if (entity) {
      const set = this._typeIndex.get(entity.type);
      if (set) set.delete(entity);
      this.entities.delete(id);
      this._invalidate();
    }
  }

  // Update type index when entity type changes (e.g., recycle/differentiate)
  updateType(entity, newType) {
    const oldSet = this._typeIndex.get(entity.type);
    if (oldSet) oldSet.delete(entity);
    entity.type = newType;
    let newSet = this._typeIndex.get(newType);
    if (!newSet) {
      newSet = new Set();
      this._typeIndex.set(newType, newSet);
    }
    newSet.add(entity);
  }

  get(id) {
    return this.entities.get(id);
  }

  all() {
    if (!this._allCache) {
      this._allCache = Array.from(this.entities.values());
    }
    return this._allCache;
  }

  byType(type) {
    const set = this._typeIndex.get(type);
    return set ? Array.from(set) : [];
  }

  byTypes(types) {
    const result = [];
    for (const t of types) {
      const set = this._typeIndex.get(t);
      if (set) {
        for (const e of set) result.push(e);
      }
    }
    return result;
  }

  byState(state) {
    const result = [];
    for (const e of this.entities.values()) {
      if (e.state === state) result.push(e);
    }
    return result;
  }

  // Entities within `radius` pixels of (x, y)
  near(x, y, radius) {
    const r2 = radius * radius;
    const result = [];
    for (const e of this.entities.values()) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2) result.push(e);
    }
    return result;
  }

  // Nearest entity of a given type to (x, y)
  nearest(x, y, type) {
    let best = null;
    let bestDist = Infinity;
    const source = type ? this._typeIndex.get(type) : this.entities.values();
    if (!source) return null;
    for (const e of source) {
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  count(type) {
    if (!type) return this.entities.size;
    const set = this._typeIndex.get(type);
    return set ? set.size : 0;
  }

  clear() {
    this.entities.clear();
    this._typeIndex.clear();
    this._invalidate();
    this.nextId = 1;
  }
}
