import React, { useState, useEffect } from 'react';
import { researchProjects } from '../data/projects';
import { useApp } from '../context/AppContext';
import { useSyncTrigger } from '../context/DataSyncContext';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function QuickAddModal({ isOpen, onClose }) {
  const { logActivity, isProjectArchived } = useApp();
  const triggerSync = useSyncTrigger();
  const [projects, setProjects] = useState([]);
  const [customProjectIds, setCustomProjectIds] = useState(new Set());
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('backlog');
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    // Track which projects are custom
    const customIds = new Set(customProjects.map(p => p.id));
    setCustomProjectIds(customIds);

    const allProjects = [...researchProjects, ...customProjects]
      .filter(p => !isProjectArchived(p.id));
    setProjects(allProjects);

    if (allProjects.length > 0 && !selectedProject) {
      setSelectedProject(allProjects[0].id);
    }
  }, [isOpen, isProjectArchived, selectedProject]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!taskTitle.trim() || !selectedProject) return;

    const project = projects.find(p => p.id === selectedProject);
    const isCustomProject = customProjectIds.has(selectedProject);

    // Create new task
    const newTask = {
      id: `${selectedProject}-${Date.now()}`,
      title: taskTitle.trim(),
      priority,
      dueDate: dueDate || undefined,
      description: '',
      labels: [],
      checklist: [],
      links: []
    };

    if (isCustomProject) {
      // Save to custom projects storage
      try {
        const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
        if (saved) {
          const customProjects = JSON.parse(saved);
          const updatedProjects = customProjects.map(p => {
            if (p.id === selectedProject) {
              const currentTasks = p.tasks || {
                backlog: [],
                inProgress: [],
                review: [],
                done: []
              };
              return {
                ...p,
                tasks: {
                  ...currentTasks,
                  [selectedColumn]: [...(currentTasks[selectedColumn] || []), newTask]
                }
              };
            }
            return p;
          });
          localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(updatedProjects));
          triggerSync();
        }
      } catch (err) {
        console.error('Failed to save task to custom project:', err);
      }
    } else {
      // Save to general task storage for built-in projects
      let savedTasks = {};
      try {
        const saved = localStorage.getItem(TASK_STORAGE_KEY);
        if (saved) savedTasks = JSON.parse(saved);
      } catch {}

      const currentTasks = savedTasks[selectedProject] || project?.tasks || {
        backlog: [],
        inProgress: [],
        review: [],
        done: []
      };

      // Add to column
      currentTasks[selectedColumn] = [...(currentTasks[selectedColumn] || []), newTask];

      // Save
      savedTasks[selectedProject] = currentTasks;
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(savedTasks));
      triggerSync();
    }

    // Log activity
    logActivity('task_created', {
      taskId: newTask.id,
      taskTitle: newTask.title,
      projectId: selectedProject,
      projectTitle: project?.title,
      column: selectedColumn
    });

    // Reset form
    setTaskTitle('');
    setPriority('medium');
    setDueDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-add-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quick Add Task</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="quick-add-form">
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Project</label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Column</label>
              <select
                value={selectedColumn}
                onChange={e => setSelectedColumn(e.target.value)}
              >
                <option value="backlog">Backlog</option>
                <option value="inProgress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <div className="priority-buttons">
                {['low', 'medium', 'high'].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-btn ${p} ${priority === p ? 'active' : ''}`}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={!taskTitle.trim()}>
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddModal;
