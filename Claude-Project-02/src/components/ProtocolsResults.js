import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

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

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;

    const item = {
      id: Date.now(),
      ...newItem,
      tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
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

  const currentItems = activeTab === 'protocols' ? protocols : results;

  return (
    <div className="protocols-results-section">
      <div className="pr-tabs">
        <button
          className={`pr-tab ${activeTab === 'protocols' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocols')}
        >
          📋 Protocols ({protocols.length})
        </button>
        <button
          className={`pr-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📊 Data & Results ({results.length})
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
                      <h4>{item.title}</h4>
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
