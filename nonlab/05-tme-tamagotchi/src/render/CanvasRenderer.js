import { CANVAS } from '../utils/constants.js';
import { TUMOR_SPRITES, TUMOR_BIG_SPRITES, IMMUNE_SPRITES, SKULL_SPRITE, TROPHY_SPRITE } from './sprites.js';
import { updateParticles, getParticles, CellAnimator } from './animations.js';
import { MUTATIONS } from '../data/mutations.js';
import { loadBestRun } from '../utils/storage.js';

const S = CANVAS.SPRITE_SCALE; // 3x for pixel art
const BG_COLOR = '#0a1a0a';
const TEXT_COLOR = '#8bc34a';
const DIM_TEXT = '#4a6a2a';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = CANVAS.WIDTH;
    this.height = CANVAS.HEIGHT;
    this.frame = 0;
    this.lastTime = 0;
    this.cellAnimator = new CellAnimator();
    this.animFrame = 0;
    this.animTimer = 0;
    this.screenShake = 0;
  }

  startRenderLoop(getState) {
    this.getState = getState;
    this.lastTime = performance.now();
    this.renderLoop();
  }

  renderLoop() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.animTimer += dt;
    if (this.animTimer > 0.5) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    const state = this.getState();
    if (state) {
      this.render(state, dt);
    }

    this.frame++;
    requestAnimationFrame(() => this.renderLoop());
  }

  render(state, dt) {
    const ctx = this.ctx;

    ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 2;
      ctx.translate(shakeX, shakeY);
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    switch (state.screen) {
      case 'playing':        this.renderGame(state, dt); break;
      case 'title':           this.renderTitle(state); break;
      case 'dead':            this.renderDeath(state); break;
      case 'win':             this.renderWin(state); break;
      case 'graveyard':       this.renderGraveyard(state); break;
      case 'about':           this.renderAbout(); break;
      case 'cytokineMenu':    this.renderCytokineMenu(state); break;
      case 'mutationInfo':    this.renderMutationInfo(state); break;
      case 'dropMutation':    this.renderDropMutation(state); break;
    }

    ctx.restore();
  }

  // ─── GAME SCREEN ───

  renderGame(state, dt) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    updateParticles(dt);
    this.cellAnimator.ensurePositions(state.immune.cells, state.tumor.allies, cx, cy);
    this.cellAnimator.update(dt, cx, cy);

    // Subtle background grid
    ctx.fillStyle = '#0d1f0d';
    for (let x = 0; x < this.width; x += 48) {
      for (let y = 0; y < this.height; y += 48) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // ── Dynamic tumor rendering ──
    // Scale factor: starts at 1.0, grows continuously to ~6x at 10k cells
    const cells = state.tumor.cellCount;
    const growthFrac = Math.min(1, cells / 10000); // 0..1
    const tumorScale = 1.0 + growthFrac * 5.0;     // 1x..6x

    // Choose sprite based on growth
    const isBig = cells > 2000;
    const sprites = isBig ? TUMOR_BIG_SPRITES : TUMOR_SPRITES;
    const sprite = sprites[this.animFrame];
    const baseW = sprite[0].length;
    const baseH = sprite.length;

    // Render tumor sprite at dynamic scale (replaces fixed S=3)
    const dynS = S * tumorScale;
    const spriteW = baseW * dynS;
    const spriteH = baseH * dynS;
    const tumorX = Math.floor(cx - spriteW / 2);
    const tumorY = Math.floor(cy - spriteH / 2);

    // Organic mass aura — grows with tumor, pulsates
    const pulse = Math.sin(this.frame * 0.04) * 0.15 + 0.85;
    const auraRadius = (spriteW / 2 + 8) * pulse;

    // Draw layered aura blobs for organic feel
    if (cells > 200) {
      const auraLayers = Math.min(5, 1 + Math.floor(growthFrac * 5));
      for (let i = auraLayers; i >= 0; i--) {
        const r = auraRadius * (1 + i * 0.25);
        const alpha = 0.04 + (auraLayers - i) * 0.02;
        ctx.fillStyle = `rgba(136, 68, 170, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pseudopods / tendrils — extend outward as tumor grows
    if (cells > 500) {
      const numTendrils = Math.min(8, 2 + Math.floor(growthFrac * 8));
      const tendrilLen = auraRadius * (0.3 + growthFrac * 0.7);
      ctx.lineWidth = 2 + growthFrac * 4;
      ctx.lineCap = 'round';

      for (let i = 0; i < numTendrils; i++) {
        const baseAngle = (i / numTendrils) * Math.PI * 2;
        const wobble = Math.sin(this.frame * 0.03 + i * 1.7) * 0.3;
        const angle = baseAngle + wobble;
        const len = tendrilLen * (0.7 + Math.sin(this.frame * 0.05 + i * 2.1) * 0.3);

        const x1 = cx + Math.cos(angle) * (spriteW * 0.3);
        const y1 = cy + Math.sin(angle) * (spriteH * 0.3);
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;

        // Curved tendril
        const cpx = cx + Math.cos(angle + 0.4) * len * 0.7;
        const cpy = cy + Math.sin(angle + 0.4) * len * 0.7;

        ctx.strokeStyle = `rgba(170, 102, 204, ${0.2 + growthFrac * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();

        // Tendril tip blob
        if (growthFrac > 0.3) {
          ctx.fillStyle = `rgba(136, 68, 170, ${0.15 + growthFrac * 0.2})`;
          ctx.beginPath();
          ctx.arc(x2, y2, 2 + growthFrac * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw the sprite itself, scaled
    for (let row = 0; row < baseH; row++) {
      for (let col = 0; col < baseW; col++) {
        const color = sprite[row][col];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(tumorX + col * dynS),
            Math.floor(tumorY + row * dynS),
            Math.ceil(dynS),
            Math.ceil(dynS)
          );
        }
      }
    }

    // Pulsating outline ring
    ctx.strokeStyle = `rgba(204, 136, 238, ${0.15 + Math.sin(this.frame * 0.05) * 0.1})`;
    ctx.lineWidth = 1 + growthFrac * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, spriteW / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Tumor name label (positioned below the scaled sprite)
    ctx.fillStyle = '#cc88ee';
    this.drawText(state.tumor.name, cx, cy + spriteH / 2 + 6, 'center', 10 + Math.floor(growthFrac * 4));

    // Immune cells + labels (drawn AFTER tumor so they appear on top)
    const CELL_LABELS = {
      cd8: { short: 'CD8', color: '#ff4444' },
      nk:  { short: 'NK',  color: '#ff8800' },
      m1:  { short: 'M1',  color: '#ffcc00' },
      dc:  { short: 'DC',  color: '#44aaff' },
      m2:  { short: 'M2',  color: '#44bb44' },
      treg:{ short: 'Treg', color: '#66dd66' },
      mdsc:{ short: 'MDSC', color: '#88ee88' },
    };

    const cellPositions = this.cellAnimator.getPositions(cx, cy);
    for (const cell of cellPositions) {
      const cellSprite = IMMUNE_SPRITES[cell.type];
      if (cellSprite) {
        const sx = Math.floor(cell.x) - 6;
        const sy = Math.floor(cell.y) - 6;
        this.drawSprite(cellSprite.pixels, sx, sy);
        const info = CELL_LABELS[cell.type];
        if (info) {
          ctx.fillStyle = info.color;
          this.drawText(info.short, cell.x, sy + 14, 'center', 8);
        }
      }
    }

    // Particles
    for (const p of getParticles()) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size * S, p.size * S);
    }
    ctx.globalAlpha = 1;

    // ── Mutation panel (top-left) ──
    if (state.tumor.mutations.length > 0) {
      const panelX = 6;
      let panelY = 6;
      // Semi-transparent backdrop
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const panelH = 14 + state.tumor.mutations.length * 14;
      ctx.fillRect(panelX - 2, panelY - 2, 150, panelH);

      ctx.fillStyle = '#ffcc00';
      this.drawText('MUTATIONS [I]nfo [D]rop', panelX, panelY, 'left', 8);
      panelY += 14;

      for (const mutId of state.tumor.mutations) {
        const mut = MUTATIONS.find(m => m.id === mutId);
        if (mut) {
          ctx.fillStyle = mut.tier >= 4 ? '#ff44ff' : mut.tier >= 3 ? '#ffaa00' : '#cccc88';
          this.drawText(mut.name, panelX + 2, panelY, 'left', 9);
          panelY += 14;
        }
      }
    }

    // ── Therapy warning (top-center) ──
    if (state.therapy.warningTherapy) {
      const flash = Math.sin(this.frame * 0.15) > 0;
      if (flash) {
        ctx.fillStyle = '#ff4444';
        this.drawText('! THERAPY INCOMING !', cx, 10, 'center', 14);
        this.drawText(`${state.therapy.warningTherapy.ticksUntil} ticks`, cx, 28, 'center', 12);
      }
    }

    // Active therapy indicator
    if (state.therapy.activeTherapies.length > 0) {
      ctx.fillStyle = '#ff6666';
      const name = state.therapy.activeTherapies[0].id.toUpperCase();
      this.drawText(`[ ${name} ]`, cx, 10, 'center', 13);
    }

    // ── HUD bottom ──
    ctx.fillStyle = TEXT_COLOR;
    this.drawText(`Cells: ${state.tumor.cellCount.toLocaleString()}`, 8, this.height - 34, 'left', 12);

    // Keyboard hints
    ctx.fillStyle = '#333';
    this.drawText('[P]ause  [I]nfo  [D]rop', 8, this.height - 14, 'left', 8);

    // Ally summary (bottom-right)
    const allyTotal = state.tumor.allies.m2 + state.tumor.allies.treg + state.tumor.allies.mdsc;
    if (allyTotal > 0) {
      ctx.fillStyle = '#66dd66';
      const parts = [];
      if (state.tumor.allies.m2 > 0)   parts.push(`M2:${state.tumor.allies.m2}`);
      if (state.tumor.allies.treg > 0) parts.push(`Treg:${state.tumor.allies.treg}`);
      if (state.tumor.allies.mdsc > 0) parts.push(`MDSC:${state.tumor.allies.mdsc}`);
      this.drawText(parts.join(' '), this.width - 8, this.height - 34, 'right', 10);
    }

    // ── Pause overlay ──
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffcc00';
      this.drawText('PAUSED', cx, cy - 30, 'center', 28);
      ctx.fillStyle = TEXT_COLOR;
      this.drawText('[P] Resume', cx, cy + 10, 'center', 14);
      this.drawText('[I] Mutation Info', cx, cy + 34, 'center', 12);
      this.drawText('[D] Drop Mutation', cx, cy + 54, 'center', 12);
    }
  }

  // ─── TITLE SCREEN ───

  renderTitle(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;

    // Title
    ctx.fillStyle = '#aa66cc';
    this.drawText('TME', cx, 50, 'center', 36);
    this.drawText('TAMAGOTCHI', cx, 90, 'center', 24);

    // Animated tumor
    const sprite = TUMOR_SPRITES[this.animFrame];
    const sw = sprite[0].length * S;
    this.drawSprite(sprite, Math.floor(cx - sw / 2), 130);

    // Subtitle
    ctx.fillStyle = '#6a8a3a';
    this.drawText('Play as a tumor cell.', cx, 175, 'center', 12);
    this.drawText('Survive the immune system.', cx, 192, 'center', 12);

    // Menu
    const menuY = 230;
    const items = ['NEW GAME', 'GRAVEYARD', 'ABOUT'];
    const selected = state._menuIndex || 0;
    for (let i = 0; i < items.length; i++) {
      ctx.fillStyle = i === selected ? TEXT_COLOR : DIM_TEXT;
      const prefix = i === selected ? '> ' : '  ';
      this.drawText(prefix + items[i], cx, menuY + i * 32, 'center', 16);
    }

    // Controls hint
    ctx.fillStyle = '#444';
    this.drawText('\u2191\u2193 Navigate    Enter: Select', cx, this.height - 16, 'center', 11);
  }

  // ─── DEATH SCREEN ───

  renderDeath(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;

    // Skull
    const sw = SKULL_SPRITE[0].length * S;
    this.drawSprite(SKULL_SPRITE, Math.floor(cx - sw / 2), 20);

    ctx.fillStyle = '#ff4444';
    this.drawText('YOU DIED', cx, 60, 'center', 28);

    ctx.fillStyle = '#cc6666';
    this.drawText(state.tumor.name, cx, 110, 'center', 16);

    const causes = {
      immuneClearance: 'Immune Clearance',
      apoptosis: 'Apoptosis',
      therapy: 'Therapy',
    };
    ctx.fillStyle = '#884444';
    this.drawText(`Cause: ${causes[state.gameOverCause] || 'Unknown'}`, cx, 145, 'center', 14);
    this.drawText(`Survived: ${state.tick} ticks`, cx, 170, 'center', 14);
    this.drawText(`Final cells: ${Math.max(0, state.tumor.cellCount)}`, cx, 195, 'center', 14);
    this.drawText(`Mutations: ${state.tumor.mutations.length}`, cx, 220, 'center', 14);

    // Show cause-specific tips
    ctx.fillStyle = '#886644';
    if (state.gameOverCause === 'apoptosis') {
      this.drawText('Tip: Use REST for +3 apoptosis', cx, 255, 'center', 10);
      this.drawText('or get BCL2 mutation early!', cx, 270, 'center', 10);
    } else if (state.gameOverCause === 'immuneClearance') {
      this.drawText('Tip: Feed IL-10/TGF-β to suppress', cx, 255, 'center', 10);
      this.drawText('immune system. Recruit allies!', cx, 270, 'center', 10);
    }

    if (state.tumor.mutations.length > 0) {
      ctx.fillStyle = '#664444';
      this.drawText(state.tumor.mutations.join(', '), cx, 295, 'center', 10);
    }

    ctx.fillStyle = DIM_TEXT;
    if (Math.sin(this.frame * 0.08) > 0) {
      this.drawText('Press any button to continue...', cx, this.height - 30, 'center', 12);
    }
  }

  // ─── WIN SCREEN ───

  renderWin(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;

    const sw = TROPHY_SPRITE[0].length * S;
    this.drawSprite(TROPHY_SPRITE, Math.floor(cx - sw / 2), 20);

    ctx.fillStyle = '#ffd700';
    this.drawText('YOU WIN!', cx, 60, 'center', 28);

    ctx.fillStyle = '#ccaa00';
    this.drawText(state.tumor.name, cx, 110, 'center', 16);

    const winTypes = {
      metastasis: 'Metastatic Escape!',
      exhaustion: 'Immune Exhaustion!',
      therapyResistance: 'Treatment Resistant!',
    };
    this.drawText(winTypes[state.winType] || 'Victory!', cx, 140, 'center', 14);

    // Stats breakdown
    ctx.fillStyle = '#aa8800';
    this.drawText(`Ticks: ${state.tick}`, cx, 175, 'center', 13);
    this.drawText(`Cells: ${state.tumor.cellCount.toLocaleString()}`, cx, 195, 'center', 13);
    this.drawText(`Mutations: ${state.tumor.mutations.length}`, cx, 215, 'center', 13);

    // Mutation list
    if (state.tumor.mutations.length > 0) {
      ctx.fillStyle = '#887700';
      const mutNames = state.tumor.mutations.map(id => {
        const m = MUTATIONS.find(mut => mut.id === id);
        return m ? m.name : id;
      });
      this.drawText(mutNames.join(', '), cx, 240, 'center', 9);
    }

    // Allies summary
    const allies = state.tumor.allies;
    if (allies.m2 + allies.treg + allies.mdsc > 0) {
      ctx.fillStyle = '#668800';
      const parts = [];
      if (allies.m2 > 0) parts.push(`M2:${allies.m2}`);
      if (allies.treg > 0) parts.push(`Treg:${allies.treg}`);
      if (allies.mdsc > 0) parts.push(`MDSC:${allies.mdsc}`);
      this.drawText(`Allies: ${parts.join(' ')}`, cx, 260, 'center', 10);
    }

    // Best run
    const best = loadBestRun();
    if (best) {
      ctx.fillStyle = '#556600';
      this.drawText(`Best: ${best.name} — ${best.ticksSurvived} ticks`, cx, 290, 'center', 10);
    }

    // Exhaustion stat if relevant
    if (state.winType === 'exhaustion') {
      ctx.fillStyle = '#668800';
      this.drawText(`Immune exhaustion: ${Math.floor(state.immune.exhaustion)}/100`, cx, 310, 'center', 10);
    }

    ctx.fillStyle = DIM_TEXT;
    if (Math.sin(this.frame * 0.08) > 0) {
      this.drawText('Press any button to continue...', cx, this.height - 30, 'center', 12);
    }
  }

  // ─── GRAVEYARD ───

  renderGraveyard(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const entries = state._graveyardEntries || [];
    const page = state._graveyardPage || 0;

    ctx.fillStyle = '#888888';
    this.drawText('GRAVEYARD', cx, 18, 'center', 20);

    if (entries.length === 0) {
      ctx.fillStyle = DIM_TEXT;
      this.drawText('No fallen tumors yet.', cx, 160, 'center', 14);
      this.drawText('Go die heroically!', cx, 185, 'center', 14);
    } else {
      const perPage = 3;
      const start = page * perPage;
      const pageEntries = entries.slice(start, start + perPage);

      const causes = {
        immuneClearance: 'Immune Clearance',
        apoptosis: 'Apoptosis',
        therapy: 'Therapy',
      };

      for (let i = 0; i < pageEntries.length; i++) {
        const entry = pageEntries[i];
        const y = 55 + i * 115;

        // Mini tombstone rect
        ctx.fillStyle = '#888';
        ctx.fillRect(16, y, 36, 48);
        ctx.fillStyle = '#666';
        ctx.fillRect(20, y - 6, 28, 8);
        ctx.fillStyle = '#555';
        ctx.fillRect(26, y + 12, 16, 4);

        ctx.fillStyle = TEXT_COLOR;
        this.drawText(entry.name, 66, y + 2, 'left', 14);

        // Cause of death
        ctx.fillStyle = '#ff6644';
        const cause = causes[entry.causeOfDeath] || 'Unknown';
        this.drawText(`Death: ${cause}`, 66, y + 20, 'left', 10);

        ctx.fillStyle = '#aa6666';
        this.drawText(`${entry.ticksSurvived} ticks | ${entry.mutations?.length || 0} mutations | ${(entry.cellsAtDeath || entry.cellsAtEnd || 0).toLocaleString()} cells`, 66, y + 36, 'left', 9);
        ctx.fillStyle = DIM_TEXT;
        const epitaph = entry.epitaph || '';
        this.drawText(epitaph, 66, y + 52, 'left', 9);
      }

      const totalPages = Math.ceil(entries.length / perPage);
      ctx.fillStyle = DIM_TEXT;
      this.drawText(`Page ${page + 1} / ${totalPages}`, cx, this.height - 40, 'center', 12);
    }

    ctx.fillStyle = '#444';
    this.drawText('\u2190\u2192 Page    Esc: Back', cx, this.height - 16, 'center', 11);
  }

  // ─── ABOUT ───

  renderAbout() {
    const ctx = this.ctx;
    const cx = this.width / 2;

    ctx.fillStyle = '#aa66cc';
    this.drawText('ABOUT', cx, 18, 'center', 20);

    const lines = [
      { text: 'TME Tamagotchi', color: '#aa66cc', size: 14 },
      { text: '', color: '', size: 8 },
      { text: 'You are a DLBCL tumor cell in a', color: TEXT_COLOR, size: 12 },
      { text: 'lymph node. Grow, mutate, and', color: TEXT_COLOR, size: 12 },
      { text: 'suppress the immune system.', color: TEXT_COLOR, size: 12 },
      { text: '', color: '', size: 10 },
      { text: 'CONTROLS:', color: '#ffcc00', size: 12 },
      { text: 'Feed: secrete cytokines (20 ATP)', color: DIM_TEXT, size: 10 },
      { text: 'Mutate: acquire mutations (30 ATP)', color: DIM_TEXT, size: 10 },
      { text: 'Recruit: summon allies (10 CYT)', color: DIM_TEXT, size: 10 },
      { text: 'Rest: free +30 ATP +3 apoptosis', color: DIM_TEXT, size: 10 },
      { text: '', color: '', size: 6 },
      { text: '[P] Pause  [I] Mutation Info', color: '#555', size: 10 },
      { text: '[D] Drop Mutation', color: '#555', size: 10 },
      { text: '', color: '', size: 6 },
      { text: 'GOAL: Reach 10k cells, exhaust', color: '#6a8a3a', size: 10 },
      { text: 'T cells, or survive all therapies!', color: '#6a8a3a', size: 10 },
    ];

    let y = 50;
    for (const line of lines) {
      if (line.text) {
        ctx.fillStyle = line.color;
        this.drawText(line.text, cx, y, 'center', line.size);
      }
      y += line.size + 6;
    }

    ctx.fillStyle = '#444';
    this.drawText('Press any button to return', cx, this.height - 16, 'center', 11);
  }

  // ─── CYTOKINE MENU ───

  renderCytokineMenu(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const selected = state._cytokineIndex || 0;

    ctx.fillStyle = TEXT_COLOR;
    this.drawText('SECRETE CYTOKINE:', cx, 20, 'center', 16);

    const cytokines = [
      { id: 'il6',  name: 'IL-6',  desc: 'Promotes tumor growth (+8% cells)', color: '#ff6688' },
      { id: 'il10', name: 'IL-10', desc: 'Immunosuppressive (+15 suppress)', color: '#66ff88' },
      { id: 'tgfb', name: 'TGF-\u03B2', desc: 'Suppress + M1\u2192M2 (30% chance)', color: '#88bbff' },
      { id: 'vegf', name: 'VEGF',  desc: 'Promotes angiogenesis (+20)', color: '#ff4444' },
    ];

    for (let i = 0; i < cytokines.length; i++) {
      const c = cytokines[i];
      const y = 70 + i * 72;
      const isSel = i === selected;

      // Selection highlight
      if (isSel) {
        ctx.fillStyle = 'rgba(139,195,74,0.08)';
        ctx.fillRect(20, y - 8, this.width - 40, 60);
      }

      ctx.fillStyle = isSel ? c.color : '#555';
      const prefix = isSel ? '> ' : '  ';
      this.drawText(prefix + c.name, 40, y, 'left', 18);

      ctx.fillStyle = isSel ? TEXT_COLOR : DIM_TEXT;
      this.drawText(c.desc, 40, y + 26, 'left', 11);
    }

    // Synergy hint
    ctx.fillStyle = '#444';
    this.drawText('Tip: IL-10 + TGF-\u03B2 = synergy bonus!', cx, this.height - 36, 'center', 9);
    this.drawText('\u2191\u2193 Select    Enter: Confirm    Esc: Cancel', cx, this.height - 16, 'center', 11);
  }

  // ─── MUTATION INFO ───

  renderMutationInfo(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const mutations = state.tumor.mutations;

    if (mutations.length === 0) return;

    const idx = state._mutationInfoIndex || 0;
    const mutId = mutations[idx];
    const mut = MUTATIONS.find(m => m.id === mutId);
    if (!mut) return;

    ctx.fillStyle = '#ffcc00';
    this.drawText('MUTATION INFO', cx, 18, 'center', 18);

    ctx.fillStyle = DIM_TEXT;
    this.drawText(`${idx + 1} / ${mutations.length}`, cx, 42, 'center', 11);

    // Mutation name
    const nameColor = mut.tier >= 4 ? '#ff44ff' : mut.tier >= 3 ? '#ffaa00' : mut.tier >= 2 ? '#66aaff' : '#cccc88';
    ctx.fillStyle = nameColor;
    this.drawText(mut.name, cx, 70, 'center', 18);

    // Tier
    ctx.fillStyle = '#888';
    this.drawText(`Tier ${mut.tier}`, cx, 96, 'center', 12);

    // Biology
    ctx.fillStyle = TEXT_COLOR;
    this.wrapText(mut.biology, cx, 130, this.width - 60, 12);

    // Flavor text
    ctx.fillStyle = '#8a7a4a';
    this.wrapText(`"${mut.flavorText}"`, cx, 200, this.width - 60, 11);

    // Effect summary
    ctx.fillStyle = '#aa8800';
    const effects = [];
    if (mut.effect.tCellKillReduction) effects.push(`CD8 kills -${mut.effect.tCellKillReduction * 100}%`);
    if (mut.effect.apoptosisResistanceBonus) effects.push(`Apoptosis +${mut.effect.apoptosisResistanceBonus}`);
    if (mut.effect.growthRateMultiplier) effects.push(`Growth x${mut.effect.growthRateMultiplier}`);
    if (mut.effect.macrophageImmunity) effects.push('Blocks macrophage kills');
    if (mut.effect.extraMutationSlots) effects.push(`+${mut.effect.extraMutationSlots} mutation slots`);
    if (mut.effect.energyRegenMultiplier) effects.push(`ATP regen x${mut.effect.energyRegenMultiplier}`);
    if (mut.effect.angiogenesisDecayMultiplier) effects.push(`Angio decay x${mut.effect.angiogenesisDecayMultiplier}`);
    if (mut.effect.cd8Effectiveness) effects.push(`CD8 effectiveness x${mut.effect.cd8Effectiveness}`);
    if (mut.effect.immunosuppressionDecayMultiplier) effects.push(`Suppress decay x${mut.effect.immunosuppressionDecayMultiplier}`);

    if (effects.length > 0) {
      this.drawText('Effects:', cx, 270, 'center', 12);
      for (let i = 0; i < effects.length; i++) {
        this.drawText(effects[i], cx, 290 + i * 18, 'center', 11);
      }
    }

    ctx.fillStyle = '#444';
    this.drawText('\u2190\u2192 Browse    Esc: Back', cx, this.height - 16, 'center', 11);
  }

  // ─── DROP MUTATION ───

  renderDropMutation(state) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const mutations = state.tumor.mutations;

    if (mutations.length === 0) return;

    ctx.fillStyle = '#ff4444';
    this.drawText('DROP MUTATION', cx, 18, 'center', 18);

    ctx.fillStyle = '#884444';
    this.drawText('Cost: 20 ATP + 15% cell loss', cx, 42, 'center', 11);

    const idx = state._dropMutationIndex || 0;

    for (let i = 0; i < mutations.length; i++) {
      const mutId = mutations[i];
      const mut = MUTATIONS.find(m => m.id === mutId);
      if (!mut) continue;

      const y = 75 + i * 50;
      const isSel = i === idx;

      if (isSel) {
        ctx.fillStyle = 'rgba(255,68,68,0.1)';
        ctx.fillRect(20, y - 6, this.width - 40, 42);
      }

      const nameColor = mut.tier >= 4 ? '#ff44ff' : mut.tier >= 3 ? '#ffaa00' : '#cccc88';
      ctx.fillStyle = isSel ? '#ff6644' : nameColor;
      const prefix = isSel ? '> ' : '  ';
      this.drawText(prefix + mut.name, 40, y, 'left', 14);

      ctx.fillStyle = isSel ? '#aa6644' : DIM_TEXT;
      this.drawText(mut.biology.slice(0, 45), 40, y + 20, 'left', 9);
    }

    ctx.fillStyle = '#444';
    this.drawText('\u2191\u2193 Select    Enter: Drop!    Esc: Cancel', cx, this.height - 16, 'center', 11);
  }

  // ─── HELPERS ───

  shake(intensity = 3) {
    this.screenShake = intensity;
  }

  // Draw a pixel-art sprite scaled by S
  drawSprite(pixels, x, y) {
    const ctx = this.ctx;
    for (let row = 0; row < pixels.length; row++) {
      for (let col = 0; col < pixels[row].length; col++) {
        const color = pixels[row][col];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x + col * S, y + row * S, S, S);
        }
      }
    }
  }

  // Draw text at readable sizes on the hi-res canvas
  drawText(text, x, y, align = 'left', size = 13) {
    const ctx = this.ctx;
    ctx.font = `${size}px 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
    ctx.fillText(text, x, y);
  }

  // Word-wrap text centered
  wrapText(text, cx, y, maxWidth, size) {
    const ctx = this.ctx;
    ctx.font = `${size}px 'Courier New', monospace`;
    const words = text.split(' ');
    let line = '';
    let lineY = y;

    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(line, cx, lineY);
        line = word;
        lineY += size + 4;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(line, cx, lineY);
    }
  }
}
