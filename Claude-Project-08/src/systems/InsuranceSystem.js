// InsuranceSystem - Prior authorization and coverage mechanics

import gameState from './GameState.js';
import ContentData from './ContentData.js';

class InsuranceSystem {
  constructor() {
    this.priorAuthQueue = [];
    this.appealQueue = [];
  }

  // Submit a prior authorization request
  submitPriorAuth(treatment) {
    const request = {
      id: Date.now(),
      treatment: treatment.name,
      cost: treatment.cost,
      submittedDay: gameState.day,
      status: 'pending',
      denialReason: null,
      appealCount: 0,
      maxAppeals: 3
    };

    gameState.insurance.priorAuthsPending.push(request);
    this.priorAuthQueue.push(request);

    return request;
  }

  // Process pending prior authorizations
  processPriorAuths() {
    const processed = [];

    gameState.insurance.priorAuthsPending = gameState.insurance.priorAuthsPending.filter(request => {
      const waitDays = gameState.day - request.submittedDay;

      // Minimum wait time
      if (waitDays < this.getWaitTime(request)) {
        return true;
      }

      // Calculate approval chance
      const approvalChance = this.calculateApprovalChance(request);

      if (Math.random() < approvalChance) {
        // Approved
        request.status = 'approved';
        gameState.insurance.priorAuthsApproved.push(request);
        processed.push({
          request,
          approved: true,
          message: `Prior Authorization APPROVED for ${request.treatment}`
        });
      } else {
        // Denied
        request.status = 'denied';
        request.denialReason = this.getRandomDenialReason();
        gameState.insurance.priorAuthsDenied.push(request);
        processed.push({
          request,
          approved: false,
          message: `Prior Authorization DENIED for ${request.treatment}`,
          reason: request.denialReason
        });

        // Hope loss from denial
        gameState.modifyHope(-10, `Prior auth denied: ${request.treatment}`);
      }

      return false;
    });

    return processed;
  }

  // Calculate approval chance based on various factors
  calculateApprovalChance(request) {
    let chance = 0.6; // Base 60% approval rate

    // Coverage level affects approval
    chance += (gameState.resources.coverage - 50) * 0.005;

    // Political climate affects approval
    if (gameState.political.acaStatus === 'weakened') {
      chance -= 0.15;
    }
    if (gameState.political.acaStatus === 'repealed') {
      chance -= 0.30;
    }

    // Higher cost treatments are more likely to be denied
    if (request.cost > 50000) {
      chance -= 0.20;
    } else if (request.cost > 20000) {
      chance -= 0.10;
    }

    // Appeals slightly increase chance
    chance += request.appealCount * 0.05;

    // Provider matters
    if (gameState.insurance.provider === 'UnitedHealth') {
      chance -= 0.05; // They deny more
    }

    return Math.max(0.1, Math.min(0.9, chance));
  }

  // Get wait time for prior auth
  getWaitTime(request) {
    let baseWait = 5; // 5 days minimum

    // Higher cost = longer wait
    if (request.cost > 50000) {
      baseWait += 10;
    } else if (request.cost > 20000) {
      baseWait += 5;
    }

    // Political climate can slow things down
    if (gameState.political.fdaStatus === 'compromised') {
      baseWait += 7;
    }

    return baseWait;
  }

  // Get a random denial reason
  getRandomDenialReason() {
    const reasons = ContentData.denialReasons;
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  // Appeal a denied prior auth
  appealDenial(requestId) {
    const request = gameState.insurance.priorAuthsDenied.find(r => r.id === requestId);

    if (!request || request.appealCount >= request.maxAppeals) {
      return {
        success: false,
        message: request ? 'Maximum appeals reached' : 'Request not found'
      };
    }

    request.appealCount++;
    request.status = 'pending';
    request.submittedDay = gameState.day;

    // Move back to pending
    gameState.insurance.priorAuthsDenied = gameState.insurance.priorAuthsDenied.filter(
      r => r.id !== requestId
    );
    gameState.insurance.priorAuthsPending.push(request);

    // Costs hope and time to appeal
    gameState.modifyHope(-5, 'Filing insurance appeal');
    gameState.advanceDay(2); // Takes 2 days to file appeal

    return {
      success: true,
      message: `Appeal #${request.appealCount} filed for ${request.treatment}`,
      request
    };
  }

  // Calculate out-of-pocket cost for a treatment
  calculatePatientCost(totalCost, isInNetwork = true) {
    const ins = gameState.insurance;

    // If policy cancelled, patient pays everything
    if (ins.policyCancelled) {
      return totalCost;
    }

    let patientCost = 0;
    let remainingCost = totalCost;

    // Out of network = higher costs
    const coinsuranceRate = isInNetwork ? 0.20 : 0.40;
    const deductible = isInNetwork ? ins.deductible : ins.deductible * 1.5;

    // Apply deductible
    const deductibleRemaining = Math.max(0, deductible - ins.deductibleMet);
    if (deductibleRemaining > 0) {
      const deductiblePortion = Math.min(remainingCost, deductibleRemaining);
      patientCost += deductiblePortion;
      ins.deductibleMet += deductiblePortion;
      remainingCost -= deductiblePortion;
    }

    // Apply coinsurance
    patientCost += remainingCost * coinsuranceRate;

    // Check against out-of-pocket max
    const oopRemaining = ins.maxOutOfPocket - ins.outOfPocketSpent;
    if (patientCost > oopRemaining) {
      patientCost = oopRemaining;
    }

    ins.outOfPocketSpent += patientCost;

    return Math.round(patientCost);
  }

  // Generate an insurance denial letter
  generateDenialLetter(request) {
    return ContentData.denialLetterTemplate
      .replace('{TREATMENT}', request.treatment)
      .replace('{REASON}', request.denialReason)
      .replace('{DATE}', `Day ${gameState.day}`)
      .replace('{PROVIDER}', gameState.insurance.provider)
      .replace('{APPEAL_DEADLINE}', `Day ${gameState.day + 3}`);
  }

  // Check network status
  checkNetworkStatus(providerName) {
    // Random chance provider left network
    if (Math.random() < 0.1) {
      return {
        inNetwork: false,
        reason: `${providerName} is no longer in your insurance network as of this month.`
      };
    }
    return { inNetwork: true };
  }

  // Annual deductible reset (New Year's event)
  resetDeductible() {
    const previousMet = gameState.insurance.deductibleMet;
    gameState.insurance.deductibleMet = 0;
    gameState.insurance.outOfPocketSpent = 0;

    return {
      type: 'deductible_reset',
      message: `Happy New Year! Your $${gameState.insurance.deductible.toLocaleString()} deductible has reset.`,
      previousMet
    };
  }

  // Reset for new game
  reset() {
    this.priorAuthQueue = [];
    this.appealQueue = [];
  }
}

const insuranceSystem = new InsuranceSystem();
export default insuranceSystem;
