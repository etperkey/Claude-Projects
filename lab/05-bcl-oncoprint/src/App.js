import React from 'react';
import { useData } from './context/DataContext';
import OncoprintGrid from './components/Oncoprint/OncoprintGrid';
import OncoprintLegend from './components/Oncoprint/OncoprintLegend';
import FilterPanel from './components/Controls/FilterPanel';
import SortControls from './components/Controls/SortControls';
import GeneSelector from './components/Controls/GeneSelector';
import DisplayOptions from './components/Controls/DisplayOptions';
import ExportControls from './components/Controls/ExportControls';
import MutationDetailModal from './components/MutationDetail/MutationDetailModal';
import ContextMenu from './components/ContextMenu/ContextMenu';
import './App.css';

function App() {
  const { loading, error } = useData();

  if (loading) {
    return (
      <div className="app loading-state">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading BCL cell line data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app error-state">
        <div className="error-message">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <p>Please ensure the data files are in the public/data/ directory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="beta-banner">In beta. Still testing. Not yet validated.</div>
      <header className="app-header">
        <div className="header-content">
          <h1>B-cell Lymphoma Cell <span style={{ fontSize: '0.6em', verticalAlign: 'middle', lineHeight: 1 }}>k</span>Line Oncoprint <span className="version-badge">v0.4</span></h1>
          <p className="subtitle">Interactive wrapper of <a href="https://depmap.org/portal/" target="_blank" rel="noopener noreferrer">DepMap</a> lymphoma cell line data</p>
        </div>
        <div className="header-credit">Created by Eric Perkey, MD-PhD</div>
      </header>

      <main className="app-main">
        <aside className="controls-panel">
          <DisplayOptions />
          <ExportControls />
          <FilterPanel />
          <SortControls />
          <GeneSelector />
        </aside>

        <section className="visualization-panel">
          <OncoprintLegend />
          <div className="oncoprint-container">
            <OncoprintGrid />
          </div>
        </section>
      </main>

      <footer className="beta-footer">
        <p>In beta. Still testing. Do not trust anything.</p>
        <p className="bloom-quote">"Poetic influence... always proceeds by a misreading of the prior poet, an act of creative correction." — Harold Bloom, <em>The Anxiety of Influence</em></p>
      </footer>

      <MutationDetailModal />
      <ContextMenu />
    </div>
  );
}

export default App;
