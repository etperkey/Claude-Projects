import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const THEME_KEY = 'research-dashboard-theme';
const ACTIVITY_KEY = 'research-dashboard-activity';
const ARCHIVED_KEY = 'research-dashboard-archived';

export function AppProvider({ children }) {
  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved || 'dark';
  });

  // Activity log
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem(ACTIVITY_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Archived project IDs
  const [archivedProjects, setArchivedProjects] = useState(() => {
    const saved = localStorage.getItem(ARCHIVED_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist activities (keep last 100)
  useEffect(() => {
    const trimmed = activities.slice(0, 100);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
  }, [activities]);

  // Persist archived
  useEffect(() => {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archivedProjects));
  }, [archivedProjects]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const logActivity = (action, details) => {
    const activity = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      ...details
    };
    setActivities(prev => [activity, ...prev]);
  };

  const archiveProject = (projectId) => {
    setArchivedProjects(prev => [...prev, projectId]);
    logActivity('archive_project', { projectId });
  };

  const unarchiveProject = (projectId) => {
    setArchivedProjects(prev => prev.filter(id => id !== projectId));
    logActivity('unarchive_project', { projectId });
  };

  const isProjectArchived = (projectId) => {
    return archivedProjects.includes(projectId);
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      activities,
      logActivity,
      archivedProjects,
      archiveProject,
      unarchiveProject,
      isProjectArchived
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
