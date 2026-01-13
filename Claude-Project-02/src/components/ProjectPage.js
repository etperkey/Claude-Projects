import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById } from '../data/projects';
import KanbanBoard from './KanbanBoard';

function ProjectPage() {
  const { projectId } = useParams();
  const project = getProjectById(projectId);
  const [tasks, setTasks] = useState(project?.tasks || {});

  if (!project) {
    return (
      <div className="project-page not-found">
        <h1>Project Not Found</h1>
        <Link to="/">← Back to Dashboard</Link>
      </div>
    );
  }

  const handleTaskMove = (taskId, fromColumn, toColumn) => {
    setTasks(prevTasks => {
      const newTasks = { ...prevTasks };
      const taskIndex = newTasks[fromColumn].findIndex(t => t.id === taskId);

      if (taskIndex === -1) return prevTasks;

      const [task] = newTasks[fromColumn].splice(taskIndex, 1);
      newTasks[toColumn] = [...newTasks[toColumn], task];

      return newTasks;
    });
  };

  const handleAddTask = (column, taskTitle, priority = 'medium') => {
    const newTask = {
      id: `${project.id}-${Date.now()}`,
      title: taskTitle,
      priority
    };

    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: [...prevTasks[column], newTask]
    }));
  };

  const handleDeleteTask = (taskId, column) => {
    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: prevTasks[column].filter(t => t.id !== taskId)
    }));
  };

  const totalTasks = Object.values(tasks).flat().length;
  const completedTasks = tasks.done.length;

  return (
    <div className="project-page" style={{ '--project-color': project.color }}>
      <header className="project-header">
        <div className="header-nav">
          <Link to="/" className="back-link">← Dashboard</Link>
        </div>
        <div className="header-main">
          <div className="header-info">
            <div className="project-badge" style={{ backgroundColor: project.color }}>
              {project.subtitle}
            </div>
            <h1>{project.title}</h1>
            <p className="project-hypothesis">{project.hypothesis}</p>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-value">{completedTasks}/{totalTasks}</span>
              <span className="stat-label">Tasks Complete</span>
            </div>
            <div className="header-stat">
              <span className="stat-value">{Math.round((completedTasks/totalTasks)*100)}%</span>
              <span className="stat-label">Progress</span>
            </div>
          </div>
        </div>
        <div className="approaches-bar">
          {project.approaches.map((approach, idx) => (
            <span key={idx} className="approach-chip">{approach}</span>
          ))}
        </div>
      </header>

      <main className="project-main">
        <KanbanBoard
          tasks={tasks}
          projectColor={project.color}
          onTaskMove={handleTaskMove}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
        />
      </main>
    </div>
  );
}

export default ProjectPage;
