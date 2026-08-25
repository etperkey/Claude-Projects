import { STAGES } from './StageDefinitions.js';
import { TRACKS, TRACK_ORDER } from '../tracks/TrackConfig.js';

/**
 * Controls stage progression with two-track support.
 */
export class StageController {
  constructor() {
    this.currentIndex = 0;
    this.stageTick = 0;
    this.mode = 'autoplay'; // 'autoplay' | 'step' | 'interactive'
    this.paused = false;
    this.stageSetupDone = false;
    this.listeners = [];

    // Track system
    this.sandbox = false;         // free-play simulation mode
    this.activeTrack = null;      // null | 'mutations' | 'chemokines'
    this.playMode = 'single';     // 'single' | 'sequential'
    this.sequentialPhase = 0;     // 0 = first track, 1 = second track
    this.showInterstitial = false;
    this.interstitialTicks = 0;
  }

  get current() {
    const base = STAGES[this.currentIndex] || STAGES[0];
    // Merge track-specific narration if a track is active
    if (this.activeTrack && TRACKS[this.activeTrack]) {
      const trackNarration = TRACKS[this.activeTrack].narration[base.id];
      if (trackNarration) {
        return {
          ...base,
          narration: trackNarration.text,
          duration: trackNarration.duration || base.duration,
        };
      }
    }
    return base;
  }

  get stageNumber() {
    return this.currentIndex + 1;
  }

  get totalStages() {
    return STAGES.length;
  }

  get progress() {
    if (this.mode !== 'autoplay') return this.stageTick;
    return this.stageTick / this.current.duration;
  }

  get trackConfig() {
    return this.activeTrack ? TRACKS[this.activeTrack] : null;
  }

  onStageChange(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  emit() {
    for (const fn of this.listeners) fn(this.current, this.currentIndex);
  }

  setMode(mode) {
    this.mode = mode;
  }

  setTrack(trackId, playMode) {
    this.activeTrack = trackId;
    this.playMode = playMode || 'single';
    this.sequentialPhase = 0;
    this.showInterstitial = false;
    this.interstitialTicks = 0;
  }

  goToStage(index, sim) {
    if (index < 0 || index >= STAGES.length) return;
    this.currentIndex = index;
    this.stageTick = 0;
    this.stageSetupDone = false;
    this.emit();
  }

  next(sim) {
    if (this.currentIndex < STAGES.length - 1) {
      this.goToStage(this.currentIndex + 1, sim);
    } else {
      // End of 9 stages
      if (this.playMode === 'sequential' && this.sequentialPhase === 0) {
        // Finished Track 1 → show interstitial, then switch to Track 2
        this.showInterstitial = true;
        this.interstitialTicks = 0;
      } else {
        // Loop back to beginning
        this.goToStage(0, sim);
      }
    }
  }

  prev(sim) {
    if (this.currentIndex > 0) {
      this.goToStage(this.currentIndex - 1, sim);
    }
  }

  update(sim) {
    if (this.paused || this.sandbox) return;

    // Handle interstitial transition
    if (this.showInterstitial) {
      this.interstitialTicks++;
      if (this.interstitialTicks >= 180) { // 3 seconds at 60fps
        this.showInterstitial = false;
        this.sequentialPhase = 1;
        this.activeTrack = TRACK_ORDER[1]; // Switch to chemokines
        sim.reset();
        sim.trackVisuals = TRACKS[this.activeTrack].visuals;
        sim.showChemokines = TRACKS[this.activeTrack].visuals.showChemokines;
        sim.start();
        this.goToStage(0, sim);
      }
      return;
    }

    // Setup stage on first tick
    if (!this.stageSetupDone) {
      this.current.setup(sim);
      this.stageSetupDone = true;
    }

    this.stageTick++;

    // Autoplay: auto-advance when duration reached
    if (this.mode === 'autoplay' && this.stageTick >= this.current.duration) {
      this.next(sim);
    }
  }

  reset(sim) {
    if (!this.sandbox) {
      this.goToStage(0, sim);
    }
  }

  resetToTrackSelect() {
    this.activeTrack = null;
    this.sandbox = false;
    this.playMode = 'single';
    this.sequentialPhase = 0;
    this.showInterstitial = false;
    this.interstitialTicks = 0;
    this.currentIndex = 0;
    this.stageTick = 0;
    this.stageSetupDone = false;
    this.paused = false;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }
}
