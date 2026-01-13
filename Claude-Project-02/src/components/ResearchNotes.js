import React, { useState, useEffect } from 'react';

const RESEARCH_NOTES_KEY = 'research-dashboard-research-notes';

function ResearchNotes({ projectId, projectTitle }) {
  const [activeTab, setActiveTab] = useState('background');
  const [notes, setNotes] = useState({
    background: '',
    specificAims: [],
    miscNotes: []
  });
  const [isEditing, setIsEditing] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RESEARCH_NOTES_KEY);
    if (saved) {
      try {
        const all = JSON.parse(saved);
        if (all[projectId]) {
          setNotes(all[projectId]);
        }
      } catch (e) {
        console.error('Failed to load research notes:', e);
      }
    }
  }, [projectId]);

  // Save notes to localStorage
  const saveNotes = (newNotes) => {
    const saved = localStorage.getItem(RESEARCH_NOTES_KEY);
    let all = {};
    if (saved) {
      try {
        all = JSON.parse(saved);
      } catch (e) {
        all = {};
      }
    }
    all[projectId] = newNotes;
    localStorage.setItem(RESEARCH_NOTES_KEY, JSON.stringify(all));
    setNotes(newNotes);
  };

  // Background handlers
  const handleSaveBackground = () => {
    saveNotes({ ...notes, background: editContent });
    setIsEditing(null);
    setEditContent('');
  };

  // Specific Aims handlers
  const handleAddAim = () => {
    const newAim = {
      id: Date.now(),
      title: '',
      description: '',
      rationale: '',
      hypothesis: '',
      approach: '',
      expectedOutcomes: '',
      status: 'planned' // planned, in-progress, completed
    };
    saveNotes({ ...notes, specificAims: [...notes.specificAims, newAim] });
    setIsEditing(`aim-${newAim.id}`);
    setEditContent(newAim);
  };

  const handleUpdateAim = (aimId, field, value) => {
    const updatedAims = notes.specificAims.map(aim =>
      aim.id === aimId ? { ...aim, [field]: value } : aim
    );
    saveNotes({ ...notes, specificAims: updatedAims });
  };

  const handleDeleteAim = (aimId) => {
    if (window.confirm('Delete this specific aim?')) {
      const updatedAims = notes.specificAims.filter(aim => aim.id !== aimId);
      saveNotes({ ...notes, specificAims: updatedAims });
    }
  };

  // Misc Notes handlers
  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      category: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveNotes({ ...notes, miscNotes: [...notes.miscNotes, newNote] });
    setIsEditing(`note-${newNote.id}`);
  };

  const handleUpdateNote = (noteId, updates) => {
    const updatedNotes = notes.miscNotes.map(note =>
      note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
    );
    saveNotes({ ...notes, miscNotes: updatedNotes });
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm('Delete this note?')) {
      const updatedNotes = notes.miscNotes.filter(note => note.id !== noteId);
      saveNotes({ ...notes, miscNotes: updatedNotes });
    }
  };

  const NOTE_CATEGORIES = [
    { id: 'general', label: 'General', color: '#888' },
    { id: 'idea', label: 'Ideas', color: '#f1c40f' },
    { id: 'question', label: 'Questions', color: '#3498db' },
    { id: 'reference', label: 'References', color: '#9b59b6' },
    { id: 'meeting', label: 'Meeting Notes', color: '#27ae60' },
    { id: 'todo', label: 'To-Do', color: '#e74c3c' }
  ];

  const AIM_STATUSES = [
    { id: 'planned', label: 'Planned', color: '#888' },
    { id: 'in-progress', label: 'In Progress', color: '#3498db' },
    { id: 'completed', label: 'Completed', color: '#27ae60' }
  ];

  return (
    <div className="research-notes">
      {/* Tab navigation */}
      <div className="notes-tabs">
        <button
          className={`notes-tab ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          📖 Research Background
        </button>
        <button
          className={`notes-tab ${activeTab === 'aims' ? 'active' : ''}`}
          onClick={() => setActiveTab('aims')}
        >
          🎯 Specific Aims ({notes.specificAims.length})
        </button>
        <button
          className={`notes-tab ${activeTab === 'misc' ? 'active' : ''}`}
          onClick={() => setActiveTab('misc')}
        >
          📝 Miscellaneous Notes ({notes.miscNotes.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="notes-content">
        {/* Background Tab */}
        {activeTab === 'background' && (
          <div className="background-section">
            <div className="section-header">
              <h3>Research Background</h3>
              {isEditing !== 'background' && (
                <button
                  className="edit-btn"
                  onClick={() => {
                    setIsEditing('background');
                    setEditContent(notes.background);
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {isEditing === 'background' ? (
              <div className="background-editor">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter research background, context, and significance...

Include:
• Scientific context and rationale
• Current state of knowledge
• Gap in existing research
• Significance and innovation
• Preliminary data (if any)"
                  rows={15}
                />
                <div className="editor-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setIsEditing(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn-submit" onClick={handleSaveBackground}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="background-display">
                {notes.background ? (
                  <div className="background-text">{notes.background}</div>
                ) : (
                  <div className="empty-state">
                    <p>No research background added yet.</p>
                    <p className="hint">Add context, rationale, and significance for your research project.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Specific Aims Tab */}
        {activeTab === 'aims' && (
          <div className="aims-section">
            <div className="section-header">
              <h3>Specific Aims</h3>
              <button className="add-btn" onClick={handleAddAim}>
                + Add Aim
              </button>
            </div>

            {notes.specificAims.length === 0 ? (
              <div className="empty-state">
                <p>No specific aims defined yet.</p>
                <p className="hint">Define clear, measurable objectives for your research project.</p>
              </div>
            ) : (
              <div className="aims-list">
                {notes.specificAims.map((aim, index) => (
                  <div key={aim.id} className="aim-card">
                    <div className="aim-header">
                      <span className="aim-number">Aim {index + 1}</span>
                      <select
                        className={`aim-status ${aim.status}`}
                        value={aim.status}
                        onChange={(e) => handleUpdateAim(aim.id, 'status', e.target.value)}
                      >
                        {AIM_STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        className="delete-aim-btn"
                        onClick={() => handleDeleteAim(aim.id)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="aim-field">
                      <label>Title</label>
                      <input
                        type="text"
                        value={aim.title}
                        onChange={(e) => handleUpdateAim(aim.id, 'title', e.target.value)}
                        placeholder="Brief title for this aim..."
                      />
                    </div>

                    <div className="aim-field">
                      <label>Description</label>
                      <textarea
                        value={aim.description}
                        onChange={(e) => handleUpdateAim(aim.id, 'description', e.target.value)}
                        placeholder="What do you want to achieve?"
                        rows={2}
                      />
                    </div>

                    <div className="aim-field">
                      <label>Rationale</label>
                      <textarea
                        value={aim.rationale}
                        onChange={(e) => handleUpdateAim(aim.id, 'rationale', e.target.value)}
                        placeholder="Why is this aim important?"
                        rows={2}
                      />
                    </div>

                    <div className="aim-field">
                      <label>Hypothesis</label>
                      <textarea
                        value={aim.hypothesis}
                        onChange={(e) => handleUpdateAim(aim.id, 'hypothesis', e.target.value)}
                        placeholder="What do you hypothesize?"
                        rows={2}
                      />
                    </div>

                    <div className="aim-field">
                      <label>Experimental Approach</label>
                      <textarea
                        value={aim.approach}
                        onChange={(e) => handleUpdateAim(aim.id, 'approach', e.target.value)}
                        placeholder="How will you test this aim?"
                        rows={3}
                      />
                    </div>

                    <div className="aim-field">
                      <label>Expected Outcomes</label>
                      <textarea
                        value={aim.expectedOutcomes}
                        onChange={(e) => handleUpdateAim(aim.id, 'expectedOutcomes', e.target.value)}
                        placeholder="What results do you expect?"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Miscellaneous Notes Tab */}
        {activeTab === 'misc' && (
          <div className="misc-section">
            <div className="section-header">
              <h3>Miscellaneous Notes</h3>
              <button className="add-btn" onClick={handleAddNote}>
                + Add Note
              </button>
            </div>

            {notes.miscNotes.length === 0 ? (
              <div className="empty-state">
                <p>No notes added yet.</p>
                <p className="hint">Add ideas, questions, meeting notes, or any other relevant information.</p>
              </div>
            ) : (
              <div className="notes-grid">
                {notes.miscNotes.map(note => (
                  <div key={note.id} className="note-card">
                    <div className="note-header">
                      <select
                        className="note-category"
                        value={note.category}
                        onChange={(e) => handleUpdateNote(note.id, { category: e.target.value })}
                        style={{
                          borderColor: NOTE_CATEGORIES.find(c => c.id === note.category)?.color
                        }}
                      >
                        {NOTE_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                      <button
                        className="delete-note-btn"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="text"
                      className="note-title"
                      value={note.title}
                      onChange={(e) => handleUpdateNote(note.id, { title: e.target.value })}
                      placeholder="Note title..."
                    />

                    <textarea
                      className="note-content"
                      value={note.content}
                      onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                      placeholder="Write your note here..."
                      rows={4}
                    />

                    <div className="note-footer">
                      <span className="note-date">
                        Updated: {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResearchNotes;
