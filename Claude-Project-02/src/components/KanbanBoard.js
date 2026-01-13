import React, { useState } from 'react';
import TaskDetailModal from './TaskDetailModal';

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

const LABEL_COLORS = {
  red: '#e74c3c',
  orange: '#f39c12',
  yellow: '#f1c40f',
  green: '#27ae60',
  blue: '#3498db',
  purple: '#9b59b6',
  pink: '#e91e63',
  teal: '#00bcd4'
};

function KanbanBoard({ tasks, projectColor, onTaskMove, onAddTask, onDeleteTask, onUpdateTask, onReorderTask }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [newTaskText, setNewTaskText] = useState({});
  const [showAddForm, setShowAddForm] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const handleDragStart = (e, task, columnId) => {
    setDraggedTask(task);
    setDraggedFrom(columnId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a small delay for visual feedback
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
    setDraggedFrom(null);
    setDragOverTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDragOver = (e, task, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTask && draggedTask.id !== task.id) {
      setDragOverTask({ taskId: task.id, columnId });
    }
  };

  const handleTaskDragLeave = () => {
    setDragOverTask(null);
  };

  const handleDrop = (e, targetColumnId, targetIndex = null) => {
    e.preventDefault();

    if (!draggedTask) return;

    // If dropping on a different column
    if (draggedFrom !== targetColumnId) {
      onTaskMove(draggedTask.id, draggedFrom, targetColumnId, targetIndex);
    } else if (targetIndex !== null && onReorderTask) {
      // Reordering within the same column
      const currentIndex = tasks[targetColumnId]?.findIndex(t => t.id === draggedTask.id);
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        onReorderTask(draggedTask.id, targetColumnId, currentIndex, targetIndex);
      }
    }

    setDraggedTask(null);
    setDraggedFrom(null);
    setDragOverTask(null);
  };

  const handleTaskDrop = (e, targetTask, columnId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTask || draggedTask.id === targetTask.id) return;

    const targetIndex = tasks[columnId]?.findIndex(t => t.id === targetTask.id);

    if (draggedFrom !== columnId) {
      // Moving to different column at specific position
      onTaskMove(draggedTask.id, draggedFrom, columnId, targetIndex);
    } else if (onReorderTask) {
      // Reordering within same column
      const currentIndex = tasks[columnId]?.findIndex(t => t.id === draggedTask.id);
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        onReorderTask(draggedTask.id, columnId, currentIndex, targetIndex);
      }
    }

    setDraggedTask(null);
    setDraggedFrom(null);
    setDragOverTask(null);
  };

  const handleAddTaskSubmit = (columnId) => {
    if (newTaskText[columnId]?.trim()) {
      onAddTask(columnId, newTaskText[columnId].trim());
      setNewTaskText({ ...newTaskText, [columnId]: '' });
      setShowAddForm({ ...showAddForm, [columnId]: false });
    }
  };

  const handleTaskClick = (e, task, columnId) => {
    // Don't open modal if we're dragging
    if (e.defaultPrevented) return;
    setSelectedTask(task);
    setSelectedColumn(columnId);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
    setSelectedColumn(null);
  };

  const handleSaveTask = (taskId, columnId, updatedData) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, columnId, updatedData);
    }
  };

  const getColumnCount = (columnId) => tasks[columnId]?.length || 0;

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < today) {
      return { text: 'Overdue', className: 'overdue' };
    } else if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', className: 'due-today' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', className: 'due-soon' };
    } else {
      return {
        text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        className: ''
      };
    }
  };

  const getChecklistProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(i => i.completed).length;
    return { completed, total: checklist.length };
  };

  return (
    <>
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

              {tasks[column.id]?.map((task, index) => {
                const dueInfo = formatDueDate(task.dueDate);
                const checklistProgress = getChecklistProgress(task.checklist);
                const hasDescription = task.description && task.description.trim().length > 0;
                const hasLinks = task.links && task.links.length > 0;
                const isDragOver = dragOverTask?.taskId === task.id && dragOverTask?.columnId === column.id;

                return (
                  <div
                    key={task.id}
                    className={`task-card ${draggedTask?.id === task.id ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task, column.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleTaskDragOver(e, task, column.id)}
                    onDragLeave={handleTaskDragLeave}
                    onDrop={(e) => handleTaskDrop(e, task, column.id)}
                    onClick={(e) => handleTaskClick(e, task, column.id)}
                  >
                    {/* Labels bar at top */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="task-labels-bar">
                        {task.labels.map(labelId => (
                          <span
                            key={labelId}
                            className="task-label-mini"
                            style={{ backgroundColor: LABEL_COLORS[labelId] || '#888' }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="task-header">
                      <span
                        className="priority-indicator"
                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                        title={`${task.priority} priority`}
                      />
                      <button
                        className="delete-task-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id, column.id);
                        }}
                        title="Delete task"
                      >
                        ×
                      </button>
                    </div>

                    <p className="task-title">{task.title}</p>

                    {/* Task metadata icons */}
                    <div className="task-metadata">
                      {dueInfo && (
                        <span className={`due-badge ${dueInfo.className}`}>
                          <span className="due-icon">📅</span>
                          {dueInfo.text}
                        </span>
                      )}
                      {hasDescription && (
                        <span className="meta-icon" title="Has notes">
                          📝
                        </span>
                      )}
                      {hasLinks && (
                        <span className="meta-icon" title={`${task.links.length} link(s)`}>
                          🔗
                        </span>
                      )}
                      {checklistProgress && (
                        <span
                          className={`checklist-badge ${checklistProgress.completed === checklistProgress.total ? 'complete' : ''}`}
                          title="Checklist progress"
                        >
                          ☑ {checklistProgress.completed}/{checklistProgress.total}
                        </span>
                      )}
                    </div>

                    <div className="task-footer">
                      <span className={`priority-badge ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TaskDetailModal
        task={selectedTask}
        columnId={selectedColumn}
        isOpen={selectedTask !== null}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        onDelete={onDeleteTask}
      />
    </>
  );
}

export default KanbanBoard;
