import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ProjectPage from './components/ProjectPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
