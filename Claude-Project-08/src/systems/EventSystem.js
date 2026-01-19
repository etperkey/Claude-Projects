// EventSystem - Manages random and timed game events

import gameState from './GameState.js';
import ContentData from './ContentData.js';

class EventSystem {
  constructor() {
    this.pendingEvents = [];
    this.scheduledEvents = [];
    this.eventCooldowns = {};
  }

  // Schedule an event for a specific day
  scheduleEvent(event, day) {
    this.scheduledEvents.push({
      ...event,
      triggerDay: day
    });
  }

  // Check for events that should trigger
  checkEvents() {
    const triggeredEvents = [];

    // Check scheduled events
    this.scheduledEvents = this.scheduledEvents.filter(event => {
      if (gameState.day >= event.triggerDay) {
        triggeredEvents.push(event);
        return false;
      }
      return true;
    });

    // Check random events based on game state
    this.checkRandomEvents(triggeredEvents);

    return triggeredEvents;
  }

  // Check for random events based on current conditions
  checkRandomEvents(triggeredEvents) {
    const rand = Math.random();

    // Insurance events (more likely if coverage is low)
    if (rand < 0.15 + (100 - gameState.resources.coverage) * 0.002) {
      const insuranceEvent = this.getRandomInsuranceEvent();
      if (insuranceEvent && !this.isOnCooldown('insurance')) {
        triggeredEvents.push(insuranceEvent);
        this.setCooldown('insurance', 3);
      }
    }

    // Political events (weekly chance)
    if (gameState.day % 7 === 0 && rand < 0.3) {
      const politicalEvent = this.getRandomPoliticalEvent();
      if (politicalEvent && !this.isOnCooldown('political')) {
        triggeredEvents.push(politicalEvent);
        this.setCooldown('political', 7);
      }
    }

    // Hospital events (if in treatment)
    if (gameState.treatment.treatmentPlan && rand < 0.2) {
      const hospitalEvent = this.getRandomHospitalEvent();
      if (hospitalEvent && !this.isOnCooldown('hospital')) {
        triggeredEvents.push(hospitalEvent);
        this.setCooldown('hospital', 5);
      }
    }

    // Financial events (more likely if in debt)
    if (gameState.finances.totalOwed > 10000 && rand < 0.25) {
      const financialEvent = this.getRandomFinancialEvent();
      if (financialEvent && !this.isOnCooldown('financial')) {
        triggeredEvents.push(financialEvent);
        this.setCooldown('financial', 3);
      }
    }

    // Collection calls (if in collections)
    if (gameState.finances.inCollections && rand < 0.4) {
      triggeredEvents.push({
        type: 'financial',
        subtype: 'collection_call',
        title: 'Collection Call',
        description: `Collection call #${gameState.finances.collectionCalls + 1} this month.`,
        effects: { hope: -2 }
      });
      gameState.finances.collectionCalls++;
    }
  }

  // Get a random insurance event
  getRandomInsuranceEvent() {
    const events = ContentData.insuranceEvents.filter(
      e => !gameState.events.insuranceEventsSeen.includes(e.id)
    );
    if (events.length === 0) return null;

    const event = events[Math.floor(Math.random() * events.length)];
    gameState.events.insuranceEventsSeen.push(event.id);
    return event;
  }

  // Get a random political event
  getRandomPoliticalEvent() {
    const events = ContentData.politicalEvents.filter(
      e => !gameState.events.newsHeadlinesSeen.includes(e.id)
    );
    if (events.length === 0) return null;

    const event = events[Math.floor(Math.random() * events.length)];
    gameState.events.newsHeadlinesSeen.push(event.id);
    return event;
  }

  // Get a random hospital event
  getRandomHospitalEvent() {
    const events = ContentData.hospitalEvents.filter(
      e => !gameState.events.hospitalEventsSeen.includes(e.id)
    );
    if (events.length === 0) return null;

    const event = events[Math.floor(Math.random() * events.length)];
    gameState.events.hospitalEventsSeen.push(event.id);
    return event;
  }

  // Get a random financial event
  getRandomFinancialEvent() {
    const events = ContentData.financialEvents;
    return events[Math.floor(Math.random() * events.length)];
  }

  // Apply event effects to game state
  applyEventEffects(event) {
    if (!event.effects) return;

    const effects = event.effects;

    if (effects.health) {
      gameState.modifyHealth(effects.health, event.title);
    }
    if (effects.money) {
      gameState.modifyMoney(effects.money, event.title);
    }
    if (effects.coverage) {
      gameState.modifyCoverage(effects.coverage, event.title);
    }
    if (effects.hope) {
      gameState.modifyHope(effects.hope, event.title);
    }
    if (effects.time) {
      gameState.modifyTime(effects.time, event.title);
    }
    if (effects.bill) {
      gameState.addBill(effects.bill.description, effects.bill.amount);
    }
    if (effects.priorAuthDenied) {
      gameState.insurance.priorAuthsDenied.push(effects.priorAuthDenied);
    }
    if (effects.networkChange) {
      gameState.insurance.networkStatus = effects.networkChange;
    }
    if (effects.political) {
      Object.assign(gameState.political, effects.political);
    }
  }

  // Cooldown management
  setCooldown(type, days) {
    this.eventCooldowns[type] = gameState.day + days;
  }

  isOnCooldown(type) {
    return this.eventCooldowns[type] && gameState.day < this.eventCooldowns[type];
  }

  // Clear cooldowns (for new game)
  reset() {
    this.pendingEvents = [];
    this.scheduledEvents = [];
    this.eventCooldowns = {};
  }
}

const eventSystem = new EventSystem();
export default eventSystem;
