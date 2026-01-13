import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { researchProjects } from '../data/projects';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function CalendarView({ isOpen, onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    // Gather all tasks with due dates
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    const allProjects = [...researchProjects, ...customProjects];

    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    const allTasks = [];
    allProjects.forEach(project => {
      const projectTasks = savedTasks[project.id] || project.tasks;
      if (!projectTasks) return;

      Object.entries(projectTasks).forEach(([column, taskList]) => {
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
          <button className="modal-close" onClick={onClose}>&times;</button>
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
    </div>
  );
}

export default CalendarView;
