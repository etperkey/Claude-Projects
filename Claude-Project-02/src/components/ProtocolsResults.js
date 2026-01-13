import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';

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
  const { isSignedIn, createDoc, syncToDoc, importFromDoc } = useGoogleAuth();

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
      googleDocUrl: null
    };

    if (activeTab === 'protocols') {
      const updated = [...protocols, item];
      setProtocols(updated);
      saveStoredData(PROTOCOLS_KEY, projectId, updated);
      logActivity('protocol_added', {
        protocolTitle: item.title,
        projectId,
        projectTitle
      });
    } else {
      const updated = [...results, item];
      setResults(updated);
      saveStoredData(RESULTS_KEY, projectId, updated);
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
    if (!window.confirm('Delete this item?')) return;

    if (activeTab === 'protocols') {
      const updated = protocols.filter(p => p.id !== itemId);
      setProtocols(updated);
      saveStoredData(PROTOCOLS_KEY, projectId, updated);
    } else {
      const updated = results.filter(r => r.id !== itemId);
      setResults(updated);
      saveStoredData(RESULTS_KEY, projectId, updated);
    }
  };

  const handleUpdateItem = (itemId, updates) => {
    if (activeTab === 'protocols') {
      const updated = protocols.map(p => p.id === itemId ? { ...p, ...updates } : p);
      setProtocols(updated);
      saveStoredData(PROTOCOLS_KEY, projectId, updated);
    } else {
      const updated = results.map(r => r.id === itemId ? { ...r, ...updates } : r);
      setResults(updated);
      saveStoredData(RESULTS_KEY, projectId, updated);
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
            <textarea
              placeholder="Description or notes..."
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
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
                        {item.googleDocId ? (
                          <>
                            <a
                              href={item.googleDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-google-action"
                            >
                              Open Doc
                            </a>
                            <button
                              className="btn-google-action"
                              onClick={() => handleSyncToGoogleDoc(item)}
                            >
                              Push
                            </button>
                            <button
                              className="btn-google-action"
                              onClick={() => handleImportFromGoogleDoc(item)}
                            >
                              Pull
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-google-action primary"
                            onClick={() => handleCreateGoogleDoc(item)}
                          >
                            📝 Create Google Doc
                          </button>
                        )}
                      </div>
                    )}
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
