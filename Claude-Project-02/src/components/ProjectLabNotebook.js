import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

const NOTEBOOK_KEY = 'research-dashboard-lab-notebook';

function ProjectLabNotebook({ projectId, projectTitle }) {
  const { isSignedIn, createDoc, syncToDoc, importFromDoc, createSheet, syncToSheet, importFromSheet } = useGoogleAuth();

  const [entries, setEntries] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    tags: [projectTitle] // Pre-populate with project title as tag
  });
  const [tagInput, setTagInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });

  // Helper to check if entry matches this project (by tag or projectId)
  const entryMatchesProject = (entry) => {
    // Match by projectId
    if (entry.projectId === projectId) return true;

    // Match by tag (case-insensitive match on project title or id)
    const projectTitleLower = projectTitle.toLowerCase();
    const projectIdLower = projectId.toLowerCase();

    return entry.tags?.some(tag => {
      const tagLower = tag.toLowerCase();
      return tagLower === projectTitleLower ||
             tagLower === projectIdLower ||
             projectTitleLower.includes(tagLower) ||
             tagLower.includes(projectTitleLower);
    });
  };

  // Load entries from localStorage (filtered by project tag or projectId)
  useEffect(() => {
    const saved = localStorage.getItem(NOTEBOOK_KEY);
    if (saved) {
      try {
        const allEntries = JSON.parse(saved);
        // Filter entries for this project by tag or projectId
        const projectEntries = allEntries.filter(entryMatchesProject);
        setEntries(projectEntries);
      } catch (e) {
        console.error('Failed to load notebook entries:', e);
      }
    }
  }, [projectId, projectTitle]);

  // Save entries to localStorage
  const saveEntries = (newProjectEntries) => {
    try {
      const saved = localStorage.getItem(NOTEBOOK_KEY);
      let allEntries = saved ? JSON.parse(saved) : [];

      // Get IDs of entries we're updating
      const updatedIds = new Set(newProjectEntries.map(e => e.id));

      // Keep entries that don't match this project OR are being updated
      allEntries = allEntries.filter(e => !entryMatchesProject(e) || updatedIds.has(e.id));

      // Remove duplicates and add/update project entries
      const existingIds = new Set(allEntries.map(e => e.id));
      const entriesToAdd = newProjectEntries.filter(e => !existingIds.has(e.id));

      // Update existing entries
      allEntries = allEntries.map(e => {
        const updated = newProjectEntries.find(ne => ne.id === e.id);
        return updated || e;
      });

      // Add new entries at the beginning
      allEntries = [...entriesToAdd, ...allEntries];

      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(allEntries));
      setEntries(newProjectEntries);
    } catch (e) {
      console.error('Failed to save notebook entries:', e);
    }
  };

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
      projectId: projectId,
      tags: newEntry.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleDocId: null,
      googleDocUrl: null,
      googleSheetId: null,
      googleSheetUrl: null
    };

    saveEntries([entry, ...entries]);
    setNewEntry({ title: '', content: '', tags: [projectTitle] });
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

  // Google Docs handlers
  const handleCreateGoogleDoc = async (entry) => {
    if (!isSignedIn) {
      setSyncStatus({ message: 'Please sign in to Google first', type: 'error' });
      setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
      return;
    }

    setSyncStatus({ message: 'Creating Google Doc...', type: 'info' });

    const contentText = `Lab Notebook Entry\n\nTitle: ${entry.title}\nDate: ${formatTimestamp(entry.createdAt)}\nProject: ${projectTitle}\nTags: ${entry.tags.join(', ') || 'None'}\n\n---\n\n${entry.content}`;

    const result = await createDoc(`[Lab Notebook] ${entry.title}`, contentText);

    if (result) {
      handleUpdateEntry(entry.id, {
        googleDocId: result.docId,
        googleDocUrl: result.docUrl
      });
      setSyncStatus({ message: 'Google Doc created!', type: 'success' });
      window.open(result.docUrl, '_blank');
    } else {
      setSyncStatus({ message: 'Failed to create Google Doc', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleSyncToGoogleDoc = async (entry) => {
    if (!entry.googleDocId) return;

    setSyncStatus({ message: 'Syncing to Google Doc...', type: 'info' });

    const contentText = `Lab Notebook Entry\n\nTitle: ${entry.title}\nDate: ${formatTimestamp(entry.createdAt)}\nLast Updated: ${formatTimestamp(entry.updatedAt)}\nProject: ${projectTitle}\nTags: ${entry.tags.join(', ') || 'None'}\n\n---\n\n${entry.content}`;

    const success = await syncToDoc(entry.googleDocId, contentText);

    if (success) {
      setSyncStatus({ message: 'Synced to Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to sync', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleImportFromGoogleDoc = async (entry) => {
    if (!entry.googleDocId) return;

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(entry.googleDocId);

    if (result) {
      let importedContent = result.content;
      const separatorIndex = importedContent.indexOf('---');
      if (separatorIndex !== -1) {
        importedContent = importedContent.substring(separatorIndex + 3).trim();
      }

      handleUpdateEntry(entry.id, { content: importedContent });
      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Google Sheets handlers
  const handleCreateGoogleSheet = async (entry) => {
    if (!isSignedIn) {
      setSyncStatus({ message: 'Please sign in to Google first', type: 'error' });
      setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
      return;
    }

    setSyncStatus({ message: 'Creating Google Sheet...', type: 'info' });

    const headers = ['Field', 'Value'];
    const data = [
      ['Title', entry.title],
      ['Date', formatTimestamp(entry.createdAt)],
      ['Project', projectTitle],
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

  const handleSyncToGoogleSheet = async (entry) => {
    if (!entry.googleSheetId) return;

    setSyncStatus({ message: 'Syncing to Google Sheet...', type: 'info' });

    const headers = ['Field', 'Value'];
    const data = [
      ['Title', entry.title],
      ['Date', formatTimestamp(entry.createdAt)],
      ['Project', projectTitle],
      ['Tags', entry.tags.join(', ') || 'None'],
      ['Content', entry.content],
      ['Last Updated', formatTimestamp(entry.updatedAt)]
    ];

    const success = await syncToSheet(entry.googleSheetId, headers, data);

    if (success) {
      setSyncStatus({ message: 'Synced to Google Sheet!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to sync', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleImportFromGoogleSheet = async (entry) => {
    if (!entry.googleSheetId) return;

    setSyncStatus({ message: 'Importing from Google Sheet...', type: 'info' });

    const result = await importFromSheet(entry.googleSheetId);

    if (result && result.data) {
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
      setSyncStatus({ message: 'Failed to import', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
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

  return (
    <div className="project-lab-notebook">
      {/* Google Status */}
      <div className="google-status-indicator">
        {isSignedIn ? (
          <span className="google-status-text connected">Google Connected</span>
        ) : (
          <span className="google-status-text">Sign in via navbar for Google Docs/Sheets</span>
        )}
      </div>

      {syncStatus.message && (
        <div className={`sync-status-bar ${syncStatus.type}`}>
          {syncStatus.message}
          <button onClick={() => setSyncStatus({ message: '', type: '' })}>x</button>
        </div>
      )}

      <div className="notebook-toolbar inline">
        <button
          className="new-entry-btn"
          onClick={() => setShowNewEntry(true)}
        >
          + New Entry
        </button>

        <input
          type="text"
          className="notebook-search"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* New Entry Form */}
      {showNewEntry && (
        <div className="new-entry-form inline">
          <input
            type="text"
            className="entry-title-input"
            placeholder="Entry title..."
            value={newEntry.title}
            onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
            autoFocus
          />

          <textarea
            className="entry-content-input"
            placeholder="Write your lab notes here..."
            value={newEntry.content}
            onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
            rows={6}
          />

          <div className="entry-meta-row">
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
              setNewEntry({ title: '', content: '', tags: [projectTitle] });
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
      <div className="notebook-entries inline">
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="notebook-empty">
            <p>No notebook entries for this project yet.</p>
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
                        <textarea
                          value={entry.content}
                          onChange={(e) => handleUpdateEntry(entry.id, { content: e.target.value })}
                          rows={10}
                        />
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
  );
}

export default ProjectLabNotebook;
