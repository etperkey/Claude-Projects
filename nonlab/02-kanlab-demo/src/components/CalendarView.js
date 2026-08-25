import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchProjects } from '../data/projects';
import CalendarPublish from './CalendarPublish';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';
const CALENDAR_EVENTS_KEY = 'research-dashboard-calendar-events';

// Event colors for calendar events
const EVENT_COLORS = [
  { id: 'blue', color: '#3498db', name: 'Blue' },
  { id: 'green', color: '#27ae60', name: 'Green' },
  { id: 'purple', color: '#9b59b6', name: 'Purple' },
  { id: 'orange', color: '#f39c12', name: 'Orange' },
  { id: 'red', color: '#e74c3c', name: 'Red' },
  { id: 'teal', color: '#00bcd4', name: 'Teal' },
  { id: 'pink', color: '#e91e63', name: 'Pink' }
];

// Generate iCal format for tasks and events
const generateICalContent = (tasks, events = []) => {
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

  // Format date with time for iCal (YYYYMMDDTHHMMSS)
  const formatDateTimeLocal = (dateStr, timeStr) => {
    const date = formatDate(dateStr);
    if (timeStr) {
      const time = timeStr.replace(/:/g, '') + '00';
      return `${date}T${time}`;
    }
    return date;
  };

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Research Dashboard//Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Research Dashboard Tasks',
    'X-WR-TIMEZONE:UTC'
  ];

  // Add tasks
  tasks.forEach(task => {
    if (!task.dueDate) return;

    const uid = `task-${task.id}@research-dashboard`;
    const dtstamp = formatDateTime(now);
    const summary = escapeText(task.title);
    const description = escapeText(
      `Project: ${task.projectTitle}\\nStatus: ${task.column}\\nPriority: ${task.priority || 'medium'}`
    );

    ical.push('BEGIN:VEVENT');
    ical.push(`UID:${uid}`);
    ical.push(`DTSTAMP:${dtstamp}`);

    // Use time if available
    if (task.dueTime) {
      const dtstart = formatDateTimeLocal(task.dueDate, task.dueTime);
      ical.push(`DTSTART:${dtstart}`);
      ical.push(`DTEND:${dtstart}`);
    } else {
      const dtstart = formatDate(task.dueDate);
      ical.push(`DTSTART;VALUE=DATE:${dtstart}`);
      ical.push(`DTEND;VALUE=DATE:${dtstart}`);
    }

    ical.push(`SUMMARY:[Task] ${summary}`);
    ical.push(`DESCRIPTION:${description}`);
    ical.push(`CATEGORIES:${escapeText(task.projectTitle)}`);

    if (task.priority === 'high') {
      ical.push('PRIORITY:1');
    } else if (task.priority === 'low') {
      ical.push('PRIORITY:9');
    } else {
      ical.push('PRIORITY:5');
    }

    ical.push('END:VEVENT');
  });

  // Add calendar events
  events.forEach(event => {
    if (!event.date) return;

    const uid = `event-${event.id}@research-dashboard`;
    const dtstamp = formatDateTime(now);
    const summary = escapeText(event.title);
    const description = event.description ? escapeText(event.description) : '';

    ical.push('BEGIN:VEVENT');
    ical.push(`UID:${uid}`);
    ical.push(`DTSTAMP:${dtstamp}`);

    if (event.startTime) {
      const dtstart = formatDateTimeLocal(event.date, event.startTime);
      ical.push(`DTSTART:${dtstart}`);
      if (event.endTime) {
        const dtend = formatDateTimeLocal(event.date, event.endTime);
        ical.push(`DTEND:${dtend}`);
      } else {
        ical.push(`DTEND:${dtstart}`);
      }
    } else {
      const dtstart = formatDate(event.date);
      ical.push(`DTSTART;VALUE=DATE:${dtstart}`);
      ical.push(`DTEND;VALUE=DATE:${dtstart}`);
    }

    ical.push(`SUMMARY:${summary}`);
    if (description) {
      ical.push(`DESCRIPTION:${description}`);
    }
    ical.push('CATEGORIES:Calendar Event');
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
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    color: 'blue'
  });
  const navigate = useNavigate();

  // Download iCal file
  const handleDownloadIcal = useCallback(() => {
    const icalContent = generateICalContent(tasks, events);
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'research-dashboard-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded! Import this file into Google Calendar.');
    setTimeout(() => setExportStatus(''), 3000);
  }, [tasks, events]);

  // Copy iCal content to clipboard
  const handleCopyIcal = useCallback(() => {
    const icalContent = generateICalContent(tasks, events);
    navigator.clipboard.writeText(icalContent).then(() => {
      setExportStatus('iCal content copied to clipboard!');
      setTimeout(() => setExportStatus(''), 3000);
    });
  }, [tasks, events]);

  // Load events from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_EVENTS_KEY);
      if (saved) setEvents(JSON.parse(saved));
    } catch {}
  }, []);

  // Save events to localStorage
  const saveEvents = (newEvents) => {
    setEvents(newEvents);
    localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(newEvents));
  };

  // Add or update event
  const handleSaveEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;

    if (editingEvent) {
      const updated = events.map(e =>
        e.id === editingEvent.id ? { ...newEvent, id: editingEvent.id } : e
      );
      saveEvents(updated);
    } else {
      const event = {
        ...newEvent,
        id: Date.now().toString()
      };
      saveEvents([...events, event]);
    }

    setNewEvent({ title: '', date: '', startTime: '', endTime: '', description: '', color: 'blue' });
    setEditingEvent(null);
    setShowEventForm(false);
  };

  // Delete event
  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Delete this event?')) {
      saveEvents(events.filter(e => e.id !== eventId));
    }
  };

  // Edit event
  const handleEditEvent = (event) => {
    setNewEvent({ ...event });
    setEditingEvent(event);
    setShowEventForm(true);
  };

  // Open event form for a specific day
  const handleAddEventForDay = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setNewEvent({ title: '', date: dateStr, startTime: '', endTime: '', description: '', color: 'blue' });
    setEditingEvent(null);
    setShowEventForm(true);
  };

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

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
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

  // Format time for display
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes}${ampm}`;
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
      const dayEvents = getEventsForDay(day);
      const totalItems = dayTasks.length + dayEvents.length;
      const hasOverdue = dayTasks.some(t => {
        const dueDate = new Date(t.dueDate);
        return dueDate < today && t.column !== 'done';
      });

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday(day) ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${totalItems > 0 ? 'has-tasks' : ''} ${hasOverdue ? 'has-overdue' : ''}`}
          onClick={() => setSelectedDay(day)}
        >
          <span className="day-number">{day}</span>
          {totalItems > 0 && (
            <div className="day-tasks-preview">
              {/* Show event dots first */}
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={`event-${event.id}`}
                  className="event-dot"
                  style={{ backgroundColor: EVENT_COLORS.find(c => c.id === event.color)?.color || '#3498db' }}
                />
              ))}
              {/* Then task dots */}
              {dayTasks.slice(0, 3 - Math.min(dayEvents.length, 2)).map(task => (
                <div
                  key={`task-${task.id}`}
                  className="task-dot"
                  style={{ backgroundColor: task.projectColor }}
                />
              ))}
              {totalItems > 3 && (
                <span className="more-tasks">+{totalItems - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

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
              {events.length > 0 && ` • ${events.length} event${events.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        )}

        {/* Add Event Button */}
        <div className="calendar-actions-bar">
          <button
            className="btn-add-event"
            onClick={() => {
              setNewEvent({ title: '', date: '', startTime: '', endTime: '', description: '', color: 'blue' });
              setEditingEvent(null);
              setShowEventForm(true);
            }}
          >
            + Add Event
          </button>
        </div>

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
            <div className="day-detail-header">
              <h4>
                {MONTHS[month]} {selectedDay}, {year}
                {(selectedDayTasks.length > 0 || selectedDayEvents.length > 0) &&
                  ` (${selectedDayTasks.length} task${selectedDayTasks.length !== 1 ? 's' : ''}, ${selectedDayEvents.length} event${selectedDayEvents.length !== 1 ? 's' : ''})`}
              </h4>
              <button
                className="btn-add-event-day"
                onClick={() => handleAddEventForDay(selectedDay)}
                title="Add event for this day"
              >
                +
              </button>
            </div>

            {/* Events for this day */}
            {selectedDayEvents.length > 0 && (
              <div className="day-events-list">
                <h5>Events</h5>
                {selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className="calendar-event-item"
                  >
                    <div
                      className="event-color"
                      style={{ backgroundColor: EVENT_COLORS.find(c => c.id === event.color)?.color || '#3498db' }}
                    />
                    <div className="event-info">
                      <span className="event-name">{event.title}</span>
                      {event.startTime && (
                        <span className="event-time">
                          {formatTimeDisplay(event.startTime)}
                          {event.endTime && ` - ${formatTimeDisplay(event.endTime)}`}
                        </span>
                      )}
                      {event.description && <span className="event-desc">{event.description}</span>}
                    </div>
                    <div className="event-actions">
                      <button onClick={() => handleEditEvent(event)} title="Edit">✏️</button>
                      <button onClick={() => handleDeleteEvent(event.id)} title="Delete">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks for this day */}
            {selectedDayTasks.length > 0 && (
              <div className="day-tasks-list">
                <h5>Tasks</h5>
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
                      {task.dueTime && <span className="task-time">{formatTimeDisplay(task.dueTime)}</span>}
                    </div>
                    <span className={`task-priority-dot ${task.priority}`} />
                  </div>
                ))}
              </div>
            )}

            {selectedDayTasks.length === 0 && selectedDayEvents.length === 0 && (
              <p className="no-tasks">No tasks or events on this day</p>
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

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="event-form-overlay" onClick={() => setShowEventForm(false)}>
          <div className="event-form-modal" onClick={e => e.stopPropagation()}>
            <div className="event-form-header">
              <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button className="modal-close" onClick={() => setShowEventForm(false)}>&times;</button>
            </div>
            <div className="event-form-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title..."
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker">
                    {EVENT_COLORS.map(c => (
                      <button
                        key={c.id}
                        className={`color-option ${newEvent.color === c.id ? 'selected' : ''}`}
                        style={{ backgroundColor: c.color }}
                        onClick={() => setNewEvent({ ...newEvent, color: c.id })}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description (optional)..."
                  rows={3}
                />
              </div>
            </div>
            <div className="event-form-footer">
              <button className="btn-cancel" onClick={() => setShowEventForm(false)}>Cancel</button>
              <button
                className="btn-save"
                onClick={handleSaveEvent}
                disabled={!newEvent.title.trim() || !newEvent.date}
              >
                {editingEvent ? 'Update' : 'Create'} Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
