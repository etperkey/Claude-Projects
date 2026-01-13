import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import AddProjectModal from './AddProjectModal';

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
  ),
  custom: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <rect x="12" y="12" width="40" height="40" rx="8" fill="currentColor"/>
      <circle cx="32" cy="28" r="8" fill="white" opacity="0.3"/>
      <rect x="24" y="40" width="16" height="4" rx="2" fill="white" opacity="0.3"/>
    </svg>
  )
};

// Calculate task stats
const getTaskStats = (tasks) => {
  const total = Object.values(tasks).flat().length;
  const done = tasks.done?.length || 0;
  const inProgress = tasks.inProgress?.length || 0;
  return { total, done, inProgress, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
};

// localStorage keys
const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function LandingPage() {
  const [customProjects, setCustomProjects] = useState([]);
  const [savedTasks, setSavedTasks] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load custom projects and saved tasks from localStorage
  useEffect(() => {
    // Load custom projects
    const savedCustom = localStorage.getItem(CUSTOM_PROJECTS_KEY);
    if (savedCustom) {
      try {
        setCustomProjects(JSON.parse(savedCustom));
      } catch (e) {
        console.error('Failed to load custom projects:', e);
      }
    }

    // Load saved task states for built-in projects
    const savedTaskData = localStorage.getItem(TASK_STORAGE_KEY);
    if (savedTaskData) {
      try {
        setSavedTasks(JSON.parse(savedTaskData));
      } catch (e) {
        console.error('Failed to load saved tasks:', e);
      }
    }
  }, []);

  // Save custom projects to localStorage
  const saveCustomProjects = (projects) => {
    localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(projects));
    setCustomProjects(projects);
  };

  const handleAddProject = (newProject) => {
    const updated = [...customProjects, newProject];
    saveCustomProjects(updated);
  };

  const handleDeleteProject = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      const updated = customProjects.filter(p => p.id !== projectId);
      saveCustomProjects(updated);
    }
  };

  // Get tasks for a project (use saved tasks if available)
  const getProjectTasks = (project) => {
    if (project.isCustom) {
      return project.tasks;
    }
    return savedTasks[project.id] || project.tasks;
  };

  const allProjects = [...researchProjects, ...customProjects];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="header-content">
          <h1>Eric Perkey's Research Project Dashboard</h1>
          <p className="subtitle">Lymphoma Biology & Immunotherapy Research</p>
        </div>
      </header>

      <main className="landing-main">
        <section className="projects-overview">
          <div className="section-header">
            <div>
              <h2>Active Research Projects</h2>
              <p className="section-description">
                Click on a project to view detailed Kanban board and manage tasks
              </p>
            </div>
            <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
              + New Project
            </button>
          </div>

          <div className="project-grid">
            {allProjects.map((project) => {
              const projectTasks = getProjectTasks(project);
              const stats = getTaskStats(projectTasks);
              return (
                <Link
                  to={`/project/${project.id}`}
                  key={project.id}
                  className="project-card"
                  style={{ '--project-color': project.color }}
                >
                  {project.isCustom && (
                    <button
                      className="delete-project-btn"
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      title="Delete project"
                    >
                      &times;
                    </button>
                  )}
                  <div className="project-card-header">
                    <div className="project-icon" style={{ color: project.color }}>
                      {ProjectIcons[project.icon] || ProjectIcons.custom}
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
              <span className="stat-value">{allProjects.length}</span>
              <span className="stat-label">Active Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {allProjects.reduce((acc, p) => acc + Object.values(getProjectTasks(p)).flat().length, 0)}
              </span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {allProjects.reduce((acc, p) => acc + (getProjectTasks(p).inProgress?.length || 0), 0)}
              </span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {allProjects.reduce((acc, p) => acc + (getProjectTasks(p).done?.length || 0), 0)}
              </span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Research Project Management Dashboard</p>
      </footer>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProject={handleAddProject}
      />
    </div>
  );
}

export default LandingPage;
