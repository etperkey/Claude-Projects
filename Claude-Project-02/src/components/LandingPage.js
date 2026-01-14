import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import AddProjectModal from './AddProjectModal';
import { useApp } from '../context/AppContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';

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
  const { isProjectArchived, archiveProject, unarchiveProject, archivedProjects, logActivity } = useApp();
  const triggerSync = useSyncTrigger();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();
  const [customProjects, setCustomProjects] = useState([]);
  const [savedTasks, setSavedTasks] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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
  const saveCustomProjects = useCallback((projects) => {
    localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(projects));
    setCustomProjects(projects);
    triggerSync();
  }, [triggerSync]);

  const handleAddProject = (newProject) => {
    const updated = [...customProjects, newProject];
    saveCustomProjects(updated);
    logActivity('project_created', {
      projectId: newProject.id,
      projectTitle: newProject.title
    });
  };

  const handleDeleteProject = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const project = customProjects.find(p => p.id === projectId);
    if (!project) return;

    // Move to trash instead of permanent deletion
    moveToTrash(TRASH_ITEM_TYPES.PROJECT, project, {
      projectId: project.id,
      projectTitle: project.title
    });

    // Remove from active projects
    const updated = customProjects.filter(p => p.id !== projectId);
    saveCustomProjects(updated);
    showSuccess(`"${project.title}" moved to trash`);
  };

  const handleArchiveProject = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    archiveProject(projectId);
  };

  const handleUnarchiveProject = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    unarchiveProject(projectId);
  };

  // Get tasks for a project (use saved tasks if available)
  const getProjectTasks = (project) => {
    if (project.isCustom) {
      return project.tasks;
    }
    return savedTasks[project.id] || project.tasks;
  };

  const allProjects = [...researchProjects, ...customProjects];
  const activeProjects = allProjects.filter(p => !isProjectArchived(p.id));
  const archivedProjectsList = allProjects.filter(p => isProjectArchived(p.id));

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
            <div className="header-actions">
              {archivedProjects.length > 0 && (
                <button
                  className="show-archived-btn"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  📦 {showArchived ? 'Hide' : 'Show'} Archived ({archivedProjects.length})
                </button>
              )}
              <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
                + New Project
              </button>
            </div>
          </div>

          <div className="project-grid">
            {activeProjects.map((project) => {
              const projectTasks = getProjectTasks(project);
              const stats = getTaskStats(projectTasks);
              return (
                <Link
                  to={`/project/${project.id}`}
                  key={project.id}
                  className="project-card"
                  style={{ '--project-color': project.color }}
                >
                  <div className="project-card-actions">
                    <button
                      className="archive-project-btn"
                      onClick={(e) => handleArchiveProject(e, project.id)}
                      title="Archive project"
                    >
                      📦
                    </button>
                    {project.isCustom && (
                      <button
                        className="delete-project-btn"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        title="Delete project"
                      >
                        &times;
                      </button>
                    )}
                  </div>
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

          {/* Archived Projects Section */}
          {showArchived && archivedProjectsList.length > 0 && (
            <div className="archived-section">
              <h3>📦 Archived Projects</h3>
              <div className="project-grid archived-grid">
                {archivedProjectsList.map((project) => {
                  const projectTasks = getProjectTasks(project);
                  const stats = getTaskStats(projectTasks);
                  return (
                    <div
                      key={project.id}
                      className="project-card archived"
                      style={{ '--project-color': project.color }}
                    >
                      <div className="project-card-actions">
                        <button
                          className="unarchive-project-btn"
                          onClick={(e) => handleUnarchiveProject(e, project.id)}
                          title="Restore project"
                        >
                          📂 Restore
                        </button>
                      </div>
                      <div className="project-card-header">
                        <div className="project-icon" style={{ color: project.color, opacity: 0.5 }}>
                          {ProjectIcons[project.icon] || ProjectIcons.custom}
                        </div>
                        <div className="project-status-badge">
                          {stats.percentage}% Complete
                        </div>
                      </div>

                      <div className="project-card-body">
                        <h3 className="project-title">{project.title}</h3>
                        <p className="project-subtitle">{project.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="quick-stats">
          <h2>Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{activeProjects.length}</span>
              <span className="stat-label">Active Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {activeProjects.reduce((acc, p) => acc + Object.values(getProjectTasks(p)).flat().length, 0)}
              </span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {activeProjects.reduce((acc, p) => acc + (getProjectTasks(p).inProgress?.length || 0), 0)}
              </span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {activeProjects.reduce((acc, p) => acc + (getProjectTasks(p).done?.length || 0), 0)}
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
