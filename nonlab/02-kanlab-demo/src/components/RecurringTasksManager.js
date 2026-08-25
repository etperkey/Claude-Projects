import React, { useState, useEffect, useCallback } from 'react';
import { useSyncTrigger } from '../context/DataSyncContext';

const RECURRING_KEY = 'research-dashboard-recurring-tasks';

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Daily', days: 1 },
  { id: 'weekly', label: 'Weekly', days: 7 },
  { id: 'biweekly', label: 'Bi-weekly', days: 14 },
  { id: 'monthly', label: 'Monthly', days: 30 }
];

const DAY_OPTIONS = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' }
];

function RecurringTasksManager({ projectId, projectTitle, onCreateTask, isOpen, onClose }) {
  const triggerSync = useSyncTrigger();
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    priority: 'medium',
    column: 'backlog',
    enabled: true
  });

  // Load recurring tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECURRING_KEY);
    if (saved) {
      try {
        const all = JSON.parse(saved);
        setRecurringTasks(all[projectId] || []);
      } catch (e) {
        console.error('Failed to load recurring tasks:', e);
      }
    }
  }, [projectId]);

  // Save recurring tasks to localStorage
  const saveRecurringTasks = useCallback((tasks) => {
    const saved = localStorage.getItem(RECURRING_KEY);
    let all = {};
    if (saved) {
      try {
        all = JSON.parse(saved);
      } catch (e) {
        all = {};
      }
    }
    all[projectId] = tasks;
    localStorage.setItem(RECURRING_KEY, JSON.stringify(all));
    setRecurringTasks(tasks);
    triggerSync();
  }, [projectId, triggerSync]);

  // Check and create due recurring tasks
  useEffect(() => {
    const checkRecurringTasks = () => {
      const today = new Date();
      const todayDay = today.getDay();
      const todayStr = today.toDateString();

      recurringTasks.forEach(rt => {
        if (!rt.enabled) return;

        // Check if task should be created today
        let shouldCreate = false;

        if (rt.frequency === 'daily') {
          shouldCreate = rt.lastCreated !== todayStr;
        } else if (rt.frequency === 'weekly' || rt.frequency === 'biweekly') {
          if (rt.dayOfWeek === todayDay && rt.lastCreated !== todayStr) {
            if (rt.frequency === 'weekly') {
              shouldCreate = true;
            } else {
              // Bi-weekly - check if 2 weeks have passed
              const lastDate = rt.lastCreated ? new Date(rt.lastCreated) : null;
              if (!lastDate || (today - lastDate) >= 13 * 24 * 60 * 60 * 1000) {
                shouldCreate = true;
              }
            }
          }
        } else if (rt.frequency === 'monthly') {
          const dayOfMonth = today.getDate();
          if (dayOfMonth === rt.dayOfMonth && rt.lastCreated !== todayStr) {
            shouldCreate = true;
          }
        }

        if (shouldCreate) {
          // Create the task
          onCreateTask(rt.column, rt.title, rt.priority);

          // Update last created date
          const updated = recurringTasks.map(t =>
            t.id === rt.id ? { ...t, lastCreated: todayStr } : t
          );
          saveRecurringTasks(updated);
        }
      });
    };

    if (recurringTasks.length > 0) {
      checkRecurringTasks();
    }
  }, [recurringTasks, onCreateTask]);

  const handleAddRecurring = () => {
    if (!newTask.title.trim()) return;

    const task = {
      id: `recurring-${Date.now()}`,
      ...newTask,
      lastCreated: null,
      createdAt: new Date().toISOString()
    };

    saveRecurringTasks([...recurringTasks, task]);
    setNewTask({
      title: '',
      frequency: 'weekly',
      dayOfWeek: 1,
      priority: 'medium',
      column: 'backlog',
      enabled: true
    });
    setShowAddForm(false);
  };

  const handleToggleEnabled = (taskId) => {
    const updated = recurringTasks.map(t =>
      t.id === taskId ? { ...t, enabled: !t.enabled } : t
    );
    saveRecurringTasks(updated);
  };

  const handleDeleteRecurring = (taskId) => {
    const updated = recurringTasks.filter(t => t.id !== taskId);
    saveRecurringTasks(updated);
  };

  const handleTriggerNow = (task) => {
    onCreateTask(task.column, task.title, task.priority);
    const updated = recurringTasks.map(t =>
      t.id === task.id ? { ...t, lastCreated: new Date().toDateString() } : t
    );
    saveRecurringTasks(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recurring-modal-content" onClick={e => e.stopPropagation()}>
        <div className="recurring-modal-header">
          <h2>Recurring Tasks</h2>
          <p className="modal-subtitle">{projectTitle}</p>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="recurring-modal-body">
          {/* Add new recurring task form */}
          {showAddForm ? (
            <div className="add-recurring-form">
              <h3>Create Recurring Task</h3>

              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Weekly lab meeting"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={newTask.frequency}
                    onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                  >
                    {FREQUENCY_OPTIONS.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {(newTask.frequency === 'weekly' || newTask.frequency === 'biweekly') && (
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={newTask.dayOfWeek}
                      onChange={(e) => setNewTask({ ...newTask, dayOfWeek: parseInt(e.target.value) })}
                    >
                      {DAY_OPTIONS.map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newTask.frequency === 'monthly' && (
                  <div className="form-group">
                    <label>Day of Month</label>
                    <select
                      value={newTask.dayOfMonth || 1}
                      onChange={(e) => setNewTask({ ...newTask, dayOfMonth: parseInt(e.target.value) })}
                    >
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Add to Column</label>
                  <select
                    value={newTask.column}
                    onChange={(e) => setNewTask({ ...newTask, column: e.target.value })}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="review">Review</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleAddRecurring}>
                  Create Recurring Task
                </button>
              </div>
            </div>
          ) : (
            <button
              className="add-recurring-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Add Recurring Task
            </button>
          )}

          {/* List of recurring tasks */}
          <div className="recurring-tasks-list">
            {recurringTasks.length === 0 ? (
              <div className="empty-recurring">
                <p>No recurring tasks set up yet.</p>
                <p className="hint">Create recurring tasks for regular activities like lab meetings, data backups, or weekly reviews.</p>
              </div>
            ) : (
              recurringTasks.map(task => (
                <div key={task.id} className={`recurring-task-item ${!task.enabled ? 'disabled' : ''}`}>
                  <div className="recurring-task-main">
                    <div className="recurring-task-info">
                      <h4>{task.title}</h4>
                      <div className="recurring-meta">
                        <span className="frequency-badge">{task.frequency}</span>
                        {(task.frequency === 'weekly' || task.frequency === 'biweekly') && (
                          <span className="day-badge">
                            {DAY_OPTIONS.find(d => d.id === task.dayOfWeek)?.label}
                          </span>
                        )}
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                      </div>
                      {task.lastCreated && (
                        <p className="last-created">Last created: {task.lastCreated}</p>
                      )}
                    </div>
                    <div className="recurring-task-actions">
                      <button
                        className="trigger-btn"
                        onClick={() => handleTriggerNow(task)}
                        title="Create task now"
                      >
                        ▶
                      </button>
                      <button
                        className={`toggle-btn ${task.enabled ? 'enabled' : ''}`}
                        onClick={() => handleToggleEnabled(task.id)}
                        title={task.enabled ? 'Disable' : 'Enable'}
                      >
                        {task.enabled ? '✓' : '○'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteRecurring(task.id)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecurringTasksManager;
