import React, { useState, useEffect, useCallback } from 'react';

const GCAL_SETTINGS_KEY = 'research-dashboard-gcal-settings';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

// Google Calendar API configuration
// Users need to set up their own Google Cloud project and OAuth credentials
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

function GoogleCalendarSync({ isOpen, onClose }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [settings, setSettings] = useState({
    syncEnabled: false,
    calendarId: 'primary',
    syncDirection: 'export', // 'export' | 'import' | 'both'
    lastSync: null
  });
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });
  const [calendars, setCalendars] = useState([]);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(GCAL_SETTINGS_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load calendar settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    localStorage.setItem(GCAL_SETTINGS_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  // Load Google API
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setIsLoading(false);
      return;
    }

    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', initClient);
      };
      document.body.appendChild(script);
    };

    const initClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          clientId: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
        });

        setGapiLoaded(true);

        // Check if already signed in
        const authInstance = window.gapi.auth2.getAuthInstance();
        setIsSignedIn(authInstance.isSignedIn.get());

        // Listen for sign-in state changes
        authInstance.isSignedIn.listen(setIsSignedIn);

        if (authInstance.isSignedIn.get()) {
          loadCalendars();
        }
      } catch (error) {
        console.error('Error initializing Google API:', error);
        setSyncStatus({ message: 'Failed to initialize Google API', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadGapi();
  }, []);

  const loadCalendars = async () => {
    try {
      const response = await window.gapi.client.calendar.calendarList.list();
      setCalendars(response.result.items || []);
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
      loadCalendars();
    } catch (error) {
      console.error('Error signing in:', error);
      setSyncStatus({ message: 'Failed to sign in', type: 'error' });
    }
  };

  const handleSignOut = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signOut();
      setCalendars([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAllTasksWithDueDates = useCallback(() => {
    const allTasks = [];
    const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);

    if (savedTasks) {
      try {
        const tasksByProject = JSON.parse(savedTasks);
        Object.entries(tasksByProject).forEach(([projectId, projectTasks]) => {
          Object.entries(projectTasks).forEach(([columnId, tasks]) => {
            tasks.forEach(task => {
              if (task.dueDate) {
                allTasks.push({
                  ...task,
                  projectId,
                  columnId
                });
              }
            });
          });
        });
      } catch (e) {
        console.error('Failed to parse tasks:', e);
      }
    }

    return allTasks;
  }, []);

  const handleExportToCalendar = async () => {
    if (!gapiLoaded || !isSignedIn) return;

    setIsLoading(true);
    setSyncStatus({ message: 'Exporting tasks to Google Calendar...', type: 'info' });

    try {
      const tasks = getAllTasksWithDueDates();
      let exported = 0;

      for (const task of tasks) {
        const event = {
          summary: `[Research] ${task.title}`,
          description: task.description || '',
          start: {
            date: task.dueDate
          },
          end: {
            date: task.dueDate
          },
          colorId: task.priority === 'high' ? '11' : task.priority === 'medium' ? '5' : '10'
        };

        try {
          await window.gapi.client.calendar.events.insert({
            calendarId: settings.calendarId,
            resource: event
          });
          exported++;
        } catch (e) {
          console.error('Failed to create event:', e);
        }
      }

      saveSettings({ ...settings, lastSync: new Date().toISOString() });
      setSyncStatus({
        message: `Successfully exported ${exported} tasks to Google Calendar`,
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setSyncStatus({ message: 'Failed to export tasks', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFromCalendar = async () => {
    if (!gapiLoaded || !isSignedIn) return;

    setIsLoading(true);
    setSyncStatus({ message: 'Fetching events from Google Calendar...', type: 'info' });

    try {
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await window.gapi.client.calendar.events.list({
        calendarId: settings.calendarId,
        timeMin: now.toISOString(),
        timeMax: oneMonthLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });

      const events = response.result.items || [];
      setSyncStatus({
        message: `Found ${events.length} upcoming events. Import feature coming soon!`,
        type: 'info'
      });
    } catch (error) {
      console.error('Import error:', error);
      setSyncStatus({ message: 'Failed to fetch calendar events', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasCredentials = GOOGLE_CLIENT_ID && GOOGLE_API_KEY;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gcal-modal-content" onClick={e => e.stopPropagation()}>
        <div className="gcal-modal-header">
          <h2>📅 Google Calendar Integration</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="gcal-modal-body">
          {!hasCredentials ? (
            <div className="gcal-setup-instructions">
              <h3>Setup Required</h3>
              <p>To enable Google Calendar integration, you need to set up Google API credentials:</p>
              <ol>
                <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the Google Calendar API</li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Add your domain to authorized JavaScript origins</li>
                <li>Create an API key</li>
                <li>Add the following to your <code>.env</code> file:</li>
              </ol>
              <pre className="env-example">
{`REACT_APP_GOOGLE_CLIENT_ID=<your-oauth-client-id>
REACT_APP_GOOGLE_API_KEY=<your-api-key>`}
              </pre>
              <p className="setup-note">After adding credentials, restart the development server.</p>

              <div className="manual-sync-section">
                <h4>Manual Export (No Setup Required)</h4>
                <p>You can manually export your tasks as an ICS file to import into any calendar app:</p>
                <button
                  className="btn-export-ics"
                  onClick={() => exportToICS(getAllTasksWithDueDates())}
                >
                  Download ICS File
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="gcal-loading">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : !isSignedIn ? (
            <div className="gcal-signin">
              <p>Sign in with your Google account to sync tasks with Google Calendar.</p>
              <button className="google-signin-btn" onClick={handleSignIn}>
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="gcal-connected">
              <div className="connection-status">
                <span className="status-dot connected"></span>
                <span>Connected to Google Calendar</span>
                <button className="signout-link" onClick={handleSignOut}>Sign out</button>
              </div>

              <div className="gcal-settings">
                <div className="form-group">
                  <label>Select Calendar</label>
                  <select
                    value={settings.calendarId}
                    onChange={(e) => saveSettings({ ...settings, calendarId: e.target.value })}
                  >
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sync-actions">
                  <button
                    className="sync-btn export"
                    onClick={handleExportToCalendar}
                    disabled={isLoading}
                  >
                    📤 Export Tasks to Calendar
                  </button>
                  <button
                    className="sync-btn import"
                    onClick={handleImportFromCalendar}
                    disabled={isLoading}
                  >
                    📥 Import from Calendar
                  </button>
                </div>

                {settings.lastSync && (
                  <p className="last-sync">
                    Last sync: {new Date(settings.lastSync).toLocaleString()}
                  </p>
                )}
              </div>

              {syncStatus.message && (
                <div className={`sync-status ${syncStatus.type}`}>
                  {syncStatus.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to export tasks as ICS file (works without Google API)
function exportToICS(tasks) {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Research Dashboard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  tasks.forEach(task => {
    const dueDate = task.dueDate.replace(/-/g, '');
    const uid = `${task.id}@research-dashboard`;
    const priority = task.priority === 'high' ? 1 : task.priority === 'medium' ? 5 : 9;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dueDate}`,
      `DTEND;VALUE=DATE:${dueDate}`,
      `SUMMARY:[Research] ${task.title}`,
      `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
      `PRIORITY:${priority}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'research-tasks.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default GoogleCalendarSync;
