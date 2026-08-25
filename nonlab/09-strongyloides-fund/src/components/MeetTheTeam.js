import React from 'react';

const team = [
  {
    name: 'Eric T. Perkey',
    credentials: 'MD, PhD',
    role: 'Principal Investigator',
    icon: '🔬',
    link: 'https://eperkey.org',
    bio: `Dr. Perkey completed his doctoral training in immunology and has extensive experience
      in lymphoma biology, B-cell signaling, and murine model systems. While his published
      work has focused on conventional translational oncology, he recognized early in his
      career that the field's failure to investigate parasite-mediated lymphomagenesis
      represented a critical gap in the literature. His institutional colleagues have
      described this pivot as "unexpected." He prefers the term "visionary."`
  },
  {
    name: 'Robert F. Kennedy Jr.',
    credentials: 'JD',
    role: 'Strategic Health Policy Advisor',
    icon: '⚖️',
    bio: `As Secretary of Health and Human Services and founder of the MAHA movement, Secretary
      Kennedy brings unparalleled visibility to research programs that challenge the conventional
      pharmaceutical paradigm. His advisory role ensures alignment with federal health
      sovereignty initiatives and maximizes the likelihood of regulatory pathway navigation.`
  },
  {
    name: 'Mel Gibson',
    credentials: '',
    role: 'Celebrity Liaison & Documentary Director',
    icon: '🎬',
    bio: `Mr. Gibson serves as the campaign's public face, bringing awareness to the intersection
      of parasitology and oncology. His involvement has been instrumental in generating
      early-stage awareness, particularly within demographics underserved by conventional
      medical outreach. Will direct "The Blue Cure" documentary at the $150M stretch goal.`
  },
  {
    name: 'Joe Rogan',
    credentials: '',
    role: 'Strongyloides Wrangler & Public Outreach Coordinator',
    icon: '🪱',
    bio: `Mr. Rogan brings a unique combination of long-form interviewing experience,
      supplement industry knowledge, and an audience of over 14 million listeners to
      this initiative. His well-documented interest in ivermectin during the COVID-19
      pandemic and his commitment to exploring topics that mainstream media will not
      cover make him an ideal advocate for this research program. He will oversee
      Strongyloides procurement, vivarium maintenance, and host a dedicated podcast
      series documenting the research in real time.`
  }
];

function MeetTheTeam() {
  return (
    <section className="section" id="team">
      <h2 className="section-title">The Dream Team</h2>
      <p className="section-intro">
        A doctor, a cabinet secretary, a Hollywood legend, and the most listened-to
        man in podcasting. The establishment doesn't stand a chance.
      </p>
      <div className="team-grid">
        {team.map((member, i) => (
          <div className="team-card" key={i}>
            <div className="team-icon">{member.icon}</div>
            <h3 className="team-name">
              {member.link ? (
                <a href={member.link} target="_blank" rel="noopener noreferrer" className="team-link">
                  {member.name}
                </a>
              ) : member.name}
              {member.credentials && <span className="team-credentials">, {member.credentials}</span>}
            </h3>
            <div className="team-role">{member.role}</div>
            <p className="team-bio">{member.bio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MeetTheTeam;
