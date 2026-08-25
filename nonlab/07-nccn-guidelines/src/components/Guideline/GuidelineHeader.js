import { useGuideline } from '../../context/GuidelineContext';
import './GuidelineHeader.css';

const NCCN_URLS = {
  dlbcl: 'https://www.nccn.org/professionals/physician_gls/pdf/b-cell.pdf',
};

function GuidelineHeader() {
  const { guideline, guidelineId } = useGuideline();
  const nccnUrl = NCCN_URLS[guidelineId];

  return (
    <div className="guideline-header">
      <div className="guideline-header-info">
        <h1>{guideline.name}</h1>
        <span className="guideline-header-version">NCCN v{guideline.version}</span>
      </div>
      <div className="guideline-header-links">
        {nccnUrl && (
          <a
            href={nccnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nccn-link"
          >
            View on NCCN.org ↗
          </a>
        )}
        <a
          href="https://www.nccn.org/professionals/physician_gls/default.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="nccn-link secondary"
        >
          All NCCN Guidelines ↗
        </a>
      </div>
    </div>
  );
}

export default GuidelineHeader;
