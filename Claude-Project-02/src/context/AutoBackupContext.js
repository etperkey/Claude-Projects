import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleAuth } from './GoogleAuthContext';
import { TOAST_TYPES } from './ToastContext';

const AutoBackupContext = createContext(null);

const BACKUP_SETTINGS_KEY = 'research-dashboard-backup-settings';
const LAST_BACKUP_KEY = 'research-dashboard-last-backup';
const DRIVE_BACKUP_FOLDER = 'Research Dashboard Backups';

// Get browser and machine info for backup filename
const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  // Detect OS/Machine
  let machine = 'Unknown';
  if (ua.includes('Windows')) machine = 'Windows';
  else if (ua.includes('Mac OS')) machine = 'Mac';
  else if (ua.includes('Linux')) machine = 'Linux';
  else if (ua.includes('Android')) machine = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) machine = 'iOS';
  else if (ua.includes('CrOS')) machine = 'ChromeOS';

  return { browser, machine };
};

// Helper to emit toast events
const emitToast = (message, type = TOAST_TYPES.INFO, duration = 5000) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message, type, duration }
  }));
};

// All localStorage keys used by the app
const APP_KEYS = [
  'research-dashboard-custom-projects',
  'research-dashboard-tasks',
  'research-dashboard-lab-notebook',
  'research-dashboard-literature',
  'research-dashboard-recurring',
  'research-dashboard-templates',
  'research-dashboard-activity',
  'research-dashboard-archived',
  'research-dashboard-theme',
  'research-dashboard-trash',
  'research-dashboard-project-order'
];

// Project-specific key prefixes
const PROJECT_PREFIXES = [
  'research-dashboard-research-notes-',
  'research-dashboard-protocols-',
  'research-dashboard-results-',
  'research-dashboard-lab-notebook-'
];

// Get all app data for backup
const getAllAppData = () => {
  const exportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    appName: 'Research Dashboard',
    data: {}
  };

  // Export standard keys
  APP_KEYS.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        exportData.data[key] = JSON.parse(value);
      }
    } catch (e) {
      console.warn(`Failed to export ${key}:`, e);
    }
  });

  // Export project-specific keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (PROJECT_PREFIXES.some(prefix => key.startsWith(prefix))) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          exportData.data[key] = JSON.parse(value);
        }
      } catch (e) {
        console.warn(`Failed to export ${key}:`, e);
      }
    }
  }

  return exportData;
};

// Import app data from backup
const importAppData = (importData) => {
  if (!importData.data || typeof importData.data !== 'object') {
    throw new Error('Invalid backup file format');
  }

  let importedCount = 0;
  Object.entries(importData.data).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      importedCount++;
    } catch (e) {
      console.error(`Failed to import ${key}:`, e);
    }
  });

  return importedCount;
};

export function AutoBackupProvider({ children }) {
  const { isSignedIn, gapiLoaded, uploadFileToDrive, openFilePicker } = useGoogleAuth();

  // Backup settings
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(BACKUP_SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      enabled: true,
      intervalMinutes: 5, // Auto-backup every 5 minutes
      backupOnExit: true,
      maxAutoBackups: 12 // Keep last 12 auto-backups
    };
  });

  const [lastBackup, setLastBackup] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_BACKUP_KEY);
      if (saved) return new Date(saved);
    } catch {}
    return null;
  });

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupFolderId, setBackupFolderId] = useState(null);
  const intervalRef = useRef(null);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Find or create backup folder in Google Drive
  const getOrCreateBackupFolder = useCallback(async () => {
    if (!gapiLoaded || !isSignedIn) return null;

    try {
      // Search for existing folder
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${DRIVE_BACKUP_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name)'
      });

      const files = response.result.files || [];
      if (files.length > 0) {
        setBackupFolderId(files[0].id);
        return files[0].id;
      }

      // Create new folder
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: DRIVE_BACKUP_FOLDER,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });

      const folderId = createResponse.result.id;
      setBackupFolderId(folderId);
      return folderId;
    } catch (error) {
      console.error('Error getting/creating backup folder:', error);
      return null;
    }
  }, [gapiLoaded, isSignedIn]);

  // Create local backup (download)
  const createLocalBackup = useCallback(() => {
    const exportData = getAllAppData();
    const { browser, machine } = getDeviceInfo();

    // Format: MANUAL-YYYY-MM-DD-HHmmss-Browser-Machine.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `MANUAL-${timestamp}-${browser}-${machine}.json`;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);

    const now = new Date();
    setLastBackup(now);
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());

    return true;
  }, []);

  // Cleanup old auto-backups, keeping only the most recent ones
  const cleanupOldAutoBackups = useCallback(async (folderId) => {
    if (!gapiLoaded || !isSignedIn || !folderId) return;

    try {
      // List all auto-backups (files starting with "AUTO-")
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name contains 'AUTO-' and mimeType = 'application/json' and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 100
      });

      const autoBackups = response.result.files || [];

      // Keep only the most recent maxAutoBackups
      const maxToKeep = settings.maxAutoBackups || 12;
      if (autoBackups.length > maxToKeep) {
        const toDelete = autoBackups.slice(maxToKeep);
        console.log(`Cleaning up ${toDelete.length} old auto-backups...`);

        for (const file of toDelete) {
          try {
            await window.gapi.client.drive.files.delete({ fileId: file.id });
          } catch (e) {
            console.error(`Failed to delete old backup ${file.name}:`, e);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }, [gapiLoaded, isSignedIn, settings.maxAutoBackups]);

  // Export backup to Google Drive
  // isAuto: true for automatic backups (will be cleaned up), false for manual (kept forever)
  const exportToGoogleDrive = useCallback(async (silent = false, isAuto = false) => {
    if (!gapiLoaded || !isSignedIn) {
      if (!silent) {
        emitToast('Please sign in to Google to backup to Drive', TOAST_TYPES.WARNING);
      }
      return false;
    }

    setIsBackingUp(true);

    try {
      const folderId = await getOrCreateBackupFolder();
      const exportData = getAllAppData();

      // Get device info for filename
      const { browser, machine } = getDeviceInfo();

      // Format: [AUTO/MANUAL]-YYYY-MM-DD-HHmmss-Browser-Machine.json
      const saveType = isAuto ? 'AUTO' : 'MANUAL';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${saveType}-${timestamp}-${browser}-${machine}.json`;

      // Create file blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      // Upload to Drive
      const result = await uploadFileToDrive(file, folderId);

      if (result) {
        const now = new Date();
        setLastBackup(now);
        localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());

        if (!silent) {
          emitToast(`Backup saved to Google Drive`, TOAST_TYPES.SUCCESS);
        }

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('backup-completed', {
          detail: { location: 'google-drive', filename, fileId: result.id, isAuto }
        }));

        // Clean up old auto-backups after successful auto-backup
        if (isAuto) {
          await cleanupOldAutoBackups(folderId);
        }

        return result;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error exporting to Google Drive:', error);
      if (!silent) {
        emitToast(`Backup failed: ${error.message}`, TOAST_TYPES.ERROR);
      }
      return false;
    } finally {
      setIsBackingUp(false);
    }
  }, [gapiLoaded, isSignedIn, getOrCreateBackupFolder, uploadFileToDrive, cleanupOldAutoBackups]);

  // Import backup from Google Drive
  const importFromGoogleDrive = useCallback(async () => {
    if (!gapiLoaded || !isSignedIn) {
      emitToast('Please sign in to Google to import from Drive', TOAST_TYPES.WARNING);
      return false;
    }

    try {
      // Open file picker for JSON files
      const file = await openFilePicker({
        mimeTypes: ['application/json'],
        multiSelect: false
      });

      if (!file) {
        return false; // User cancelled
      }

      // Download the file content
      const response = await window.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const importData = response.result;

      // Validate the import file
      if (!importData.appName || importData.appName !== 'Research Dashboard') {
        emitToast('Invalid backup file. Please select a valid Research Dashboard backup.', TOAST_TYPES.ERROR);
        return false;
      }

      // Confirm before importing
      const keyCount = Object.keys(importData.data).length;
      const exportDate = new Date(importData.exportDate).toLocaleDateString();
      const confirmMsg = `Import ${keyCount} data entries from backup dated ${exportDate}?\n\nExisting data will be merged with the backup.`;

      if (!window.confirm(confirmMsg)) {
        return false;
      }

      // Import the data
      const importedCount = importAppData(importData);

      emitToast(`Successfully imported ${importedCount} entries from Google Drive. Reloading...`, TOAST_TYPES.SUCCESS);

      // Reload to apply imported data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      return true;
    } catch (error) {
      console.error('Error importing from Google Drive:', error);
      emitToast(`Import failed: ${error.message}`, TOAST_TYPES.ERROR);
      return false;
    }
  }, [gapiLoaded, isSignedIn, openFilePicker]);

  // List backups in Google Drive
  const listDriveBackups = useCallback(async () => {
    if (!gapiLoaded || !isSignedIn) return [];

    try {
      const folderId = await getOrCreateBackupFolder();
      if (!folderId) return [];

      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name, createdTime, modifiedTime, size)',
        orderBy: 'createdTime desc',
        pageSize: 20
      });

      return response.result.files || [];
    } catch (error) {
      console.error('Error listing Drive backups:', error);
      return [];
    }
  }, [gapiLoaded, isSignedIn, getOrCreateBackupFolder]);

  // Restore specific backup from Drive
  const restoreFromDriveBackup = useCallback(async (fileId, filename) => {
    if (!gapiLoaded || !isSignedIn) return false;

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      const importData = response.result;

      if (!importData.appName || importData.appName !== 'Research Dashboard') {
        emitToast('Invalid backup file format', TOAST_TYPES.ERROR);
        return false;
      }

      const keyCount = Object.keys(importData.data).length;
      if (!window.confirm(`Restore from "${filename}"?\n\nThis will import ${keyCount} data entries.`)) {
        return false;
      }

      const importedCount = importAppData(importData);
      emitToast(`Restored ${importedCount} entries. Reloading...`, TOAST_TYPES.SUCCESS);

      setTimeout(() => {
        window.location.reload();
      }, 1500);

      return true;
    } catch (error) {
      console.error('Error restoring from Drive backup:', error);
      emitToast(`Restore failed: ${error.message}`, TOAST_TYPES.ERROR);
      return false;
    }
  }, [gapiLoaded, isSignedIn]);

  // Delete backup from Drive
  const deleteDriveBackup = useCallback(async (fileId) => {
    if (!gapiLoaded || !isSignedIn) return false;

    try {
      await window.gapi.client.drive.files.delete({ fileId });
      emitToast('Backup deleted from Google Drive', TOAST_TYPES.SUCCESS);
      return true;
    } catch (error) {
      console.error('Error deleting Drive backup:', error);
      emitToast(`Delete failed: ${error.message}`, TOAST_TYPES.ERROR);
      return false;
    }
  }, [gapiLoaded, isSignedIn]);

  // Auto-backup interval
  useEffect(() => {
    if (!settings.enabled || settings.intervalMinutes <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const runAutoBackup = async () => {
      // Check if enough time has passed since last backup
      const now = new Date();
      if (lastBackup) {
        const minutesSinceLastBackup = (now - lastBackup) / (1000 * 60);
        if (minutesSinceLastBackup < settings.intervalMinutes) {
          return;
        }
      }

      // Prefer Google Drive if signed in, otherwise skip auto-backup
      // (local auto-download would be annoying)
      if (isSignedIn && gapiLoaded) {
        console.log('Running auto-backup to Google Drive...');
        await exportToGoogleDrive(true, true); // silent, auto backup
      }
    };

    // Run immediately on mount if enough time has passed
    runAutoBackup();

    // Set up interval
    intervalRef.current = setInterval(runAutoBackup, settings.intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.enabled, settings.intervalMinutes, isSignedIn, gapiLoaded, lastBackup, exportToGoogleDrive]);

  // Backup on exit (beforeunload)
  useEffect(() => {
    if (!settings.backupOnExit) return;

    const handleBeforeUnload = () => {
      // Can only do synchronous operations here
      // Store a flag to backup on next load if we have unsaved changes
      const now = new Date();
      if (lastBackup) {
        const minutesSinceLastBackup = (now - lastBackup) / (1000 * 60);
        if (minutesSinceLastBackup < 5) {
          return; // Recent backup exists, no need
        }
      }
      localStorage.setItem('research-dashboard-needs-backup', 'true');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settings.backupOnExit, lastBackup]);

  // Check for pending backup on load
  useEffect(() => {
    const needsBackup = localStorage.getItem('research-dashboard-needs-backup');
    if (needsBackup === 'true' && isSignedIn && gapiLoaded) {
      localStorage.removeItem('research-dashboard-needs-backup');
      // Delay to let app initialize
      setTimeout(() => {
        exportToGoogleDrive(true, true); // silent, auto backup
      }, 3000);
    }
  }, [isSignedIn, gapiLoaded, exportToGoogleDrive]);

  const value = {
    settings,
    updateSettings,
    lastBackup,
    isBackingUp,
    createLocalBackup,
    exportToGoogleDrive,
    importFromGoogleDrive,
    listDriveBackups,
    restoreFromDriveBackup,
    deleteDriveBackup,
    isSignedIn,
    gapiLoaded
  };

  return (
    <AutoBackupContext.Provider value={value}>
      {children}
    </AutoBackupContext.Provider>
  );
}

export function useAutoBackup() {
  const context = useContext(AutoBackupContext);
  if (!context) {
    throw new Error('useAutoBackup must be used within an AutoBackupProvider');
  }
  return context;
}
