import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SimulationEngine } from './engine/SimulationEngine.js';
import { TRACKS, TRACK_ORDER } from './tracks/TrackConfig.js';
import CanvasView from './components/CanvasView.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import StageNarration from './components/StageNarration.jsx';
import CellInfoTooltip from './components/CellInfoTooltip.jsx';
import ParameterPanel from './components/ParameterPanel.jsx';
import Legend from './components/Legend.jsx';
import PathwayOverlay from './components/PathwayOverlay.jsx';
import PresentationMode from './components/PresentationMode.jsx';
import TrackedCellPanel from './components/TrackedCellPanel.jsx';
import TrackSelector from './components/TrackSelector.jsx';
import './App.css';

export default function App() {
  const engine = useMemo(() => new SimulationEngine(), []);
  const [, forceUpdate] = useState(0);
  const [tooltip, setTooltip] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [trackSelected, setTrackSelected] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const containerRef = useRef(null);

  const update = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  useEffect(() => {
    engine.onStateChange = update;
    // Don't auto-start — wait for track selection
    return () => engine.stop();
  }, [engine, update]);

  const handleSelectTrack = useCallback((trackId, playMode) => {
    const track = TRACKS[trackId];
    engine.stages.setTrack(trackId, playMode);
    engine.trackVisuals = track.visuals;
    engine.showChemokines = track.visuals.showChemokines;
    engine.reset();
    engine.start();
    setActiveTrack(trackId);
    setTrackSelected(true);
    update();
  }, [engine, update]);

  const handleSandbox = useCallback(() => {
    engine.stages.resetToTrackSelect();
    engine.stages.sandbox = true;
    engine.stages.mode = 'interactive';
    engine.trackVisuals = null;
    engine.showChemokines = false;
    engine.tick = 0;
    engine.entities.clear();
    engine.affinityHistory = [];
    engine.heroId = null;
    engine.trackedId = null;
    engine.trackedEvents = [];
    // Mark as pending — setupSandbox will run after canvas mounts and triggers resize
    engine._pendingSandbox = true;
    setActiveTrack('sandbox');
    setTrackSelected(true);
    update();
  }, [engine, update]);

  const handlePlayBoth = useCallback(() => {
    const firstTrack = TRACK_ORDER[0];
    const track = TRACKS[firstTrack];
    engine.stages.setTrack(firstTrack, 'sequential');
    engine.trackVisuals = track.visuals;
    engine.showChemokines = track.visuals.showChemokines;
    engine.reset();
    engine.start();
    setActiveTrack(firstTrack);
    setTrackSelected(true);
    update();
  }, [engine, update]);

  const handleReturnToTrackSelect = useCallback(() => {
    engine.stop();
    engine.stages.resetToTrackSelect();
    engine.trackVisuals = null;
    engine.showChemokines = false;
    setTrackSelected(false);
    setActiveTrack(null);
    update();
  }, [engine, update]);

  useEffect(() => {
    const handleKey = (e) => {
      switch (e.key) {
        case ' ':
          if (!trackSelected) return;
          e.preventDefault();
          engine.stages.togglePause();
          update();
          break;
        case 'ArrowRight':
          if (!trackSelected) return;
          engine.stages.next(engine);
          update();
          break;
        case 'ArrowLeft':
          if (!trackSelected) return;
          engine.stages.prev(engine);
          update();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'l':
        case 'L':
          setShowLegend(v => !v);
          break;
        case 'u':
        case 'U':
          setShowUI(v => !v);
          break;
        case 'v':
        case 'V':
          setVoiceEnabled(v => !v);
          break;
        case 't':
        case 'T':
          handleReturnToTrackSelect();
          break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          engine.untrackCell();
          setTooltip(null);
          update();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [engine, isFullscreen, trackSelected, update, handleReturnToTrackSelect]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Sync activeTrack state when sequential mode switches tracks
  const currentTrackId = engine.stages.activeTrack;
  useEffect(() => {
    if (trackSelected && currentTrackId && currentTrackId !== activeTrack) {
      setActiveTrack(currentTrackId);
    }
  }, [trackSelected, currentTrackId, activeTrack]);

  const stage = engine.stages.current;
  const mode = engine.stages.mode;
  const isSandbox = engine.stages.sandbox;
  const isTracking = engine.trackedId != null;
  const chemokinesForced = engine.trackVisuals && engine.trackVisuals.showChemokines;

  const handleCellClick = useCallback((entity, x, y) => {
    if (!entity) {
      setTooltip(null);
      return;
    }

    // Show info tooltip for any cell type
    setTooltip({ entity, x, y });
  }, []);

  return (
    <div ref={containerRef} className={`app-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {!trackSelected && (
        <TrackSelector
          onSelectTrack={handleSelectTrack}
          onPlayBoth={handlePlayBoth}
          onSandbox={handleSandbox}
        />
      )}

      {trackSelected && (
        <>
          <CanvasView engine={engine} onCellClick={handleCellClick} />

          {showUI && (
            <>
              <div className="top-bar">
                <div className="title-group">
                  <div className="title">
                    <span className="title-full">Germinal Center Reaction</span>
                    <span className="title-short">GC Reaction</span>
                  </div>
                  {isSandbox ? (
                    <div className="track-pill">Sandbox</div>
                  ) : engine.stages.trackConfig && (
                    <div className="track-pill">
                      {engine.stages.trackConfig.icon}{' '}
                      {engine.stages.trackConfig.subtitle}
                    </div>
                  )}
                </div>
                <div className="top-right">
                  {!isSandbox && !chemokinesForced && (
                    <PathwayOverlay engine={engine} onUpdate={update} />
                  )}
                  {isSandbox && (
                    <button
                      className={`legend-toggle${engine.showChemokines ? ' active' : ''}`}
                      onClick={() => { engine.showChemokines = !engine.showChemokines; update(); }}
                      title="Toggle chemokine gradients"
                    >
                      Chemokines
                    </button>
                  )}
                  {!isSandbox && (
                    <button
                      className={`legend-toggle${voiceEnabled ? ' active' : ''}`}
                      onClick={() => setVoiceEnabled(v => !v)}
                      title="Toggle voice narration (V)"
                    >
                      {voiceEnabled ? 'Voice On' : 'Voice Off'}
                    </button>
                  )}
                  <button
                    className="legend-toggle"
                    onClick={() => setShowLegend(v => !v)}
                  >
                    {showLegend ? 'Hide' : 'Show'} Legend
                  </button>
                  <button
                    className="legend-toggle"
                    onClick={handleReturnToTrackSelect}
                    title="Return to track selection (T)"
                  >
                    Tracks
                  </button>
                  <PresentationMode isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
                </div>
              </div>

              {!isSandbox && (
                <div className="bottom-bar">
                  <ControlPanel engine={engine} onUpdate={update} />
                  <StageNarration
                    stage={stage}
                    voiceEnabled={voiceEnabled}
                    trackId={currentTrackId}
                    paused={engine.stages.paused}
                  />
                </div>
              )}

              {isSandbox && (
                <div className="sandbox-controls">
                  <button className="ctrl-btn" onClick={() => { engine.stages.togglePause(); update(); }}>
                    {engine.stages.paused ? 'Resume' : 'Pause'}
                  </button>
                  <div className="control-group speed-group">
                    <span className="speed-label">Speed:</span>
                    {[0.5, 1, 2, 4].map(s => (
                      <button
                        key={s}
                        className={`speed-btn ${engine.speed === s ? 'active' : ''}`}
                        onClick={() => { engine.speed = s; update(); }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(mode === 'interactive' || isSandbox) && (
                <ParameterPanel engine={engine} onUpdate={update} />
              )}

              <Legend visible={showLegend} />

              {isTracking && (
                <TrackedCellPanel engine={engine} onUpdate={update} />
              )}
            </>
          )}

          {tooltip && (
            <CellInfoTooltip
              entity={tooltip.entity}
              x={tooltip.x}
              y={tooltip.y}
              onClose={() => setTooltip(null)}
              onTrack={(entityId) => {
                engine.trackCell(entityId);
                setTooltip(null);
                update();
              }}
            />
          )}

          {!showUI && (
            <button className="show-ui-btn" onClick={() => setShowUI(true)}>
              Show UI (U)
            </button>
          )}
        </>
      )}
    </div>
  );
}
