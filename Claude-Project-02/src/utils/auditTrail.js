/**
 * ELN Audit Trail Utilities
 * Provides functions for tracking changes, generating checksums, and maintaining audit trails
 */

// Change types for audit entries
export const CHANGE_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  LOCK: 'lock',
  UNLOCK: 'unlock',
  ARCHIVE: 'archive',
  RESTORE: 'restore'
};

/**
 * Generate a simple checksum for content verification
 * @param {string} content - Content to hash
 * @returns {string} - Hexadecimal hash string
 */
export function generateChecksum(content) {
  if (!content) return '';

  let hash = 0;
  const str = typeof content === 'string' ? content : JSON.stringify(content);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Compare two objects and return the differences
 * @param {object} oldObj - Original object
 * @param {object} newObj - Modified object
 * @param {string[]} fieldsToTrack - Optional array of field names to track (tracks all if not specified)
 * @returns {object[]} - Array of change objects { field, oldValue, newValue }
 */
export function diffObjects(oldObj, newObj, fieldsToTrack = null) {
  const changes = [];

  if (!oldObj || !newObj) {
    return changes;
  }

  const fields = fieldsToTrack || [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];

  fields.forEach(field => {
    // Skip internal fields
    if (field.startsWith('_') || field === 'auditTrail' || field === 'updatedAt') {
      return;
    }

    const oldVal = oldObj[field];
    const newVal = newObj[field];

    // Compare values (simple comparison for primitives, JSON stringify for objects)
    const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal;
    const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal;

    if (oldStr !== newStr) {
      changes.push({
        field,
        oldValue: oldVal,
        newValue: newVal
      });
    }
  });

  return changes;
}

/**
 * Create an audit entry
 * @param {string} changeType - Type of change (from CHANGE_TYPES)
 * @param {object[]} changes - Array of changes (from diffObjects)
 * @param {object} user - Optional user info { id, name, email }
 * @param {string} content - Optional content for checksum
 * @returns {object} - Audit entry object
 */
export function createAuditEntry(changeType, changes = [], user = null, content = null) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    changeType,
    changes,
    userId: user?.id || null,
    userName: user?.name || user?.email || 'Anonymous',
    checksum: content ? generateChecksum(content) : null
  };
}

/**
 * Format an audit entry for display
 * @param {object} entry - Audit entry object
 * @returns {string} - Formatted display string
 */
export function formatAuditEntry(entry) {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleString();
  const user = entry.userName || 'Unknown';

  let action = '';
  switch (entry.changeType) {
    case CHANGE_TYPES.CREATE:
      action = 'Created';
      break;
    case CHANGE_TYPES.UPDATE:
      action = `Updated ${entry.changes?.length || 0} field(s)`;
      break;
    case CHANGE_TYPES.LOCK:
      action = 'Locked';
      break;
    case CHANGE_TYPES.UNLOCK:
      action = 'Unlocked';
      break;
    case CHANGE_TYPES.ARCHIVE:
      action = 'Archived';
      break;
    case CHANGE_TYPES.RESTORE:
      action = 'Restored';
      break;
    default:
      action = entry.changeType;
  }

  return `${dateStr} - ${user} - ${action}`;
}

/**
 * Validate an audit trail for integrity
 * @param {object[]} auditTrail - Array of audit entries
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateAuditTrail(auditTrail) {
  const errors = [];

  if (!Array.isArray(auditTrail)) {
    return { valid: false, errors: ['Audit trail is not an array'] };
  }

  // Check each entry has required fields
  auditTrail.forEach((entry, index) => {
    if (!entry.id) {
      errors.push(`Entry ${index}: Missing ID`);
    }
    if (!entry.timestamp) {
      errors.push(`Entry ${index}: Missing timestamp`);
    }
    if (!entry.changeType) {
      errors.push(`Entry ${index}: Missing change type`);
    }
  });

  // Check timestamps are in order
  for (let i = 1; i < auditTrail.length; i++) {
    const prevTime = new Date(auditTrail[i - 1].timestamp).getTime();
    const currTime = new Date(auditTrail[i].timestamp).getTime();
    if (currTime < prevTime) {
      errors.push(`Entry ${i}: Timestamp is before previous entry`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get a summary of an audit trail
 * @param {object[]} auditTrail - Array of audit entries
 * @returns {object} - Summary object
 */
export function getAuditTrailSummary(auditTrail) {
  if (!Array.isArray(auditTrail) || auditTrail.length === 0) {
    return {
      totalEntries: 0,
      firstEntry: null,
      lastEntry: null,
      changesByType: {},
      uniqueUsers: []
    };
  }

  const changesByType = {};
  const users = new Set();

  auditTrail.forEach(entry => {
    changesByType[entry.changeType] = (changesByType[entry.changeType] || 0) + 1;
    if (entry.userName) {
      users.add(entry.userName);
    }
  });

  return {
    totalEntries: auditTrail.length,
    firstEntry: auditTrail[0],
    lastEntry: auditTrail[auditTrail.length - 1],
    changesByType,
    uniqueUsers: Array.from(users)
  };
}

/**
 * Check if an entry should be auto-locked based on settings
 * @param {object} entry - Lab notebook entry
 * @param {object} settings - ELN settings
 * @returns {boolean} - True if entry should be locked
 */
export function shouldAutoLock(entry, settings) {
  if (!settings?.autoLockEnabled || entry.isLocked) {
    return false;
  }

  const lockHours = entry.lockAfterHours ?? settings.autoLockHours ?? 24;
  const createdAt = new Date(entry.createdAt).getTime();
  const now = Date.now();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

  return hoursSinceCreation >= lockHours;
}

/**
 * Get time remaining until auto-lock
 * @param {object} entry - Lab notebook entry
 * @param {object} settings - ELN settings
 * @returns {number|null} - Hours remaining, or null if not applicable
 */
export function getAutoLockTimeRemaining(entry, settings) {
  if (!settings?.autoLockEnabled || entry.isLocked) {
    return null;
  }

  const lockHours = entry.lockAfterHours ?? settings.autoLockHours ?? 24;
  const createdAt = new Date(entry.createdAt).getTime();
  const now = Date.now();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

  const remaining = lockHours - hoursSinceCreation;
  return remaining > 0 ? remaining : 0;
}

/**
 * Export audit trail as CSV
 * @param {object[]} auditTrail - Array of audit entries
 * @param {string} entryTitle - Title of the entry for the export
 * @returns {string} - CSV content
 */
export function exportAuditTrailCSV(auditTrail, entryTitle = 'Entry') {
  const headers = ['Timestamp', 'User', 'Change Type', 'Changes', 'Checksum'];
  const rows = [headers.join(',')];

  auditTrail.forEach(entry => {
    const changesStr = entry.changes
      ? entry.changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ')
      : '';

    rows.push([
      entry.timestamp,
      `"${entry.userName || 'Unknown'}"`,
      entry.changeType,
      `"${changesStr}"`,
      entry.checksum || ''
    ].join(','));
  });

  return `Audit Trail for: ${entryTitle}\nExported: ${new Date().toISOString()}\n\n${rows.join('\n')}`;
}
