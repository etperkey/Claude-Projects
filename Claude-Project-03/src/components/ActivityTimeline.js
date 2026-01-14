import React from 'react';
import { useApp } from '../context/AppContext';

const ACTION_ICONS = {
  task_created: '➕',
  task_moved: '↔️',
  task_updated: '✏️',
  task_deleted: '🗑️',
  project_created: '📁',
  archive_project: '📦',
  unarchive_project: '📂',
  protocol_added: '📋',
  result_added: '📊',
  default: '•'
};

const ACTION_LABELS = {
  task_created: 'Task created',
  task_moved: 'Task moved',
  task_updated: 'Task updated',
  task_deleted: 'Task deleted',
  project_created: 'Project created',
  archive_project: 'Project archived',
  unarchive_project: 'Project unarchived',
  protocol_added: 'Protocol added',
  result_added: 'Result added'
};

function ActivityTimeline({ isOpen, onClose }) {
  const { activities } = useApp();

  if (!isOpen) return null;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityDescription = (activity) => {
    switch (activity.action) {
      case 'task_created':
        return `"${activity.taskTitle}" in ${activity.projectTitle}`;
      case 'task_moved':
        return `"${activity.taskTitle}" from ${activity.fromColumn} to ${activity.toColumn}`;
      case 'task_updated':
        return `"${activity.taskTitle}" in ${activity.projectTitle}`;
      case 'task_deleted':
        return `"${activity.taskTitle}" from ${activity.projectTitle}`;
      case 'project_created':
        return `"${activity.projectTitle}"`;
      case 'archive_project':
      case 'unarchive_project':
        return `Project ${activity.projectId}`;
      case 'protocol_added':
        return `"${activity.protocolTitle}" to ${activity.projectTitle}`;
      case 'result_added':
        return `"${activity.resultTitle}" to ${activity.projectTitle}`;
      default:
        return activity.details || '';
    }
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="activity-overlay" onClick={onClose}>
      <div className="activity-panel" onClick={e => e.stopPropagation()}>
        <div className="activity-header">
          <h2>Activity Timeline</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="activity-content">
          {activities.length === 0 ? (
            <div className="no-activity">
              <p>No activity yet</p>
              <span>Your actions will appear here</span>
            </div>
          ) : (
            Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date} className="activity-day">
                <h3 className="activity-date">{date}</h3>
                <div className="activity-list">
                  {dayActivities.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <span className="activity-icon">
                        {ACTION_ICONS[activity.action] || ACTION_ICONS.default}
                      </span>
                      <div className="activity-details">
                        <span className="activity-action">
                          {ACTION_LABELS[activity.action] || activity.action}
                        </span>
                        <span className="activity-description">
                          {getActivityDescription(activity)}
                        </span>
                      </div>
                      <span className="activity-time">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityTimeline;
