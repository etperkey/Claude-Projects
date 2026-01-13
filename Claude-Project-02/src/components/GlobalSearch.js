import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchProjects } from '../data/projects';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, tasks, projects
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [results, setResults] = useState({ projects: [], tasks: [] });
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], tasks: [] });
      return;
    }

    const searchQuery = query.toLowerCase();

    // Get all projects
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    const allProjects = [...researchProjects, ...customProjects];

    // Get saved tasks
    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    // Search projects
    const matchedProjects = allProjects.filter(p =>
      p.title.toLowerCase().includes(searchQuery) ||
      p.subtitle?.toLowerCase().includes(searchQuery) ||
      p.description?.toLowerCase().includes(searchQuery)
    );

    // Search tasks across all projects
    const matchedTasks = [];
    allProjects.forEach(project => {
      const projectTasks = savedTasks[project.id] || project.tasks;
      if (!projectTasks) return;

      Object.entries(projectTasks).forEach(([column, tasks]) => {
        tasks.forEach(task => {
          const matchesQuery =
            task.title.toLowerCase().includes(searchQuery) ||
            task.description?.toLowerCase().includes(searchQuery);

          const matchesPriority =
            priorityFilter === 'all' || task.priority === priorityFilter;

          if (matchesQuery && matchesPriority) {
            matchedTasks.push({
              ...task,
              projectId: project.id,
              projectTitle: project.title,
              column
            });
          }
        });
      });
    });

    setResults({
      projects: filter === 'tasks' ? [] : matchedProjects,
      tasks: filter === 'projects' ? [] : matchedTasks
    });
  }, [query, filter, priorityFilter]);

  const handleTaskClick = (task) => {
    navigate(`/project/${task.projectId}`);
    onClose();
  };

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search projects and tasks..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>
          <button className="search-close" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="search-filters">
          <div className="filter-group">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'projects' ? 'active' : ''}`}
              onClick={() => setFilter('projects')}
            >
              Projects
            </button>
            <button
              className={`filter-btn ${filter === 'tasks' ? 'active' : ''}`}
              onClick={() => setFilter('tasks')}
            >
              Tasks
            </button>
          </div>
          <div className="filter-group">
            <select
              className="priority-filter"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="search-results">
          {!query && (
            <div className="search-placeholder">
              <p>Start typing to search across all projects and tasks</p>
              <div className="search-tips">
                <span>💡 Tips: Search by task title, project name, or description</span>
              </div>
            </div>
          )}

          {query && results.projects.length === 0 && results.tasks.length === 0 && (
            <div className="search-no-results">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.projects.length > 0 && (
            <div className="results-section">
              <h3>Projects ({results.projects.length})</h3>
              {results.projects.map(project => (
                <div
                  key={project.id}
                  className="search-result-item project-result"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div
                    className="result-color-bar"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="result-content">
                    <span className="result-title">{project.title}</span>
                    <span className="result-subtitle">{project.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.tasks.length > 0 && (
            <div className="results-section">
              <h3>Tasks ({results.tasks.length})</h3>
              {results.tasks.slice(0, 20).map(task => (
                <div
                  key={task.id}
                  className="search-result-item task-result"
                  onClick={() => handleTaskClick(task)}
                >
                  <span className={`result-priority ${task.priority}`} />
                  <div className="result-content">
                    <span className="result-title">{task.title}</span>
                    <span className="result-meta">
                      {task.projectTitle} • {task.column}
                    </span>
                  </div>
                </div>
              ))}
              {results.tasks.length > 20 && (
                <p className="more-results">
                  +{results.tasks.length - 20} more tasks
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
