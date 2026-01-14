import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSyncTrigger } from './DataSyncContext';

const TrashContext = createContext(null);

const TRASH_STORAGE_KEY = 'research-dashboard-trash';
const TRASH_RETENTION_DAYS = 30;

// Item types that can be trashed
export const TRASH_ITEM_TYPES = {
  PROJECT: 'project',
  TASK: 'task',
  REFERENCE: 'reference',
  NOTEBOOK_ENTRY: 'notebook_entry',
  PROTOCOL: 'protocol',
  RESULT: 'result',
  NOTE: 'note'
};

export function TrashProvider({ children }) {
  const triggerSync = useSyncTrigger();
  const [trashedItems, setTrashedItems] = useState([]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Load trash from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TRASH_STORAGE_KEY);
      if (saved) {
        const items = JSON.parse(saved);
        // Filter out expired items
        const now = new Date();
        const validItems = items.filter(item => {
          const deletedAt = new Date(item.deletedAt);
          const daysSinceDeleted = (now - deletedAt) / (1000 * 60 * 60 * 24);
          return daysSinceDeleted < TRASH_RETENTION_DAYS;
        });
        setTrashedItems(validItems);

        // Save filtered list if items were removed
        if (validItems.length !== items.length) {
          localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(validItems));
        }
      }
    } catch (e) {
      console.error('Failed to load trash:', e);
    }
  }, []);

  // Save trash to localStorage
  const saveTrash = useCallback((items) => {
    try {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
      setTrashedItems(items);
      triggerSync();
    } catch (e) {
      console.error('Failed to save trash:', e);
    }
  }, [triggerSync]);

  // Move an item to trash
  const moveToTrash = useCallback((type, item, metadata = {}) => {
    const trashedItem = {
      id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      originalId: item.id,
      data: item,
      metadata: {
        ...metadata,
        originalLocation: metadata.projectId || metadata.location || 'unknown'
      },
      deletedAt: new Date().toISOString()
    };

    saveTrash([trashedItem, ...trashedItems]);
    return trashedItem.id;
  }, [trashedItems, saveTrash]);

  // Restore an item from trash
  const restoreFromTrash = useCallback((trashId) => {
    const item = trashedItems.find(i => i.id === trashId);
    if (!item) return null;

    // Remove from trash
    const updatedTrash = trashedItems.filter(i => i.id !== trashId);
    saveTrash(updatedTrash);

    return item;
  }, [trashedItems, saveTrash]);

  // Permanently delete an item from trash
  const permanentlyDelete = useCallback((trashId) => {
    const updatedTrash = trashedItems.filter(i => i.id !== trashId);
    saveTrash(updatedTrash);
  }, [trashedItems, saveTrash]);

  // Empty all trash
  const emptyTrash = useCallback(() => {
    saveTrash([]);
  }, [saveTrash]);

  // Get trash items by type
  const getTrashByType = useCallback((type) => {
    return trashedItems.filter(item => item.type === type);
  }, [trashedItems]);

  // Get days until permanent deletion
  const getDaysUntilExpiry = useCallback((deletedAt) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const daysPassed = (now - deleted) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - daysPassed));
  }, []);

  // Open/close trash modal
  const openTrash = useCallback(() => setIsTrashOpen(true), []);
  const closeTrash = useCallback(() => setIsTrashOpen(false), []);

  const value = {
    trashedItems,
    isTrashOpen,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    getTrashByType,
    getDaysUntilExpiry,
    openTrash,
    closeTrash,
    TRASH_ITEM_TYPES
  };

  return (
    <TrashContext.Provider value={value}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error('useTrash must be used within TrashProvider');
  }
  return context;
}
