import React from 'react';
import Hero from './components/Hero';
import CampaignSummary from './components/CampaignSummary';
import ScienceAims from './components/ScienceAims';
import Endorsements from './components/Endorsements';
import FundingTiers from './components/FundingTiers';
import StretchGoals from './components/StretchGoals';
import MeetTheTeam from './components/MeetTheTeam';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="maha-banner">
        <div className="maha-banner-inner">
          🇺🇸 Proudly aligned with President Trump's <strong>Make America Healthy Again</strong> movement &mdash; Taking health freedom BACK from Big Pharma
        </div>
      </div>
      <nav className="topnav">
        <div className="topnav-inner">
          <span className="topnav-logo">FundRealScience<sup>&trade;</sup></span>
          <div className="topnav-right">
            <span className="topnav-tagline">Democratizing Discovery</span>
            <span className="topnav-sep">&middot;</span>
            <span className="topnav-campaign">Campaign #FS-2026-00047</span>
          </div>
        </div>
      </nav>
      <Hero />
      <div className="main-content">
        <CampaignSummary />
        <ScienceAims />
        <Endorsements />
        <FundingTiers />
        <StretchGoals />
        <MeetTheTeam />
        <FAQ />
      </div>
      <Footer />
    </div>
  );
}

export default App;
