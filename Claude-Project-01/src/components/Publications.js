import React from 'react';

function Publications() {
  // First-author and co-first-author publications
  const selectedPublications = [
    {
      id: 1,
      title: 'Early Notch signals from fibroblastic reticular cells program effector CD8+ T cell differentiation',
      authors: 'De Sousa DM*, Perkey E*, Le Corre L*, et al.',
      journal: 'Journal of Experimental Medicine',
      year: 2025,
      badge: 'Co-First Author',
      pmid: '40111253'
    },
    {
      id: 2,
      title: 'Notch signaling drives intestinal graft-versus-host disease in mice and nonhuman primates',
      authors: 'Tkachev V*, Vanderbeck A*, Perkey E*, et al.',
      journal: 'Science Translational Medicine',
      year: 2023,
      badge: 'Co-First Author',
      pmid: '37379368'
    },
    {
      id: 3,
      title: 'Single-cell analyses identify brain mural cells expressing CD19 as potential off-tumor targets for CAR-T immunotherapies',
      authors: 'Parker KR*, Migliorini D*, Perkey E, et al.',
      journal: 'Cell',
      year: 2020,
      badge: 'Key Contribution',
      pmid: '32961131'
    },
    {
      id: 4,
      title: 'GCNT1-Mediated O-Glycosylation of the Sialomucin CD43 Is a Sensitive Indicator of Notch Signaling in Activated T Cells',
      authors: 'Perkey E, Maurice De Sousa D, et al.',
      journal: 'Journal of Immunology',
      year: 2020,
      badge: 'First Author',
      pmid: '32060138'
    },
    {
      id: 5,
      title: 'Fibroblastic niches prime T cell alloimmunity through Delta-like Notch ligands',
      authors: 'Chung J*, Ebens C*, Perkey E, et al.',
      journal: 'Journal of Clinical Investigation',
      year: 2017,
      badge: 'Key Contribution',
      pmid: '28319044'
    },
    {
      id: 6,
      title: 'New Insights into Graft-Versus-Host Disease and Graft Rejection',
      authors: 'Perkey E, Maillard I',
      journal: 'Annual Review of Pathology',
      year: 2018,
      badge: 'Key Review',
      pmid: '29068759'
    },
    {
      id: 7,
      title: 'Increased TORC2 signaling promotes age-related decline in CD4 T cell signaling and function',
      authors: 'Perkey E, Fingar D, Miller RA, Garcia GG',
      journal: 'Journal of Immunology',
      year: 2013,
      badge: 'First Author',
      pmid: '24078700'
    },
    {
      id: 8,
      title: 'Ex-vivo Enzymatic Treatment of Aged CD4 T cells Restores Cognate T-cell Helper Function and Enhances Antibody Production in Mice',
      authors: 'Perkey E, Miller RA, Garcia GG',
      journal: 'Journal of Immunology',
      year: 2012,
      badge: 'First Author',
      pmid: '23136198'
    }
  ];

  const metrics = {
    totalPublications: 24,
    hIndex: 14,
    totalCitations: '2,800+'
  };

  return (
    <section id="publications" className="publications">
      <div className="container">
        <h2 className="section-title">Selected Publications</h2>

        <div className="publication-metrics">
          <div className="metric">
            <span className="metric-value">{metrics.totalPublications}</span>
            <span className="metric-label">Publications</span>
          </div>
          <div className="metric">
            <span className="metric-value">{metrics.hIndex}</span>
            <span className="metric-label">h-index</span>
          </div>
          <div className="metric">
            <span className="metric-value">{metrics.totalCitations}</span>
            <span className="metric-label">Citations</span>
          </div>
        </div>

        <p className="publications-intro">
          Publications highlighting my research contributions.
          * denotes equal contribution.
        </p>

        <div className="publications-list">
          {selectedPublications.map((pub) => (
            <article key={pub.id} className="publication-card">
              <div className="publication-content">
                <div className="publication-header">
                  <span className={`publication-badge ${pub.badge.toLowerCase().replace(' ', '-')}`}>
                    {pub.badge}
                  </span>
                  <span className="publication-year">{pub.year}</span>
                </div>
                <h3 className="publication-title">
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {pub.title}
                  </a>
                </h3>
                <p className="publication-authors">{pub.authors}</p>
                <p className="publication-journal">{pub.journal}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="publications-footer">
          <a
            href="https://scholar.google.com/citations?user=8AF8PccAAAAJ&hl=en"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Google Scholar
          </a>
          <a
            href="https://www.ncbi.nlm.nih.gov/myncbi/1ZO5xVuohdp5v/bibliography/public/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Full Bibliography
          </a>
        </div>
      </div>
    </section>
  );
}

export default Publications;
