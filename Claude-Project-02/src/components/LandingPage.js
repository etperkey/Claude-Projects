import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import AddProjectModal from './AddProjectModal';
import { useApp } from '../context/AppContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';

// Project icons
// Science/Biology Project Icons
const ProjectIcons = {
  // DNA Double Helix
  dna: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M20 8 Q32 20 20 32 Q8 44 20 56" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path d="M44 8 Q32 20 44 32 Q56 44 44 56" stroke="currentColor" strokeWidth="4" fill="none"/>
      <line x1="22" y1="14" x2="42" y2="14" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="18" y1="26" x2="46" y2="26" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="18" y1="38" x2="46" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="22" y1="50" x2="42" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
    </svg>
  ),
  // Cell
  cell: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="32" cy="32" rx="26" ry="22" fill="currentColor" opacity="0.9"/>
      <ellipse cx="32" cy="34" rx="12" ry="10" fill="currentColor"/>
      <circle cx="32" cy="34" r="5" fill="white" opacity="0.3"/>
      <circle cx="20" cy="26" r="3" fill="white" opacity="0.2"/>
      <circle cx="44" cy="38" r="4" fill="white" opacity="0.2"/>
    </svg>
  ),
  // Microscope
  microscope: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <rect x="28" y="8" width="8" height="20" rx="2" fill="currentColor"/>
      <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.8"/>
      <rect x="30" y="40" width="4" height="12" fill="currentColor"/>
      <rect x="20" y="52" width="24" height="4" rx="2" fill="currentColor"/>
      <ellipse cx="32" cy="32" rx="4" ry="4" fill="white" opacity="0.3"/>
    </svg>
  ),
  // Flask/Beaker
  flask: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M24 8 L24 24 L12 52 Q10 56 14 58 L50 58 Q54 56 52 52 L40 24 L40 8" fill="currentColor" opacity="0.9"/>
      <rect x="22" y="6" width="20" height="4" rx="1" fill="currentColor"/>
      <path d="M16 44 Q32 38 48 44 L52 52 Q54 56 50 58 L14 58 Q10 56 12 52 Z" fill="currentColor"/>
      <circle cx="24" cy="50" r="3" fill="white" opacity="0.3"/>
      <circle cx="38" cy="48" r="2" fill="white" opacity="0.3"/>
    </svg>
  ),
  // Antibody (Y-shape)
  antibody: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 56 L32 36 M32 36 L18 20 M32 36 L46 20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <circle cx="18" cy="16" r="8" fill="currentColor"/>
      <circle cx="46" cy="16" r="8" fill="currentColor"/>
      <circle cx="32" cy="56" r="6" fill="currentColor"/>
    </svg>
  ),
  // Virus
  virus: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="32" r="16" fill="currentColor"/>
      <circle cx="32" cy="8" r="4" fill="currentColor"/>
      <circle cx="32" cy="56" r="4" fill="currentColor"/>
      <circle cx="8" cy="32" r="4" fill="currentColor"/>
      <circle cx="56" cy="32" r="4" fill="currentColor"/>
      <circle cx="15" cy="15" r="3" fill="currentColor"/>
      <circle cx="49" cy="15" r="3" fill="currentColor"/>
      <circle cx="15" cy="49" r="3" fill="currentColor"/>
      <circle cx="49" cy="49" r="3" fill="currentColor"/>
    </svg>
  ),
  // Brain
  brain: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="24" cy="28" rx="14" ry="16" fill="currentColor"/>
      <ellipse cx="40" cy="28" rx="14" ry="16" fill="currentColor"/>
      <ellipse cx="24" cy="44" rx="10" ry="10" fill="currentColor" opacity="0.9"/>
      <ellipse cx="40" cy="44" rx="10" ry="10" fill="currentColor" opacity="0.9"/>
      <path d="M24 20 Q28 24 24 28 Q20 32 24 36" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
      <path d="M40 20 Q36 24 40 28 Q44 32 40 36" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
    </svg>
  ),
  // Heart
  heart: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 56 L12 36 Q4 28 12 18 Q20 10 32 22 Q44 10 52 18 Q60 28 52 36 Z" fill="currentColor"/>
      <path d="M20 24 Q24 20 28 24" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
    </svg>
  ),
  // Molecule
  molecule: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="32" r="10" fill="currentColor"/>
      <circle cx="16" cy="16" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="48" cy="16" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="16" cy="48" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="48" cy="48" r="6" fill="currentColor" opacity="0.8"/>
      <line x1="26" y1="26" x2="20" y2="20" stroke="currentColor" strokeWidth="3"/>
      <line x1="38" y1="26" x2="44" y2="20" stroke="currentColor" strokeWidth="3"/>
      <line x1="26" y1="38" x2="20" y2="44" stroke="currentColor" strokeWidth="3"/>
      <line x1="38" y1="38" x2="44" y2="44" stroke="currentColor" strokeWidth="3"/>
    </svg>
  ),
  // Petri Dish
  petri: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="32" cy="36" rx="26" ry="16" fill="currentColor" opacity="0.6"/>
      <ellipse cx="32" cy="32" rx="26" ry="16" fill="currentColor"/>
      <circle cx="24" cy="30" r="4" fill="white" opacity="0.3"/>
      <circle cx="38" cy="34" r="3" fill="white" opacity="0.3"/>
      <circle cx="30" cy="38" r="2" fill="white" opacity="0.3"/>
    </svg>
  ),
  // Test Tube
  testtube: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M24 8 L24 44 Q24 56 32 56 Q40 56 40 44 L40 8" fill="currentColor" opacity="0.9"/>
      <rect x="22" y="6" width="20" height="4" rx="1" fill="currentColor"/>
      <path d="M24 32 L40 32 L40 44 Q40 56 32 56 Q24 56 24 44 Z" fill="currentColor"/>
      <circle cx="30" cy="44" r="3" fill="white" opacity="0.3"/>
    </svg>
  ),
  // Syringe
  syringe: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <rect x="20" y="12" width="24" height="36" rx="2" fill="currentColor" opacity="0.9"/>
      <rect x="28" y="4" width="8" height="10" rx="1" fill="currentColor"/>
      <rect x="30" y="48" width="4" height="12" fill="currentColor"/>
      <line x1="24" y1="20" x2="40" y2="20" stroke="white" strokeWidth="2" opacity="0.3"/>
      <line x1="24" y1="28" x2="40" y2="28" stroke="white" strokeWidth="2" opacity="0.3"/>
      <line x1="24" y1="36" x2="40" y2="36" stroke="white" strokeWidth="2" opacity="0.3"/>
    </svg>
  ),
  // Chromosome
  chromosome: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M20 8 Q14 16 20 32 Q14 48 20 56" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M44 8 Q50 16 44 32 Q50 48 44 56" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <rect x="18" y="28" width="28" height="8" rx="2" fill="currentColor"/>
    </svg>
  ),
  // Protein
  protein: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M12 32 Q20 16 32 24 Q44 32 32 40 Q20 48 32 56 Q44 48 52 32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <circle cx="12" cy="32" r="4" fill="currentColor"/>
      <circle cx="52" cy="32" r="4" fill="currentColor"/>
    </svg>
  ),
  // Leaf/Plant
  leaf: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 56 L32 32 Q16 24 16 16 Q16 8 32 8 Q48 8 48 16 Q48 24 32 32" fill="currentColor"/>
      <path d="M32 32 L32 16" stroke="white" strokeWidth="2" opacity="0.3"/>
      <path d="M28 24 L32 20 L36 24" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
    </svg>
  ),
  // Original icons kept for backwards compatibility
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

// Icon options for the selector (id and display name)
export const ICON_OPTIONS = [
  { id: 'dna', name: 'DNA Helix' },
  { id: 'cell', name: 'Cell' },
  { id: 'microscope', name: 'Microscope' },
  { id: 'flask', name: 'Flask' },
  { id: 'antibody', name: 'Antibody' },
  { id: 'virus', name: 'Virus' },
  { id: 'brain', name: 'Brain' },
  { id: 'heart', name: 'Heart' },
  { id: 'molecule', name: 'Molecule' },
  { id: 'petri', name: 'Petri Dish' },
  { id: 'testtube', name: 'Test Tube' },
  { id: 'syringe', name: 'Syringe' },
  { id: 'chromosome', name: 'Chromosome' },
  { id: 'protein', name: 'Protein' },
  { id: 'leaf', name: 'Plant/Leaf' },
  { id: 'custom', name: 'Default' }
];

export { ProjectIcons };

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
const PROJECT_ORDER_KEY = 'research-dashboard-project-order';
const PROJECT_OVERRIDES_KEY = 'research-dashboard-project-overrides';

function LandingPage() {
  const { isProjectArchived, archiveProject, unarchiveProject, archivedProjects, logActivity } = useApp();
  const triggerSync = useSyncTrigger();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();
  const [customProjects, setCustomProjects] = useState([]);
  const [savedTasks, setSavedTasks] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [projectOrder, setProjectOrder] = useState([]);
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverProject, setDragOverProject] = useState(null);
  const [projectOverrides, setProjectOverrides] = useState({});

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

    // Load project order
    const savedOrder = localStorage.getItem(PROJECT_ORDER_KEY);
    if (savedOrder) {
      try {
        setProjectOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to load project order:', e);
      }
    }

    // Load project overrides for built-in projects
    const savedOverrides = localStorage.getItem(PROJECT_OVERRIDES_KEY);
    if (savedOverrides) {
      try {
        setProjectOverrides(JSON.parse(savedOverrides));
      } catch (e) {
        console.error('Failed to load project overrides:', e);
      }
    }
  }, []);

  // Save custom projects to localStorage
  const saveCustomProjects = useCallback((projects) => {
    localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(projects));
    setCustomProjects(projects);
    triggerSync();
  }, [triggerSync]);

  // Save project order to localStorage
  const saveProjectOrder = useCallback((order) => {
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(order));
    setProjectOrder(order);
    triggerSync();
  }, [triggerSync]);

  // Drag and drop handlers
  const handleDragStart = (e, projectId) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedProject(null);
    setDragOverProject(null);
  };

  const handleDragOver = (e, projectId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (projectId !== draggedProject) {
      setDragOverProject(projectId);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverProject(null);
    }
  };

  const handleDrop = (e, targetProjectId) => {
    e.preventDefault();
    if (!draggedProject || draggedProject === targetProjectId) return;

    const allProjectIds = activeProjects.map(p => p.id);
    let currentOrder = projectOrder.length > 0
      ? projectOrder.filter(id => allProjectIds.includes(id))
      : allProjectIds;

    allProjectIds.forEach(id => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });

    const draggedIndex = currentOrder.indexOf(draggedProject);
    const targetIndex = currentOrder.indexOf(targetProjectId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedProject);

    saveProjectOrder(newOrder);
    setDraggedProject(null);
    setDragOverProject(null);
  };

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

  // Apply overrides to built-in projects
  const projectsWithOverrides = researchProjects.map(p => {
    if (projectOverrides[p.id]) {
      return { ...p, ...projectOverrides[p.id] };
    }
    return p;
  });

  const allProjects = [...projectsWithOverrides, ...customProjects];
  const activeProjectsUnsorted = allProjects.filter(p => !isProjectArchived(p.id));

  // Sort active projects by saved order
  const activeProjects = [...activeProjectsUnsorted].sort((a, b) => {
    const indexA = projectOrder.indexOf(a.id);
    const indexB = projectOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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
              const isDragging = draggedProject === project.id;
              const isDragOver = dragOverProject === project.id;
              return (
                <Link
                  to={`/project/${project.id}`}
                  key={project.id}
                  className={`project-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  style={{ '--project-color': project.color }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, project.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, project.id)}
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
