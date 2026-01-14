import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import AddProjectModal from './AddProjectModal';
import { useApp } from '../context/AppContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';

// KanLab Logo
const KanLabLogo = () => (
  <svg viewBox="0 0 48 48" className="kanlab-logo" width="48" height="48">
    <defs>
      <linearGradient id="kanlab-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    {/* Kanban board columns */}
    <rect x="4" y="8" width="10" height="32" rx="2" fill="url(#kanlab-gradient)" opacity="0.9"/>
    <rect x="19" y="8" width="10" height="24" rx="2" fill="url(#kanlab-gradient)" opacity="0.7"/>
    <rect x="34" y="8" width="10" height="16" rx="2" fill="url(#kanlab-gradient)" opacity="0.5"/>
    {/* Task cards */}
    <rect x="6" y="12" width="6" height="4" rx="1" fill="white" opacity="0.9"/>
    <rect x="6" y="20" width="6" height="4" rx="1" fill="white" opacity="0.7"/>
    <rect x="6" y="28" width="6" height="4" rx="1" fill="white" opacity="0.5"/>
    <rect x="21" y="12" width="6" height="4" rx="1" fill="white" opacity="0.8"/>
    <rect x="21" y="20" width="6" height="4" rx="1" fill="white" opacity="0.6"/>
    <rect x="36" y="12" width="6" height="4" rx="1" fill="white" opacity="0.7"/>
  </svg>
);

// Project icons - Biomedical Research
const ProjectIcons = {
  // CAR-T Cell - T-cell with CAR receptor
  cart: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="32" r="22" fill="currentColor" opacity="0.9"/>
      <circle cx="32" cy="32" r="16" fill="currentColor"/>
      {/* T-cell receptor */}
      <path d="M32 10 L32 18 M28 12 L32 18 L36 12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
      {/* CAR construct */}
      <rect x="28" y="6" width="8" height="6" rx="2" fill="#81C784"/>
      {/* Cell surface proteins */}
      <circle cx="18" cy="28" r="3" fill="#A5D6A7"/>
      <circle cx="46" cy="28" r="3" fill="#A5D6A7"/>
      <circle cx="20" cy="42" r="3" fill="#A5D6A7"/>
      <circle cx="44" cy="42" r="3" fill="#A5D6A7"/>
      {/* Nucleus */}
      <ellipse cx="32" cy="36" rx="8" ry="6" fill="#1B5E20" opacity="0.5"/>
    </svg>
  ),
  // CRISPR - DNA double helix with scissors
  crispr: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      {/* DNA helix backbone */}
      <path d="M20 8 Q32 20 20 32 Q8 44 20 56" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8"/>
      <path d="M44 8 Q32 20 44 32 Q56 44 44 56" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.8"/>
      {/* Base pairs */}
      <line x1="22" y1="14" x2="42" y2="14" stroke="#64B5F6" strokeWidth="2"/>
      <line x1="18" y1="26" x2="46" y2="26" stroke="#64B5F6" strokeWidth="2"/>
      <line x1="18" y1="38" x2="46" y2="38" stroke="#64B5F6" strokeWidth="2"/>
      <line x1="22" y1="50" x2="42" y2="50" stroke="#64B5F6" strokeWidth="2"/>
      {/* Scissors/Cas9 */}
      <circle cx="46" cy="32" r="8" fill="#1565C0"/>
      <path d="M42 28 L50 36 M50 28 L42 36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Tumor Microenvironment - cells in spatial arrangement
  tme: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      {/* Tumor cells */}
      <circle cx="32" cy="32" r="10" fill="currentColor"/>
      <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="40" cy="24" r="7" fill="currentColor" opacity="0.8"/>
      <circle cx="26" cy="42" r="5" fill="currentColor" opacity="0.7"/>
      <circle cx="40" cy="40" r="6" fill="currentColor" opacity="0.7"/>
      {/* Immune cells (smaller, different color) */}
      <circle cx="14" cy="30" r="4" fill="#CE93D8"/>
      <circle cx="50" cy="30" r="4" fill="#CE93D8"/>
      <circle cx="18" cy="46" r="3" fill="#CE93D8"/>
      <circle cx="48" cy="18" r="3" fill="#CE93D8"/>
      <circle cx="32" cy="52" r="3" fill="#CE93D8"/>
      {/* Stroma/ECM lines */}
      <path d="M8 16 Q16 20 12 28" stroke="#E1BEE7" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M52 48 Q56 44 54 36" stroke="#E1BEE7" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
  ),
  // Single-cell RNA-seq - cell with data/barcode
  scrna: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      {/* Main cell */}
      <circle cx="28" cy="32" r="20" fill="currentColor" opacity="0.9"/>
      {/* Nucleus */}
      <circle cx="28" cy="34" r="10" fill="#BF360C" opacity="0.6"/>
      {/* mRNA transcripts */}
      <path d="M22 26 Q26 24 30 26" stroke="#FFCC80" strokeWidth="2" fill="none"/>
      <path d="M20 32 Q24 30 28 32" stroke="#FFCC80" strokeWidth="2" fill="none"/>
      <path d="M24 40 Q28 38 32 40" stroke="#FFCC80" strokeWidth="2" fill="none"/>
      {/* Data/barcode visualization */}
      <rect x="50" y="16" width="3" height="12" fill="#FF8A65"/>
      <rect x="54" y="20" width="3" height="8" fill="#FF8A65"/>
      <rect x="50" y="32" width="3" height="16" fill="#FFAB91"/>
      <rect x="54" y="36" width="3" height="12" fill="#FFAB91"/>
      {/* Arrow from cell to data */}
      <path d="M44 32 L48 32" stroke="#FFE0B2" strokeWidth="2" markerEnd="url(#arrow)"/>
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
          <div className="kanlab-brand">
            <KanLabLogo />
            <div className="kanlab-title-group">
              <h1>KanLab</h1>
              <p className="subtitle">Research Project Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="projects-overview">
          <div className="section-header">
            <div>
              <h2>Active Projects</h2>
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
        <p>KanLab - Research Project Management</p>
        <span className="version-tag">v0.1</span>
        <p className="copyright">Created by Eric Perkey. All rights reserved.</p>
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
