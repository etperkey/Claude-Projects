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
  ),
  // Science/Biology Icons
  dna: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M20 4 Q38 16 20 32 Q2 48 20 60" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path d="M44 4 Q26 16 44 32 Q62 48 44 60" stroke="currentColor" strokeWidth="4" fill="none"/>
      <line x1="20" y1="10" x2="44" y2="10" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="14" y1="22" x2="50" y2="22" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="14" y1="42" x2="50" y2="42" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      <line x1="20" y1="54" x2="44" y2="54" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
    </svg>
  ),
  cell: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="32" cy="32" rx="26" ry="22" fill="currentColor" opacity="0.3"/>
      <ellipse cx="32" cy="32" rx="24" ry="20" stroke="currentColor" strokeWidth="3" fill="none"/>
      <ellipse cx="32" cy="34" rx="10" ry="8" fill="currentColor" opacity="0.8"/>
      <circle cx="20" cy="26" r="3" fill="currentColor" opacity="0.5"/>
      <circle cx="44" cy="28" r="2" fill="currentColor" opacity="0.5"/>
      <circle cx="22" cy="40" r="2" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  microscope: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <rect x="28" y="4" width="8" height="24" rx="2" fill="currentColor"/>
      <ellipse cx="32" cy="32" rx="6" ry="4" fill="currentColor" opacity="0.8"/>
      <line x1="32" y1="36" x2="32" y2="52" stroke="currentColor" strokeWidth="4"/>
      <ellipse cx="32" cy="56" rx="16" ry="4" fill="currentColor" opacity="0.6"/>
      <rect x="16" y="18" width="8" height="6" rx="1" fill="currentColor" opacity="0.7"/>
      <line x1="16" y1="21" x2="8" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M24 4 L24 24 L8 52 Q6 56 10 58 L54 58 Q58 56 56 52 L40 24 L40 4" stroke="currentColor" strokeWidth="3" fill="none"/>
      <line x1="20" y1="4" x2="44" y2="4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12 48 Q32 40 52 48 L54 54 Q32 46 10 54 Z" fill="currentColor" opacity="0.4"/>
      <circle cx="20" cy="50" r="2" fill="currentColor"/>
      <circle cx="32" cy="46" r="3" fill="currentColor"/>
      <circle cx="44" cy="52" r="2" fill="currentColor"/>
    </svg>
  ),
  antibody: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 56 L32 36" stroke="currentColor" strokeWidth="4"/>
      <path d="M32 36 L20 24 L12 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <path d="M32 36 L44 24 L52 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="52" cy="12" r="6" fill="currentColor" opacity="0.8"/>
      <rect x="28" y="54" width="8" height="6" rx="2" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  virus: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="32" r="16" fill="currentColor" opacity="0.8"/>
      <circle cx="32" cy="32" r="12" fill="currentColor"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 32 + Math.cos(rad) * 16;
        const y1 = 32 + Math.sin(rad) * 16;
        const x2 = 32 + Math.cos(rad) * 26;
        const y2 = 32 + Math.sin(rad) * 26;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>;
      })}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 32 + Math.cos(rad) * 26;
        const cy = 32 + Math.sin(rad) * 26;
        return <circle key={i} cx={cx} cy={cy} r="4" fill="currentColor"/>;
      })}
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="24" cy="28" rx="14" ry="16" fill="currentColor" opacity="0.8"/>
      <ellipse cx="40" cy="28" rx="14" ry="16" fill="currentColor" opacity="0.8"/>
      <path d="M18 20 Q24 16 32 20 Q40 16 46 20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
      <path d="M16 32 Q24 28 32 32 Q40 28 48 32" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
      <ellipse cx="32" cy="48" rx="8" ry="6" fill="currentColor"/>
      <line x1="32" y1="54" x2="32" y2="60" stroke="currentColor" strokeWidth="4"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 56 L12 36 Q4 28 4 20 Q4 8 16 8 Q24 8 32 18 Q40 8 48 8 Q60 8 60 20 Q60 28 52 36 Z" fill="currentColor"/>
      <path d="M20 24 Q28 24 32 32" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
    </svg>
  ),
  molecule: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <circle cx="32" cy="20" r="8" fill="currentColor"/>
      <circle cx="16" cy="44" r="8" fill="currentColor" opacity="0.8"/>
      <circle cx="48" cy="44" r="8" fill="currentColor" opacity="0.8"/>
      <line x1="32" y1="28" x2="20" y2="38" stroke="currentColor" strokeWidth="3"/>
      <line x1="32" y1="28" x2="44" y2="38" stroke="currentColor" strokeWidth="3"/>
      <line x1="24" y1="44" x2="40" y2="44" stroke="currentColor" strokeWidth="3"/>
    </svg>
  ),
  petri: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <ellipse cx="32" cy="36" rx="26" ry="12" fill="currentColor" opacity="0.3"/>
      <ellipse cx="32" cy="32" rx="26" ry="12" stroke="currentColor" strokeWidth="3" fill="none"/>
      <ellipse cx="32" cy="28" rx="26" ry="12" stroke="currentColor" strokeWidth="3" fill="none"/>
      <circle cx="24" cy="30" r="4" fill="currentColor" opacity="0.6"/>
      <circle cx="38" cy="28" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="28" cy="34" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="42" cy="32" r="3" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  testtube: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M24 8 L24 44 Q24 56 32 56 Q40 56 40 44 L40 8" stroke="currentColor" strokeWidth="3" fill="none"/>
      <line x1="20" y1="8" x2="44" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M24 36 Q32 32 40 36 L40 44 Q40 52 32 52 Q24 52 24 44 Z" fill="currentColor" opacity="0.4"/>
      <circle cx="30" cy="44" r="2" fill="currentColor"/>
      <circle cx="36" cy="40" r="2" fill="currentColor"/>
    </svg>
  ),
  syringe: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <rect x="18" y="28" width="28" height="12" rx="2" fill="currentColor"/>
      <rect x="46" y="30" width="12" height="8" rx="1" fill="currentColor" opacity="0.8"/>
      <line x1="58" y1="34" x2="62" y2="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <rect x="6" y="32" width="12" height="4" fill="currentColor" opacity="0.6"/>
      <line x1="4" y1="34" x2="6" y2="34" stroke="currentColor" strokeWidth="2"/>
      <line x1="26" y1="30" x2="26" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <line x1="34" y1="30" x2="34" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <rect x="10" y="26" width="4" height="16" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
  chromosome: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M20 8 Q12 8 12 16 L12 28 Q12 32 16 32 Q12 32 12 36 L12 48 Q12 56 20 56" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M44 8 Q52 8 52 16 L52 28 Q52 32 48 32 Q52 32 52 36 L52 48 Q52 56 44 56" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <ellipse cx="32" cy="32" rx="6" ry="4" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  protein: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M8 32 Q16 16 28 24 Q40 32 32 44 Q24 56 40 48 Q56 40 56 32" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <circle cx="8" cy="32" r="4" fill="currentColor"/>
      <circle cx="28" cy="24" r="4" fill="currentColor" opacity="0.8"/>
      <circle cx="32" cy="44" r="4" fill="currentColor" opacity="0.8"/>
      <circle cx="56" cy="32" r="4" fill="currentColor"/>
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 64 64" className="project-card-icon">
      <path d="M32 58 Q32 40 24 32 Q8 16 32 8 Q56 16 40 32 Q32 40 32 58" fill="currentColor" opacity="0.8"/>
      <path d="M32 58 L32 20" stroke="currentColor" strokeWidth="2"/>
      <path d="M32 28 Q24 32 20 28" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M32 36 Q40 40 44 36" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M32 44 Q26 48 22 44" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  )
};

// Icon options for the icon selector
export const ICON_OPTIONS = [
  { id: 'custom', name: 'Custom' },
  { id: 'cart', name: 'CAR-T Cell' },
  { id: 'crispr', name: 'CRISPR' },
  { id: 'tme', name: 'Tumor Microenvironment' },
  { id: 'scrna', name: 'Single-cell RNA' },
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
  { id: 'leaf', name: 'Leaf' }
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
  const [projectOverrides, setProjectOverrides] = useState({});
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverProject, setDragOverProject] = useState(null);

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

    // Load project overrides
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
    // Add a slight delay to allow the drag image to be set
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
    // Only clear if leaving the card entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverProject(null);
    }
  };

  const handleDrop = (e, targetProjectId) => {
    e.preventDefault();
    if (!draggedProject || draggedProject === targetProjectId) return;

    const allProjectIds = activeProjects.map(p => p.id);

    // Get current order (use saved order or default order)
    let currentOrder = projectOrder.length > 0
      ? projectOrder.filter(id => allProjectIds.includes(id))
      : allProjectIds;

    // Add any new projects not in the order
    allProjectIds.forEach(id => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });

    const draggedIndex = currentOrder.indexOf(draggedProject);
    const targetIndex = currentOrder.indexOf(targetProjectId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at new position
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
    // Projects not in order go to the end
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
