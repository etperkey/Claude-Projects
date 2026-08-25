import React from 'react';

const tiers = [
  {
    amount: 25,
    name: 'Supporter',
    backers: 14,
    rewards: [
      'Personalized thank-you email from the research team',
      'Digital Certificate of Participation',
      'Name listed on the campaign\'s Supporter Recognition page'
    ]
  },
  {
    amount: 100,
    name: 'Advocate',
    backers: 5,
    rewards: [
      'All Supporter tier benefits',
      'Quarterly newsletter: "The Strongyloides Sentinel"',
      'Digital copy of the research proposal and mechanistic overview',
      'Early access to preprint manuscripts'
    ]
  },
  {
    amount: 500,
    name: 'Champion',
    backers: 2,
    rewards: [
      'All Advocate tier benefits',
      'Limited-edition campaign enamel pin',
      'Invitation to annual virtual research symposium',
      'Acknowledgment in all resulting publications'
    ]
  },
  {
    amount: 1000,
    name: 'Patron',
    backers: 1,
    rewards: [
      'All Champion tier benefits',
      'Virtual lab tour with the Principal Investigator (30 min)',
      'Named acknowledgment in the Methods section of published work',
      'Commemorative methylene blue sample vial (display only, 0.5 mL)'
    ]
  },
  {
    amount: 10000,
    name: 'Benefactor',
    backers: 1,
    rewards: [
      'All Patron tier benefits',
      'Named laboratory bench ("The [Your Name] Bench")',
      'Signed photograph from campaign ambassador Mel Gibson',
      'Invitation to in-person laboratory dedication ceremony',
      'Your name engraved on the Strongyloides biocontainment unit'
    ]
  },
  {
    amount: 1000000,
    name: 'Founding Visionary',
    backers: 0,
    rewards: [
      'All Benefactor tier benefits',
      'Naming rights to the primary Strongyloides cell line',
      'Permanent advisory board seat with voting privileges',
      'Personal call with campaign ambassador Mel Gibson',
      'Portrait displayed in the laboratory in perpetuity',
      'Co-investigator status on all grant applications'
    ],
    featured: true
  }
];

function FundingTiers() {
  return (
    <section className="section" id="rewards">
      <h2 className="section-title">Contribution Tiers</h2>
      <p className="section-intro">
        Select a contribution level below. All rewards are estimated for delivery within
        18–36 months of campaign completion, subject to regulatory and logistical timelines.
      </p>
      <div className="tiers-grid">
        {tiers.map((tier, i) => (
          <div className={`tier-card ${tier.featured ? 'tier-featured' : ''}`} key={i}>
            {tier.featured && <div className="tier-badge">Most Impactful</div>}
            <div className="tier-amount">
              ${tier.amount.toLocaleString()}
              {tier.amount >= 1000000 && <span className="tier-plus">+</span>}
            </div>
            <div className="tier-name">{tier.name}</div>
            <div className="tier-backers">{tier.backers} backer{tier.backers !== 1 ? 's' : ''}</div>
            <ul className="tier-rewards">
              {tier.rewards.map((r, j) => (
                <li key={j}>{r}</li>
              ))}
            </ul>
            <a
              href="https://www.givesendgo.com/ivermectinfund/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="tier-button"
            >
              Donate ${tier.amount.toLocaleString()}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FundingTiers;
