import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';
import LiteratureManager from './LiteratureManager';
import CitableTextarea from './CitableTextarea';

const RESEARCH_NOTES_KEY = 'research-dashboard-research-notes';

function ResearchNotes({ projectId, projectTitle }) {
  const { isSignedIn, createDoc, syncToDoc, importFromDoc } = useGoogleAuth();
  const triggerSync = useSyncTrigger();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('background');
  const [notes, setNotes] = useState({
    background: '',
    backgroundGoogleDocId: null,
    backgroundGoogleDocUrl: null,
    specificAims: [],
    miscNotes: []
  });
  const [isEditing, setIsEditing] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });

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
  const saveNotes = useCallback((newNotes) => {
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
    triggerSync();
  }, [projectId, triggerSync]);

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
      content: '', // Single text field for all aim details
      status: 'planned',
      googleDocId: null,
      googleDocUrl: null
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
    const aim = notes.specificAims.find(a => a.id === aimId);
    if (!aim) return;

    // Move to trash instead of permanent deletion
    moveToTrash(TRASH_ITEM_TYPES.NOTE, { ...aim, noteType: 'specificAim' }, {
      projectId,
      projectTitle
    });

    const updatedAims = notes.specificAims.filter(a => a.id !== aimId);
    saveNotes({ ...notes, specificAims: updatedAims });
    showSuccess(`"${aim.title || 'Specific Aim'}" moved to trash`);
  };

  // Misc Notes handlers
  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      category: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleDocId: null,
      googleDocUrl: null
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
    const note = notes.miscNotes.find(n => n.id === noteId);
    if (!note) return;

    // Move to trash instead of permanent deletion
    moveToTrash(TRASH_ITEM_TYPES.NOTE, { ...note, noteType: 'miscNote' }, {
      projectId,
      projectTitle
    });

    const updatedNotes = notes.miscNotes.filter(n => n.id !== noteId);
    saveNotes({ ...notes, miscNotes: updatedNotes });
    showSuccess(`"${note.title || 'Note'}" moved to trash`);
  };

  // Google Docs handlers
  const handleCreateBackgroundDoc = async () => {
    const title = `[Research Background] ${projectTitle}`;
    const content = `Research Background
Project: ${projectTitle}

---

${notes.background || 'No background content yet.'}

---
Last Updated: ${new Date().toLocaleString()}`;

    const result = await createDoc(title, content);
    if (result) {
      saveNotes({
        ...notes,
        backgroundGoogleDocId: result.docId,
        backgroundGoogleDocUrl: result.docUrl
      });
      window.open(result.docUrl, '_blank');
    }
  };

  const handleSyncBackgroundDoc = async () => {
    if (!notes.backgroundGoogleDocId) return;

    const content = `Research Background
Project: ${projectTitle}

---

${notes.background || 'No background content yet.'}

---
Last Updated: ${new Date().toLocaleString()}`;

    await syncToDoc(notes.backgroundGoogleDocId, content);
  };

  const handleCreateAimDoc = async (aim, index) => {
    const title = `[Specific Aim ${index + 1}] ${aim.title || 'Untitled'} - ${projectTitle}`;
    const content = `Specific Aim ${index + 1}: ${aim.title || 'Untitled'}
Project: ${projectTitle}
Status: ${aim.status}

---

${aim.content || aim.description || 'No details yet.'}

---
Last Updated: ${new Date().toLocaleString()}`;

    const result = await createDoc(title, content);
    if (result) {
      handleUpdateAim(aim.id, 'googleDocId', result.docId);
      handleUpdateAim(aim.id, 'googleDocUrl', result.docUrl);
      window.open(result.docUrl, '_blank');
    }
  };

  const handleSyncAimDoc = async (aim, index) => {
    if (!aim.googleDocId) return;

    const content = `Specific Aim ${index + 1}: ${aim.title || 'Untitled'}
Project: ${projectTitle}
Status: ${aim.status}

---

${aim.content || aim.description || 'No details yet.'}

---
Last Updated: ${new Date().toLocaleString()}`;

    await syncToDoc(aim.googleDocId, content);
  };

  const handleCreateNoteDoc = async (note) => {
    const title = `[Note] ${note.title} - ${projectTitle}`;
    const content = `Note: ${note.title}
Project: ${projectTitle}
Category: ${NOTE_CATEGORIES.find(c => c.id === note.category)?.label || note.category}

---

${note.content || 'No content yet.'}

---
Created: ${new Date(note.createdAt).toLocaleString()}
Last Updated: ${new Date().toLocaleString()}`;

    const result = await createDoc(title, content);
    if (result) {
      handleUpdateNote(note.id, {
        googleDocId: result.docId,
        googleDocUrl: result.docUrl
      });
      window.open(result.docUrl, '_blank');
    }
  };

  const handleSyncNoteDoc = async (note) => {
    if (!note.googleDocId) return;

    const content = `Note: ${note.title}
Project: ${projectTitle}
Category: ${NOTE_CATEGORIES.find(c => c.id === note.category)?.label || note.category}

---

${note.content || 'No content yet.'}

---
Created: ${new Date(note.createdAt).toLocaleString()}
Last Updated: ${new Date().toLocaleString()}`;

    await syncToDoc(note.googleDocId, content);
  };

  // Import functions
  const handleImportBackgroundDoc = async () => {
    if (!notes.backgroundGoogleDocId) return;

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(notes.backgroundGoogleDocId);

    if (result) {
      let importedContent = result.content;
      const firstSep = importedContent.indexOf('---');
      const secondSep = importedContent.lastIndexOf('---');

      if (firstSep !== -1 && secondSep !== -1 && firstSep !== secondSep) {
        importedContent = importedContent.substring(firstSep + 3, secondSep).trim();
      }

      saveNotes({ ...notes, background: importedContent });
      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleImportAimDoc = async (aim) => {
    if (!aim.googleDocId) return;

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(aim.googleDocId);

    if (result) {
      let importedContent = result.content;
      const firstSep = importedContent.indexOf('---');
      const secondSep = importedContent.lastIndexOf('---');

      if (firstSep !== -1 && secondSep !== -1 && firstSep !== secondSep) {
        const sectionContent = importedContent.substring(firstSep + 3, secondSep);

        // Parse sections
        const descMatch = sectionContent.match(/DESCRIPTION:\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
        const ratMatch = sectionContent.match(/RATIONALE:\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
        const hypMatch = sectionContent.match(/HYPOTHESIS:\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
        const appMatch = sectionContent.match(/EXPERIMENTAL APPROACH:\n([\s\S]*?)(?=\n[A-Z]+:|$)/);
        const outMatch = sectionContent.match(/EXPECTED OUTCOMES:\n([\s\S]*?)(?=\n[A-Z]+:|$)/);

        if (descMatch) handleUpdateAim(aim.id, 'description', descMatch[1].trim());
        if (ratMatch) handleUpdateAim(aim.id, 'rationale', ratMatch[1].trim());
        if (hypMatch) handleUpdateAim(aim.id, 'hypothesis', hypMatch[1].trim());
        if (appMatch) handleUpdateAim(aim.id, 'approach', appMatch[1].trim());
        if (outMatch) handleUpdateAim(aim.id, 'expectedOutcomes', outMatch[1].trim());
      }

      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
  };

  const handleImportNoteDoc = async (note) => {
    if (!note.googleDocId) return;

    setSyncStatus({ message: 'Importing from Google Doc...', type: 'info' });

    const result = await importFromDoc(note.googleDocId);

    if (result) {
      let importedContent = result.content;
      const firstSep = importedContent.indexOf('---');
      const secondSep = importedContent.lastIndexOf('---');

      if (firstSep !== -1 && secondSep !== -1 && firstSep !== secondSep) {
        importedContent = importedContent.substring(firstSep + 3, secondSep).trim();
      }

      handleUpdateNote(note.id, { content: importedContent });
      setSyncStatus({ message: 'Imported from Google Doc!', type: 'success' });
    } else {
      setSyncStatus({ message: 'Failed to import', type: 'error' });
    }
    setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
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

      {/* Tab navigation */}
      <div className="notes-tabs">
        <button
          className={`notes-tab ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          Research Background
        </button>
        <button
          className={`notes-tab ${activeTab === 'aims' ? 'active' : ''}`}
          onClick={() => setActiveTab('aims')}
        >
          Specific Aims ({notes.specificAims.length})
        </button>
        <button
          className={`notes-tab ${activeTab === 'misc' ? 'active' : ''}`}
          onClick={() => setActiveTab('misc')}
        >
          Miscellaneous Notes ({notes.miscNotes.length})
        </button>
        <button
          className={`notes-tab ${activeTab === 'literature' ? 'active' : ''}`}
          onClick={() => setActiveTab('literature')}
        >
          📚 Literature
        </button>
      </div>

      {/* Tab content */}
      <div className="notes-content">
        {/* Background Tab */}
        {activeTab === 'background' && (
          <div className="background-section">
            <div className="section-header">
              <h3>
                Research Background
                {notes.backgroundGoogleDocId && (
                  <span className="google-doc-indicator" title="Linked to Google Doc">📄</span>
                )}
              </h3>
              <div className="section-actions">
                {isEditing !== 'background' && (
                  <button
                    className="edit-btn"
                    onClick={() => {
                      setIsEditing('background');
                      setEditContent(notes.background);
                    }}
                  >
                    Edit
                  </button>
                )}
                {isSignedIn && notes.background && (
                  notes.backgroundGoogleDocId ? (
                    <>
                      <a
                        href={notes.backgroundGoogleDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-google-action"
                      >
                        Open Doc
                      </a>
                      <button
                        className="btn-google-action"
                        onClick={handleSyncBackgroundDoc}
                      >
                        Push
                      </button>
                      <button
                        className="btn-google-action"
                        onClick={handleImportBackgroundDoc}
                      >
                        Pull
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-google-action primary"
                      onClick={handleCreateBackgroundDoc}
                    >
                      Create Doc
                    </button>
                  )
                )}
              </div>
            </div>

            {isEditing === 'background' ? (
              <div className="background-editor">
                <CitableTextarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  projectId={projectId}
                  placeholder="Enter research background, context, and significance...

Include:
- Scientific context and rationale
- Current state of knowledge
- Gap in existing research
- Significance and innovation
- Preliminary data (if any)

Type @cite: or [@ to insert citations from your literature library."
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
                      <span className="aim-number">
                        Aim {index + 1}
                        {aim.googleDocId && (
                          <span className="google-doc-indicator" title="Linked to Google Doc">📄</span>
                        )}
                      </span>
                      <div className="aim-header-actions">
                        <select
                          className={`aim-status ${aim.status}`}
                          value={aim.status}
                          onChange={(e) => handleUpdateAim(aim.id, 'status', e.target.value)}
                        >
                          {AIM_STATUSES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        {isSignedIn && (
                          aim.googleDocId ? (
                            <>
                              <a
                                href={aim.googleDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-google-action small"
                                title="Open Doc"
                              >
                                📄
                              </a>
                              <button
                                className="btn-google-action small"
                                onClick={() => handleSyncAimDoc(aim, index)}
                                title="Push to Doc"
                              >
                                ⬆
                              </button>
                              <button
                                className="btn-google-action small"
                                onClick={() => handleImportAimDoc(aim)}
                                title="Pull from Doc"
                              >
                                ⬇
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-google-action small primary"
                              onClick={() => handleCreateAimDoc(aim, index)}
                              title="Create Doc"
                            >
                              📝
                            </button>
                          )
                        )}
                        <button
                          className="delete-aim-btn"
                          onClick={() => handleDeleteAim(aim.id)}
                        >
                          x
                        </button>
                      </div>
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
                      <label>Details</label>
                      <CitableTextarea
                        value={aim.content || aim.description || ''}
                        onChange={(e) => handleUpdateAim(aim.id, 'content', e.target.value)}
                        projectId={projectId}
                        placeholder="Describe your specific aim including hypothesis, approach, and expected outcomes... (Type @cite: to add citations)"
                        rows={8}
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
                      <div className="note-header-actions">
                        {note.googleDocId && (
                          <span className="google-doc-indicator" title="Linked to Google Doc">📄</span>
                        )}
                        <button
                          className="delete-note-btn"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          x
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      className="note-title"
                      value={note.title}
                      onChange={(e) => handleUpdateNote(note.id, { title: e.target.value })}
                      placeholder="Note title..."
                    />

                    <CitableTextarea
                      className="note-content"
                      value={note.content}
                      onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                      projectId={projectId}
                      placeholder="Write your note here... (Type @cite: to add citations)"
                      rows={4}
                    />

                    <div className="note-footer">
                      <span className="note-date">
                        Updated: {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      {isSignedIn && (
                        <div className="note-google-actions">
                          {note.googleDocId ? (
                            <>
                              <a
                                href={note.googleDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-google-action small"
                                title="Open Doc"
                              >
                                📄
                              </a>
                              <button
                                className="btn-google-action small"
                                onClick={() => handleSyncNoteDoc(note)}
                                title="Push to Doc"
                              >
                                ⬆
                              </button>
                              <button
                                className="btn-google-action small"
                                onClick={() => handleImportNoteDoc(note)}
                                title="Pull from Doc"
                              >
                                ⬇
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-google-action small primary"
                              onClick={() => handleCreateNoteDoc(note)}
                              title="Create Doc"
                            >
                              📝
                            </button>
                          )
                        }
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Literature Tab */}
        {activeTab === 'literature' && (
          <LiteratureManager
            projectId={projectId}
            projectTitle={projectTitle}
          />
        )}
      </div>
    </div>
  );
}

export default ResearchNotes;
