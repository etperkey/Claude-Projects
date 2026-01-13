import React, { useState } from 'react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', icon: '📋' },
  { id: 'inProgress', title: 'In Progress', icon: '🔄' },
  { id: 'review', title: 'Review', icon: '👀' },
  { id: 'done', title: 'Done', icon: '✅' }
];

const PRIORITY_COLORS = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#27ae60'
};

function KanbanBoard({ tasks, projectColor, onTaskMove, onAddTask, onDeleteTask }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [newTaskText, setNewTaskText] = useState({});
  const [showAddForm, setShowAddForm] = useState({});

  const handleDragStart = (e, task, columnId) => {
    setDraggedTask(task);
    setDraggedFrom(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (draggedTask && draggedFrom !== targetColumnId) {
      onTaskMove(draggedTask.id, draggedFrom, targetColumnId);
    }
    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const handleAddTaskSubmit = (columnId) => {
    if (newTaskText[columnId]?.trim()) {
      onAddTask(columnId, newTaskText[columnId].trim());
      setNewTaskText({ ...newTaskText, [columnId]: '' });
      setShowAddForm({ ...showAddForm, [columnId]: false });
    }
  };

  const getColumnCount = (columnId) => tasks[columnId]?.length || 0;

  return (
    <div className="kanban-board">
      {COLUMNS.map((column) => (
        <div
          key={column.id}
          className={`kanban-column ${draggedFrom && draggedFrom !== column.id ? 'drop-target' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="column-header">
            <div className="column-title">
              <span className="column-icon">{column.icon}</span>
              <h3>{column.title}</h3>
              <span className="task-count">{getColumnCount(column.id)}</span>
            </div>
            <button
              className="add-task-btn"
              onClick={() => setShowAddForm({ ...showAddForm, [column.id]: true })}
              title="Add task"
            >
              +
            </button>
          </div>

          <div className="column-content">
            {showAddForm[column.id] && (
              <div className="add-task-form">
                <input
                  type="text"
                  placeholder="Enter task title..."
                  value={newTaskText[column.id] || ''}
                  onChange={(e) => setNewTaskText({ ...newTaskText, [column.id]: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTaskSubmit(column.id)}
                  autoFocus
                />
                <div className="add-task-actions">
                  <button
                    className="submit-btn"
                    onClick={() => handleAddTaskSubmit(column.id)}
                  >
                    Add
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setShowAddForm({ ...showAddForm, [column.id]: false })}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {tasks[column.id]?.map((task) => (
              <div
                key={task.id}
                className={`task-card ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task, column.id)}
              >
                <div className="task-header">
                  <span
                    className="priority-indicator"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                    title={`${task.priority} priority`}
                  />
                  <button
                    className="delete-task-btn"
                    onClick={() => onDeleteTask(task.id, column.id)}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
                <p className="task-title">{task.title}</p>
                <div className="task-footer">
                  <span className={`priority-badge ${task.priority}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KanbanBoard;
