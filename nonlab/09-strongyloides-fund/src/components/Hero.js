import React, { useState } from 'react';
import { useCampaignTotal } from '../useCampaignTotal';

const FALLBACK_RAISED = 1847;
const FALLBACK_GOAL = 2200000;
const BACKERS = 23;
const CAMPAIGN_END = new Date('2029-03-15T00:00:00');

// GiveSendGo returns "YYYY-MM-DD HH:MM:SS" in UTC. Parse robustly, then format
// as "N hours ago" / "N days ago" / "just now".
function relTime(s) {
  if (!s) return null;
  const t = Date.parse(s.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return null;
  const delta = Math.max(0, Date.now() - t);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function Hero() {
  const [showModal, setShowModal] = useState(false);
  const { raised, goal, lastDonation, loading } = useCampaignTotal({ raised: FALLBACK_RAISED, goal: FALLBACK_GOAL });
  const pct = ((raised / goal) * 100).toFixed(2);
  const daysLeft = Math.max(0, Math.ceil((CAMPAIGN_END - Date.now()) / 86_400_000));
  const lastAgo = relTime(lastDonation);

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-image-col">
          <img
            src={process.env.PUBLIC_URL + '/proposal.jpeg'}
            alt="Proposed Mechanism of Strongyloides-Driven Lymphomagenesis and Therapeutic Synergy of Ivermectin and Methylene Blue"
            className="hero-image"
          />
          <div className="hero-image-caption">
            Fig. 1 &mdash; The mechanism THEY don't want studied (preprint under review, <em>Journal of Making America Healthy Again</em>)
          </div>
        </div>
        <div className="hero-info-col">
          <div className="hero-category">CANCER RESEARCH &middot; PARASITES &middot; REAL MEDICINE</div>
          <h1 className="hero-title">
            The Cure Big Pharma Doesn't Want You to Know About
          </h1>
          <p className="hero-subtitle">
            A People-Funded Campaign to Finally Prove What They've Been Hiding
          </p>

          <div className="funding-stats">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${Math.max(pct, 0.8)}%` }}>
                <span className="progress-label">{pct}%</span>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">
                  ${raised.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  {loading && <span className="stat-loading"> · loading…</span>}
                </span>
                <span className="stat-label">pledged of ${(goal / 1e6).toFixed(1)}M goal</span>
              </div>
              <div className="stat">
                <span className="stat-value">{BACKERS}</span>
                <span className="stat-label">backers</span>
              </div>
              <div className="stat">
                <span className="stat-value">{daysLeft.toLocaleString()}</span>
                <span className="stat-label">days to go</span>
              </div>
            </div>
            {lastAgo && (
              <div className="last-donation">
                Last donation {lastAgo}
              </div>
            )}
          </div>

          <a
            href="https://www.givesendgo.com/ivermectinfund"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button"
          >
            Back This Project on GiveSendGo
          </a>
          <div className="cta-subtext">
            All-or-nothing funding. This project will only be funded if it reaches its goal by March 15, 2029.
          </div>

          <div className="hero-badges">
            <span className="badge badge-maha">MAHA Aligned</span>
            <span className="badge badge-peer">They Don't Want This Peer Reviewed</span>
            <span className="badge badge-fda">FDA Awareness Pending</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Pledge Processing</h3>
            <p>
              Thank you for your interest in the kind of REAL science that Big Pharma doesn't want funded.
            </p>
            <p>
              Our payment infrastructure is currently undergoing compliance review following
              guidance from the Federal Trade Commission. We anticipate resolution within 6&ndash;18
              months.
            </p>
            <p>
              In the meantime, please consider sharing this campaign with your network. Awareness
              is the first step toward a cure.
            </p>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              I Understand
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Hero;
