// NewsSystem - Political satire events and news headlines

import gameState from './GameState.js';
import ContentData from './ContentData.js';

class NewsSystem {
  constructor() {
    this.currentHeadline = null;
    this.headlineHistory = [];
    this.breakingNewsQueue = [];
  }

  // Get a Trump tweet/executive order
  getTrumpEvent() {
    const tweets = ContentData.trumpTweets.filter(
      t => !this.headlineHistory.includes(t.id)
    );
    if (tweets.length === 0) return null;

    const tweet = tweets[Math.floor(Math.random() * tweets.length)];
    this.headlineHistory.push(tweet.id);
    return {
      type: 'trump',
      ...tweet
    };
  }

  // Get an RFK Jr. event
  getRFKEvent() {
    const events = ContentData.rfkEvents.filter(
      e => !this.headlineHistory.includes(e.id)
    );
    if (events.length === 0) return null;

    const event = events[Math.floor(Math.random() * events.length)];
    this.headlineHistory.push(event.id);
    return {
      type: 'rfk',
      ...event
    };
  }

  // Get a congressional event
  getCongressEvent() {
    const events = ContentData.congressEvents.filter(
      e => !this.headlineHistory.includes(e.id)
    );
    if (events.length === 0) return null;

    const event = events[Math.floor(Math.random() * events.length)];
    this.headlineHistory.push(event.id);
    return {
      type: 'congress',
      ...event
    };
  }

  // Get a random news headline
  getRandomHeadline() {
    const rand = Math.random();

    if (rand < 0.4) {
      return this.getTrumpEvent();
    } else if (rand < 0.7) {
      return this.getRFKEvent();
    } else {
      return this.getCongressEvent();
    }
  }

  // Check if breaking news should appear
  checkBreakingNews() {
    // Breaking news has a chance to appear based on political climate
    const baseChance = 0.1;
    const politicalModifier = (gameState.political.trumpExecutiveOrders +
                               gameState.political.rfkPolicies) * 0.02;

    if (Math.random() < baseChance + politicalModifier) {
      const news = this.getRandomHeadline();
      if (news) {
        this.breakingNewsQueue.push(news);
        return news;
      }
    }
    return null;
  }

  // Apply news effects to game state
  applyNewsEffects(news) {
    if (!news.effects) return;

    const effects = news.effects;

    if (effects.coverage) {
      gameState.modifyCoverage(effects.coverage, `News: ${news.headline || news.text}`);
    }
    if (effects.hope) {
      gameState.modifyHope(effects.hope, `News: ${news.headline || news.text}`);
    }
    if (effects.drugCosts) {
      // Increase future drug costs
      gameState.political.drugPriceCaps = false;
    }
    if (effects.acaStatus) {
      gameState.political.acaStatus = effects.acaStatus;
    }
    if (effects.fdaStatus) {
      gameState.political.fdaStatus = effects.fdaStatus;
    }

    // Track political events
    if (news.type === 'trump') {
      gameState.political.trumpExecutiveOrders++;
    } else if (news.type === 'rfk') {
      gameState.political.rfkPolicies++;
    }
  }

  // Format news for display
  formatHeadline(news) {
    if (news.type === 'trump') {
      return {
        source: '@realDonaldTrump',
        icon: 'twitter',
        text: news.text,
        style: 'tweet'
      };
    } else if (news.type === 'rfk') {
      return {
        source: 'BREAKING NEWS',
        icon: 'news',
        text: news.headline,
        subtext: news.description,
        style: 'news'
      };
    } else {
      return {
        source: 'WASHINGTON POST',
        icon: 'news',
        text: news.headline,
        subtext: news.description,
        style: 'news'
      };
    }
  }

  // Get ticker-style news feed
  getNewsTicker() {
    const headlines = [];

    // Mix of real satirical headlines
    headlines.push(...ContentData.tickerHeadlines);

    // Shuffle and return a subset
    return headlines
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }

  // Reset for new game
  reset() {
    this.currentHeadline = null;
    this.headlineHistory = [];
    this.breakingNewsQueue = [];
  }
}

const newsSystem = new NewsSystem();
export default newsSystem;
