import React, { useState, useEffect } from 'react';
import TaskDependencySelector from './TaskDependencySelector';
import MacroTextarea from './MacroTextarea';
import FileAttachments from './FileAttachments';

const PRIORITY_OPTIONS = [
  { id: 'high', label: 'High', color: '#e74c3c' },
  { id: 'medium', label: 'Medium', color: '#f39c12' },
  { id: 'low', label: 'Low', color: '#27ae60' }
];

const LABEL_COLORS = [
  { id: 'red', color: '#e74c3c', name: 'Red' },
  { id: 'orange', color: '#f39c12', name: 'Orange' },
  { id: 'yellow', color: '#f1c40f', name: 'Yellow' },
  { id: 'green', color: '#27ae60', name: 'Green' },
  { id: 'blue', color: '#3498db', name: 'Blue' },
  { id: 'purple', color: '#9b59b6', name: 'Purple' },
  { id: 'pink', color: '#e91e63', name: 'Pink' },
  { id: 'teal', color: '#00bcd4', name: 'Teal' }
];

function TaskDetailModal({ task, columnId, isOpen, onClose, onSave, onDelete, allTasks }) {
  const [editedTask, setEditedTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    links: [],
    labels: [],
    checklist: [],
    dependencies: [],
    attachments: []
  });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate || '',
        links: task.links || [],
        labels: task.labels || [],
        checklist: task.checklist || [],
        dependencies: task.dependencies || [],
        attachments: task.attachments || []
      });
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onSave(task.id, columnId, editedTask);
    onClose();
  };

  const handleAddLink = () => {
    if (newLink.url.trim()) {
      const linkToAdd = {
        id: Date.now(),
        title: newLink.title.trim() || newLink.url,
        url: newLink.url.trim()
      };
      setEditedTask({
        ...editedTask,
        links: [...editedTask.links, linkToAdd]
      });
      setNewLink({ title: '', url: '' });
      setShowLinkForm(false);
    }
  };

  const handleRemoveLink = (linkId) => {
    setEditedTask({
      ...editedTask,
      links: editedTask.links.filter(l => l.id !== linkId)
    });
  };

  const handleToggleLabel = (labelId) => {
    const hasLabel = editedTask.labels.includes(labelId);
    setEditedTask({
      ...editedTask,
      labels: hasLabel
        ? editedTask.labels.filter(l => l !== labelId)
        : [...editedTask.labels, labelId]
    });
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const item = {
        id: Date.now(),
        text: newChecklistItem.trim(),
        completed: false
      };
      setEditedTask({
        ...editedTask,
        checklist: [...editedTask.checklist, item]
      });
      setNewChecklistItem('');
    }
  };

  const handleToggleChecklistItem = (itemId) => {
    setEditedTask({
      ...editedTask,
      checklist: editedTask.checklist.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    });
  };

  const handleRemoveChecklistItem = (itemId) => {
    setEditedTask({
      ...editedTask,
      checklist: editedTask.checklist.filter(item => item.id !== itemId)
    });
  };

  const checklistProgress = editedTask.checklist.length > 0
    ? Math.round((editedTask.checklist.filter(i => i.completed).length / editedTask.checklist.length) * 100)
    : 0;

  const isOverdue = editedTask.dueDate && new Date(editedTask.dueDate) < new Date();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-modal-content" onClick={e => e.stopPropagation()}>
        <div className="task-modal-header">
          <div className="task-modal-labels">
            {editedTask.labels.map(labelId => {
              const label = LABEL_COLORS.find(l => l.id === labelId);
              return label ? (
                <span
                  key={labelId}
                  className="task-label-pill"
                  style={{ backgroundColor: label.color }}
                />
              ) : null;
            })}
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="task-modal-body">
          {/* Title */}
          <div className="task-section">
            <input
              type="text"
              className="task-title-input"
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
              placeholder="Task title..."
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="task-meta-row">
            <div className="task-meta-item">
              <label>Priority</label>
              <div className="priority-selector">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    className={`priority-option ${editedTask.priority === p.id ? 'selected' : ''}`}
                    style={{
                      '--priority-color': p.color,
                      backgroundColor: editedTask.priority === p.id ? p.color : 'transparent'
                    }}
                    onClick={() => setEditedTask({ ...editedTask, priority: p.id })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="task-meta-item">
              <label>Due Date</label>
              <input
                type="date"
                className={`date-input ${isOverdue ? 'overdue' : ''}`}
                value={editedTask.dueDate}
                onChange={e => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Labels */}
          <div className="task-section">
            <div className="section-header-row">
              <label>Labels</label>
              <button
                className="add-btn-small"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                {showLabelPicker ? 'Done' : '+ Add'}
              </button>
            </div>
            {showLabelPicker && (
              <div className="label-picker">
                {LABEL_COLORS.map(label => (
                  <button
                    key={label.id}
                    className={`label-option ${editedTask.labels.includes(label.id) ? 'selected' : ''}`}
                    style={{ backgroundColor: label.color }}
                    onClick={() => handleToggleLabel(label.id)}
                  >
                    {editedTask.labels.includes(label.id) && '✓'}
                  </button>
                ))}
              </div>
            )}
            <div className="selected-labels">
              {editedTask.labels.map(labelId => {
                const label = LABEL_COLORS.find(l => l.id === labelId);
                return label ? (
                  <span
                    key={labelId}
                    className="label-tag"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <button onClick={() => handleToggleLabel(labelId)}>&times;</button>
                  </span>
                ) : null;
              })}
            </div>
          </div>

          {/* Dependencies */}
          <div className="task-section">
            <TaskDependencySelector
              currentTaskId={task.id}
              allTasks={allTasks}
              selectedDependencies={editedTask.dependencies}
              onUpdate={(deps) => setEditedTask({ ...editedTask, dependencies: deps })}
            />
          </div>

          {/* Description/Notes */}
          <div className="task-section">
            <label>Notes</label>
            <MacroTextarea
              className="task-description-input"
              value={editedTask.description}
              onChange={(description) => setEditedTask({ ...editedTask, description })}
              placeholder="Add notes, details, or context... (type @ for commands)"
              rows={4}
            />
          </div>

          {/* Checklist */}
          <div className="task-section">
            <div className="section-header-row">
              <label>Checklist</label>
              {editedTask.checklist.length > 0 && (
                <span className="checklist-progress">{checklistProgress}%</span>
              )}
            </div>
            {editedTask.checklist.length > 0 && (
              <div className="checklist-progress-bar">
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            )}
            <div className="checklist-items">
              {editedTask.checklist.map(item => (
                <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                  />
                  <span className="checklist-text">{item.text}</span>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="add-checklist-form">
              <input
                type="text"
                placeholder="Add checklist item..."
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddChecklistItem()}
              />
              <button onClick={handleAddChecklistItem}>Add</button>
            </div>
          </div>

          {/* Links */}
          <div className="task-section">
            <div className="section-header-row">
              <label>Links & Attachments</label>
              <button
                className="add-btn-small"
                onClick={() => setShowLinkForm(!showLinkForm)}
              >
                + Add Link
              </button>
            </div>
            {showLinkForm && (
              <div className="add-link-form">
                <input
                  type="text"
                  placeholder="Link title (optional)"
                  value={newLink.title}
                  onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                  onKeyPress={e => e.key === 'Enter' && handleAddLink()}
                />
                <div className="link-form-actions">
                  <button className="submit-btn" onClick={handleAddLink}>Add</button>
                  <button className="cancel-btn" onClick={() => setShowLinkForm(false)}>Cancel</button>
                </div>
              </div>
            )}
            <div className="links-list">
              {editedTask.links.map(link => (
                <div key={link.id} className="link-item">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <span className="link-icon">🔗</span>
                    {link.title}
                  </a>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveLink(link.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Google Drive Attachments */}
          <div className="task-section">
            <div className="section-header-row">
              <label>Google Drive Files</label>
            </div>
            <FileAttachments
              attachments={editedTask.attachments}
              onUpdate={(attachments) => setEditedTask({ ...editedTask, attachments })}
              maxFiles={10}
            />
          </div>
        </div>

        <div className="task-modal-footer">
          <button className="btn-delete" onClick={() => {
            if (window.confirm('Delete this task?')) {
              onDelete(task.id, columnId);
              onClose();
            }
          }}>
            Delete Task
          </button>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-submit" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
