import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById } from '../data/projects';
import KanbanBoard from './KanbanBoard';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // First try to get from built-in projects
    let foundProject = getProjectById(projectId);

    if (foundProject) {
      setProject(foundProject);
      setIsCustomProject(false);

      // Check localStorage for saved tasks for this project
      const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
      if (savedTasks) {
        try {
          const allSavedTasks = JSON.parse(savedTasks);
          if (allSavedTasks[projectId]) {
            setTasks(allSavedTasks[projectId]);
          } else {
            setTasks(foundProject.tasks);
          }
        } catch (e) {
          setTasks(foundProject.tasks);
        }
      } else {
        setTasks(foundProject.tasks);
      }
      setIsLoaded(true);
    } else {
      // Try to get from custom projects in localStorage
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        try {
          const customProjects = JSON.parse(saved);
          foundProject = customProjects.find(p => p.id === projectId);
          if (foundProject) {
            setProject(foundProject);
            setTasks(foundProject.tasks);
            setIsCustomProject(true);
            setIsLoaded(true);
          }
        } catch (e) {
          console.error('Failed to load custom projects:', e);
        }
      }
    }
  }, [projectId]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded || !project) return;

    if (isCustomProject) {
      // Save to custom projects storage
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        try {
          const customProjects = JSON.parse(saved);
          const updatedProjects = customProjects.map(p =>
            p.id === projectId ? { ...p, tasks } : p
          );
          localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(updatedProjects));
        } catch (e) {
          console.error('Failed to save tasks:', e);
        }
      }
    } else {
      // Save to general task storage for built-in projects
      const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
      let allSavedTasks = {};
      if (savedTasks) {
        try {
          allSavedTasks = JSON.parse(savedTasks);
        } catch (e) {
          allSavedTasks = {};
        }
      }
      allSavedTasks[projectId] = tasks;
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(allSavedTasks));
    }
  }, [tasks, isCustomProject, project, projectId, isLoaded]);

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

  const handleUpdateTask = (taskId, column, updatedData) => {
    setTasks(prevTasks => ({
      ...prevTasks,
      [column]: prevTasks[column].map(task =>
        task.id === taskId
          ? { ...task, ...updatedData }
          : task
      )
    }));
  };

  const totalTasks = Object.values(tasks).flat().length;
  const completedTasks = tasks.done?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0;

  return (
    <div className="project-page" style={{ '--project-color': project.color }}>
      <header className="project-header">
        <div className="header-nav">
          <Link to="/" className="back-link">← Dashboard</Link>
        </div>
        <div className="header-main">
          <div className="header-info">
            <div className="project-badge" style={{ backgroundColor: project.color }}>
              {project.subtitle || 'Research Project'}
            </div>
            <h1>{project.title}</h1>
            <p className="project-hypothesis">{project.hypothesis || project.description}</p>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-value">{completedTasks}/{totalTasks}</span>
              <span className="stat-label">Tasks Complete</span>
            </div>
            <div className="header-stat">
              <span className="stat-value">{progressPercent}%</span>
              <span className="stat-label">Progress</span>
            </div>
          </div>
        </div>
        <div className="approaches-bar">
          {project.approaches?.map((approach, idx) => (
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
          onUpdateTask={handleUpdateTask}
        />
      </main>
    </div>
  );
}

export default ProjectPage;
