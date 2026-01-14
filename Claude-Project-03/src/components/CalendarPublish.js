import React, { useState, useCallback, useEffect } from 'react';

const GIST_CONFIG_KEY = 'research-dashboard-gist-config';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';
const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';

// Generate iCal format for tasks
const generateICalContent = (tasks) => {
  const now = new Date();
  const formatDate = (dateStr) => dateStr.replace(/-/g, '');

  const escapeText = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const formatDateTime = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KanLab//Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KanLab Tasks',
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H'
  ];

  tasks.forEach(task => {
    if (!task.dueDate) return;

    const uid = `${task.id}@research-dashboard`;
    const dtstamp = formatDateTime(now);
    const dtstart = formatDate(task.dueDate);
    const summary = escapeText(task.title);
    const description = escapeText(
      `Project: ${task.projectTitle}\\nStatus: ${task.column}\\nPriority: ${task.priority || 'medium'}`
    );

    ical.push('BEGIN:VEVENT');
    ical.push(`UID:${uid}`);
    ical.push(`DTSTAMP:${dtstamp}`);
    ical.push(`DTSTART;VALUE=DATE:${dtstart}`);
    ical.push(`DTEND;VALUE=DATE:${dtstart}`);
    ical.push(`SUMMARY:${summary}`);
    ical.push(`DESCRIPTION:${description}`);
    ical.push(`CATEGORIES:${escapeText(task.projectTitle)}`);

    if (task.priority === 'high') {
      ical.push('PRIORITY:1');
    } else if (task.priority === 'low') {
      ical.push('PRIORITY:9');
    } else {
      ical.push('PRIORITY:5');
    }

    ical.push('END:VEVENT');
  });

  ical.push('END:VCALENDAR');

  return ical.join('\r\n');
};

function CalendarPublish({ isOpen, onClose, tasks }) {
  const [githubToken, setGithubToken] = useState('');
  const [gistConfig, setGistConfig] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Load saved gist config
  useEffect(() => {
    const saved = localStorage.getItem(GIST_CONFIG_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setGistConfig(config);
        if (config.token) {
          setGithubToken(config.token);
        }
      } catch (e) {
        console.error('Failed to load gist config:', e);
      }
    }
  }, []);

  // Create or update GitHub Gist
  const publishToGist = useCallback(async () => {
    if (!githubToken) {
      setStatus({ message: 'Please enter your GitHub token first', type: 'error' });
      setShowTokenInput(true);
      return;
    }

    setIsPublishing(true);
    setStatus({ message: 'Publishing calendar...', type: 'info' });

    const icalContent = generateICalContent(tasks);

    try {
      let response;
      const gistData = {
        description: 'KanLab Tasks Calendar',
        public: false,
        files: {
          'research-dashboard-tasks.ics': {
            content: icalContent
          }
        }
      };

      if (gistConfig?.gistId) {
        // Update existing gist
        response = await fetch(`https://api.github.com/gists/${gistConfig.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(gistData)
        });
      } else {
        // Create new gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(gistData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to publish to GitHub');
      }

      const data = await response.json();

      // Get the raw URL for the .ics file
      const rawUrl = data.files['research-dashboard-tasks.ics'].raw_url;
      // Convert to a stable URL (remove the commit hash for latest version)
      const stableRawUrl = rawUrl.replace(/\/raw\/[a-f0-9]+\//, '/raw/');
      const webcalUrl = stableRawUrl.replace('https://', 'webcal://');

      const newConfig = {
        gistId: data.id,
        gistUrl: data.html_url,
        rawUrl: stableRawUrl,
        webcalUrl,
        token: githubToken,
        lastPublished: new Date().toISOString()
      };

      localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(newConfig));
      setGistConfig(newConfig);
      setStatus({
        message: gistConfig?.gistId ? 'Calendar updated successfully!' : 'Calendar published successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Publish error:', error);
      if (error.message.includes('401') || error.message.includes('Bad credentials')) {
        setStatus({ message: 'Invalid GitHub token. Please check your token and try again.', type: 'error' });
        setShowTokenInput(true);
      } else if (error.message.includes('404')) {
        // Gist was deleted, create a new one
        const oldConfig = gistConfig;
        setGistConfig(null);
        localStorage.removeItem(GIST_CONFIG_KEY);
        setStatus({ message: 'Previous gist not found. Click Publish to create a new one.', type: 'warning' });
      } else {
        setStatus({ message: `Error: ${error.message}`, type: 'error' });
      }
    } finally {
      setIsPublishing(false);
    }
  }, [githubToken, gistConfig, tasks]);

  const copyToClipboard = useCallback((text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({ message: `${label} copied to clipboard!`, type: 'success' });
      setTimeout(() => setStatus({ message: '', type: '' }), 2000);
    });
  }, []);

  const clearGistConfig = useCallback(() => {
    if (window.confirm('This will disconnect the calendar subscription. You will need to set it up again. Continue?')) {
      localStorage.removeItem(GIST_CONFIG_KEY);
      setGistConfig(null);
      setGithubToken('');
      setStatus({ message: 'Calendar subscription disconnected', type: 'info' });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="calendar-publish-overlay" onClick={onClose}>
      <div className="calendar-publish-modal" onClick={e => e.stopPropagation()}>
        <div className="publish-header">
          <h3>Publish Calendar for Subscription</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="publish-content">
          {!gistConfig ? (
            <>
              <div className="publish-intro">
                <p>
                  Publish your tasks to a GitHub Gist to get a webcal URL that Google Calendar
                  can subscribe to. Changes are synced when you click "Publish".
                </p>
              </div>

              <div className="token-setup">
                <h4>Step 1: Create a GitHub Personal Access Token</h4>
                <ol>
                  <li>
                    Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">
                      GitHub Token Settings
                    </a>
                  </li>
                  <li>Give it a name like "KanLab Calendar"</li>
                  <li>Select the <code>gist</code> scope</li>
                  <li>Click "Generate token" and copy it</li>
                </ol>

                <div className="token-input-group">
                  <label>GitHub Personal Access Token:</label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="token-input"
                  />
                  <p className="token-note">
                    Your token is stored locally and only used to publish your calendar.
                  </p>
                </div>

                <h4>Step 2: Publish Your Calendar</h4>
                <button
                  className="btn-publish"
                  onClick={publishToGist}
                  disabled={isPublishing || !githubToken}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Calendar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="publish-connected">
                <div className="connection-badge">
                  <span className="status-dot connected"></span>
                  Calendar Published
                </div>
                <p className="last-published">
                  Last updated: {new Date(gistConfig.lastPublished).toLocaleString()}
                </p>
              </div>

              <div className="subscription-urls">
                <div className="url-group">
                  <label>Webcal Subscription URL (for Google Calendar):</label>
                  <div className="url-display">
                    <input
                      type="text"
                      value={gistConfig.webcalUrl}
                      readOnly
                      className="url-input"
                    />
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(gistConfig.webcalUrl, 'Webcal URL')}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="url-group">
                  <label>Direct .ics URL:</label>
                  <div className="url-display">
                    <input
                      type="text"
                      value={gistConfig.rawUrl}
                      readOnly
                      className="url-input"
                    />
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(gistConfig.rawUrl, 'ICS URL')}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="subscription-instructions">
                <h4>Subscribe in Google Calendar:</h4>
                <ol>
                  <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Google Calendar</a></li>
                  <li>Click the "+" next to "Other calendars" in the left sidebar</li>
                  <li>Select "From URL"</li>
                  <li>Paste the Webcal URL above</li>
                  <li>Click "Add calendar"</li>
                </ol>
                <p className="sync-note">
                  <strong>Note:</strong> Google Calendar syncs external calendars every 12-24 hours.
                  Click "Update Calendar" after making changes to publish them.
                </p>
              </div>

              <div className="publish-actions">
                <button
                  className="btn-update"
                  onClick={publishToGist}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Updating...' : 'Update Calendar'}
                </button>

                {showTokenInput && (
                  <div className="token-update">
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="Enter new GitHub token"
                      className="token-input small"
                    />
                  </div>
                )}

                <button
                  className="btn-view-gist"
                  onClick={() => window.open(gistConfig.gistUrl, '_blank')}
                >
                  View Gist
                </button>

                <button
                  className="btn-disconnect"
                  onClick={clearGistConfig}
                >
                  Disconnect
                </button>
              </div>

              <div className="task-summary">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} with due dates will be included
              </div>
            </>
          )}

          {status.message && (
            <div className={`publish-status ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPublish;
