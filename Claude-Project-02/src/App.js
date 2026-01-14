import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { DataSyncProvider } from './context/DataSyncContext';
import { AutoBackupProvider } from './context/AutoBackupContext';
import { ReferencesProvider } from './context/ReferencesContext';
import { ApiKeysProvider } from './context/ApiKeysContext';
import { SemanticSearchProvider } from './context/SemanticSearchContext';
import { ToastProvider } from './context/ToastContext';
import { TrashProvider } from './context/TrashContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ProjectPage from './components/ProjectPage';
import GoogleSignInPrompt from './components/GoogleSignInPrompt';
import QuickCapture from './components/QuickCapture';
import ApiKeySettings from './components/ApiKeySettings';
import TrashModal from './components/TrashModal';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <GoogleAuthProvider>
          <DataSyncProvider>
            <AutoBackupProvider>
              <AppProvider>
              <ApiKeysProvider>
                <SemanticSearchProvider>
                  <ReferencesProvider>
                    <TrashProvider>
                      <Router>
                        <div className="App">
                          <Navbar />
                          <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/project/:projectId" element={<ProjectPage />} />
                          </Routes>
                          <GoogleSignInPrompt />
                          <QuickCapture />
                          <ApiKeySettings />
                          <TrashModal />
                        </div>
                      </Router>
                    </TrashProvider>
                  </ReferencesProvider>
                </SemanticSearchProvider>
              </ApiKeysProvider>
              </AppProvider>
            </AutoBackupProvider>
          </DataSyncProvider>
        </GoogleAuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
