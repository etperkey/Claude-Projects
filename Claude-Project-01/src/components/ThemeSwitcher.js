import React from 'react';
import './ThemeSwitcher.css';

function ThemeSwitcher({ currentTheme, setTheme }) {
  const themes = [
    { id: 'modern', label: 'Modern', icon: '✨' },
    { id: 'geocities', label: "90's Geocities", icon: '🚧' },
    { id: 'myspace', label: "2000's MySpace", icon: '💫' }
  ];

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].id);
  };

  const currentThemeData = themes.find(t => t.id === currentTheme);

  return (
    <div className="theme-switcher">
      <button
        className={`theme-toggle-btn ${currentTheme}`}
        onClick={cycleTheme}
        title={`Current: ${currentThemeData?.label}. Click to switch!`}
      >
        <span className="theme-icon">{currentThemeData?.icon}</span>
        <span className="theme-label">{currentThemeData?.label}</span>
      </button>
    </div>
  );
}

export default ThemeSwitcher;
