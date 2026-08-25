import { HashRouter, Routes, Route } from 'react-router-dom';
import { GuidelineProvider } from './context/GuidelineContext';
import Navbar from './components/Navbar/Navbar';
import GuidelineListPage from './components/GuidelineList/GuidelineListPage';
import GuidelinePage from './components/Guideline/GuidelinePage';
import ChangelogPage from './components/Changelog/ChangelogPage';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './App.css';

function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <div className="app">
          <Navbar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<GuidelineListPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route
                path="/guidelines/:guidelineId"
                element={
                  <GuidelineProvider>
                    <GuidelinePage />
                  </GuidelineProvider>
                }
              />
            </Routes>
          </div>
        </div>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
