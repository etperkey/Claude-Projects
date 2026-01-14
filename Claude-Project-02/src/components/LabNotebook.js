import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { researchProjects } from '../data/projects';
import MacroTextarea from './MacroTextarea';

const NOTEBOOK_KEY = 'research-dashboard-lab-notebook';

function LabNotebook({ isOpen, onClose }) {
  const { isSignedIn, createDoc, syncToDoc, importFromDoc, createSheet, syncToSheet, importFromSheet } = useGoogleAuth();
  const triggerSync = useSyncTrigger();

  const [entries, setEntries] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    projectId: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });

  // Load custom projects
  const [customProjects, setCustomProjects] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('research-dashboard-custom-projects');
      if (saved) setCustomProjects(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const allProjects = [...researchProjects, ...customProjects];

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(NOTEBOOK_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notebook entries:', e);
      }
    }
  }, []);

  // Save entries to localStorage
  const saveEntries = useCallback((newEntries) => {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(newEntries));
    setEntries(newEntries);
    triggerSync();
  }, [triggerSync]);

  // Format timestamp
  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateHeader = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Add new entry
  const handleAddEntry = () => {
    if (!newEntry.title.trim() && !newEntry.content.trim()) return;

    const entry = {
      id: `entry-${Date.now()}`,
      title: newEntry.title.trim() || 'Untitled Entry',
      content: newEntry.content,
      projectId: newEntry.projectId || null,
      tags: newEntry.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleDocId: null,
      googleDocUrl: null,
      googleSheetId: null,
      googleSheetUrl: null
    };

    saveEntries([entry, ...entries]);
    setNewEntry({ title: '', content: '', projectId: '', tags: [] });
    setShowNewEntry(false);
  };

  // Update entry
  const handleUpdateEntry = (entryId, updates) => {
    const updated = entries.map(e =>
      e.id === entryId
        ? { ...e, ...updates, updatedAt: new Date().toISOString() }
        : e
    );
    saveEntries(updated);
    if (selectedEntry?.id === entryId) {
      setSelectedEntry({ ...selectedEntry, ...updates });
    }
  };

  // Delete entry
  const handleDeleteEntry = (entryId) => {
    if (window.confirm('Delete this notebook entry?')) {
      const updated = entries.filter(e => e.id !== entryId);
      saveEntries(updated);
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !newEntry.tags.includes(tagInput.trim())) {
      setNewEntry({
        ...newEntry,
        tags: [...newEntry.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Create Google Doc from entry
  const handleCreateGoogleDoc = async (entry) => {
    if (!isSignedIn) {
      setSyncStatus({ message: 'Please sign in to Google first (use navbar button)', type: 'error' });
      setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
      return;
    }

    setSyncStatus({ message: 'Creating Google Doc...', type: 'info' });

    const projectName = entry.projectId
      ? allProjects.find(p => p.id === entry.projectId)?.title || 'Unknown Project'
      : 'No Project';

    const contentText = `Lab Notebook Entry\n\nTitle: ${entry.title}\nDate: ${formatTimestamp(entry.createdAt)}\nProject: ${projectName}\nTags: ${entry.tags.join(', ') || 'None'}\n\n---\n\n${entry.content}`;

    const result = await createDoc(`[Lab Notebook] ${entry.title}`, contentText);

    if (result) {
      handleUpdateEntry(entry.id, {
        googleDocId: result.docId,
        googleDocUrl: result.docUrl
      });
      setSyncStatus({ message: 'Google Doc created successfully!', type: 'success' });
      window.open(result.docUrl, '_blank');
    } else {
      setSyncStatus({ message: 'Failed to create Google Doc', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Sync entry to existing Google Doc
  const handleSyncToGoogleDoc = async (entry) => {
    if (!entry.googleDocId) {
      setSyncStatus({ message: 'No Google Doc linked to this entry', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Syncing to Google Doc...', type: 'info' });

    const projectName = entry.projectId
      ? allProjects.find(p => p.id === entry.projectId)?.title || 'Unknown Project'
      : 'No Project';

    const contentText = `Lab Notebook Entry\n\nTitle: ${entry.title}\nDate: ${formatTimestamp(entry.createdAt)}\nLast Updated: ${formatTimestamp(entry.updatedAt)}\nProject: ${projectName}\nTags: ${entry.tags.join(', ') || 'None'}\n\n---\n\n${entry.content}`;

    const success = await syncToDoc(entry.googleDocId, contentText);

    if (success) {
      setSyncStatus({ message: 'Synced to Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to sync to Google Doc', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Import content from Google Doc
  const handleImportFromGoogleDoc = async (entry) => {
    if (!entry.googleDocId) {
      setSyncStatus({ message: 'No Google Doc linked to this entry', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(entry.googleDocId);

    if (result) {
      // Extract the main content (after the "---" separator)
      let importedContent = result.content;
      const separatorIndex = importedContent.indexOf('---');
      if (separatorIndex !== -1) {
        importedContent = importedContent.substring(separatorIndex + 3).trim();
      }

      handleUpdateEntry(entry.id, { content: importedContent });
      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import from Google Doc', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Create Google Sheet from entry
  const handleCreateGoogleSheet = async (entry) => {
    if (!isSignedIn) {
      setSyncStatus({ message: 'Please sign in to Google first (use navbar button)', type: 'error' });
      setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
      return;
    }

    setSyncStatus({ message: 'Creating Google Sheet...', type: 'info' });

    const projectName = entry.projectId
      ? allProjects.find(p => p.id === entry.projectId)?.title || 'Unknown Project'
      : 'No Project';

    const headers = ['Field', 'Value'];
    const data = [
      ['Title', entry.title],
      ['Date', formatTimestamp(entry.createdAt)],
      ['Project', projectName],
      ['Tags', entry.tags.join(', ') || 'None'],
      ['Content', entry.content],
      ['Last Updated', formatTimestamp(entry.updatedAt)]
    ];

    const result = await createSheet(`[Lab Notebook] ${entry.title}`, headers, data);

    if (result) {
      handleUpdateEntry(entry.id, {
        googleSheetId: result.spreadsheetId,
        googleSheetUrl: result.sheetUrl
      });
      setSyncStatus({ message: 'Google Sheet created!', type: 'success' });
      window.open(result.sheetUrl, '_blank');
    } else {
      setSyncStatus({ message: 'Failed to create Google Sheet', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Sync entry to existing Google Sheet
  const handleSyncToGoogleSheet = async (entry) => {
    if (!entry.googleSheetId) {
      setSyncStatus({ message: 'No Google Sheet linked to this entry', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Syncing to Google Sheet...', type: 'info' });

    const projectName = entry.projectId
      ? allProjects.find(p => p.id === entry.projectId)?.title || 'Unknown Project'
      : 'No Project';

    const headers = ['Field', 'Value'];
    const data = [
      ['Title', entry.title],
      ['Date', formatTimestamp(entry.createdAt)],
      ['Project', projectName],
      ['Tags', entry.tags.join(', ') || 'None'],
      ['Content', entry.content],
      ['Last Updated', formatTimestamp(entry.updatedAt)]
    ];

    const success = await syncToSheet(entry.googleSheetId, headers, data);

    if (success) {
      setSyncStatus({ message: 'Synced to Google Sheet!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to sync to Google Sheet', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Import content from Google Sheet
  const handleImportFromGoogleSheet = async (entry) => {
    if (!entry.googleSheetId) {
      setSyncStatus({ message: 'No Google Sheet linked to this entry', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Importing from Google Sheet...', type: 'info' });

    const result = await importFromSheet(entry.googleSheetId);

    if (result && result.data) {
      // Parse the sheet data (Field, Value format)
      const updates = {};
      result.data.forEach(row => {
        const field = row[0]?.toLowerCase();
        const value = row[1] || '';
        if (field === 'content') updates.content = value;
        if (field === 'tags') updates.tags = value.split(',').map(t => t.trim()).filter(Boolean);
      });

      if (Object.keys(updates).length > 0) {
        handleUpdateEntry(entry.id, updates);
      }
      setSyncStatus({ message: 'Imported from Google Sheet!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import from Google Sheet', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Count inbox items (no project assigned or has 'inbox' tag)
  const inboxCount = entries.filter(entry =>
    !entry.projectId || entry.tags?.includes('inbox') || entry.isQuickCapture
  ).length;

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    let matchesProject = filterProject === 'all';

    if (filterProject === 'inbox') {
      // Show entries with no project, or with 'inbox' tag, or quick captures
      matchesProject = !entry.projectId || entry.tags?.includes('inbox') || entry.isQuickCapture;
    } else if (filterProject === '') {
      matchesProject = !entry.projectId;
    } else if (filterProject !== 'all') {
      matchesProject = entry.projectId === filterProject;
    }

    const matchesSearch = !searchTerm ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  // Group entries by date
  const groupedEntries = filteredEntries.reduce((groups, entry) => {
    const dateKey = new Date(entry.createdAt).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
    return groups;
  }, {});

  const getProjectColor = (projectId) => {
    const project = allProjects.find(p => p.id === projectId);
    return project?.color || '#888';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notebook-modal-content" onClick={e => e.stopPropagation()}>
        <div className="notebook-header">
          <div className="notebook-title-row">
            <h2>Lab Notebook</h2>
            <div className="notebook-google-status">
              {isSignedIn ? (
                <span className="google-status-text connected">Google Connected</span>
              ) : (
                <span className="google-status-text">Sign in via navbar for Google Docs</span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {syncStatus.message && (
          <div className={`notebook-sync-status ${syncStatus.type}`}>
            {syncStatus.message}
            <button onClick={() => setSyncStatus({ message: '', type: '' })}>x</button>
          </div>
        )}

        <div className="notebook-toolbar">
          <button
            className="new-entry-btn"
            onClick={() => setShowNewEntry(true)}
          >
            + New Entry
          </button>

          <div className="notebook-filters">
            <input
              type="text"
              className="notebook-search"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="notebook-project-filter"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">All Entries</option>
              <option value="inbox">Inbox ({inboxCount})</option>
              <option value="">Unassigned</option>
              {allProjects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="notebook-body">
          {/* New Entry Form */}
          {showNewEntry && (
            <div className="new-entry-form">
              <input
                type="text"
                className="entry-title-input"
                placeholder="Entry title..."
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                autoFocus
              />

              <MacroTextarea
                className="entry-content-input"
                placeholder="Write your lab notes here... (type @ for commands)"
                value={newEntry.content}
                onChange={(content) => setNewEntry({ ...newEntry, content })}
                rows={8}
              />

              <div className="entry-meta-row">
                <select
                  className="entry-project-select"
                  value={newEntry.projectId}
                  onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
                >
                  <option value="">Link to project (optional)</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>

                <div className="entry-tags-input">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <button onClick={handleAddTag}>+</button>
                </div>
              </div>

              {newEntry.tags.length > 0 && (
                <div className="entry-tags">
                  {newEntry.tags.map(tag => (
                    <span key={tag} className="entry-tag">
                      {tag}
                      <button onClick={() => setNewEntry({
                        ...newEntry,
                        tags: newEntry.tags.filter(t => t !== tag)
                      })}>x</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="entry-form-actions">
                <button className="btn-cancel" onClick={() => {
                  setShowNewEntry(false);
                  setNewEntry({ title: '', content: '', projectId: '', tags: [] });
                }}>
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleAddEntry}>
                  Save Entry
                </button>
              </div>
            </div>
          )}

          {/* Entries List */}
          <div className="notebook-entries">
            {Object.keys(groupedEntries).length === 0 ? (
              <div className="notebook-empty">
                <p>No notebook entries yet.</p>
                <p className="hint">Start documenting your research by clicking "+ New Entry"</p>
              </div>
            ) : (
              Object.entries(groupedEntries).map(([dateKey, dayEntries]) => (
                <div key={dateKey} className="notebook-day-group">
                  <h3 className="day-header">{formatDateHeader(dayEntries[0].createdAt)}</h3>

                  {dayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`notebook-entry ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
                    >
                      <div
                        className="entry-main"
                        onClick={() => setSelectedEntry(
                          selectedEntry?.id === entry.id ? null : entry
                        )}
                      >
                        <div className="entry-header">
                          <span className="entry-time">
                            {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {entry.projectId ? (
                            <span
                              className="entry-project-badge"
                              style={{ backgroundColor: getProjectColor(entry.projectId) }}
                            >
                              {allProjects.find(p => p.id === entry.projectId)?.title || 'Project'}
                            </span>
                          ) : (
                            <span className="entry-inbox-badge" title="In inbox - assign to project">
                              Inbox
                            </span>
                          )}
                          {entry.isQuickCapture && (
                            <span className="quick-capture-badge" title="Quick Capture">
                              Quick
                            </span>
                          )}
                          {entry.googleDocId && (
                            <span className="google-doc-badge" title="Linked to Google Doc">
                              G
                            </span>
                          )}
                          {entry.googleSheetId && (
                            <span className="google-sheet-badge" title="Linked to Google Sheet">
                              S
                            </span>
                          )}
                        </div>

                        <h4 className="entry-title">{entry.title}</h4>

                        <p className="entry-preview">
                          {entry.content.slice(0, 150)}
                          {entry.content.length > 150 && '...'}
                        </p>

                        {entry.tags.length > 0 && (
                          <div className="entry-tags-display">
                            {entry.tags.map(tag => (
                              <span key={tag} className="entry-tag-badge">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded Entry View */}
                      {selectedEntry?.id === entry.id && (
                        <div className="entry-expanded">
                          <div className="entry-full-content">
                            <MacroTextarea
                              value={entry.content}
                              onChange={(content) => handleUpdateEntry(entry.id, { content })}
                              rows={10}
                            />
                          </div>

                          {/* Project Assignment */}
                          <div className="entry-assignment">
                            <label>Assign to Project:</label>
                            <select
                              className="entry-project-assign"
                              value={entry.projectId || ''}
                              onChange={(e) => {
                                const newProjectId = e.target.value || null;
                                // Remove 'inbox' tag when assigning to a project
                                const newTags = newProjectId
                                  ? entry.tags?.filter(t => t !== 'inbox') || []
                                  : entry.tags || [];
                                handleUpdateEntry(entry.id, {
                                  projectId: newProjectId,
                                  tags: newTags,
                                  isQuickCapture: newProjectId ? false : entry.isQuickCapture
                                });
                              }}
                            >
                              <option value="">No Project (Inbox)</option>
                              {allProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                              ))}
                            </select>
                            {!entry.projectId && (
                              <span className="assignment-hint">Select a project to organize this entry</span>
                            )}
                          </div>

                          <div className="entry-actions">
                            {isSignedIn && (
                              <>
                                <div className="google-actions-row">
                                  <span className="google-action-label">Docs:</span>
                                  {entry.googleDocId ? (
                                    <>
                                      <a
                                        href={entry.googleDocUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-action small"
                                      >
                                        Open
                                      </a>
                                      <button
                                        className="btn-action small"
                                        onClick={() => handleSyncToGoogleDoc(entry)}
                                        title="Push to Google Doc"
                                      >
                                        ⬆
                                      </button>
                                      <button
                                        className="btn-action small"
                                        onClick={() => handleImportFromGoogleDoc(entry)}
                                        title="Pull from Google Doc"
                                      >
                                        ⬇
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn-action small primary"
                                      onClick={() => handleCreateGoogleDoc(entry)}
                                    >
                                      + Create
                                    </button>
                                  )}
                                </div>
                                <div className="google-actions-row">
                                  <span className="google-action-label">Sheets:</span>
                                  {entry.googleSheetId ? (
                                    <>
                                      <a
                                        href={entry.googleSheetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-action small"
                                      >
                                        Open
                                      </a>
                                      <button
                                        className="btn-action small"
                                        onClick={() => handleSyncToGoogleSheet(entry)}
                                        title="Push to Google Sheet"
                                      >
                                        ⬆
                                      </button>
                                      <button
                                        className="btn-action small"
                                        onClick={() => handleImportFromGoogleSheet(entry)}
                                        title="Pull from Google Sheet"
                                      >
                                        ⬇
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn-action small primary"
                                      onClick={() => handleCreateGoogleSheet(entry)}
                                    >
                                      + Create
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                            <button
                              className="btn-action danger"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              Delete
                            </button>
                          </div>

                          <div className="entry-meta-info">
                            <span>Created: {formatTimestamp(entry.createdAt)}</span>
                            {entry.updatedAt !== entry.createdAt && (
                              <span>Updated: {formatTimestamp(entry.updatedAt)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LabNotebook;
