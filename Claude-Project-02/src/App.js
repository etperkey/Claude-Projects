import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ProjectPage from './components/ProjectPage';
import './App.css';

function App() {
  return (
    <GoogleAuthProvider>
      <AppProvider>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/project/:projectId" element={<ProjectPage />} />
            </Routes>
          </div>
        </Router>
      </AppProvider>
    </GoogleAuthProvider>
  );
}

export default App;
