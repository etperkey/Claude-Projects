import { EntityManager } from './EntityManager.js';
import { PhysicsSystem } from './PhysicsSystem.js';
import { InteractionSystem } from './InteractionSystem.js';
import { GCStructure } from '../zones/GCStructure.js';
import { StageController } from '../stages/StageController.js';
import { drawZones, drawChemokineGradients, drawZoneOverlayLabels, drawChemokineOverlayLabels } from '../zones/ZoneRenderer.js';
import { drawCell } from '../cells/CellRenderer.js';
import { drawMutationCallouts, drawReceptorLabels, drawTfhLabels } from '../cells/AnnotationRenderer.js';
import { updateBehavior, triggerSHM, triggerDivision, triggerCSR } from '../cells/CellBehaviors.js';
import { CellType, CellState } from '../cells/CellTypes.js';
import {
  createFoB, createCentroblast, createCentrocyte,
  createFDC, createTfh, createMacrophage,
  createApoptotic, createPlasmablast, createMemoryB, createCell,
} from '../cells/CellFactory.js';
import { HE } from '../utils/colors.js';
import { DEFAULTS, INITIAL_FOB_COUNT } from '../utils/constants.js';
import { lerp } from '../utils/math.js';

export class SimulationEngine {
  constructor() {
    this.entities = new EntityManager();
    this.physics = new PhysicsSystem();
    this.interactions = new InteractionSystem();
    this.gc = new GCStructure();
    this.stages = new StageController();

    this.tick = 0;
    this.speed = 1.0;
    this.running = false;
    this.rafId = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.tickRate = 1000 / 48; // 48 ticks per second (0.8x of original 60, syncs with audio)

    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.ctx = null; // set by CanvasView

    this.showChemokines = false;
    this.trackVisuals = null; // set when track selected
    this.affinityHistory = []; // for stage 9 chart

    // Interactive parameters
    this.params = { ...DEFAULTS };

    // Tracked cell (follow-one-cell mode)
    this.trackedId = null;
    this.trackedEvents = []; // event log for the tracked cell

    // Hero cell — persists across all stages, auto-tracked
    this.heroId = null;

    // Callbacks for React — throttled, not every tick
    this.onStateChange = null;
    this._lastStageIndex = -1;
    this._lastPaused = false;
    this._uiTickCounter = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width, height) / 800;
    this.gc.resize(width, height);

    // Deferred sandbox setup — needs valid dimensions
    if (this._pendingSandbox && width > 0 && height > 0) {
      this._pendingSandbox = false;
      this.setupSandbox();
      this.start();
      if (this.onStateChange) this.onStateChange();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  loop = (now) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta * this.speed;

    // Fixed timestep updates
    let updated = false;
    while (this.accumulator >= this.tickRate) {
      this.accumulator -= this.tickRate;
      this.update();
      updated = true;
    }

    // Render every frame (driven by this single RAF loop)
    if (this.ctx) {
      this.render(this.ctx);
    }

    // Throttled React UI updates — only when stage/pause changes, or every 30 ticks
    if (updated && this.onStateChange) {
      const stageChanged = this.stages.currentIndex !== this._lastStageIndex;
      const pauseChanged = this.stages.paused !== this._lastPaused;
      this._uiTickCounter++;

      const trackingUpdate = this.trackedId && this._uiTickCounter >= 10;
      if (stageChanged || pauseChanged || trackingUpdate || this._uiTickCounter >= 30) {
        this._lastStageIndex = this.stages.currentIndex;
        this._lastPaused = this.stages.paused;
        this._uiTickCounter = 0;
        this.onStateChange();
      }
    }
  };

  update() {
    // Pause freezes everything (render still runs via RAF)
    if (this.stages.paused) return;

    this.tick++;

    // Stage progression (sandbox mode skips this)
    this.stages.update(this);

    // GC fade in/out
    if (this.gc.visible && this.gc.opacity < 1) {
      this.gc.opacity = Math.min(1, this.gc.opacity + 0.015);
    }

    // Physics
    this.physics.update(this.entities, this.gc, 1, this.scale);

    // Cell behaviors
    const allEntities = this.entities.all();
    const bcellCount = this.entities.count(CellType.Centroblast) +
                       this.entities.count(CellType.Centrocyte);
    for (const e of allEntities) {
      const events = updateBehavior(e, this.gc, this.params, this.tick, bcellCount);
      this.processEvents(events);
    }

    // Occasional CSR on centroblasts (after SHM rounds, ~5% chance per idle CB per tick)
    // In mutations track, suppress CSR until stage 8 (when it's narrated)
    const suppressCSR = this.trackVisuals && this.trackVisuals.showMutationCallouts
      && this.stages.stageNumber < 8;
    if (this.tick % 60 === 0 && !suppressCSR) {
      const cbs = this.entities.byType(CellType.Centroblast);
      for (const cb of cbs) {
        if (cb.state === CellState.Idle && !cb.isotype && Math.random() < 0.05) {
          const isotypes = ['IgG1', 'IgG3', 'IgA1', 'IgE'];
          triggerCSR(cb, isotypes[Math.floor(Math.random() * isotypes.length)]);
        }
      }
    }

    // In mutations track stages 3-4, boost SHM frequency for AID emphasis
    const boostSHM = this.trackVisuals && this.trackVisuals.enhanceSHM
      && (this.stages.stageNumber === 3 || this.stages.stageNumber === 4);
    if (boostSHM && this.tick % 90 === 0) {
      const cbs = this.entities.byType(CellType.Centroblast);
      for (const cb of cbs) {
        if (cb.state === CellState.Idle && Math.random() < 0.08) {
          triggerSHM(cb, this.tick, true); // enhanced = more sparks
        }
      }
    }

    // Sandbox continuous lifecycle: proliferation, SHM, migration, selection, recycling/exit
    if (this.stages.sandbox) {
      // Ensure all idle centroblasts have a division cooldown ticking
      if (this.tick % 60 === 0) {
        const cbs = this.entities.byType(CellType.Centroblast);
        for (const cb of cbs) {
          if (cb.state === CellState.Idle && cb.divisionCooldown == null) {
            cb.divisionCooldown = 60 + Math.random() * 90;
          }
        }
      }

      // SHM on idle centroblasts (~8% chance every 90 ticks)
      if (this.tick % 90 === 0) {
        const cbs = this.entities.byType(CellType.Centroblast);
        for (const cb of cbs) {
          if (cb.state === CellState.Idle && Math.random() < 0.08) {
            triggerSHM(cb, this.tick, false);
          }
        }
      }

      // Centroblast → Centrocyte migration (~5% chance every 90 ticks for idle CBs)
      if (this.tick % 90 === 0) {
        const cbs = this.entities.byType(CellType.Centroblast)
          .filter(c => c.state === CellState.Idle);
        for (const cb of cbs) {
          if (Math.random() < 0.05) {
            this.entities.updateType(cb, CellType.Centrocyte);
            cb.zone = 'lz';
            cb.state = CellState.Migrating;
            const lzPt = this.gc.randomLZPoint();
            cb.targetX = lzPt.x;
            cb.targetY = lzPt.y;
            cb.onArrival = (e) => { e.state = CellState.Idle; };
          }
        }
      }

      // Maintain centroblast population — recruit FoBs if low
      if (this.tick % 120 === 0) {
        const cbCount = this.entities.count(CellType.Centroblast);
        if (cbCount < 8) {
          const fobs = this.entities.byType(CellType.FoB);
          const toRecruit = Math.min(3, fobs.length);
          for (let i = 0; i < toRecruit; i++) {
            const recruit = fobs[i];
            const dzPt = this.gc.randomDZPoint();
            this.entities.updateType(recruit, CellType.Centroblast);
            recruit.zone = 'dz';
            recruit.state = CellState.Migrating;
            recruit.affinity = 0.3 + Math.random() * 0.3;
            recruit.divisionCooldown = 60 + Math.random() * 90;
            recruit.targetX = dzPt.x;
            recruit.targetY = dzPt.y;
            recruit.onArrival = (e) => { e.state = CellState.Idle; e.zone = 'dz'; };
          }
        }
        // Replenish mantle FoBs
        const fobCount = this.entities.count(CellType.FoB);
        if (fobCount < 20) {
          for (let i = 0; i < 3; i++) {
            this.entities.add(createFoB(this.gc));
          }
        }
      }
    }

    // Stage 6: steer a Tfh toward hero once it's Selected but not yet helped
    if (this.stages.stageNumber === 6 && this.heroId) {
      const hero = this.entities.get(this.heroId);
      if (hero && hero.type === CellType.Centrocyte
        && hero.state === CellState.Selected && !hero.tfhHelped && !hero._tfhSteered) {
        const nearestTfh = this.entities.nearest(hero.x, hero.y, CellType.Tfh);
        if (nearestTfh && nearestTfh.state === CellState.Idle) {
          nearestTfh.targetX = hero.x + 10;
          nearestTfh.targetY = hero.y;
          nearestTfh.speedMult = 1.5;
          // Transient label — will be rendered by AnnotationRenderer
          nearestTfh._heroHelper = true;
          nearestTfh.glow = true;
          nearestTfh.glowColor = 'rgba(156, 39, 176, 0.4)';
          nearestTfh.glowRadius = 14;
          nearestTfh.glowTimer = 180;
          hero._tfhSteered = true; // only steer once
        }
      }
    }

    // Sync tracked cell event log
    if (this.trackedId) {
      const tracked = this.entities.get(this.trackedId);
      if (tracked && tracked.eventLog) {
        while (tracked.eventLog.length > this.trackedEvents.length) {
          this.trackedEvents.push(tracked.eventLog[this.trackedEvents.length]);
        }
      }
      // If tracked cell was removed, clear tracking
      if (!tracked) {
        this.trackedId = null;
      }
    }

    // Interactions
    const interEvents = this.interactions.update(
      this.entities, this.gc, this.params, this.scale, this.tick
    );
    this.processEvents(interEvents);

    // Track affinity history
    if (this.tick % 60 === 0) {
      const bcells = this.entities.byTypes([CellType.Centroblast, CellType.Centrocyte]);
      if (bcells.length > 0) {
        const avg = bcells.reduce((s, b) => s + (b.affinity || 0.5), 0) / bcells.length;
        this.affinityHistory.push(avg);
        if (this.affinityHistory.length > 100) this.affinityHistory.shift();
      }
    }
  }

  processEvents(events) {
    for (const ev of events) {
      switch (ev.type) {
        case 'spawn':
          this.entities.add(createCell(ev.cellType, ev.x, ev.y, {
            zone: ev.zone,
            affinity: ev.affinity,
          }));
          break;
        case 'remove':
          this.entities.remove(ev.entityId);
          break;
        case 'apoptose': {
          this.entities.remove(ev.entityId);
          this.entities.add(createApoptotic(ev.x, ev.y));
          break;
        }
        case 'recycle': {
          const e = this.entities.get(ev.entityId);
          if (e) {
            const pt = this.gc.randomDZPoint();
            this.entities.updateType(e, CellType.Centroblast);
            e.zone = 'dz';
            e.state = CellState.Migrating;
            e.targetX = pt.x;
            e.targetY = pt.y;
            e.divisionCooldown = 90 + Math.random() * 60;
            e.tfhHelped = false;
            e.glow = false;
            e.onArrival = (ent) => {
              ent.state = CellState.Idle;
              ent.zone = 'dz';
              // Hero gets another round of SHM after recycling back to DZ
              if (ent.isHero) {
                triggerSHM(ent, this.tick, true);
                ent.affinity = Math.min(1, ent.affinity + 0.1);
              }
            };
            // eventLog persists through type changes for tracking
          }
          break;
        }
        case 'differentiate': {
          const e = this.entities.get(ev.entityId);
          if (e) {
            const exitPt = this.gc.exitPoint();
            this.entities.updateType(e, ev.newType);
            e.zone = 'exit';
            e.state = CellState.Exiting;
            e.targetX = exitPt.x;
            e.targetY = exitPt.y;
            e.glow = true;
            e.glowColor = 'rgba(255, 193, 7, 0.4)';
            e.glowRadius = 12;
            e.glowTimer = 120;
            // eventLog persists through differentiation
          }
          break;
        }
      }
    }
  }

  render(ctx) {
    // Clear
    ctx.fillStyle = HE.slideBackground;
    ctx.fillRect(0, 0, this.width, this.height);

    // Zones
    drawZones(ctx, this.gc);

    // Chemokine gradients overlay
    if (this.showChemokines) {
      drawChemokineGradients(ctx, this.gc);
    }

    // Cells (sorted: FDC first so arms are behind other cells, tracked cell last/on top)
    const all = this.entities.all();
    const tid = this.trackedId;
    const fdcs = [];
    const others = [];
    let tracked = null;

    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (e.id === tid) { tracked = e; continue; }
      if (e.type === CellType.FDC) fdcs.push(e);
      else others.push(e);
    }

    const tv = this.trackVisuals;
    for (const e of fdcs) drawCell(ctx, e, this.scale, this.tick, tid, tv);
    for (const e of others) drawCell(ctx, e, this.scale, this.tick, tid, tv);
    // Draw tracked cell last so it's always on top
    if (tracked) drawCell(ctx, tracked, this.scale, this.tick, tid, tv);

    // Zone and chemokine labels drawn AFTER cells so they're always readable
    drawZoneOverlayLabels(ctx, this.gc);
    if (this.showChemokines) {
      drawChemokineOverlayLabels(ctx, this.gc, this.stages.current.id);
    }

    // Track-specific annotations (drawn after all cells)
    const allEntities = this.entities.all();
    if (tv) {
      if (tv.showMutationCallouts) {
        drawMutationCallouts(ctx, allEntities, this.scale, this.tick);
      }
      if (tv.showReceptorLabels) {
        drawReceptorLabels(ctx, allEntities, this.scale);
      }
    }
    // Tfh label shown on both tracks when helping the hero
    drawTfhLabels(ctx, allEntities, this.scale);

    // Interstitial overlay
    if (this.stages.showInterstitial) {
      this.renderInterstitial(ctx);
    }
  }

  renderInterstitial(ctx) {
    const progress = this.stages.interstitialTicks / 180;
    const alpha = progress < 0.15 ? progress / 0.15
      : progress > 0.85 ? (1 - progress) / 0.15
      : 1;

    ctx.save();
    ctx.fillStyle = `rgba(10, 5, 25, ${0.85 * alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e0d0f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleSize = Math.max(24, 32 * this.scale);
    ctx.font = `600 ${titleSize}px sans-serif`;
    ctx.fillText('Switching to Track 2', this.width / 2, this.height / 2 - 20 * this.scale);

    const subSize = Math.max(14, 18 * this.scale);
    ctx.font = `${subSize}px sans-serif`;
    ctx.fillStyle = '#b388ff';
    ctx.fillText('Chemokines: Gradients & Receptors', this.width / 2, this.height / 2 + 20 * this.scale);

    ctx.restore();
  }

  // Track a cell — follow it through the GC with event logging
  trackCell(entityId) {
    const e = this.entities.get(entityId);
    if (!e) return;
    // Only track B lineage cells
    const trackable = [CellType.FoB, CellType.Centroblast, CellType.Centrocyte,
                       CellType.Plasmablast, CellType.MemoryB];
    if (!trackable.includes(e.type)) return;

    this.trackedId = entityId;
    this.trackedEvents = [];
    e.eventLog = []; // attach event log array to entity
    e.eventLog.push({ tick: this.tick, type: 'tracked', cellType: e.type, affinity: e.affinity });
  }

  untrackCell() {
    if (this.trackedId) {
      const e = this.entities.get(this.trackedId);
      if (e) e.eventLog = null;
    }
    this.trackedId = null;
    this.trackedEvents = [];
  }

  // Get entity at pixel coordinates (for click/tooltip)
  getEntityAt(x, y) {
    const all = this.entities.all();
    let closest = null;
    // Larger hit area on touch devices / small screens
    const isMobile = this.width < 1200;
    let closestDist = (isMobile ? 35 : 20) * this.scale; // max click distance
    for (const e of all) {
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) {
        closestDist = d;
        closest = e;
      }
    }
    return closest;
  }

  // ================================================================
  //  Stage setup methods — called by StageDefinitions
  // ================================================================

  setupStage1_AntigenEncounter() {
    this.entities.clear();
    this.gc.visible = false;
    this.gc.opacity = 0;
    this.affinityHistory = [];
    this.heroId = null;

    // Place a single FDC near center
    const fdc = createCell(CellType.FDC, this.width * 0.5, this.height * 0.45, { zone: 'lz' });
    fdc.armAngles = [];
    for (let i = 0; i < 6; i++) fdc.armAngles.push((i / 6) * Math.PI * 2);
    this.entities.add(fdc);

    // Place the hero B cell closer to FDC — deliberate approach
    const fob = createCell(CellType.FoB, this.width * 0.62, this.height * 0.42, { zone: 'mantle' });
    fob.isHero = true;
    fob.targetX = this.width * 0.5 + 30 * this.scale;
    fob.targetY = this.height * 0.45;
    fob.speedMult = 0.3; // Slow, deliberate approach
    fob.onArrival = (e) => {
      // Strong BCR-Ag binding glow
      e.glow = true;
      e.glowColor = 'rgba(255, 193, 7, 0.7)';
      e.glowRadius = 30 * this.scale;
      e.glowTimer = 300;
      e.state = CellState.Activating;
      // Also glow the FDC to show antigen presentation
      const fdcs = this.entities.byType(CellType.FDC);
      for (const f of fdcs) {
        f.glow = true;
        f.glowColor = 'rgba(255, 152, 0, 0.5)';
        f.glowRadius = 25 * this.scale;
        f.glowTimer = 300;
      }
    };
    this.entities.add(fob);

    // Auto-track the hero cell
    this.heroId = fob.id;
    this.trackCell(fob.id);

    // Scatter some mantle FoBs for ambiance
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 180 + Math.random() * 80;
      const x = this.width * 0.5 + r * Math.cos(angle) * this.scale;
      const y = this.height * 0.5 + r * Math.sin(angle) * this.scale;
      const bystander = createCell(CellType.FoB, x, y, { zone: 'mantle' });
      this.entities.add(bystander);
    }
  }

  setupStage2_GCFormation() {
    // Fade in GC structure (opacity ramps in update loop)
    this.gc.visible = true;
    this.gc.opacity = 0;

    // Remove stage-1 FDC only — hero FoB will be transformed, not deleted
    const toRemove = [];
    for (const e of this.entities.all()) {
      if (e.type === CellType.FDC) {
        toRemove.push(e.id);
      }
    }
    for (const id of toRemove) this.entities.remove(id);

    // Transform the hero FoB into the first centroblast — migrate into the DZ
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero) {
      const dzPt = this.gc.randomDZPoint();
      this.entities.updateType(hero, CellType.Centroblast);
      hero.zone = 'dz';
      hero.state = CellState.Migrating;
      hero.affinity = 0.55; // slightly above average — activated cell
      hero.speedMult = 0.8;
      hero.glow = true;
      hero.glowColor = 'rgba(255, 193, 7, 0.5)';
      hero.glowRadius = 20 * this.scale;
      hero.glowTimer = 120;
      hero.divisionCooldown = 90 + Math.random() * 120;
      hero.targetX = dzPt.x;
      hero.targetY = dzPt.y;
      hero.onArrival = (e) => {
        e.state = CellState.Idle;
        e.zone = 'dz';
      };
    }

    // Reposition remaining mantle FoBs to GC-relative positions
    const existingFobs = this.entities.byType(CellType.FoB);
    for (const fob of existingFobs) {
      const angle = Math.random() * Math.PI * 2;
      const r = this.gc.rx * (1.1 + Math.random() * 0.3);
      fob.targetX = this.gc.cx + r * Math.cos(angle);
      fob.targetY = this.gc.cy + r * Math.sin(angle);
      fob.speedMult = 0.3;
      fob.zone = 'mantle';
    }

    // Top up mantle FoBs if needed
    const needed = INITIAL_FOB_COUNT - existingFobs.length;
    for (let i = 0; i < needed; i++) {
      this.entities.add(createFoB(this.gc));
    }

    // Add 3 more centroblasts in DZ (hero is the first)
    for (let i = 0; i < 3; i++) {
      this.entities.add(createCentroblast(this.gc, 0.5));
    }

    // FDCs in LZ — spread across the light zone in a triangle pattern
    const fdcPositions = [
      { xOff: 0, yOff: -0.25 },      // center-top
      { xOff: -0.35, yOff: -0.05 },   // left-middle
      { xOff: 0.35, yOff: -0.05 },    // right-middle
    ];
    for (const pos of fdcPositions) {
      const fx = this.gc.cx + this.gc.rx * pos.xOff;
      const fy = this.gc.cy + this.gc.ry * pos.yOff;
      const fdc = createCell(CellType.FDC, fx, fy, { zone: 'lz' });
      fdc.armAngles = [];
      for (let j = 0; j < 6; j++) fdc.armAngles.push((j / 6) * Math.PI * 2 + Math.random() * 0.3);
      this.entities.add(fdc);
    }
  }

  setupStage3_Proliferation() {
    // Trigger division — hero first so it's visually prominent
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero && hero.type === CellType.Centroblast && hero.state === CellState.Idle) {
      triggerDivision(hero);
    }
    const cbs = this.entities.byType(CellType.Centroblast);
    for (const cb of cbs) {
      if (cb.id !== this.heroId) triggerDivision(cb);
    }
  }

  setupStage4_SHM() {
    // Hero gets SHM first — boost affinity to ensure it passes selection later
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero && hero.type === CellType.Centroblast) {
      if (hero.state !== CellState.Idle) {
        hero.state = CellState.Idle;
        hero.stateTimer = null;
      }
      triggerSHM(hero, this.tick, true); // enhanced sparks
      hero.affinity = Math.min(1, hero.affinity + 0.15); // beneficial mutation
    }
    // Then trigger on all others
    const cbs = this.entities.byType(CellType.Centroblast);
    for (const cb of cbs) {
      if (cb.id !== this.heroId && cb.state === CellState.Idle) {
        triggerSHM(cb, this.tick);
      }
    }
  }

  setupStage5_Migration() {
    // Ensure hero migrates first — force idle if needed
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero && hero.type === CellType.Centroblast) {
      if (hero.state !== CellState.Idle) {
        hero.state = CellState.Idle;
        hero.stateTimer = null;
      }
    }

    // Convert some centroblasts to centrocytes and migrate to LZ
    const cbs = this.entities.byType(CellType.Centroblast)
      .filter(c => c.state === CellState.Idle);

    // Hero goes first, then 60% of the rest
    const heroInList = cbs.find(c => c.id === this.heroId);
    const others = cbs.filter(c => c.id !== this.heroId);
    const toMigrate = heroInList
      ? [heroInList, ...others.slice(0, Math.ceil(others.length * 0.6))]
      : cbs.slice(0, Math.ceil(cbs.length * 0.6));

    for (const cb of toMigrate) {
      this.entities.updateType(cb, CellType.Centrocyte);
      cb.zone = 'lz';
      cb.state = CellState.Migrating;

      // Hero migrates directly to the nearest FDC dendrite tip
      if (cb.id === this.heroId) {
        const nearestFdc = this.entities.nearest(cb.x, cb.y, CellType.FDC);
        if (nearestFdc && nearestFdc.armAngles && nearestFdc.armAngles.length > 0) {
          // Pick the arm closest to the hero's current position
          let bestAngle = nearestFdc.armAngles[0];
          let bestDist = Infinity;
          for (const angle of nearestFdc.armAngles) {
            const tipX = nearestFdc.x + Math.cos(angle) * 35 * this.scale;
            const tipY = nearestFdc.y + Math.sin(angle) * 35 * this.scale;
            const d = (tipX - cb.x) ** 2 + (tipY - cb.y) ** 2;
            if (d < bestDist) { bestDist = d; bestAngle = angle; }
          }
          cb.targetX = nearestFdc.x + Math.cos(bestAngle) * 30 * this.scale;
          cb.targetY = nearestFdc.y + Math.sin(bestAngle) * 30 * this.scale;
        } else {
          const lzPt = this.gc.randomLZPoint();
          cb.targetX = lzPt.x;
          cb.targetY = lzPt.y;
        }
      } else {
        const lzPt = this.gc.randomLZPoint();
        cb.targetX = lzPt.x;
        cb.targetY = lzPt.y;
      }

      cb.onArrival = (e) => {
        e.state = CellState.Idle;
      };
    }

    // Add Tfh cells if not present
    if (this.entities.count(CellType.Tfh) < this.params.tfhCount) {
      const needed = this.params.tfhCount - this.entities.count(CellType.Tfh);
      for (let i = 0; i < needed; i++) {
        this.entities.add(createTfh(this.gc));
      }
    }
  }

  setupStage6_Selection() {
    // Ensure we have FDCs
    if (this.entities.count(CellType.FDC) < 3) {
      for (let i = this.entities.count(CellType.FDC); i < 5; i++) {
        this.entities.add(createFDC(this.gc));
      }
    }

    // Steer hero centrocyte toward the nearest FDC so it visibly interacts
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero && hero.type === CellType.Centrocyte) {
      // Force idle so InteractionSystem can pick it up
      if (hero.state === CellState.Migrating || hero.state === CellState.Moving) {
        hero.state = CellState.Idle;
        hero.stateTimer = null;
      }
      // Clear any interaction cooldown on the hero
      this.interactions.interactionCooldowns.delete(hero.id);
      // Navigate hero directly to the nearest FDC
      const nearestFdc = this.entities.nearest(hero.x, hero.y, CellType.FDC);
      if (nearestFdc) {
        hero.targetX = nearestFdc.x + (Math.random() - 0.5) * 15;
        hero.targetY = nearestFdc.y + (Math.random() - 0.5) * 15;
        hero.speedMult = 1.0;
        hero.onArrival = (e) => {
          e.state = CellState.Idle;
          e.speedMult = 0.6;
        };

        // Pre-position a Tfh near the hero's target FDC so help arrives quickly
        const nearestTfh = this.entities.nearest(hero.x, hero.y, CellType.Tfh);
        if (nearestTfh) {
          nearestTfh.x = nearestFdc.x + 40 * this.scale;
          nearestTfh.y = nearestFdc.y + 20 * this.scale;
          nearestTfh.state = CellState.Idle;
          nearestTfh.targetX = null;
          nearestTfh.targetY = null;
        }
      }
    }
  }

  setupStage7_Clearance() {
    // Add macrophages if needed
    if (this.entities.count(CellType.Macrophage) < 2) {
      for (let i = this.entities.count(CellType.Macrophage); i < 2; i++) {
        this.entities.add(createMacrophage(this.gc));
      }
    }

    // Create some apoptotic bodies if none exist
    if (this.entities.count(CellType.Apoptotic) < 3) {
      for (let i = 0; i < 4; i++) {
        const pt = this.gc.randomLZPoint();
        this.entities.add(createApoptotic(pt.x, pt.y));
      }
    }
  }

  setupStage8_RecyclingExit() {
    // Release hero for recycling now that stage 8 has started
    const hero = this.heroId ? this.entities.get(this.heroId) : null;
    if (hero) {
      hero._recycleReady = true;
    }

    // Select ALL idle/migrating centrocytes for fate decisions
    const centrocytes = this.entities.byType(CellType.Centrocyte)
      .filter(c => c.state === CellState.Idle || c.state === CellState.Migrating
        || c.state === CellState.Selected);
    for (const cc of centrocytes) {
      cc.state = CellState.Selected;
      cc.stateTimer = 0;
      cc.glow = true;
      cc.glowColor = 'rgba(76, 175, 80, 0.4)';
      cc.glowRadius = 15;
      cc.glowTimer = 90;
    }

    // Also directly spawn a couple plasmablasts + memory B to ensure visibility
    // even if no centrocytes existed
    if (centrocytes.length < 3) {
      for (let i = 0; i < 2; i++) {
        const pt = this.gc.randomLZPoint();
        const pb = createPlasmablast(pt.x, pt.y, 0.7 + Math.random() * 0.2);
        pb.targetX = this.gc.exitPoint().x;
        pb.targetY = this.gc.exitPoint().y;
        this.entities.add(pb);
      }
      for (let i = 0; i < 2; i++) {
        const pt = this.gc.randomLZPoint();
        const mb = createMemoryB(pt.x, pt.y, 0.6 + Math.random() * 0.2);
        mb.targetX = this.gc.exitPoint().x;
        mb.targetY = this.gc.exitPoint().y;
        this.entities.add(mb);
      }
    }
  }

  setupStage9_AffinityMaturation() {
    // Run accelerated cycles — boost speed temporarily
    // This is mostly visual; the existing systems continue running
    // Ensure there are centroblasts dividing
    const cbCount = this.entities.count(CellType.Centroblast);
    if (cbCount < 8) {
      for (let i = cbCount; i < 10; i++) {
        const cb = createCentroblast(this.gc, 0.5 + Math.random() * 0.3);
        this.entities.add(cb);
      }
    }
  }

  // Sandbox mode: fully populated GC, no stages
  setupSandbox() {
    this.entities.clear();
    this.gc.visible = true;
    this.gc.opacity = 1;
    this.affinityHistory = [];
    this.heroId = null;
    this.trackedId = null;
    this.trackedEvents = [];

    // FoBs in mantle
    for (let i = 0; i < INITIAL_FOB_COUNT; i++) {
      this.entities.add(createFoB(this.gc));
    }
    // Centroblasts in DZ
    for (let i = 0; i < 12; i++) {
      this.entities.add(createCentroblast(this.gc, 0.35 + Math.random() * 0.35));
    }
    // Centrocytes in LZ
    for (let i = 0; i < 8; i++) {
      this.entities.add(createCentrocyte(this.gc, 0.3 + Math.random() * 0.4));
    }
    // FDCs — spread across the full LZ so migrating centrocytes encounter them
    const fdcPositions = [
      { xOff: 0, yOff: -0.15 },       // center
      { xOff: -0.30, yOff: -0.05 },   // left
      { xOff: 0.30, yOff: -0.05 },    // right
      { xOff: -0.15, yOff: -0.30 },   // upper-left
      { xOff: 0.15, yOff: -0.30 },    // upper-right
      { xOff: 0, yOff: -0.40 },       // top
      { xOff: -0.20, yOff: -0.18 },   // mid-left
      { xOff: 0.20, yOff: -0.18 },    // mid-right
    ];
    for (const pos of fdcPositions) {
      const fx = this.gc.cx + this.gc.rx * pos.xOff;
      const fy = this.gc.cy + this.gc.ry * pos.yOff;
      const fdc = createCell(CellType.FDC, fx, fy, { zone: 'lz' });
      this.entities.add(fdc);
    }
    // Tfh cells
    for (let i = 0; i < this.params.tfhCount; i++) {
      this.entities.add(createTfh(this.gc));
    }
    // Macrophages
    for (let i = 0; i < 2; i++) {
      this.entities.add(createMacrophage(this.gc));
    }
  }

  // Reset everything
  reset() {
    this.entities.clear();
    this.gc.visible = false;
    this.gc.opacity = 0;
    this.tick = 0;
    this.affinityHistory = [];
    this.heroId = null;
    this.trackedId = null;
    this.trackedEvents = [];
    this.stages.reset(this);
  }

  setParam(key, value) {
    this.params[key] = value;
    // Update GC geometry if DZ:LZ ratio changed
    if (key === 'dzLzRatio') {
      this.gc.setDzFraction(value);
    }
    if (key === 'tfhCount') {
      // Add or remove Tfh cells
      const current = this.entities.count(CellType.Tfh);
      if (value > current) {
        for (let i = 0; i < value - current; i++) {
          this.entities.add(createTfh(this.gc));
        }
      } else if (value < current) {
        const tfhs = this.entities.byType(CellType.Tfh);
        for (let i = 0; i < current - value; i++) {
          this.entities.remove(tfhs[i].id);
        }
      }
    }
  }
}
