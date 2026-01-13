import React, { useState, useEffect } from 'react';

const TEMPLATES_KEY = 'research-dashboard-task-templates';

// Pre-built research templates
const DEFAULT_TEMPLATES = [
  {
    id: 'new-experiment',
    name: 'New Experiment',
    description: 'Standard workflow for starting a new experiment',
    icon: '🧪',
    tasks: [
      { title: 'Define hypothesis and objectives', column: 'backlog', priority: 'high' },
      { title: 'Literature review', column: 'backlog', priority: 'high' },
      { title: 'Design experimental protocol', column: 'backlog', priority: 'high' },
      { title: 'Prepare materials and reagents', column: 'backlog', priority: 'medium' },
      { title: 'Set up controls', column: 'backlog', priority: 'medium' },
      { title: 'Run pilot experiment', column: 'backlog', priority: 'medium' },
      { title: 'Collect data', column: 'backlog', priority: 'medium' },
      { title: 'Analyze results', column: 'backlog', priority: 'medium' },
      { title: 'Document findings', column: 'backlog', priority: 'low' }
    ]
  },
  {
    id: 'paper-submission',
    name: 'Paper Submission',
    description: 'Checklist for submitting a research paper',
    icon: '📝',
    tasks: [
      { title: 'Complete first draft', column: 'backlog', priority: 'high' },
      { title: 'Internal review with co-authors', column: 'backlog', priority: 'high' },
      { title: 'Address co-author feedback', column: 'backlog', priority: 'high' },
      { title: 'Format figures and tables', column: 'backlog', priority: 'medium' },
      { title: 'Write abstract and keywords', column: 'backlog', priority: 'medium' },
      { title: 'Prepare supplementary materials', column: 'backlog', priority: 'medium' },
      { title: 'Select target journal', column: 'backlog', priority: 'medium' },
      { title: 'Format according to journal guidelines', column: 'backlog', priority: 'medium' },
      { title: 'Write cover letter', column: 'backlog', priority: 'low' },
      { title: 'Submit manuscript', column: 'backlog', priority: 'high' },
      { title: 'Address reviewer comments', column: 'backlog', priority: 'high' }
    ]
  },
  {
    id: 'grant-application',
    name: 'Grant Application',
    description: 'Tasks for preparing a grant proposal',
    icon: '💰',
    tasks: [
      { title: 'Identify funding opportunity', column: 'backlog', priority: 'high' },
      { title: 'Review grant requirements', column: 'backlog', priority: 'high' },
      { title: 'Draft specific aims', column: 'backlog', priority: 'high' },
      { title: 'Write research strategy', column: 'backlog', priority: 'high' },
      { title: 'Prepare budget', column: 'backlog', priority: 'medium' },
      { title: 'Gather supporting documents', column: 'backlog', priority: 'medium' },
      { title: 'Get letters of support', column: 'backlog', priority: 'medium' },
      { title: 'Internal review', column: 'backlog', priority: 'medium' },
      { title: 'Final revisions', column: 'backlog', priority: 'high' },
      { title: 'Submit application', column: 'backlog', priority: 'high' }
    ]
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis Pipeline',
    description: 'Standard data analysis workflow',
    icon: '📊',
    tasks: [
      { title: 'Data collection and organization', column: 'backlog', priority: 'high' },
      { title: 'Data cleaning and preprocessing', column: 'backlog', priority: 'high' },
      { title: 'Exploratory data analysis', column: 'backlog', priority: 'medium' },
      { title: 'Statistical analysis', column: 'backlog', priority: 'high' },
      { title: 'Create visualizations', column: 'backlog', priority: 'medium' },
      { title: 'Interpret results', column: 'backlog', priority: 'high' },
      { title: 'Document methodology', column: 'backlog', priority: 'medium' },
      { title: 'Peer review of analysis', column: 'backlog', priority: 'low' }
    ]
  },
  {
    id: 'literature-review',
    name: 'Literature Review',
    description: 'Systematic literature review process',
    icon: '📚',
    tasks: [
      { title: 'Define research question', column: 'backlog', priority: 'high' },
      { title: 'Identify databases and keywords', column: 'backlog', priority: 'high' },
      { title: 'Conduct systematic search', column: 'backlog', priority: 'high' },
      { title: 'Screen titles and abstracts', column: 'backlog', priority: 'medium' },
      { title: 'Full-text review', column: 'backlog', priority: 'medium' },
      { title: 'Extract key findings', column: 'backlog', priority: 'medium' },
      { title: 'Synthesize findings', column: 'backlog', priority: 'high' },
      { title: 'Write review summary', column: 'backlog', priority: 'medium' }
    ]
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Weekly research progress review',
    icon: '📅',
    tasks: [
      { title: 'Review completed tasks', column: 'backlog', priority: 'medium' },
      { title: 'Update project status', column: 'backlog', priority: 'medium' },
      { title: 'Plan next week priorities', column: 'backlog', priority: 'high' },
      { title: 'Update lab notebook', column: 'backlog', priority: 'medium' },
      { title: 'Prepare for lab meeting', column: 'backlog', priority: 'medium' }
    ]
  }
];

function TaskTemplatesManager({ projectId, onApplyTemplate, isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    icon: '📋',
    tasks: []
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Load custom templates from localStorage
  useEffect(() => {
    setTemplates(DEFAULT_TEMPLATES);

    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) {
      try {
        setCustomTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom templates:', e);
      }
    }
  }, []);

  const saveCustomTemplates = (templates) => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    setCustomTemplates(templates);
  };

  const handleApplyTemplate = (template) => {
    if (window.confirm(`Apply "${template.name}" template? This will create ${template.tasks.length} tasks.`)) {
      template.tasks.forEach(task => {
        onApplyTemplate(task.column, task.title, task.priority);
      });
      onClose();
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || newTemplate.tasks.length === 0) return;

    const template = {
      id: `custom-${Date.now()}`,
      ...newTemplate,
      isCustom: true
    };

    saveCustomTemplates([...customTemplates, template]);
    setNewTemplate({ name: '', description: '', icon: '📋', tasks: [] });
    setShowCreateForm(false);
  };

  const handleAddTaskToTemplate = () => {
    if (!newTaskTitle.trim()) return;
    setNewTemplate({
      ...newTemplate,
      tasks: [...newTemplate.tasks, {
        title: newTaskTitle.trim(),
        column: 'backlog',
        priority: 'medium'
      }]
    });
    setNewTaskTitle('');
  };

  const handleRemoveTaskFromTemplate = (index) => {
    setNewTemplate({
      ...newTemplate,
      tasks: newTemplate.tasks.filter((_, i) => i !== index)
    });
  };

  const handleDeleteCustomTemplate = (templateId) => {
    if (window.confirm('Delete this custom template?')) {
      const updated = customTemplates.filter(t => t.id !== templateId);
      saveCustomTemplates(updated);
    }
  };

  const ICON_OPTIONS = ['📋', '🧪', '📝', '💰', '📊', '📚', '🔬', '🧬', '💊', '🦠', '🧫', '📅', '🎯', '⚡'];

  if (!isOpen) return null;

  const allTemplates = [...templates, ...customTemplates];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="templates-modal-content" onClick={e => e.stopPropagation()}>
        <div className="templates-modal-header">
          <h2>Task Templates</h2>
          <p className="modal-subtitle">Quick-start your project with pre-built task sets</p>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="templates-modal-body">
          {/* Template creation form */}
          {showCreateForm ? (
            <div className="create-template-form">
              <h3>Create Custom Template</h3>

              <div className="form-row">
                <div className="form-group icon-selector">
                  <label>Icon</label>
                  <div className="icon-options">
                    {ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        className={`icon-option ${newTemplate.icon === icon ? 'selected' : ''}`}
                        onClick={() => setNewTemplate({ ...newTemplate, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Cell Culture Protocol"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of the template"
                />
              </div>

              <div className="form-group">
                <label>Tasks ({newTemplate.tasks.length})</label>
                <div className="template-tasks-list">
                  {newTemplate.tasks.map((task, index) => (
                    <div key={index} className="template-task-item">
                      <span>{task.title}</span>
                      <button onClick={() => handleRemoveTaskFromTemplate(index)}>×</button>
                    </div>
                  ))}
                </div>
                <div className="add-template-task">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add task to template..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTaskToTemplate()}
                  />
                  <button onClick={handleAddTaskToTemplate}>Add</button>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.name.trim() || newTemplate.tasks.length === 0}
                >
                  Save Template
                </button>
              </div>
            </div>
          ) : (
            <button
              className="create-template-btn"
              onClick={() => setShowCreateForm(true)}
            >
              + Create Custom Template
            </button>
          )}

          {/* Template grid */}
          <div className="templates-grid">
            {allTemplates.map(template => (
              <div
                key={template.id}
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(
                  selectedTemplate?.id === template.id ? null : template
                )}
              >
                <div className="template-card-header">
                  <span className="template-icon">{template.icon}</span>
                  {template.isCustom && (
                    <button
                      className="delete-template-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomTemplate(template.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <h4>{template.name}</h4>
                <p className="template-description">{template.description}</p>
                <span className="template-task-count">{template.tasks.length} tasks</span>

                {selectedTemplate?.id === template.id && (
                  <div className="template-preview">
                    <h5>Tasks:</h5>
                    <ul>
                      {template.tasks.slice(0, 5).map((task, i) => (
                        <li key={i}>{task.title}</li>
                      ))}
                      {template.tasks.length > 5 && (
                        <li className="more-tasks">+{template.tasks.length - 5} more...</li>
                      )}
                    </ul>
                    <button
                      className="apply-template-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                    >
                      Apply Template
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskTemplatesManager;
