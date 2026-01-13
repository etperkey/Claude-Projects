import React, { useState } from 'react';

const NOTEBOOK_KEY = 'research-dashboard-lab-notebook';

function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [entry, setEntry] = useState({
    title: '',
    content: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    if (!entry.title.trim() && !entry.content.trim()) return;

    const newEntry = {
      id: `entry-${Date.now()}`,
      title: entry.title.trim() || 'Quick Note',
      content: entry.content,
      projectId: null, // Unassigned - can be sorted later
      tags: [...entry.tags, 'inbox'], // Mark as inbox item
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleDocId: null,
      googleDocUrl: null,
      googleSheetId: null,
      googleSheetUrl: null,
      isQuickCapture: true // Flag to identify quick captures
    };

    // Save to lab notebook storage
    try {
      const saved = localStorage.getItem(NOTEBOOK_KEY);
      const entries = saved ? JSON.parse(saved) : [];
      entries.unshift(newEntry); // Add to beginning
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(entries));

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Reset form
      setEntry({ title: '', content: '', tags: [] });
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to save quick capture:', e);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !entry.tags.includes(tagInput.trim())) {
      setEntry({ ...entry, tags: [...entry.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEntry({ ...entry, tags: entry.tags.filter(t => t !== tagToRemove) });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`quick-capture-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Quick Capture (Ctrl+Shift+N)"
      >
        {isOpen ? '×' : '+'}
      </button>

      {/* Success Toast */}
      {showSuccess && (
        <div className="quick-capture-toast">
          Captured! View in Lab Notebook
        </div>
      )}

      {/* Quick Capture Modal */}
      {isOpen && (
        <div className="quick-capture-overlay" onClick={() => setIsOpen(false)}>
          <div className="quick-capture-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-capture-header">
              <h3>Quick Capture</h3>
              <span className="quick-capture-hint">Ctrl+Enter to save</span>
            </div>

            <div className="quick-capture-body">
              <input
                type="text"
                className="quick-capture-title"
                placeholder="Title (optional)"
                value={entry.title}
                onChange={(e) => setEntry({ ...entry, title: e.target.value })}
                onKeyDown={handleKeyPress}
                autoFocus
              />

              <textarea
                className="quick-capture-content"
                placeholder="Capture your idea, observation, or note..."
                value={entry.content}
                onChange={(e) => setEntry({ ...entry, content: e.target.value })}
                onKeyDown={handleKeyPress}
                rows={4}
              />

              {/* Tags */}
              <div className="quick-capture-tags">
                {entry.tags.map(tag => (
                  <span key={tag} className="quick-tag">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>×</button>
                  </span>
                ))}
                <div className="quick-tag-input">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                </div>
              </div>

              <p className="quick-capture-note">
                Saved to Lab Notebook inbox. Assign to a project later.
              </p>
            </div>

            <div className="quick-capture-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setIsOpen(false);
                  setEntry({ title: '', content: '', tags: [] });
                }}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleSave}
                disabled={!entry.title.trim() && !entry.content.trim()}
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuickCapture;
