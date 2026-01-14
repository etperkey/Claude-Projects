import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useGoogleAuth } from './GoogleAuthContext';
import { TOAST_TYPES } from './ToastContext';

const DataSyncContext = createContext(null);

// Helper to emit toast events
const emitToast = (message, type = TOAST_TYPES.INFO, duration = 5000) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message, type, duration }
  }));
};

// All localStorage keys that need to be synced
const SYNC_KEYS = [
  'research-dashboard-custom-projects',
  'research-dashboard-tasks',
  'research-lab-notebook',
  'research-dashboard-literature',
  'research-dashboard-recurring',
  'research-dashboard-templates',
  'research-dashboard-activity',
  'research-dashboard-archived',
  'research-dashboard-theme'
];

// Keys that store per-project data (need special handling)
const PROJECT_DATA_PREFIXES = [
  'research-dashboard-research-notes-',
  'research-dashboard-protocols-',
  'research-dashboard-results-'
];

const DRIVE_FILE_NAME = 'research-dashboard-data.json';
const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid too many API calls

export function DataSyncProvider({ children }) {
  const { isSignedIn, gapiLoaded } = useGoogleAuth();
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [lastSynced, setLastSynced] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const syncTimeoutRef = useRef(null);
  const isInitialSyncDone = useRef(false);

  // Get all localStorage data that should be synced
  const getAllLocalData = useCallback(() => {
    const data = {
      version: 1,
      lastModified: new Date().toISOString(),
      keys: {}
    };

    // Get standard keys
    SYNC_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data.keys[key] = JSON.parse(value);
        } catch {
          data.keys[key] = value;
        }
      }
    });

    // Get project-specific keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (PROJECT_DATA_PREFIXES.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data.keys[key] = JSON.parse(value);
          } catch {
            data.keys[key] = value;
          }
        }
      }
    }

    return data;
  }, []);

  // Apply synced data to localStorage
  const applyDataToLocal = useCallback((data) => {
    if (!data || !data.keys) return;

    Object.entries(data.keys).forEach(([key, value]) => {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    });
  }, []);

  // Find existing sync file in Drive
  const findSyncFile = useCallback(async () => {
    if (!gapiLoaded || !isSignedIn) return null;

    try {
      const response = await window.gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        q: `name = '${DRIVE_FILE_NAME}'`,
        fields: 'files(id, name, modifiedTime)'
      });

      const files = response.result.files || [];
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error('Error finding sync file:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  // Read data from Drive
  const readFromDrive = useCallback(async (driveFileId) => {
    if (!gapiLoaded || !isSignedIn || !driveFileId) return null;

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: driveFileId,
        alt: 'media'
      });

      return response.result;
    } catch (error) {
      console.error('Error reading from Drive:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  // Write data to Drive
  const writeToDrive = useCallback(async (data, existingFileId = null) => {
    if (!gapiLoaded || !isSignedIn) return null;

    try {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      const metadata = {
        name: DRIVE_FILE_NAME,
        mimeType: 'application/json'
      };

      if (!existingFileId) {
        metadata.parents = ['appDataFolder'];
      }

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        closeDelim;

      const url = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const method = existingFileId ? 'PATCH' : 'POST';

      const response = await window.gapi.client.request({
        path: url,
        method: method,
        headers: {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartRequestBody
      });

      return response.result;
    } catch (error) {
      console.error('Error writing to Drive:', error);
      throw error;
    }
  }, [gapiLoaded, isSignedIn]);

  // Merge remote and local data (simple strategy: use most recent per key)
  const mergeData = useCallback((localData, remoteData) => {
    if (!remoteData || !remoteData.keys) return localData;
    if (!localData || !localData.keys) return remoteData;

    // For now, prefer remote data but keep local-only keys
    const merged = {
      version: 1,
      lastModified: new Date().toISOString(),
      keys: { ...localData.keys, ...remoteData.keys }
    };

    return merged;
  }, []);

  // Perform full sync (pull from Drive, merge, push back)
  const syncNow = useCallback(async (showNotifications = true) => {
    if (!gapiLoaded || !isSignedIn) {
      setSyncStatus('error');
      setSyncError('Not signed in to Google');
      if (showNotifications) {
        emitToast('Sync failed: Not signed in to Google', TOAST_TYPES.ERROR);
      }
      return false;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Find or create sync file
      let existingFile = await findSyncFile();
      let remoteData = null;

      if (existingFile) {
        setFileId(existingFile.id);
        remoteData = await readFromDrive(existingFile.id);
      }

      // Get local data
      const localData = getAllLocalData();

      // Merge data
      const mergedData = mergeData(localData, remoteData);

      // Apply merged data locally
      applyDataToLocal(mergedData);

      // Upload merged data to Drive
      const result = await writeToDrive(mergedData, existingFile?.id);

      if (result) {
        setFileId(result.id);
        setLastSynced(new Date());
        setSyncStatus('success');

        // Dispatch event so components can refresh
        window.dispatchEvent(new CustomEvent('data-synced'));

        return true;
      } else {
        throw new Error('Failed to write to Drive');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError(error.message);
      if (showNotifications) {
        emitToast(`Sync failed: ${error.message}`, TOAST_TYPES.ERROR, 8000);
      }
      return false;
    }
  }, [gapiLoaded, isSignedIn, findSyncFile, readFromDrive, getAllLocalData, mergeData, applyDataToLocal, writeToDrive]);

  // Debounced save to Drive (called when local data changes)
  const queueSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncNow();
    }, SYNC_DEBOUNCE_MS);
  }, [syncNow]);

  // Initial sync when signed in
  useEffect(() => {
    if (isSignedIn && gapiLoaded && !isInitialSyncDone.current) {
      isInitialSyncDone.current = true;
      syncNow();
    }
  }, [isSignedIn, gapiLoaded, syncNow]);

  // Reset initial sync flag when signed out
  useEffect(() => {
    if (!isSignedIn) {
      isInitialSyncDone.current = false;
      setFileId(null);
      setLastSynced(null);
      setSyncStatus('idle');
    }
  }, [isSignedIn]);

  // Listen for localStorage changes and queue sync
  useEffect(() => {
    if (!isSignedIn || !gapiLoaded) return;

    const handleStorageChange = (e) => {
      // Check if it's a key we care about
      const isRelevantKey = SYNC_KEYS.includes(e.key) ||
        PROJECT_DATA_PREFIXES.some(prefix => e.key?.startsWith(prefix));

      if (isRelevantKey) {
        queueSync();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isSignedIn, gapiLoaded, queueSync]);

  // Also watch for custom events from components that modify localStorage directly
  useEffect(() => {
    if (!isSignedIn || !gapiLoaded) return;

    const handleLocalChange = () => {
      queueSync();
    };

    window.addEventListener('local-data-changed', handleLocalChange);
    return () => window.removeEventListener('local-data-changed', handleLocalChange);
  }, [isSignedIn, gapiLoaded, queueSync]);

  const value = {
    syncStatus,
    lastSynced,
    syncError,
    syncNow,
    queueSync,
    isSignedIn,
    gapiLoaded
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
}

// Helper hook for components to trigger sync after localStorage updates
export function useSyncTrigger() {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent('local-data-changed'));
  }, []);
}
