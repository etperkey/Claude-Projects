import React, { useState } from 'react';

const PROJECT_COLORS = [
  { name: 'Red', value: '#8B2942' },
  { name: 'Purple', value: '#5B4A8A' },
  { name: 'Blue', value: '#3A5A8A' },
  { name: 'Brown', value: '#8A6A3A' },
  { name: 'Green', value: '#2A6A4A' },
  { name: 'Teal', value: '#2A5A6A' },
  { name: 'Orange', value: '#8A4A2A' },
  { name: 'Pink', value: '#8A3A6A' },
];

function AddProjectModal({ isOpen, onClose, onAddProject }) {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    hypothesis: '',
    color: '#3A5A8A',
    approaches: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const newProject = {
      id: 'custom-' + Date.now(),
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      hypothesis: formData.hypothesis,
      color: formData.color,
      icon: 'custom',
      approaches: formData.approaches.split(',').map(a => a.trim()).filter(a => a),
      tasks: {
        backlog: [],
        inProgress: [],
        review: [],
        done: []
      },
      isCustom: true
    };

    onAddProject(newProject);
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      hypothesis: '',
      color: '#3A5A8A',
      approaches: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label>Project Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., CAR-T Cell Optimization"
              required
            />
          </div>

          <div className="form-group">
            <label>Subtitle</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={e => setFormData({...formData, subtitle: e.target.value})}
              placeholder="e.g., Enhancing Persistence"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Brief project description..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Core Hypothesis</label>
            <textarea
              value={formData.hypothesis}
              onChange={e => setFormData({...formData, hypothesis: e.target.value})}
              placeholder="What is your main hypothesis?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Project Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-option ${formData.color === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setFormData({...formData, color: color.value})}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Research Approaches (comma-separated)</label>
            <input
              type="text"
              value={formData.approaches}
              onChange={e => setFormData({...formData, approaches: e.target.value})}
              placeholder="e.g., Flow Cytometry, CRISPR, Mouse Models"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProjectModal;
