import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { DataSyncProvider } from './context/DataSyncContext';
import { ReferencesProvider } from './context/ReferencesContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ProjectPage from './components/ProjectPage';
import GoogleSignInPrompt from './components/GoogleSignInPrompt';
import QuickCapture from './components/QuickCapture';
import './App.css';

function App() {
  return (
    <GoogleAuthProvider>
      <DataSyncProvider>
        <AppProvider>
          <ReferencesProvider>
            <Router>
              <div className="App">
                <Navbar />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/project/:projectId" element={<ProjectPage />} />
                </Routes>
                <GoogleSignInPrompt />
                <QuickCapture />
              </div>
            </Router>
          </ReferencesProvider>
        </AppProvider>
      </DataSyncProvider>
    </GoogleAuthProvider>
  );
}

export default App;
