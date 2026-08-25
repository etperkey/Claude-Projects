import React from 'react';

const aims = [
  {
    number: 1,
    title: 'Prove the Parasite-Cancer Connection That Nobody Will Talk About',
    icon: '🪱',
    description: `Here's what the medical establishment doesn't want you to know: a common gut
      parasite called Strongyloides may be poking your immune cells over and over until
      they go haywire and turn into cancer. We're going to put parasite juice on human
      immune cells in the lab and watch what happens. Our theory? The constant irritation
      flips a genetic switch — the same switch found in most cases of follicular lymphoma.
      We'll check every month for 3 years. If we're right, this changes EVERYTHING about
      how we understand blood cancer.`,
    timeline: 'Months 1–36',
    budget: '$720K'
  },
  {
    number: 2,
    title: 'Unleash Ivermectin: Kill the Parasite AND the Cancer',
    icon: '💊',
    description: `Ivermectin does TWO incredible things. First, it kills the parasite — takes out
      the root cause. But here's the part they REALLY don't want you to know: ivermectin
      has also been shown to fight cancer cells directly by shutting down their growth
      signals. We're going to test doses from the normal amount all the way up to 10x
      the standard dose. Yes, that's more than what's typically given. The mainstream
      scientists say you "can't get enough in the blood." We say that's a dosing problem,
      not a science problem. And we're going to solve it.`,
    timeline: 'Months 12–48',
    budget: '$860K'
  },
  {
    number: 3,
    title: 'The Methylene Blue Knockout Punch',
    icon: '🔵',
    description: `Once ivermectin has the cancer cells on the ropes, methylene blue delivers the
      finishing blow. Here's how: cancer cells are energy hogs — they burn sugar like
      crazy (scientists call it the "Warburg effect"). Methylene blue forces them to
      switch back to normal energy production, which overwhelms their damaged machinery
      and causes them to self-destruct. It's like flipping the power grid on a house
      with bad wiring. Two cheap, safe, off-patent compounds working together to do
      what billion-dollar drugs can't. That's the kind of science Big Pharma prays
      you never hear about.`,
    timeline: 'Months 24–60',
    budget: '$620K'
  }
];

function ScienceAims() {
  return (
    <section className="section" id="science">
      <h2 className="section-title">The Three-Part Plan to Beat Cancer</h2>
      <p className="section-intro">
        Three bold steps. Five years. Two dirt-cheap drugs the establishment has ignored
        for decades. This is the research program they tried to shut down — and we're
        doing it anyway, with YOUR help.
      </p>
      <div className="aims-grid">
        {aims.map(aim => (
          <div className="aim-card" key={aim.number}>
            <div className="aim-header">
              <span className="aim-icon">{aim.icon}</span>
              <span className="aim-number">Specific Aim {aim.number}</span>
            </div>
            <h3 className="aim-title">{aim.title}</h3>
            <p className="aim-description">{aim.description}</p>
            <div className="aim-footer">
              <span className="aim-timeline">{aim.timeline}</span>
              <span className="aim-budget">{aim.budget}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ScienceAims;
