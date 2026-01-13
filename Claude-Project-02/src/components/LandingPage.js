import React from 'react';
import { Link } from 'react-router-dom';
import { researchProjects } from '../data/projects';

// Project icons
const ProjectIcons = {
  tp53: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="32" r="26" fill="currentColor"/>
      <path d="M24 28 L40 44 M40 28 L24 44" stroke="#FFD93D" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  ),
  bite: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="20" cy="32" r="14" fill="#5B4A8A"/>
      <circle cx="44" cy="32" r="14" fill="#1A6B5A"/>
      <rect x="26" y="28" width="12" height="8" rx="2" fill="#D4A84B"/>
    </svg>
  ),
  chemokine: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="24" cy="32" r="16" fill="currentColor"/>
      <circle cx="44" cy="24" r="8" fill="#C84A5A"/>
      <circle cx="48" cy="38" r="6" fill="#C84A5A" opacity="0.7"/>
      <path d="M36 28 L42 22" stroke="#C84A5A" strokeWidth="2"/>
    </svg>
  ),
  microbe: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="32" cy="36" rx="20" ry="16" fill="currentColor"/>
      <ellipse cx="32" cy="20" rx="12" ry="8" fill="#5A8A4A"/>
      <line x1="32" y1="28" x2="32" y2="32" stroke="#8ABA7A" strokeWidth="2"/>
    </svg>
  )
};

// Calculate task stats
const getTaskStats = (tasks) => {
  const total = Object.values(tasks).flat().length;
  const done = tasks.done.length;
  const inProgress = tasks.inProgress.length;
  return { total, done, inProgress, percentage: Math.round((done / total) * 100) };
};

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="header-content">
          <h1>Research Project Hub</h1>
          <p className="subtitle">Lymphoma Biology & Immunotherapy Research</p>
        </div>
      </header>

      <main className="landing-main">
        <section className="projects-overview">
          <h2>Active Research Projects</h2>
          <p className="section-description">
            Click on a project to view detailed Kanban board and manage tasks
          </p>

          <div className="project-grid">
            {researchProjects.map((project) => {
              const stats = getTaskStats(project.tasks);
              return (
                <Link
                  to={`/project/${project.id}`}
                  key={project.id}
                  className="project-card"
                  style={{ '--project-color': project.color }}
                >
                  <div className="project-card-header">
                    <div className="project-icon" style={{ color: project.color }}>
                      {ProjectIcons[project.icon]}
                    </div>
                    <div className="project-status-badge">
                      {stats.percentage}% Complete
                    </div>
                  </div>

                  <div className="project-card-body">
                    <h3 className="project-title">{project.title}</h3>
                    <p className="project-subtitle">{project.subtitle}</p>
                    <p className="project-description">{project.description}</p>
                  </div>

                  <div className="project-card-footer">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${stats.percentage}%`, backgroundColor: project.color }}
                      />
                    </div>
                    <div className="task-stats">
                      <span className="stat">
                        <span className="stat-number">{stats.done}</span> done
                      </span>
                      <span className="stat">
                        <span className="stat-number">{stats.inProgress}</span> in progress
                      </span>
                      <span className="stat">
                        <span className="stat-number">{stats.total}</span> total
                      </span>
                    </div>
                    <div className="approaches">
                      {project.approaches.slice(0, 3).map((approach, idx) => (
                        <span key={idx} className="approach-tag">{approach}</span>
                      ))}
                    </div>
                  </div>

                  <div className="card-hover-indicator">
                    View Kanban Board →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="quick-stats">
          <h2>Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{researchProjects.length}</span>
              <span className="stat-label">Active Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {researchProjects.reduce((acc, p) => acc + Object.values(p.tasks).flat().length, 0)}
              </span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {researchProjects.reduce((acc, p) => acc + p.tasks.inProgress.length, 0)}
              </span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {researchProjects.reduce((acc, p) => acc + p.tasks.done.length, 0)}
              </span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Research Project Management Dashboard</p>
      </footer>
    </div>
  );
}

export default LandingPage;
