import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { useAutoBackup } from '../context/AutoBackupContext';
import { useApiKeys } from '../context/ApiKeysContext';
import { useTrash } from '../context/TrashContext';
import GlobalSearch from './GlobalSearch';
import CalendarView from './CalendarView';
import QuickAddModal from './QuickAddModal';
import ActivityTimeline from './ActivityTimeline';
import LabNotebook from './LabNotebook';
import BackupSettingsModal from './BackupSettingsModal';
import { researchProjects } from '../data/projects';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function Navbar() {
  const { theme, toggleTheme } = useApp();
  const { isSignedIn, gisLoaded, hasCredentials, user, signIn, signOut } = useGoogleAuth();
  const {
    createLocalBackup,
    exportToGoogleDrive,
    isBackingUp,
    lastBackup,
    settings: backupSettings
  } = useAutoBackup();
  const { openSettings, hasClaudeKey, hasOpenaiKey } = useApiKeys();
  const { trashedItems, openTrash } = useTrash();
  const [showSearch, setShowSearch] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showLabNotebook, setShowLabNotebook] = useState(false);
  const [showBackupSettings, setShowBackupSettings] = useState(false);

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
        setShowLabNotebook(false);
        setShowBackupSettings(false);
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

    // Track custom project IDs
    const customProjectIds = new Set(customProjects.map(p => p.id));

    const allProjects = [...researchProjects, ...customProjects];

    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    // Build CSV
    const rows = [['Project', 'Task', 'Status', 'Priority', 'Due Date', 'Description']];

    allProjects.forEach(project => {
      // For custom projects, tasks are in the project object
      // For built-in projects, check savedTasks first
      let projectTasks;
      if (customProjectIds.has(project.id)) {
        projectTasks = project.tasks;
      } else {
        projectTasks = savedTasks[project.id] || project.tasks;
      }
      if (!projectTasks) return;

      Object.entries(projectTasks).forEach(([column, tasks]) => {
        if (!Array.isArray(tasks)) return;
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

  // Export full workspace as JSON
  const handleExportJSON = () => {
    // All localStorage keys used by the app
    const APP_KEYS = [
      'research-dashboard-custom-projects',
      'research-dashboard-tasks',
      'research-dashboard-lab-notebook',
      'research-dashboard-literature',
      'research-dashboard-recurring',
      'research-dashboard-templates',
      'research-dashboard-activity',
      'research-dashboard-archived',
      'research-dashboard-theme',
      'research-dashboard-trash'
    ];

    // Project-specific key prefixes
    const PROJECT_PREFIXES = [
      'research-dashboard-research-notes-',
      'research-dashboard-protocols-',
      'research-dashboard-results-',
      'research-dashboard-lab-notebook-'
    ];

    const exportData = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      appName: 'Research Dashboard',
      data: {}
    };

    // Export standard keys
    APP_KEYS.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          exportData.data[key] = JSON.parse(value);
        }
      } catch (e) {
        console.warn(`Failed to export ${key}:`, e);
      }
    });

    // Export project-specific keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (PROJECT_PREFIXES.some(prefix => key.startsWith(prefix))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            exportData.data[key] = JSON.parse(value);
          }
        } catch (e) {
          console.warn(`Failed to export ${key}:`, e);
        }
      }
    }

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `research-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import workspace from JSON backup
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);

          // Validate the import file
          if (!importData.appName || importData.appName !== 'Research Dashboard') {
            alert('Invalid backup file. Please select a valid Research Dashboard backup.');
            return;
          }

          if (!importData.data || typeof importData.data !== 'object') {
            alert('Invalid backup file format. Missing data section.');
            return;
          }

          // Confirm before overwriting
          const keyCount = Object.keys(importData.data).length;
          const confirmMsg = `This will import ${keyCount} data entries from your backup dated ${new Date(importData.exportDate).toLocaleDateString()}.\n\nExisting data will be merged with the backup. Continue?`;

          if (!window.confirm(confirmMsg)) return;

          // Import each key to localStorage
          let importedCount = 0;
          Object.entries(importData.data).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, JSON.stringify(value));
              importedCount++;
            } catch (e) {
              console.error(`Failed to import ${key}:`, e);
            }
          });

          alert(`Successfully imported ${importedCount} data entries. The page will now reload to apply changes.`);

          // Reload to apply imported data
          window.location.reload();
        } catch (e) {
          console.error('Import error:', e);
          alert('Failed to import backup file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

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
            📓 <span className="btn-label">Lab Notebook</span>
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

          <div className="export-dropdown">
            <button
              className={`nav-btn ${isBackingUp ? 'backing-up' : ''}`}
              onClick={() => setShowExportMenu(!showExportMenu)}
              title={lastBackup ? `Last backup: ${lastBackup.toLocaleString()}` : 'Export / Import data'}
            >
              {isBackingUp ? (
                <span className="backup-icon spinning">↻</span>
              ) : (
                <>📥</>
              )}
              <span className="btn-label">Export</span>
              {backupSettings.enabled && isSignedIn && (
                <span className="auto-backup-indicator" title="Auto-backup enabled">●</span>
              )}
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <div className="export-menu-section">Google Drive</div>
                <button
                  onClick={() => { exportToGoogleDrive(); setShowExportMenu(false); }}
                  disabled={!isSignedIn || isBackingUp}
                  title={!isSignedIn ? 'Sign in to Google first' : ''}
                >
                  ☁️ Backup to Drive
                </button>
                <button
                  onClick={() => { setShowBackupSettings(true); setShowExportMenu(false); }}
                  disabled={!isSignedIn}
                  title={!isSignedIn ? 'Sign in to Google first' : ''}
                >
                  📂 Restore from Drive
                </button>
                <div className="export-menu-section">Local</div>
                <button onClick={() => { handleExportCSV(); setShowExportMenu(false); }}>
                  📄 Export Tasks CSV
                </button>
                <button onClick={() => { createLocalBackup(); setShowExportMenu(false); }}>
                  💾 Download Backup
                </button>
                <button onClick={() => { handleImportJSON(); setShowExportMenu(false); }}>
                  📤 Import from File
                </button>
                <div className="export-menu-divider"></div>
                <button onClick={() => { setShowBackupSettings(true); setShowExportMenu(false); }}>
                  ⚙️ Backup Settings
                </button>
              </div>
            )}
          </div>

          <button
            className={`nav-btn trash-btn ${trashedItems.length > 0 ? 'has-items' : ''}`}
            onClick={openTrash}
            title={trashedItems.length > 0 ? `Trash (${trashedItems.length} items)` : 'Trash'}
          >
            🗑️ <span className="btn-label">Trash</span>
            {trashedItems.length > 0 && (
              <span className="trash-count-badge">{trashedItems.length}</span>
            )}
          </button>

          {isSignedIn && (
            <>
              <button
                className={`nav-btn cloud-btn ${isBackingUp ? 'backing-up' : ''}`}
                onClick={() => exportToGoogleDrive(false, false)}
                disabled={isBackingUp}
                title={lastBackup ? `Save to Cloud (Last: ${lastBackup.toLocaleString()})` : 'Save backup to Google Drive'}
              >
                {isBackingUp ? (
                  <span className="cloud-icon spinning">↻</span>
                ) : (
                  <span className="cloud-icon">☁↑</span>
                )}
                <span className="btn-label">Save</span>
                {backupSettings.enabled && (
                  <span className="auto-backup-indicator" title="Auto-backup enabled">●</span>
                )}
              </button>
              <button
                className="nav-btn cloud-btn"
                onClick={() => setShowBackupSettings(true)}
                title="View and restore from Google Drive backups"
              >
                <span className="cloud-icon">☁↓</span>
                <span className="btn-label">Load</span>
              </button>
            </>
          )}

          {hasCredentials && (
            isSignedIn ? (
              <button
                className="nav-btn google-auth-btn signed-in"
                onClick={signOut}
                title={user ? `Signed in as ${user.email}` : 'Sign out of Google'}
              >
                {user?.picture ? (
                  <img src={user.picture} alt="" className="google-avatar" />
                ) : (
                  <span className="google-icon">G</span>
                )}
                <span className="btn-label">{user?.name?.split(' ')[0] || 'Google'}</span>
              </button>
            ) : (
              <button
                className="nav-btn google-auth-btn"
                onClick={signIn}
                disabled={!gisLoaded}
                title="Sign in with Google"
              >
                <span className="google-icon">G</span>
                <span className="btn-label">{gisLoaded ? 'Sign In' : '...'}</span>
              </button>
            )
          )}

          <button
            className={`nav-btn settings-btn ${hasClaudeKey || hasOpenaiKey ? 'configured' : ''}`}
            onClick={openSettings}
            title={hasClaudeKey && hasOpenaiKey ? 'API Settings (configured)' : 'Configure API Keys'}
          >
            ⚙️ <span className="btn-label">Settings</span>
            {(!hasClaudeKey || !hasOpenaiKey) && <span className="settings-dot"></span>}
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
      <LabNotebook isOpen={showLabNotebook} onClose={() => setShowLabNotebook(false)} />
      <BackupSettingsModal isOpen={showBackupSettings} onClose={() => setShowBackupSettings(false)} />
    </>
  );
}

export default Navbar;
