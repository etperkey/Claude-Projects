import React, { useState, useEffect } from 'react';
import { useAutoBackup } from '../context/AutoBackupContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';

function BackupSettingsModal({ isOpen, onClose }) {
  const {
    settings,
    updateSettings,
    lastBackup,
    isBackingUp,
    exportToGoogleDrive,
    listDriveBackups,
    restoreFromDriveBackup,
    deleteDriveBackup,
    isSignedIn
  } = useAutoBackup();

  const { signIn } = useGoogleAuth();

  const [driveBackups, setDriveBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Load Drive backups when modal opens
  useEffect(() => {
    if (isOpen && isSignedIn && activeTab === 'backups') {
      loadBackups();
    }
  }, [isOpen, isSignedIn, activeTab]);

  const loadBackups = async () => {
    setLoadingBackups(true);
    const backups = await listDriveBackups();
    setDriveBackups(backups);
    setLoadingBackups(false);
  };

  const handleRestore = async (fileId, filename) => {
    const success = await restoreFromDriveBackup(fileId, filename);
    if (success) {
      onClose();
    }
  };

  const handleDelete = async (fileId, filename) => {
    if (window.confirm(`Delete backup "${filename}"?`)) {
      await deleteDriveBackup(fileId);
      loadBackups();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="backup-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Backup Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="backup-tabs">
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`tab-btn ${activeTab === 'backups' ? 'active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            Google Drive Backups
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="setting-group">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  />
                  Enable Auto-Backup
                </label>
                <p className="setting-description">
                  Automatically backup your data to Google Drive at regular intervals
                </p>
              </div>

              <div className="setting-group">
                <label className="setting-label">Backup Interval</label>
                <select
                  value={settings.intervalMinutes}
                  onChange={(e) => updateSettings({ intervalMinutes: parseInt(e.target.value) })}
                  disabled={!settings.enabled}
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={10}>Every 10 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                  <option value={120}>Every 2 hours</option>
                  <option value={240}>Every 4 hours</option>
                  <option value={480}>Every 8 hours</option>
                  <option value={1440}>Once a day</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.backupOnExit}
                    onChange={(e) => updateSettings({ backupOnExit: e.target.checked })}
                  />
                  Backup on Exit
                </label>
                <p className="setting-description">
                  Attempt to backup when you close or leave the page
                </p>
              </div>

              <div className="backup-status">
                <h3>Status</h3>
                {lastBackup ? (
                  <p>Last backup: <strong>{lastBackup.toLocaleString()}</strong></p>
                ) : (
                  <p>No backups yet</p>
                )}
                {!isSignedIn && (
                  <div className="sign-in-prompt">
                    <p>Sign in to Google to enable cloud backups</p>
                    <button className="sign-in-btn" onClick={signIn}>
                      Sign in with Google
                    </button>
                  </div>
                )}
              </div>

              <div className="backup-actions">
                <button
                  className="primary-btn"
                  onClick={() => exportToGoogleDrive()}
                  disabled={!isSignedIn || isBackingUp}
                >
                  {isBackingUp ? 'Backing up...' : 'Backup Now'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backups' && (
            <div className="backups-tab">
              {!isSignedIn ? (
                <div className="sign-in-prompt centered">
                  <p>Sign in to Google to view your backups</p>
                  <button className="sign-in-btn" onClick={signIn}>
                    Sign in with Google
                  </button>
                </div>
              ) : loadingBackups ? (
                <div className="loading">Loading backups...</div>
              ) : driveBackups.length === 0 ? (
                <div className="no-backups">
                  <p>No backups found in Google Drive</p>
                  <button
                    className="primary-btn"
                    onClick={() => exportToGoogleDrive()}
                    disabled={isBackingUp}
                  >
                    Create First Backup
                  </button>
                </div>
              ) : (
                <>
                  <div className="backups-header">
                    <span>{driveBackups.length} backup(s) found</span>
                    <button
                      className="refresh-btn"
                      onClick={loadBackups}
                      disabled={loadingBackups}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                  <div className="backups-list">
                    {driveBackups.map(backup => (
                      <div key={backup.id} className="backup-item">
                        <div className="backup-info">
                          <div className="backup-name">{backup.name}</div>
                          <div className="backup-meta">
                            {formatDate(backup.createdTime)} • {formatSize(backup.size)}
                          </div>
                        </div>
                        <div className="backup-actions">
                          <button
                            className="restore-btn"
                            onClick={() => handleRestore(backup.id, backup.name)}
                            title="Restore this backup"
                          >
                            Restore
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(backup.id, backup.name)}
                            title="Delete this backup"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BackupSettingsModal;
