import React from 'react';

const RAISED = 1847;

const goals = [
  {
    amount: 2200000,
    label: '$2.2M',
    title: 'Core Research Program',
    description: 'Fund the full three-part plan: hire the team, buy the equipment, get the parasites, and stock up on ivermectin and methylene blue. This is where it all starts.',
    status: 'in-progress'
  },
  {
    amount: 2800000,
    label: '$2.8M',
    title: 'Phase I Clinical Trial Filing',
    description: 'File with the FDA to start human trials. With President Trump\'s FDA, we expect this to move FAST. No more bureaucratic delays — the American people are waiting.',
    status: 'locked'
  },
  {
    amount: 3500000,
    label: '$3.5M',
    title: 'StrongyloScan\u2122 Mobile App',
    description: 'A phone app that lets you check for parasites FROM HOME. Just take a photo — the AI does the rest. No doctor visit needed. Integrates with Apple Health and Google Fit. Health freedom in your pocket.',
    status: 'locked'
  },
  {
    amount: 5000000,
    label: '$5M',
    title: '"The Blue Cure" Documentary',
    description: 'Mel Gibson directs and stars in the explosive documentary exposing how Big Pharma buried ivermectin to protect their cancer drug profits. The truth is coming out — in theaters nationwide.',
    status: 'locked'
  },
  {
    amount: 7500000,
    label: '$7.5M',
    title: 'Nobel Prize Nomination Campaign',
    description: 'When we prove this works, the world needs to know. Dedicated campaign to get the Nobel Prize nomination our team deserves. Includes travel to Stockholm. Make Science Great Again.',
    status: 'locked'
  }
];

function StretchGoals() {
  return (
    <section className="section section-dark" id="stretch-goals">
      <h2 className="section-title">Stretch Goals</h2>
      <p className="section-intro">
        When we blow past our goal — and we WILL — here's what comes next. Every
        dollar beyond $2.2M unlocks the next phase of the fight against Big Pharma.
      </p>
      <div className="stretch-timeline">
        {goals.map((goal, i) => {
          const reached = RAISED >= goal.amount;
          return (
            <div className={`stretch-item ${goal.status} ${reached ? 'reached' : ''}`} key={i}>
              <div className="stretch-marker">
                <div className="stretch-dot" />
                {i < goals.length - 1 && <div className="stretch-line" />}
              </div>
              <div className="stretch-content">
                <div className="stretch-amount">{goal.label}</div>
                <h3 className="stretch-title">{goal.title}</h3>
                <p className="stretch-description">{goal.description}</p>
                <span className={`stretch-status stretch-status-${goal.status}`}>
                  {goal.status === 'in-progress' ? '0.08% Funded' : 'Locked'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StretchGoals;
