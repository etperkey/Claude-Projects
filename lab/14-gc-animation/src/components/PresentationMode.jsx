import React from 'react';

export default function PresentationMode({ isFullscreen, onToggle }) {
  return (
    <button
      className="presentation-btn"
      onClick={onToggle}
      title={isFullscreen ? 'Exit fullscreen' : 'Presentation mode'}
    >
      {isFullscreen ? '⤓' : '⤢'}
    </button>
  );
}
