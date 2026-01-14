import React, { useState, useEffect } from 'react';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';

// Type labels and icons
const TYPE_CONFIG = {
  [TRASH_ITEM_TYPES.PROJECT]: { label: 'Project', icon: '📁' },
  [TRASH_ITEM_TYPES.TASK]: { label: 'Task', icon: '✓' },
  [TRASH_ITEM_TYPES.REFERENCE]: { label: 'Reference', icon: '📚' },
  [TRASH_ITEM_TYPES.NOTEBOOK_ENTRY]: { label: 'Notebook Entry', icon: '📓' },
  [TRASH_ITEM_TYPES.PROTOCOL]: { label: 'Protocol', icon: '📋' },
  [TRASH_ITEM_TYPES.RESULT]: { label: 'Result', icon: '📊' },
  [TRASH_ITEM_TYPES.NOTE]: { label: 'Note', icon: '📝' }
};

function TrashModal({ onRestore }) {
  const {
    trashedItems,
    isTrashOpen,
    closeTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    getDaysUntilExpiry
  } = useTrash();
  const { showSuccess, showWarning } = useToast();

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isTrashOpen) {
        closeTrash();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isTrashOpen, closeTrash]);

  if (!isTrashOpen) return null;

  // Filter items
  const filteredItems = trashedItems.filter(item => {
    const matchesType = filter === 'all' || item.type === filter;
    const matchesSearch = !searchTerm ||
      item.data.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.data.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleRestore = (trashId) => {
    const item = restoreFromTrash(trashId);
    if (item && onRestore) {
      onRestore(item);
      showSuccess(`Restored: ${item.data.title || item.data.name || 'Item'}`);
    }
  };

  const handlePermanentDelete = (trashId) => {
    if (window.confirm('Permanently delete this item? This cannot be undone.')) {
      permanentlyDelete(trashId);
      showWarning('Item permanently deleted');
    }
  };

  const handleEmptyTrash = () => {
    if (window.confirm(`Permanently delete all ${trashedItems.length} items in trash? This cannot be undone.`)) {
      emptyTrash();
      showWarning('Trash emptied');
    }
  };

  // Get unique types for filter
  const availableTypes = [...new Set(trashedItems.map(i => i.type))];

  return (
    <div className="trash-modal-overlay" onClick={closeTrash}>
      <div className="trash-modal" onClick={e => e.stopPropagation()}>
        <div className="trash-modal-header">
          <h2>Trash</h2>
          <div className="trash-header-actions">
            {trashedItems.length > 0 && (
              <button
                className="empty-trash-btn"
                onClick={handleEmptyTrash}
              >
                Empty Trash
              </button>
            )}
            <button className="close-btn" onClick={closeTrash}>&times;</button>
          </div>
        </div>

        <div className="trash-modal-toolbar">
          <input
            type="text"
            className="trash-search"
            placeholder="Search trash..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            className="trash-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>
                {TYPE_CONFIG[type]?.label || type}
              </option>
            ))}
          </select>
        </div>

        <div className="trash-modal-content">
          {filteredItems.length === 0 ? (
            <div className="trash-empty">
              {trashedItems.length === 0 ? (
                <>
                  <div className="trash-empty-icon">🗑️</div>
                  <p>Trash is empty</p>
                  <p className="trash-empty-hint">
                    Deleted items will appear here for {30} days before being permanently removed.
                  </p>
                </>
              ) : (
                <p>No items match your search</p>
              )}
            </div>
          ) : (
            <div className="trash-items-list">
              {filteredItems.map(item => {
                const config = TYPE_CONFIG[item.type] || { label: 'Item', icon: '📄' };
                const daysLeft = getDaysUntilExpiry(item.deletedAt);

                return (
                  <div key={item.id} className="trash-item">
                    <div className="trash-item-icon">{config.icon}</div>
                    <div className="trash-item-info">
                      <span className="trash-item-title">
                        {item.data.title || item.data.name || 'Untitled'}
                      </span>
                      <span className="trash-item-meta">
                        {config.label}
                        {item.metadata.originalLocation && item.metadata.originalLocation !== 'unknown' && (
                          <> • from {item.metadata.projectTitle || item.metadata.originalLocation}</>
                        )}
                        <> • {daysLeft} day{daysLeft !== 1 ? 's' : ''} until deleted</>
                      </span>
                    </div>
                    <div className="trash-item-actions">
                      <button
                        className="restore-btn"
                        onClick={() => handleRestore(item.id)}
                        title="Restore item"
                      >
                        Restore
                      </button>
                      <button
                        className="delete-forever-btn"
                        onClick={() => handlePermanentDelete(item.id)}
                        title="Delete permanently"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="trash-modal-footer">
          <span className="trash-count">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {filter !== 'all' && ` (filtered from ${trashedItems.length} total)`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TrashModal;
