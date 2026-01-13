import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import GlobalSearch from './GlobalSearch';
import CalendarView from './CalendarView';
import QuickAddModal from './QuickAddModal';
import ActivityTimeline from './ActivityTimeline';
import GoogleCalendarSync from './GoogleCalendarSync';
import LabNotebook from './LabNotebook';
import { researchProjects } from '../data/projects';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function Navbar() {
  const { theme, toggleTheme } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
  const [showLabNotebook, setShowLabNotebook] = useState(false);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowCalendar(false);
        setShowQuickAdd(false);
        setShowActivity(false);
        setShowGoogleCalendar(false);
        setShowLabNotebook(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportCSV = () => {
    // Get all projects and tasks
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    const allProjects = [...researchProjects, ...customProjects];

    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    // Build CSV
    const rows = [['Project', 'Task', 'Status', 'Priority', 'Due Date', 'Description']];

    allProjects.forEach(project => {
      const projectTasks = savedTasks[project.id] || project.tasks;
      if (!projectTasks) return;

      Object.entries(projectTasks).forEach(([column, tasks]) => {
        tasks.forEach(task => {
          rows.push([
            project.title,
            task.title,
            column,
            task.priority || 'medium',
            task.dueDate || '',
            (task.description || '').replace(/"/g, '""')
          ]);
        });
      });
    });

    const csvContent = rows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `research-tasks-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <nav className="global-navbar">
        <div className="navbar-left">
          <button
            className="nav-btn search-btn"
            onClick={() => setShowSearch(true)}
            title="Search (⌘K)"
          >
            🔍 <span className="btn-label">Search</span>
            <span className="shortcut">⌘K</span>
          </button>

          <button
            className="nav-btn notebook-btn"
            onClick={() => setShowLabNotebook(true)}
            title="Lab Notebook"
          >
            📓 <span className="btn-label">Notebook</span>
          </button>
        </div>

        <div className="navbar-right">
          <button
            className="nav-btn"
            onClick={() => setShowQuickAdd(true)}
            title="Quick Add Task"
          >
            ➕ <span className="btn-label">Add Task</span>
          </button>

          <button
            className="nav-btn"
            onClick={() => setShowCalendar(true)}
            title="Calendar View"
          >
            📅 <span className="btn-label">Calendar</span>
          </button>

          <button
            className="nav-btn"
            onClick={() => setShowActivity(true)}
            title="Activity Timeline"
          >
            📜 <span className="btn-label">Activity</span>
          </button>

          <button
            className="nav-btn gcal-btn"
            onClick={() => setShowGoogleCalendar(true)}
            title="Google Calendar Sync"
          >
            📆 <span className="btn-label">G-Cal</span>
          </button>

          <button
            className="nav-btn"
            onClick={handleExportCSV}
            title="Export to CSV"
          >
            📥 <span className="btn-label">Export</span>
          </button>

          <button
            className="nav-btn theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <CalendarView isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
      <QuickAddModal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
      <ActivityTimeline isOpen={showActivity} onClose={() => setShowActivity(false)} />
      <GoogleCalendarSync isOpen={showGoogleCalendar} onClose={() => setShowGoogleCalendar(false)} />
      <LabNotebook isOpen={showLabNotebook} onClose={() => setShowLabNotebook(false)} />
    </>
  );
}

export default Navbar;
