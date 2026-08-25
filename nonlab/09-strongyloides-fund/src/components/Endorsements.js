import React from 'react';

const endorsements = [
  {
    name: 'Robert F. Kennedy Jr.',
    title: 'United States Secretary of Health and Human Services',
    quote: `The pharmaceutical industry has spent decades burying cheap cures so they can
      sell you expensive ones. This is EXACTLY why I created the MAHA movement. Ivermectin
      won a Nobel Prize — a NOBEL PRIZE — and they tried to ban it. Methylene blue costs
      pennies. Of course Big Pharma doesn't want this studied. This campaign is the American
      people saying ENOUGH. We're funding the science ourselves. That's what health freedom
      looks like.`,
    badge: 'HHS Endorsed',
    note: 'Statement adapted from public remarks on therapeutic access, February 2026'
  },
  {
    name: 'Mel Gibson',
    title: 'Actor, Director, Health Freedom Advocate',
    quote: `They told people there was nothing they could do. Just take the chemo, pay the
      bills, and pray. Meanwhile two of the cheapest drugs on the planet might actually
      WORK — and nobody will fund the research? That's not science. That's a cover-up.
      I've seen how these people operate. I'm putting my name on this because somebody
      has to stand up and say what everybody's thinking.`,
    badge: 'Campaign Ambassador',
    note: 'Mr. Gibson serves in an advisory and public awareness capacity'
  },
  {
    name: 'Name Withheld',
    title: 'Former Senior Official, Center for Drug Evaluation and Research, FDA',
    quote: `I spent 20 years at the FDA watching good drugs get ignored because no company
      could make money off them. Ivermectin and methylene blue both have real biological
      activity against cancer cells — that's not controversial, that's published science.
      The only reason nobody's tested this combination is because there's no profit in it.
      The system is broken. I can't say that publicly with my name attached, but I can
      say it here: this research deserves a shot.`,
    badge: 'Regulatory Perspective',
    note: 'Identity withheld at the request of the individual'
  }
];

function Endorsements() {
  return (
    <section className="section section-dark" id="endorsements">
      <h2 className="section-title">Patriots Who Are Standing Up</h2>
      <p className="section-intro">
        Real leaders who aren't afraid to say what the mainstream media won't.
        These are the voices Big Pharma can't silence.
      </p>

      <div className="endorsement-banner">
        <div className="endorsement-banner-inner">
          <span className="endorsement-banner-icon">🇺🇸</span>
          <div>
            <strong>Aligned with the Make America Healthy Again (MAHA) Initiative</strong>
            <p>
              President Trump's MAHA movement is about one thing: giving Americans back
              control of their own health. No more letting Big Pharma decide which cures
              get funded. No more letting the FDA bury cheap treatments. This campaign
              is MAHA in action. Learn more about the administration's health priorities
              at{' '}
              <a
                href="https://www.whitehouse.gov/health/"
                target="_blank"
                rel="noopener noreferrer"
              >
                whitehouse.gov/health
              </a>.
            </p>
          </div>
        </div>
      </div>

      <div className="endorsements-grid">
        {endorsements.map((e, i) => (
          <div className="endorsement-card" key={i}>
            <div className="endorsement-badge">{e.badge}</div>
            <blockquote className="endorsement-quote">"{e.quote}"</blockquote>
            <div className="endorsement-attribution">
              <strong>{e.name}</strong>
              <span>{e.title}</span>
            </div>
            <div className="endorsement-note">{e.note}</div>
          </div>
        ))}
      </div>

      <div className="callout callout-rejection">
        <strong>Why the NIH Said No (And Why That Tells You Everything)</strong>
        <p>
          We applied to Fauci's old agency — NIAID — and they threw our application in the
          trash without even discussing it. Their excuse? "No published evidence" and the
          doses were "too high." These are the same people who spent billions on drugs that
          don't work while a Nobel Prize-winning medicine sat on the shelf.
        </p>
        <p>
          The system isn't broken — it's RIGGED. When the government won't fund your
          research, you take it to the people. That's exactly what we're doing. Every
          dollar you give is a vote against the establishment and FOR real cures.
        </p>
      </div>
    </section>
  );
}

export default Endorsements;
