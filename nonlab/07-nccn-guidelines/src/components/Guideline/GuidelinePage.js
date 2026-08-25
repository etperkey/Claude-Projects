import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGuideline } from '../../context/GuidelineContext';
import { WalkerProvider } from '../../context/WalkerContext';
import GuidelineHeader from './GuidelineHeader';
import ViewModeSwitcher from './ViewModeSwitcher';
import FlowchartView from '../Flowchart/FlowchartView';
import WalkerView from '../Walker/WalkerView';
import CalculatorPanel from '../Calculators/CalculatorPanel';
import './GuidelinePage.css';

function GuidelinePage() {
  const { guideline, loading, error, mode, guidelineId } = useGuideline();
  const [calcOpen, setCalcOpen] = useState(false);

  if (loading) {
    return (
      <div className="guideline-loading">
        <div className="loading-spinner" />
        <p>Loading guideline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guideline-error">
        <h2>Guideline not found</h2>
        <p>{error}</p>
        <Link to="/" className="guideline-error-link">
          &larr; Back to all guidelines
        </Link>
      </div>
    );
  }

  if (!guideline) return null;

  return (
    <div className="guideline-page">
      <div className="disclaimer-compact">
        Educational use only — not for clinical decision-making.
      </div>
      <GuidelineHeader />
      <ViewModeSwitcher onOpenCalculators={() => setCalcOpen(true)} />
      <div className="guideline-view">
        {mode === 'flowchart' ? (
          <FlowchartView />
        ) : (
          <WalkerProvider key={guidelineId}>
            <WalkerView />
          </WalkerProvider>
        )}
      </div>
      <CalculatorPanel isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}

export default GuidelinePage;
