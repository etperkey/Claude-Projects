import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import CalendarPublish from './CalendarPublish';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

// Generate iCal format for tasks
const generateICalContent = (tasks) => {
  const now = new Date();
  const formatDate = (dateStr) => {
    // Convert YYYY-MM-DD to YYYYMMDD format
    return dateStr.replace(/-/g, '');
  };

  const escapeText = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const formatDateTime = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KanLab//Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KanLab Tasks',
    'X-WR-TIMEZONE:UTC'
  ];

  tasks.forEach(task => {
    if (!task.dueDate) return;

    const uid = `${task.id}@research-dashboard`;
    const dtstamp = formatDateTime(now);
    const dtstart = formatDate(task.dueDate);
    const summary = escapeText(task.title);
    const description = escapeText(
      `Project: ${task.projectTitle}\\nStatus: ${task.column}\\nPriority: ${task.priority || 'medium'}`
    );

    ical.push('BEGIN:VEVENT');
    ical.push(`UID:${uid}`);
    ical.push(`DTSTAMP:${dtstamp}`);
    ical.push(`DTSTART;VALUE=DATE:${dtstart}`);
    ical.push(`DTEND;VALUE=DATE:${dtstart}`);
    ical.push(`SUMMARY:${summary}`);
    ical.push(`DESCRIPTION:${description}`);
    ical.push(`CATEGORIES:${escapeText(task.projectTitle)}`);

    // Add color category if supported
    if (task.priority === 'high') {
      ical.push('PRIORITY:1');
    } else if (task.priority === 'low') {
      ical.push('PRIORITY:9');
    } else {
      ical.push('PRIORITY:5');
    }

    ical.push('END:VEVENT');
  });

  ical.push('END:VCALENDAR');

  return ical.join('\r\n');
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function CalendarView({ isOpen, onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const navigate = useNavigate();

  // Download iCal file
  const handleDownloadIcal = useCallback(() => {
    const icalContent = generateICalContent(tasks);
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'research-dashboard-tasks.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded! Import this file into Google Calendar.');
    setTimeout(() => setExportStatus(''), 3000);
  }, [tasks]);

  // Copy iCal content to clipboard
  const handleCopyIcal = useCallback(() => {
    const icalContent = generateICalContent(tasks);
    navigator.clipboard.writeText(icalContent).then(() => {
      setExportStatus('iCal content copied to clipboard!');
      setTimeout(() => setExportStatus(''), 3000);
    });
  }, [tasks]);

  useEffect(() => {
    if (!isOpen) return;

    // Gather all tasks with due dates
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    // Track custom project IDs
    const customProjectIds = new Set(customProjects.map(p => p.id));

    const allProjects = [...researchProjects, ...customProjects];

    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    const allTasks = [];
    allProjects.forEach(project => {
      // For custom projects, tasks are stored in the project object itself
      // For built-in projects, tasks are in savedTasks or fall back to project.tasks
      let projectTasks;
      if (customProjectIds.has(project.id)) {
        // Custom project - tasks are in the project object
        projectTasks = project.tasks;
      } else {
        // Built-in project - check savedTasks first, then fall back to project.tasks
        projectTasks = savedTasks[project.id] || project.tasks;
      }

      if (!projectTasks) return;

      Object.entries(projectTasks).forEach(([column, taskList]) => {
        if (!Array.isArray(taskList)) return;
        taskList.forEach(task => {
          if (task.dueDate) {
            allTasks.push({
              ...task,
              projectId: project.id,
              projectTitle: project.title,
              projectColor: project.color,
              column
            });
          }
        });
      });
    });

    setTasks(allTasks);
  }, [isOpen]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const getTasksForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const isToday = (day) => {
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
  };

  const handleTaskClick = (task) => {
    navigate(`/project/${task.projectId}`);
    onClose();
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      const hasOverdue = dayTasks.some(t => {
        const dueDate = new Date(t.dueDate);
        return dueDate < today && t.column !== 'done';
      });

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday(day) ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${dayTasks.length > 0 ? 'has-tasks' : ''} ${hasOverdue ? 'has-overdue' : ''}`}
          onClick={() => setSelectedDay(day)}
        >
          <span className="day-number">{day}</span>
          {dayTasks.length > 0 && (
            <div className="day-tasks-preview">
              {dayTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="task-dot"
                  style={{ backgroundColor: task.projectColor }}
                />
              ))}
              {dayTasks.length > 3 && (
                <span className="more-tasks">+{dayTasks.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={e => e.stopPropagation()}>
        <div className="calendar-header">
          <h2>Calendar View</h2>
          <div className="calendar-header-actions">
            <button
              className={`btn-export-cal ${showExport ? 'expanded' : ''}`}
              onClick={() => setShowExport(!showExport)}
              title="Export to Calendar"
            >
              Export {showExport ? '▲' : '▼'}
            </button>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* iCal Export Section */}
        {showExport && (
          <div className="ical-export-section">
            <div className="ical-export-header">
              <h4>Calendar Export Options</h4>
              <button
                className="collapse-export-btn"
                onClick={() => setShowExport(false)}
                title="Collapse"
              >
                ✕
              </button>
            </div>

            {/* Subscribe Option */}
            <div className="export-option subscribe-option">
              <div className="option-header">
                <span className="option-icon">🔄</span>
                <div>
                  <strong>Subscribe (Recommended)</strong>
                  <p>Create a subscription URL that Google Calendar can auto-update</p>
                </div>
              </div>
              <button className="btn-subscribe" onClick={() => setShowPublish(true)}>
                Set Up Subscription
              </button>
            </div>

            <div className="export-divider">
              <span>or</span>
            </div>

            {/* One-time Export Option */}
            <div className="export-option download-option">
              <div className="option-header">
                <span className="option-icon">📥</span>
                <div>
                  <strong>One-time Download</strong>
                  <p>Download .ics file to manually import (won't auto-update)</p>
                </div>
              </div>
              <div className="ical-export-actions">
                <button className="btn-download-ical" onClick={handleDownloadIcal}>
                  Download .ics File
                </button>
                <button className="btn-copy-ical-content" onClick={handleCopyIcal}>
                  Copy iCal Data
                </button>
              </div>
            </div>

            {exportStatus && (
              <div className="ical-export-status">{exportStatus}</div>
            )}

            <details className="import-instructions">
              <summary>How to manually import into Google Calendar</summary>
              <ol>
                <li>Click "Download .ics File" above</li>
                <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Google Calendar</a></li>
                <li>Click the gear icon → Settings</li>
                <li>Select "Import & Export" from the left menu</li>
                <li>Click "Select file from your computer" and choose the downloaded file</li>
                <li>Select the calendar to add events to and click "Import"</li>
              </ol>
            </details>

            <div className="ical-task-count">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} with due dates
            </div>
          </div>
        )}

        <div className="calendar-nav">
          <button onClick={prevMonth}>&lt;</button>
          <h3>{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth}>&gt;</button>
          <button className="today-btn" onClick={goToToday}>Today</button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {DAYS.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {renderCalendarDays()}
          </div>
        </div>

        {selectedDay && (
          <div className="calendar-day-detail">
            <h4>
              {MONTHS[month]} {selectedDay}, {year}
              {selectedDayTasks.length > 0 && ` (${selectedDayTasks.length} tasks)`}
            </h4>
            {selectedDayTasks.length === 0 ? (
              <p className="no-tasks">No tasks due on this day</p>
            ) : (
              <div className="day-tasks-list">
                {selectedDayTasks.map(task => (
                  <div
                    key={task.id}
                    className="calendar-task-item"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div
                      className="task-color"
                      style={{ backgroundColor: task.projectColor }}
                    />
                    <div className="task-info">
                      <span className="task-name">{task.title}</span>
                      <span className="task-project">{task.projectTitle}</span>
                    </div>
                    <span className={`task-priority-dot ${task.priority}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Publish Modal */}
      <CalendarPublish
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        tasks={tasks}
      />
    </div>
  );
}

export default CalendarView;
