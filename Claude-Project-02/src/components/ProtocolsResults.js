import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';
import MacroTextarea from './MacroTextarea';
import FileAttachments from './FileAttachments';

const PROTOCOLS_KEY = 'research-dashboard-protocols';
const RESULTS_KEY = 'research-dashboard-results';

// Helper to get stored data
const getStoredData = (key, projectId) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      return data[projectId] || [];
    }
  } catch {}
  return [];
};

// Helper to save data
const saveStoredData = (key, projectId, items) => {
  try {
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : {};
    data[projectId] = items;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save:', e);
  }
};

function ProtocolsResults({ projectId, projectTitle }) {
  const { logActivity } = useApp();
  const { isSignedIn, createDoc, syncToDoc, importFromDoc, createSheet, syncToSheet, importFromSheet } = useGoogleAuth();
  const triggerSync = useSyncTrigger();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();

  // Wrapper to save data and trigger sync
  const saveWithSync = useCallback((key, items) => {
    saveStoredData(key, projectId, items);
    triggerSync();
  }, [projectId, triggerSync]);

  const [activeTab, setActiveTab] = useState('protocols');
  const [protocols, setProtocols] = useState(() => getStoredData(PROTOCOLS_KEY, projectId));
  const [results, setResults] = useState(() => getStoredData(RESULTS_KEY, projectId));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    fileUrl: '',
    tags: ''
  });
  const [expandedItem, setExpandedItem] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;

    const item = {
      id: Date.now(),
      ...newItem,
      tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      googleDocId: null,
      googleDocUrl: null,
      googleSheetId: null,
      googleSheetUrl: null
    };

    if (activeTab === 'protocols') {
      const updated = [...protocols, item];
      setProtocols(updated);
      saveWithSync(PROTOCOLS_KEY, updated);
      logActivity('protocol_added', {
        protocolTitle: item.title,
        projectId,
        projectTitle
      });
    } else {
      const updated = [...results, item];
      setResults(updated);
      saveWithSync(RESULTS_KEY, updated);
      logActivity('result_added', {
        resultTitle: item.title,
        projectId,
        projectTitle
      });
    }

    setNewItem({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      fileUrl: '',
      tags: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteItem = (itemId) => {
    if (activeTab === 'protocols') {
      const item = protocols.find(p => p.id === itemId);
      if (!item) return;

      // Move to trash instead of permanent deletion
      moveToTrash(TRASH_ITEM_TYPES.PROTOCOL, item, {
        projectId,
        projectTitle
      });

      const updated = protocols.filter(p => p.id !== itemId);
      setProtocols(updated);
      saveWithSync(PROTOCOLS_KEY, updated);
      showSuccess(`"${item.title || 'Protocol'}" moved to trash`);
    } else {
      const item = results.find(r => r.id === itemId);
      if (!item) return;

      // Move to trash instead of permanent deletion
      moveToTrash(TRASH_ITEM_TYPES.RESULT, item, {
        projectId,
        projectTitle
      });

      const updated = results.filter(r => r.id !== itemId);
      setResults(updated);
      saveWithSync(RESULTS_KEY, updated);
      showSuccess(`"${item.title || 'Result'}" moved to trash`);
    }
  };

  const handleUpdateItem = (itemId, updates) => {
    if (activeTab === 'protocols') {
      const updated = protocols.map(p => p.id === itemId ? { ...p, ...updates } : p);
      setProtocols(updated);
      saveWithSync(PROTOCOLS_KEY, updated);
    } else {
      const updated = results.map(r => r.id === itemId ? { ...r, ...updates } : r);
      setResults(updated);
      saveWithSync(RESULTS_KEY, updated);
    }
  };

  // Create Google Doc for an item
  const handleCreateGoogleDoc = async (item) => {
    const type = activeTab === 'protocols' ? 'Protocol' : 'Result';
    const title = `[${type}] ${item.title} - ${projectTitle}`;

    const content = `${type}: ${item.title}
Project: ${projectTitle}
Date: ${new Date(item.date).toLocaleDateString()}
Tags: ${item.tags?.join(', ') || 'None'}

---

${item.description || 'No description provided.'}

${item.fileUrl ? `\nAttached File/Link: ${item.fileUrl}` : ''}

---
Created: ${new Date(item.createdAt).toLocaleString()}
Last Updated: ${new Date().toLocaleString()}`;

    const result = await createDoc(title, content);

    if (result) {
      handleUpdateItem(item.id, {
        googleDocId: result.docId,
        googleDocUrl: result.docUrl
      });
      window.open(result.docUrl, '_blank');
    }
  };

  // Sync item to existing Google Doc
  const handleSyncToGoogleDoc = async (item) => {
    if (!item.googleDocId) {
      setSyncStatus({ message: 'No Google Doc linked to this item', type: 'error' });
      return;
    }

    const type = activeTab === 'protocols' ? 'Protocol' : 'Result';

    const content = `${type}: ${item.title}
Project: ${projectTitle}
Date: ${new Date(item.date).toLocaleDateString()}
Tags: ${item.tags?.join(', ') || 'None'}

---

${item.description || 'No description provided.'}

${item.fileUrl ? `\nAttached File/Link: ${item.fileUrl}` : ''}

---
Created: ${new Date(item.createdAt).toLocaleString()}
Last Updated: ${new Date().toLocaleString()}`;

    await syncToDoc(item.googleDocId, content);
  };

  // Import content from Google Doc
  const handleImportFromGoogleDoc = async (item) => {
    if (!item.googleDocId) {
      setSyncStatus({ message: 'No Google Doc linked to this item', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(item.googleDocId);

    if (result) {
      // Extract the description content (between the two "---" separators)
      let importedContent = result.content;
      const firstSep = importedContent.indexOf('---');
      const secondSep = importedContent.lastIndexOf('---');

      if (firstSep !== -1 && secondSep !== -1 && firstSep !== secondSep) {
        importedContent = importedContent.substring(firstSep + 3, secondSep).trim();
        // Remove the "Attached File/Link:" line if present
        importedContent = importedContent.replace(/\nAttached File\/Link:.*$/m, '').trim();
      }

      handleUpdateItem(item.id, { description: importedContent });
      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import from Google Doc', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  // Google Sheets handlers
  const handleCreateGoogleSheet = async (item) => {
    const type = activeTab === 'protocols' ? 'Protocol' : 'Result';
    const title = `[${type}] ${item.title} - ${projectTitle}`;

    const headers = ['Field', 'Value'];
    const data = [
      ['Title', item.title],
      ['Type', type],
      ['Project', projectTitle],
      ['Date', new Date(item.date).toLocaleDateString()],
      ['Tags', item.tags?.join(', ') || 'None'],
      ['Description', item.description || ''],
      ['File/Link', item.fileUrl || ''],
      ['Created', new Date(item.createdAt).toLocaleString()],
      ['Last Updated', new Date().toLocaleString()]
    ];

    setSyncStatus({ message: 'Creating Google Sheet...', type: 'info' });

    const result = await createSheet(title, headers, data);

    if (result) {
      handleUpdateItem(item.id, {
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

  const handleSyncToGoogleSheet = async (item) => {
    if (!item.googleSheetId) {
      setSyncStatus({ message: 'No Google Sheet linked', type: 'error' });
      return;
    }

    const type = activeTab === 'protocols' ? 'Protocol' : 'Result';
    const headers = ['Field', 'Value'];
    const data = [
      ['Title', item.title],
      ['Type', type],
      ['Project', projectTitle],
      ['Date', new Date(item.date).toLocaleDateString()],
      ['Tags', item.tags?.join(', ') || 'None'],
      ['Description', item.description || ''],
      ['File/Link', item.fileUrl || ''],
      ['Created', new Date(item.createdAt).toLocaleString()],
      ['Last Updated', new Date().toLocaleString()]
    ];

    setSyncStatus({ message: 'Syncing to Google Sheet...', type: 'info' });

    const success = await syncToSheet(item.googleSheetId, headers, data);

    if (success) {
      setSyncStatus({ message: 'Synced to Google Sheet!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to sync to Google Sheet', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleImportFromGoogleSheet = async (item) => {
    if (!item.googleSheetId) {
      setSyncStatus({ message: 'No Google Sheet linked', type: 'error' });
      return;
    }

    setSyncStatus({ message: 'Importing from Google Sheet...', type: 'info' });

    const result = await importFromSheet(item.googleSheetId);

    if (result && result.data) {
      // Parse the sheet data (Field, Value format)
      const updates = {};
      result.data.forEach(row => {
        const field = row[0]?.toLowerCase();
        const value = row[1] || '';
        if (field === 'description') updates.description = value;
        if (field === 'tags') updates.tags = value.split(',').map(t => t.trim()).filter(Boolean);
      });

      if (Object.keys(updates).length > 0) {
        handleUpdateItem(item.id, updates);
      }
      setSyncStatus({ message: 'Imported from Google Sheet!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import from Google Sheet', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const currentItems = activeTab === 'protocols' ? protocols : results;

  return (
    <div className="protocols-results-section">
      {/* Google Status */}
      <div className="google-status-indicator">
        {isSignedIn ? (
          <span className="google-status-text connected">Google Connected</span>
        ) : (
          <span className="google-status-text">Sign in via navbar for Google Docs</span>
        )}
      </div>

      {syncStatus.message && (
        <div className={`sync-status-bar ${syncStatus.type}`}>
          {syncStatus.message}
          <button onClick={() => setSyncStatus({ message: '', type: '' })}>x</button>
        </div>
      )}

      <div className="pr-tabs">
        <button
          className={`pr-tab ${activeTab === 'protocols' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocols')}
        >
          Protocols ({protocols.length})
        </button>
        <button
          className={`pr-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Data & Results ({results.length})
        </button>
      </div>

      <div className="pr-content">
        <div className="pr-header">
          <h3>{activeTab === 'protocols' ? 'Protocols & Methods' : 'Data & Results'}</h3>
          <button className="add-pr-btn" onClick={() => setShowAddForm(true)}>
            + Add {activeTab === 'protocols' ? 'Protocol' : 'Result'}
          </button>
        </div>

        {showAddForm && (
          <div className="pr-add-form">
            <input
              type="text"
              placeholder={activeTab === 'protocols' ? 'Protocol title...' : 'Result title...'}
              value={newItem.title}
              onChange={e => setNewItem({ ...newItem, title: e.target.value })}
              autoFocus
            />
            <MacroTextarea
              placeholder="Description or notes... (type @ for commands)"
              value={newItem.description}
              onChange={(description) => setNewItem({ ...newItem, description })}
              rows={3}
            />
            <div className="pr-form-row">
              <input
                type="date"
                value={newItem.date}
                onChange={e => setNewItem({ ...newItem, date: e.target.value })}
              />
              <input
                type="url"
                placeholder="File/Link URL (optional)"
                value={newItem.fileUrl}
                onChange={e => setNewItem({ ...newItem, fileUrl: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={newItem.tags}
              onChange={e => setNewItem({ ...newItem, tags: e.target.value })}
            />
            <div className="pr-form-actions">
              <button className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn-submit" onClick={handleAddItem}>Add</button>
            </div>
          </div>
        )}

        {currentItems.length === 0 && !showAddForm ? (
          <div className="pr-empty">
            <p>No {activeTab === 'protocols' ? 'protocols' : 'results'} yet</p>
            <span>Add your first {activeTab === 'protocols' ? 'protocol or method' : 'data or result'}</span>
          </div>
        ) : (
          <div className="pr-list">
            {currentItems.map(item => (
              <div
                key={item.id}
                className={`pr-item ${expandedItem === item.id ? 'expanded' : ''}`}
              >
                <div className="pr-item-header" onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                  <div className="pr-item-main">
                    <span className="pr-item-icon">
                      {activeTab === 'protocols' ? '📋' : '📊'}
                    </span>
                    <div className="pr-item-info">
                      <h4>
                        {item.title}
                        {item.googleDocId && (
                          <span className="google-doc-indicator" title="Linked to Google Doc">📄</span>
                        )}
                        {item.googleSheetId && (
                          <span className="google-sheet-indicator" title="Linked to Google Sheet">📊</span>
                        )}
                      </h4>
                      <span className="pr-item-date">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="pr-item-actions">
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pr-link-btn"
                        onClick={e => e.stopPropagation()}
                      >
                        🔗
                      </a>
                    )}
                    <button
                      className="pr-delete-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                    >
                      🗑️
                    </button>
                    <span className="pr-expand-icon">
                      {expandedItem === item.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {expandedItem === item.id && (
                  <div className="pr-item-details">
                    {item.description && (
                      <p className="pr-description">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="pr-tags">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="pr-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pr-file-link"
                      >
                        📎 Open attached file/link
                      </a>
                    )}

                    {/* Google Docs Actions */}
                    {isSignedIn && (
                      <div className="pr-google-actions">
                        <span className="google-action-label">Docs:</span>
                        {item.googleDocId ? (
                          <>
                            <a
                              href={item.googleDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-google-action"
                            >
                              Open
                            </a>
                            <button
                              className="btn-google-action"
                              onClick={() => handleSyncToGoogleDoc(item)}
                              title="Push to Google Doc"
                            >
                              ⬆
                            </button>
                            <button
                              className="btn-google-action"
                              onClick={() => handleImportFromGoogleDoc(item)}
                              title="Pull from Google Doc"
                            >
                              ⬇
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-google-action primary"
                            onClick={() => handleCreateGoogleDoc(item)}
                          >
                            + Create
                          </button>
                        )}
                      </div>
                    )}

                    {/* Google Sheets Actions */}
                    {isSignedIn && (
                      <div className="pr-google-actions">
                        <span className="google-action-label">Sheets:</span>
                        {item.googleSheetId ? (
                          <>
                            <a
                              href={item.googleSheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-google-action"
                            >
                              Open
                            </a>
                            <button
                              className="btn-google-action"
                              onClick={() => handleSyncToGoogleSheet(item)}
                              title="Push to Google Sheet"
                            >
                              ⬆
                            </button>
                            <button
                              className="btn-google-action"
                              onClick={() => handleImportFromGoogleSheet(item)}
                              title="Pull from Google Sheet"
                            >
                              ⬇
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-google-action primary"
                            onClick={() => handleCreateGoogleSheet(item)}
                          >
                            + Create
                          </button>
                        )}
                      </div>
                    )}

                    {/* File Attachments */}
                    <div className="pr-attachments">
                      <span className="google-action-label">Files:</span>
                      <FileAttachments
                        attachments={item.attachments || []}
                        onUpdate={(attachments) => handleUpdateItem(item.id, { attachments })}
                        maxFiles={10}
                        compact={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProtocolsResults;
