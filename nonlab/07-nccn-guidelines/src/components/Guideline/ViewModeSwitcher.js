import { useGuideline } from '../../context/GuidelineContext';
import './ViewModeSwitcher.css';

function ViewModeSwitcher({ onOpenCalculators }) {
  const { mode, setMode } = useGuideline();

  return (
    <div className="view-mode-switcher">
      <div className="view-mode-tabs">
        <button
          className={`view-mode-tab ${mode === 'flowchart' ? 'active' : ''}`}
          onClick={() => setMode('flowchart')}
        >
          <span className="tab-icon">🔀</span>
          Flowchart
        </button>
        <button
          className={`view-mode-tab ${mode === 'walker' ? 'active' : ''}`}
          onClick={() => setMode('walker')}
        >
          <span className="tab-icon">🚶</span>
          Decision Walker
        </button>
      </div>
      <button className="calc-open-btn" onClick={onOpenCalculators}>
        <span className="tab-icon">🧮</span>
        Calculators
      </button>
    </div>
  );
}

export default ViewModeSwitcher;
