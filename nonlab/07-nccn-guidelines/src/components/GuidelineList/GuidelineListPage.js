import { Link } from 'react-router-dom';
import { guidelineRegistry } from '../../data/guidelines';
import './GuidelineListPage.css';

const TYPE_ICONS = {
  'B-Cell Lymphoma': '🔬',
  'Hodgkin Lymphoma': '🔬',
  'CLL/SLL': '🔬',
  'T-Cell Lymphoma': '🔬',
  'Cutaneous Lymphoma': '🔬',
  'default': '📄'
};

function GuidelineListPage() {
  return (
    <div className="guideline-list-page">
      <div className="guideline-list-header">
        <h1>NCCN Clinical Practice Guidelines</h1>
        <p>Interactive viewer for NCCN treatment algorithms. Select a guideline to explore.</p>
      </div>
      <div className="disclaimer-banner">
        <strong>Educational Use Only.</strong> This tool is an independent educational resource
        and is not affiliated with, endorsed by, or a substitute for the official NCCN Clinical
        Practice Guidelines. It should not be used for clinical decision-making. Always refer to
        the <a href="https://www.nccn.org/guidelines/guidelines-detail" target="_blank" rel="noopener noreferrer">official NCCN guidelines</a> and
        use clinical judgment for patient care.
      </div>
      <div className="guideline-cards">
        {guidelineRegistry.map((g) => (
          <Link
            key={g.id}
            to={`/guidelines/${g.id}`}
            className="guideline-card"
          >
            <div className="guideline-card-icon">
              {TYPE_ICONS[g.category] || TYPE_ICONS.default}
            </div>
            <div className="guideline-card-body">
              <h2>{g.name}</h2>
              <p className="guideline-card-subtitle">{g.subtitle}</p>
              <div className="guideline-card-meta">
                <span className="guideline-card-version">v{g.version}</span>
                <span className="guideline-card-pages">{g.pageCount} algorithm pages</span>
              </div>
              {g.nccnUrl && (
                <a
                  href={g.nccnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guideline-card-nccn"
                  onClick={(e) => e.stopPropagation()}
                >
                  View official NCCN PDF ↗
                </a>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default GuidelineListPage;
