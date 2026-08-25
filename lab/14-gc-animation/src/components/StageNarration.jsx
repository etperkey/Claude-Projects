import React, { useEffect, useRef, useState } from 'react';

export default React.memo(function StageNarration({ stage, voiceEnabled, trackId, paused }) {
  const audioRef = useRef(null);
  const narrationRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Create a persistent audio element once
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.volume = 0.85;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Play/stop when stage, track, or voiceEnabled changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stage) return;

    // Stop any currently playing audio immediately on stage change
    audio.pause();
    audio.currentTime = 0;

    if (!voiceEnabled) {
      return;
    }

    const folder = trackId || 'mutations';
    const src = `./audio/${folder}/stage${stage.id}.mp3`;

    // Small delay so visual transition happens first
    const timer = setTimeout(() => {
      audio.src = src;
      audio.load();
      audio.playbackRate = 1.0; // Always normal speed
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err.message);
        });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      // Stop audio when effect cleans up (stage changing, unmounting)
      audio.pause();
      audio.currentTime = 0;
    };
  }, [stage?.id, voiceEnabled, trackId]);

  // Pause/resume audio in sync with simulation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !voiceEnabled) return;

    if (paused) {
      audio.pause();
    } else if (audio.src && audio.currentTime > 0) {
      audio.play().catch(() => {});
    }
  }, [paused, voiceEnabled]);

  // Detect overflow on stage change
  useEffect(() => {
    const el = narrationRef.current;
    if (!el) { setIsOverflowing(false); return; }
    // Check after a frame so layout is settled
    requestAnimationFrame(() => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 4);
    });
  }, [stage?.id]);

  if (!stage) return null;

  return (
    <div
      ref={narrationRef}
      className={`stage-narration${isOverflowing ? ' narration-overflow' : ''}`}
    >
      <div className="narration-title">{stage.title}</div>
      <div className="narration-text">{stage.narration}</div>
    </div>
  );
})
