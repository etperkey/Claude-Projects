import React, { useRef, useEffect, useCallback } from 'react';

export default function CanvasView({ engine, onCellClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    engine.resize(w * dpr, h * dpr);
  }, [engine]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Provide canvas context to engine (single RAF loop lives in engine)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.ctx = canvas.getContext('2d');
    return () => { engine.ctx = null; };
  }, [engine]);

  const getCanvasCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
      screenX: clientX,
      screenY: clientY,
    };
  }, []);

  const handleClick = useCallback((e) => {
    if (!onCellClick) return;
    const { x, y, screenX, screenY } = getCanvasCoords(e.clientX, e.clientY);
    const entity = engine.getEntityAt(x, y);
    if (entity) {
      onCellClick(entity, screenX, screenY);
    } else {
      onCellClick(null);
    }
  }, [engine, onCellClick, getCanvasCoords]);

  const handleTouchEnd = useCallback((e) => {
    if (!onCellClick) return;
    // Use the last touch point from changedTouches
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault(); // prevent ghost click
    const { x, y, screenX, screenY } = getCanvasCoords(touch.clientX, touch.clientY);
    const entity = engine.getEntityAt(x, y);
    if (entity) {
      onCellClick(entity, screenX, screenY);
    } else {
      onCellClick(null);
    }
  }, [engine, onCellClick, getCanvasCoords]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
      />
    </div>
  );
}
