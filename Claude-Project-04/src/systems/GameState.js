/**
 * GameState.js - Centralized state management for Lab Tycoon
 * Single source of truth for all game data
 */

const SAVE_KEY = 'labTycoonSave';

export class GameState {
  constructor() {
    this.data = null;
    this.listeners = [];
  }

  // Initialize with default state
  initNew() {
    this.data = {
      funding: 50000,
      researchPoints: 0,
      scientists: [],
      equipment: [],
      research: {
        biology: { level: 0, progress: 0 },
        chemistry: { level: 0, progress: 0 },
        physics: { level: 0, progress: 0 },
        engineering: { level: 0, progress: 0 }
      },
      unlockedEquipment: ['microscope', 'computer'],
      academia: [],
      stats: {
        totalExperiments: 0,
        successfulExperiments: 0,
        discoveryCount: 0,
        playTime: 0,
        burnouts: 0,
        dreamsDestroyed: 0
      },
      lastSave: Date.now()
    };
    this.notifyListeners();
    return this.data;
  }

  // Load from localStorage
  load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        this.data = JSON.parse(saved);
        // Ensure all fields exist (for backward compatibility)
        this.data.academia = this.data.academia || [];
        this.data.stats = this.data.stats || {
          totalExperiments: 0,
          successfulExperiments: 0,
          discoveryCount: 0,
          playTime: 0,
          burnouts: 0,
          dreamsDestroyed: 0
        };
        this.notifyListeners();
        return true;
      }
    } catch (e) {
      console.error('Failed to load save:', e);
    }
    return false;
  }

  // Save to localStorage
  save() {
    if (!this.data) return false;
    try {
      this.data.lastSave = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  // Check if save exists
  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  // Clear save
  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    this.data = null;
  }

  // Get current state
  get() {
    return this.data;
  }

  // Update state
  update(changes) {
    if (!this.data) return;
    Object.assign(this.data, changes);
    this.notifyListeners();
  }

  // Add listener for state changes
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.data));
  }

  // ==================== GAME ACTIONS ====================

  // Add funding
  addFunding(amount) {
    if (!this.data) return;
    this.data.funding += amount;
    this.notifyListeners();
  }

  // Spend funding (returns true if successful)
  spendFunding(amount) {
    if (!this.data || this.data.funding < amount) return false;
    this.data.funding -= amount;
    this.notifyListeners();
    return true;
  }

  // Add research points
  addResearchPoints(amount) {
    if (!this.data) return;
    this.data.researchPoints += amount;
    this.notifyListeners();
  }

  // Spend research points (returns true if successful)
  spendResearchPoints(amount) {
    if (!this.data || this.data.researchPoints < amount) return false;
    this.data.researchPoints -= amount;
    this.notifyListeners();
    return true;
  }

  // Add scientist
  addScientist(scientist) {
    if (!this.data) return false;
    if (this.data.scientists.length >= 10) return false;
    this.data.scientists.push(scientist);
    this.notifyListeners();
    return true;
  }

  // Remove scientist
  removeScientist(id) {
    if (!this.data) return;
    this.data.scientists = this.data.scientists.filter(s => s.id !== id);
    this.notifyListeners();
  }

  // Add equipment
  addEquipment(equipment) {
    if (!this.data) return false;
    this.data.equipment.push(equipment);
    this.notifyListeners();
    return true;
  }

  // Remove equipment
  removeEquipment(slotIndex) {
    if (!this.data) return;
    this.data.equipment = this.data.equipment.filter(e => e.slotIndex !== slotIndex);
    this.notifyListeners();
  }

  // Get equipment by slot
  getEquipmentBySlot(slotIndex) {
    if (!this.data) return null;
    return this.data.equipment.find(e => e.slotIndex === slotIndex);
  }

  // Unlock equipment type
  unlockEquipment(type) {
    if (!this.data) return;
    if (!this.data.unlockedEquipment.includes(type)) {
      this.data.unlockedEquipment.push(type);
      this.notifyListeners();
    }
  }

  // Check if equipment is unlocked
  isEquipmentUnlocked(type) {
    if (!this.data) return false;
    return this.data.unlockedEquipment.includes(type);
  }

  // Upgrade research branch
  upgradeResearch(branch, level) {
    if (!this.data || !this.data.research[branch]) return;
    this.data.research[branch].level = level;
    this.data.stats.discoveryCount++;
    this.notifyListeners();
  }

  // Add academia worker
  addAcademiaWorker(worker) {
    if (!this.data) return false;
    if (this.data.academia.length >= 20) return false;
    this.data.academia.push(worker);
    this.notifyListeners();
    return true;
  }

  // Remove academia worker
  removeAcademiaWorker(id) {
    if (!this.data) return;
    this.data.academia = this.data.academia.filter(w => w.id !== id);
    this.notifyListeners();
  }

  // Increment stat
  incrementStat(statName, amount = 1) {
    if (!this.data || !this.data.stats) return;
    if (this.data.stats[statName] !== undefined) {
      this.data.stats[statName] += amount;
      this.notifyListeners();
    }
  }

  // Apply crisis effect
  applyCrisisEffect(effect) {
    if (!this.data) return;
    if (effect.funding) {
      this.data.funding = Math.max(0, this.data.funding + effect.funding);
    }
    if (effect.researchPoints) {
      this.data.researchPoints = Math.max(0, this.data.researchPoints + effect.researchPoints);
    }
    this.notifyListeners();
  }
}

// Singleton instance
export const gameState = new GameState();

export default gameState;
