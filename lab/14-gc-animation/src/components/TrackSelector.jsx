import React, { useState } from 'react';
import { TRACKS, TRACK_ORDER } from '../tracks/TrackConfig.js';

export default function TrackSelector({ onSelectTrack, onPlayBoth, onSandbox }) {
  const [showSong, setShowSong] = useState(false);

  return (
    <div className="track-selector-overlay">
      <div className="track-selector-content">
        <h1 className="track-selector-title">Germinal Center Reaction</h1>
        <p className="track-selector-subtitle">Choose a narrative perspective</p>

        <div className="track-cards">
          {TRACK_ORDER.map(id => {
            const track = TRACKS[id];
            return (
              <button
                key={id}
                className="track-card"
                onClick={() => onSelectTrack(id, 'single')}
              >
                <div className="track-card-icon">{track.icon}</div>
                <div className="track-card-title">{track.title}</div>
                <div className="track-card-subtitle">{track.subtitle}</div>
                <div className="track-card-desc">{track.description}</div>
              </button>
            );
          })}
        </div>

        <div className="track-selector-actions">
          <button className="play-both-btn" onClick={onPlayBoth}>
            Play Both Tracks
            <span className="play-both-hint">Mutations, then Chemokines</span>
          </button>
          <button className="play-both-btn sandbox-btn" onClick={onSandbox}>
            Sandbox Mode
            <span className="play-both-hint">Free-play simulation with adjustable parameters</span>
          </button>
        </div>

        <div className="easter-egg-section">
          <button
            className="easter-egg-btn"
            onClick={() => setShowSong(!showSong)}
            title="Dark Zone Blues"
          >
            {showSong ? '🎵 Close' : '🎵'}
          </button>
          {showSong && (
            <div className="easter-egg-content">
              <div className="easter-egg-player">
                <iframe
                  src="https://www.udio.com/embed/qEk6bF7k5JExZ1rkj9cqe6"
                  width="100%"
                  height="228"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media"
                  style={{ borderRadius: '12px' }}
                />
              </div>
              <div className="easter-egg-lyrics">
                <h3>Dark Zone Blues</h3>
                <p className="lyrics-subtitle">A folk ballad about the germinal center reaction</p>

                <p className="lyrics-heading">Verse 1 — The Call</p>
                <p>Well I was just a naive cell, driftin' through the blood<br/>
                When an antigen came callin' like a Mississippi flood<br/>
                It grabbed my BCR and it whispered, "Follow me,<br/>
                Past the T cell border, to where the follicles run free"</p>
                <p>I crossed into the dark zone where the lights don't ever shine<br/>
                Where a billion cells are dividin' on the double-helix line<br/>
                AID was rewritin' every letter that I knew<br/>
                Somatic hypermutation — Lord, I'm somebody new</p>

                <p className="lyrics-heading">Chorus</p>
                <p className="lyrics-chorus">Blowin' through the germinal center<br/>
                Where the strong survive and the weak ones fade<br/>
                Blowin' through the germinal center<br/>
                Every antibody gets remade</p>

                <p className="lyrics-heading">Verse 2 — The Trial</p>
                <p>Then they pushed me to the light zone, put me on display<br/>
                The FDCs were holdin' antigen like a poker hand to play<br/>
                "Show us what you got now, let's see how tight you bind"<br/>
                If your affinity ain't high enough, you get left behind</p>
                <p>The T-follicular helpers watched from the corner of the room<br/>
                With their ICOS and their CD40L, decidin' on my doom<br/>
                "We'll give you one more chance, boy — go cycle through again"<br/>
                Back to the dark zone, back to where it all began</p>

                <p className="lyrics-heading">Chorus</p>
                <p className="lyrics-chorus">Blowin' through the germinal center<br/>
                Where the strong survive and the weak ones fade<br/>
                Blowin' through the germinal center<br/>
                Every antibody gets remade</p>

                <p className="lyrics-heading">Verse 3 — The Becoming</p>
                <p>Some cells class-switched to IgG, threw their IgM away<br/>
                Some went off to IgA for the mucosal highway<br/>
                The plasma cells shipped out along the bone marrow line<br/>
                Pumpin' out their antibodies like a California wine</p>
                <p>The memory cells, they settled down in quiet neighborhoods<br/>
                Ready to respond again, the way a good cell should<br/>
                If the antigen comes back around like an old unwanted friend —<br/>
                The germinal center knows it never really ends</p>

                <p className="lyrics-heading">Chorus</p>
                <p className="lyrics-chorus">Blowin' through the germinal center<br/>
                Where the strong survive and the weak ones fade<br/>
                Blowin' through the germinal center<br/>
                Every antibody gets remade</p>

                <p className="lyrics-heading">Verse 4 — The Fall</p>
                <p>But sometimes in the dark zone, when the mutations roll<br/>
                A B cell loses its direction and the cancer takes its toll<br/>
                BCL2 won't let you die and MYC won't let you rest<br/>
                EZH2 rewrites the rules and puts 'em to the test</p>
                <p>They call it lymphoma now — a germinal center crime<br/>
                When the cells that should have died kept dividin' overtime<br/>
                From follicular to diffuse, the names all change, but the song<br/>
                Remains the same old ballad of a cell that went wrong</p>

                <p className="lyrics-heading">Final Chorus</p>
                <p className="lyrics-chorus">Blowin' through the germinal center<br/>
                Where the strong survive and the weak ones fade<br/>
                Blowin' through the germinal center<br/>
                Some get saved... and some get betrayed</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
