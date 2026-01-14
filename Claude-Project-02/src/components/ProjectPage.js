import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById } from '../data/projects';
import KanbanBoard from './KanbanBoard';
import ProtocolsResults from './ProtocolsResults';
import ResearchNotes from './ResearchNotes';
import ProjectLabNotebook from './ProjectLabNotebook';
import RecurringTasksManager from './RecurringTasksManager';
import TaskTemplatesManager from './TaskTemplatesManager';
import { useApp } from '../context/AppContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';
const NOTEBOOK_KEY = 'research-dashboard-lab-notebook';
const LITERATURE_KEY = 'research-dashboard-literature';

function ProjectPage() {
  const { projectId } = useParams();
  const { logActivity, isProjectArchived } = useApp();
  const triggerSync = useSyncTrigger();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban'); // kanban, protocols, or notes
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [notebookCount, setNotebookCount] = useState(0);
  const [citationsCount, setCitationsCount] = useState(0);

  useEffect(() => {
    // First try to get from built-in projects
    let foundProject = getProjectById(projectId);

    if (foundProject) {
      setProject(foundProject);
      setIsCustomProject(false);

      // Check localStorage for saved tasks for this project
      const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
      if (savedTasks) {
        try {
          const allSavedTasks = JSON.parse(savedTasks);
          if (allSavedTasks[projectId]) {
            setTasks(allSavedTasks[projectId]);
          } else {
            setTasks(foundProject.tasks);
          }
        } catch (e) {
          setTasks(foundProject.tasks);
        }
      } else {
        setTasks(foundProject.tasks);
      }
      setIsLoaded(true);
    } else {
      // Try to get from custom projects in localStorage
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        try {
          const customProjects = JSON.parse(saved);
          foundProject = customProjects.find(p => p.id === projectId);
          if (foundProject) {
            setProject(foundProject);
            setTasks(foundProject.tasks);
            setIsCustomProject(true);
            setIsLoaded(true);
          }
        } catch (e) {
          console.error('Failed to load custom projects:', e);
        }
      }
    }
  }, [projectId]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded || !project) return;

    if (isCustomProject) {
      // Save to custom projects storage
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        try {
          const customProjects = JSON.parse(saved);
          const updatedProjects = customProjects.map(p =>
            p.id === projectId ? { ...p, tasks } : p
          );
          localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(updatedProjects));
          triggerSync();
        } catch (e) {
          console.error('Failed to save tasks:', e);
        }
      }
    } else {
      // Save to general task storage for built-in projects
      const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
      let allSavedTasks = {};
      if (savedTasks) {
        try {
          allSavedTasks = JSON.parse(savedTasks);
        } catch (e) {
          allSavedTasks = {};
        }
      }
      allSavedTasks[projectId] = tasks;
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(allSavedTasks));
      triggerSync();
    }
  }, [tasks, isCustomProject, project, projectId, isLoaded, triggerSync]);

  // Load notebook entries and citations counts
  useEffect(() => {
    if (!project) return;

    // Count notebook entries for this project
    const notebookSaved = localStorage.getItem(NOTEBOOK_KEY);
    if (notebookSaved) {
      try {
        const allEntries = JSON.parse(notebookSaved);
        const projectTitleLower = project.title.toLowerCase();
        const projectIdLower = projectId.toLowerCase();

        const projectEntries = allEntries.filter(entry => {
          if (entry.projectId === projectId) return true;
          return entry.tags?.some(tag => {
            const tagLower = tag.toLowerCase();
            return tagLower === projectTitleLower ||
                   tagLower === projectIdLower ||
                   projectTitleLower.includes(tagLower) ||
                   tagLower.includes(projectTitleLower);
          });
        });
        setNotebookCount(projectEntries.length);
      } catch (e) {
        setNotebookCount(0);
      }
    }

    // Count citations/literature for this project
    const literatureSaved = localStorage.getItem(LITERATURE_KEY);
    if (literatureSaved) {
      try {
        const all = JSON.parse(literatureSaved);
        const projectRefs = all[projectId] || [];
        setCitationsCount(projectRefs.length);
      } catch (e) {
        setCitationsCount(0);
      }
    }
  }, [project, projectId, activeTab]); // Re-count when tab changes (in case user added entries)

  // Start editing project
  const handleEditProject = () => {
    setEditedProject({
      title: project.title,
      subtitle: project.subtitle || '',
      description: project.description || '',
      hypothesis: project.hypothesis || '',
      approaches: project.approaches?.join(', ') || '',
      color: project.color || '#6366f1'
    });
    setIsEditingProject(true);
  };

  // Save project edits
  const handleSaveProject = () => {
    if (!editedProject.title.trim()) return;

    const updatedProject = {
      ...project,
      title: editedProject.title.trim(),
      subtitle: editedProject.subtitle.trim(),
      description: editedProject.description.trim(),
      hypothesis: editedProject.hypothesis.trim(),
      approaches: editedProject.approaches.split(',').map(a => a.trim()).filter(a => a),
      color: editedProject.color
    };

    if (isCustomProject) {
      // Update in custom projects storage
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        try {
          const customProjects = JSON.parse(saved);
          const updatedProjects = customProjects.map(p =>
            p.id === projectId ? { ...p, ...updatedProject } : p
          );
          localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(updatedProjects));
          triggerSync();
        } catch (e) {
          console.error('Failed to save project:', e);
        }
      }
    }

    setProject(updatedProject);
    setIsEditingProject(false);
    setEditedProject(null);
    showSuccess('Project updated successfully');
    logActivity('edit', 'project', updatedProject.title);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditingProject(false);
    setEditedProject(null);
  };

  if (!project) {
    return (
      <div className="project-page not-found">
        <h1>Project Not Found</h1>
        <Link to="/">← Back to Dashboard</Link>
      </div>
    );
  }

  // Check if archived
  if (isProjectArchived(projectId)) {
    return (
      <div className="project-page not-found">
        <h1>Project Archived</h1>
        <p>This project has been archived and is not visible.</p>
        <Link to="/">← Back to Dashboard</Link>
      </div>
    );
  }

  const handleTaskMove = (taskId, fromColumn, toColumn, targetIndex = null) => {
    setTasks(prevTasks => {
      const newTasks = { ...prevTasks };
      const taskIndex = newTasks[fromColumn].findIndex(t => t.id === taskId);

      if (taskIndex === -1) return prevTasks;

      const [task] = newTasks[fromColumn].splice(taskIndex, 1);

      if (targetIndex !== null && targetIndex >= 0) {
        newTasks[toColumn] = [
          ...newTasks[toColumn].slice(0, targetIndex),
          task,
          ...newTasks[toColumn].slice(targetIndex)
        ];
      } else {
        newTasks[toColumn] = [...newTasks[toColumn], task];
      }

      // Log activity
      logActivity('task_moved', {
        taskId,
        taskTitle: task.title,
        projectId,
        projectTitle: project.title,
        fromColumn,
        toColumn
      });

      return newTasks;
    });
  };

  const handleReorderTask = (taskId, columnId, fromIndex, toIndex) => {
    setTasks(prevTasks => {
      const newTasks = { ...prevTasks };
      const columnTasks = [...newTasks[columnId]];

      // Remove from old position
      const [task] = columnTasks.splice(fromIndex, 1);

      // Insert at new position
      columnTasks.splice(toIndex, 0, task);

      newTasks[columnId] = columnTasks;
      return newTasks;
    });
  };

  const handleAddTask = (column, taskTitle, priority = 'medium') => {
    const newTask = {
      id: `${project.id}-${Date.now()}`,
      title: taskTitle,
      priority,
      description: '',
      labels: [],
      checklist: [],
      links: []
    };

    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: [...prevTasks[column], newTask]
    }));

    logActivity('task_created', {
      taskId: newTask.id,
      taskTitle,
      projectId,
      projectTitle: project.title,
      column
    });
  };

  const handleDeleteTask = (taskId, column) => {
    const task = tasks[column]?.find(t => t.id === taskId);
    if (!task) return;

    // Move to trash instead of permanent deletion
    moveToTrash(TRASH_ITEM_TYPES.TASK, { ...task, column }, {
      projectId,
      projectTitle: project.title,
      column
    });

    // Remove from active tasks
    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: prevTasks[column].filter(t => t.id !== taskId)
    }));

    logActivity('task_deleted', {
      taskId,
      taskTitle: task.title,
      projectId,
      projectTitle: project.title,
      column
    });

    showSuccess(`"${task.title}" moved to trash`);
  };

  const handleUpdateTask = (taskId, column, updatedData) => {
    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: prevTasks[column].map(task =>
        task.id === taskId
          ? { ...task, ...updatedData }
          : task
      )
    }));

    logActivity('task_updated', {
      taskId,
      taskTitle: updatedData.title || tasks[column]?.find(t => t.id === taskId)?.title,
      projectId,
      projectTitle: project.title,
      column
    });
  };

  const totalTasks = Object.values(tasks).flat().length;
  const completedTasks = tasks.done?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0;

  return (
    <div className="project-page" style={{ '--project-color': project.color }}>
      <header className="project-header">
        <div className="header-nav">
          <Link to="/" className="back-link">← Dashboard</Link>
          {isCustomProject && !isEditingProject && (
            <button className="edit-project-btn" onClick={handleEditProject} title="Edit project details">
              ✏️ Edit
            </button>
          )}
        </div>
        {isEditingProject && editedProject ? (
          <div className="project-edit-form">
            <div className="edit-form-row">
              <label>Project Title</label>
              <input
                type="text"
                value={editedProject.title}
                onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                placeholder="Project title"
              />
            </div>
            <div className="edit-form-row">
              <label>Subtitle/Badge</label>
              <input
                type="text"
                value={editedProject.subtitle}
                onChange={(e) => setEditedProject({ ...editedProject, subtitle: e.target.value })}
                placeholder="e.g., CAR-T Therapy, Drug Discovery"
              />
            </div>
            <div className="edit-form-row">
              <label>Description</label>
              <textarea
                value={editedProject.description}
                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                placeholder="Brief project description"
                rows={2}
              />
            </div>
            <div className="edit-form-row">
              <label>Hypothesis</label>
              <textarea
                value={editedProject.hypothesis}
                onChange={(e) => setEditedProject({ ...editedProject, hypothesis: e.target.value })}
                placeholder="Main hypothesis or research question"
                rows={2}
              />
            </div>
            <div className="edit-form-row">
              <label>Approaches (comma-separated)</label>
              <input
                type="text"
                value={editedProject.approaches}
                onChange={(e) => setEditedProject({ ...editedProject, approaches: e.target.value })}
                placeholder="e.g., In vivo, CRISPR, Flow Cytometry"
              />
            </div>
            <div className="edit-form-row">
              <label>Color</label>
              <input
                type="color"
                value={editedProject.color}
                onChange={(e) => setEditedProject({ ...editedProject, color: e.target.value })}
              />
            </div>
            <div className="edit-form-actions">
              <button className="btn-cancel" onClick={handleCancelEdit}>Cancel</button>
              <button className="btn-save" onClick={handleSaveProject}>Save Changes</button>
            </div>
          </div>
        ) : (
          <>
            <div className="header-main">
              <div className="header-info">
                <div className="project-badge" style={{ backgroundColor: project.color }}>
                  {project.subtitle || 'Research Project'}
                </div>
                <h1>{project.title}</h1>
                <p className="project-hypothesis">{project.hypothesis || project.description}</p>
              </div>
              <div className="header-stats">
                <div className="header-stat">
                  <span className="stat-value">{completedTasks}/{totalTasks}</span>
                  <span className="stat-label">Tasks Complete</span>
                </div>
                <div className="header-stat">
                  <span className="stat-value">{progressPercent}%</span>
                  <span className="stat-label">Progress</span>
                </div>
                <div className="header-stat">
                  <span className="stat-value">{notebookCount}</span>
                  <span className="stat-label">Notebook Entries</span>
                </div>
                <div className="header-stat">
                  <span className="stat-value">{citationsCount}</span>
                  <span className="stat-label">Citations</span>
                </div>
              </div>
            </div>
            <div className="approaches-bar">
              {project.approaches?.map((approach, idx) => (
                <span key={idx} className="approach-chip">{approach}</span>
              ))}
            </div>
          </>
        )}
      </header>

      {/* Tab navigation */}
      <div className="project-tabs">
        <div className="tabs-left">
          <button
            className={`project-tab ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            📋 Kanban Board
          </button>
          <button
            className={`project-tab ${activeTab === 'protocols' ? 'active' : ''}`}
            onClick={() => setActiveTab('protocols')}
          >
            🧪 Protocols & Results
          </button>
          <button
            className={`project-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📖 Research Notes
          </button>
          <button
            className={`project-tab ${activeTab === 'notebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('notebook')}
          >
            📓 Lab Notebook
          </button>
        </div>
        <div className="tabs-right">
          <button
            className="tab-action-btn"
            onClick={() => setShowRecurringModal(true)}
            title="Recurring Tasks"
          >
            🔄 Recurring
          </button>
          <button
            className="tab-action-btn"
            onClick={() => setShowTemplatesModal(true)}
            title="Task Templates"
          >
            📑 Templates
          </button>
        </div>
      </div>

      <main className="project-main">
        {activeTab === 'kanban' && (
          <KanbanBoard
            tasks={tasks}
            projectColor={project.color}
            onTaskMove={handleTaskMove}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onReorderTask={handleReorderTask}
          />
        )}
        {activeTab === 'protocols' && (
          <ProtocolsResults
            projectId={projectId}
            projectTitle={project.title}
          />
        )}
        {activeTab === 'notes' && (
          <ResearchNotes
            projectId={projectId}
            projectTitle={project.title}
          />
        )}
        {activeTab === 'notebook' && (
          <ProjectLabNotebook
            projectId={projectId}
            projectTitle={project.title}
          />
        )}
      </main>

      {/* Recurring Tasks Modal */}
      <RecurringTasksManager
        projectId={projectId}
        projectTitle={project.title}
        onCreateTask={handleAddTask}
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
      />

      {/* Task Templates Modal */}
      <TaskTemplatesManager
        projectId={projectId}
        onApplyTemplate={handleAddTask}
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
      />
    </div>
  );
}

export default ProjectPage;
