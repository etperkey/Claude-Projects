import React from 'react';

const modes = [
  { id: 'autoplay', icon: '▶', label: 'Autoplay' },
  { id: 'step', icon: '⏭', label: 'Step' },
  { id: 'interactive', icon: '🔬', label: 'Interactive' },
];

const speeds = [0.5, 1, 2, 4];

export default function ControlPanel({ engine, onUpdate }) {
  const stages = engine.stages;

  const handleModeChange = (mode) => {
    stages.setMode(mode);
    onUpdate();
  };

  const handlePause = () => {
    stages.togglePause();
    onUpdate();
  };

  const handleSpeedChange = (speed) => {
    engine.speed = speed;
    onUpdate();
  };

  const handleNext = () => {
    stages.next(engine);
    onUpdate();
  };

  const handlePrev = () => {
    stages.prev(engine);
    onUpdate();
  };

  const handleReset = () => {
    engine.reset();
    engine.start();
    onUpdate();
  };

  return (
    <div className="control-panel">
      <div className="control-group">
        {modes.map(m => (
          <button
            key={m.id}
            className={`mode-btn ${stages.mode === m.id ? 'active' : ''}`}
            onClick={() => handleModeChange(m.id)}
            title={m.label}
          >
            {m.icon}
          </button>
        ))}
      </div>

      <div className="control-group">
        {stages.mode === 'step' && (
          <button className="ctrl-btn" onClick={handlePrev} title="Previous stage">◀</button>
        )}
        <button className="ctrl-btn" onClick={handlePause}>
          {stages.paused ? '▶' : '⏸'}
        </button>
        {stages.mode === 'step' && (
          <button className="ctrl-btn" onClick={handleNext} title="Next stage">▶</button>
        )}
        <button className="ctrl-btn" onClick={handleReset} title="Reset">⟲</button>
      </div>

      <div className="control-group speed-group">
        <span className="speed-label">Speed:</span>
        {speeds.map(s => (
          <button
            key={s}
            className={`speed-btn ${engine.speed === s ? 'active' : ''}`}
            data-speed={s}
            onClick={() => handleSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="stage-indicator">
        {stages.trackConfig && (
          <span className="track-indicator">
            {stages.trackConfig.icon} {stages.trackConfig.title} &mdash;{' '}
          </span>
        )}
        Stage {stages.stageNumber}/{stages.totalStages}
      </div>

      {stages.mode === 'autoplay' && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stages.progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}
