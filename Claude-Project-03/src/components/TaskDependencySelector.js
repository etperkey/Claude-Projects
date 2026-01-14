import React, { useState } from 'react';

function TaskDependencySelector({
  currentTaskId,
  allTasks,
  selectedDependencies = [],
  onUpdate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten all tasks from all columns
  const availableTasks = Object.entries(allTasks || {}).flatMap(([columnId, tasks]) =>
    (tasks || [])
      .filter(task => task.id !== currentTaskId)
      .map(task => ({ ...task, columnId }))
  );

  const filteredTasks = availableTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleDependency = (taskId) => {
    const isSelected = selectedDependencies.includes(taskId);
    const newDependencies = isSelected
      ? selectedDependencies.filter(id => id !== taskId)
      : [...selectedDependencies, taskId];
    onUpdate(newDependencies);
  };

  const getTaskById = (taskId) => availableTasks.find(t => t.id === taskId);

  const getColumnLabel = (columnId) => {
    const labels = {
      backlog: 'Backlog',
      inProgress: 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    return labels[columnId] || columnId;
  };

  return (
    <div className="task-dependency-selector">
      <div className="section-header-row">
        <label>Blocked By (Dependencies)</label>
        <button
          className="add-btn-small"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Done' : '+ Add'}
        </button>
      </div>

      {/* Selected dependencies */}
      {selectedDependencies.length > 0 && (
        <div className="selected-dependencies">
          {selectedDependencies.map(depId => {
            const task = getTaskById(depId);
            if (!task) return null;
            return (
              <div key={depId} className={`dependency-chip ${task.columnId === 'done' ? 'resolved' : 'blocking'}`}>
                <span className="dep-status-icon">
                  {task.columnId === 'done' ? '✓' : '⏳'}
                </span>
                <span className="dep-title">{task.title}</span>
                <button
                  className="remove-dep-btn"
                  onClick={() => handleToggleDependency(depId)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dependency picker */}
      {isOpen && (
        <div className="dependency-picker">
          <input
            type="text"
            className="dependency-search"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="dependency-list">
            {filteredTasks.length === 0 ? (
              <div className="no-tasks-msg">No tasks available</div>
            ) : (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`dependency-option ${selectedDependencies.includes(task.id) ? 'selected' : ''}`}
                  onClick={() => handleToggleDependency(task.id)}
                >
                  <span className="dep-checkbox">
                    {selectedDependencies.includes(task.id) ? '☑' : '☐'}
                  </span>
                  <span className="dep-task-title">{task.title}</span>
                  <span className={`dep-column-badge ${task.columnId}`}>
                    {getColumnLabel(task.columnId)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dependency status message */}
      {selectedDependencies.length > 0 && (
        <div className="dependency-status">
          {selectedDependencies.every(id => getTaskById(id)?.columnId === 'done') ? (
            <span className="status-resolved">All dependencies resolved</span>
          ) : (
            <span className="status-blocking">
              {selectedDependencies.filter(id => getTaskById(id)?.columnId !== 'done').length} blocking task(s)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskDependencySelector;
