// GameState - Central state management for The American Cancer Experience

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Player character info
    this.player = {
      name: 'Patient',
      age: 45,
      occupation: 'employed',
      cancerType: 'lung',
      stage: 2,
      diagnosisMethod: 'screening' // 'screening' or 'emergency'
    };

    // Core resources (0-100 scale except money)
    this.resources = {
      health: 70,        // Physical condition
      money: 25000,      // Savings in dollars
      coverage: 80,      // Insurance effectiveness
      hope: 75,          // Mental health / will to fight
      time: 365          // Days remaining to live without treatment
    };

    // Game progression
    this.day = 1;
    this.week = 1;
    this.phase = 'diagnosis'; // diagnosis, insurance, treatment, financial, ending

    // Insurance state
    this.insurance = {
      provider: 'UnitedHealth',
      plan: 'Silver',
      deductible: 8000,
      deductibleMet: 0,
      maxOutOfPocket: 16000,
      outOfPocketSpent: 0,
      priorAuthsPending: [],
      priorAuthsDenied: [],
      priorAuthsApproved: [],
      networkStatus: 'in-network',
      policyCancelled: false
    };

    // Treatment state
    this.treatment = {
      oncologist: null,
      oncologistInNetwork: true,
      treatmentPlan: null,
      chemoCycles: 0,
      chemoCompleted: 0,
      surgeryScheduled: false,
      surgeryCompleted: false,
      radiationSessions: 0,
      radiationCompleted: 0,
      appointments: [],
      missedAppointments: 0
    };

    // Financial state
    this.finances = {
      bills: [],
      totalOwed: 0,
      inCollections: false,
      collectionCalls: 0,
      bankruptcyFiled: false,
      gofundmeStarted: false,
      gofundmeRaised: 0,
      jobLost: false,
      wagesLost: 0
    };

    // Event tracking
    this.events = {
      newsHeadlinesSeen: [],
      insuranceEventsSeen: [],
      hospitalEventsSeen: [],
      decisonsMade: []
    };

    // Political climate (affects coverage and costs)
    this.political = {
      acaStatus: 'intact',
      fdaStatus: 'normal',
      drugPriceCaps: false,
      trumpExecutiveOrders: 0,
      rfkPolicies: 0
    };

    // Ending tracking
    this.ending = null;
    this.endingReasons = [];
  }

  // Resource modification with bounds checking
  modifyHealth(amount, reason) {
    this.resources.health = Math.max(0, Math.min(100, this.resources.health + amount));
    this.logDecision('health', amount, reason);
    if (this.resources.health <= 0) {
      this.triggerEnding('death');
    }
    return this.resources.health;
  }

  modifyMoney(amount, reason) {
    this.resources.money += amount;
    this.logDecision('money', amount, reason);
    if (this.resources.money < -50000 && !this.finances.bankruptcyFiled) {
      // Prompt bankruptcy consideration
    }
    return this.resources.money;
  }

  modifyCoverage(amount, reason) {
    this.resources.coverage = Math.max(0, Math.min(100, this.resources.coverage + amount));
    this.logDecision('coverage', amount, reason);
    if (this.resources.coverage <= 0) {
      this.insurance.policyCancelled = true;
    }
    return this.resources.coverage;
  }

  modifyHope(amount, reason) {
    this.resources.hope = Math.max(0, Math.min(100, this.resources.hope + amount));
    this.logDecision('hope', amount, reason);
    if (this.resources.hope <= 0) {
      this.triggerEnding('gave_up');
    }
    return this.resources.hope;
  }

  modifyTime(amount, reason) {
    this.resources.time = Math.max(0, this.resources.time + amount);
    this.logDecision('time', amount, reason);
    if (this.resources.time <= 0) {
      this.triggerEnding('time_ran_out');
    }
    return this.resources.time;
  }

  // Advance game time
  advanceDay(days = 1) {
    this.day += days;
    this.week = Math.ceil(this.day / 7);

    // Time ticks down (cancer progresses)
    this.modifyTime(-days, 'Time passes');

    // Health degrades if not in treatment
    if (!this.treatment.treatmentPlan) {
      this.modifyHealth(-0.5 * days, 'Untreated cancer progression');
    }

    // Hope degrades from ongoing stress
    if (this.finances.inCollections) {
      this.modifyHope(-0.2 * days, 'Collection agency stress');
    }

    return this.day;
  }

  // Add a bill
  addBill(description, amount, dueInDays = 30) {
    const bill = {
      id: Date.now(),
      description,
      amount,
      dueDate: this.day + dueInDays,
      paid: false,
      inCollections: false
    };
    this.finances.bills.push(bill);
    this.finances.totalOwed += amount;
    return bill;
  }

  // Pay a bill
  payBill(billId, amount) {
    const bill = this.finances.bills.find(b => b.id === billId);
    if (bill && this.resources.money >= amount) {
      this.modifyMoney(-amount, `Paid: ${bill.description}`);
      bill.amount -= amount;
      this.finances.totalOwed -= amount;
      if (bill.amount <= 0) {
        bill.paid = true;
      }
      return true;
    }
    return false;
  }

  // Log decisions for ending calculation
  logDecision(type, value, reason) {
    this.events.decisonsMade.push({
      day: this.day,
      type,
      value,
      reason
    });
  }

  // Trigger an ending
  triggerEnding(type) {
    this.ending = type;
    this.phase = 'ending';
  }

  // Calculate ending based on current state
  calculateEnding() {
    if (this.resources.health <= 0) {
      return 'death_by_denial';
    }
    if (this.resources.hope <= 0) {
      return 'system_wins';
    }
    if (this.resources.time <= 0 && this.resources.health > 0) {
      return 'death_by_delay';
    }
    if (this.treatment.chemoCompleted >= this.treatment.chemoCycles &&
        this.treatment.surgeryCompleted &&
        this.resources.health > 50) {
      if (this.finances.bankruptcyFiled) {
        return 'remission_bankruptcy';
      }
      if (this.resources.money > 10000) {
        return 'against_all_odds';
      }
      return 'remission_broke';
    }
    return 'ongoing';
  }

  // Save game state
  save() {
    const saveData = {
      player: this.player,
      resources: this.resources,
      day: this.day,
      week: this.week,
      phase: this.phase,
      insurance: this.insurance,
      treatment: this.treatment,
      finances: this.finances,
      events: this.events,
      political: this.political
    };
    localStorage.setItem('americanCancerExperience', JSON.stringify(saveData));
    return true;
  }

  // Load game state
  load() {
    const saveData = localStorage.getItem('americanCancerExperience');
    if (saveData) {
      const data = JSON.parse(saveData);
      Object.assign(this, data);
      return true;
    }
    return false;
  }

  // Check if save exists
  hasSave() {
    return localStorage.getItem('americanCancerExperience') !== null;
  }

  // Delete save
  deleteSave() {
    localStorage.removeItem('americanCancerExperience');
  }
}

// Singleton instance
const gameState = new GameState();
export default gameState;
