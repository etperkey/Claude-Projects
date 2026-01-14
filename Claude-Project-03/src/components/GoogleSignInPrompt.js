import React from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

function GoogleSignInPrompt() {
  const { showSignInPrompt, gisLoaded, signIn, dismissPrompt } = useGoogleAuth();

  if (!showSignInPrompt) return null;

  return (
    <div className="google-prompt-overlay">
      <div className="google-prompt-modal">
        <div className="google-prompt-header">
          <h2>Connect to Google</h2>
        </div>

        <div className="google-prompt-body">
          <div className="google-prompt-icon">
            <span className="google-g-icon">G</span>
          </div>

          <p className="google-prompt-message">
            Sign in with Google to enable:
          </p>

          <ul className="google-features-list">
            <li>Create and sync Google Docs from your notes</li>
            <li>Export tasks to Google Calendar</li>
            <li>Import content from Google Docs</li>
            <li>Two-way sync between dashboard and Google</li>
          </ul>

          <div className="google-prompt-actions">
            <button
              className="google-signin-btn-large"
              onClick={signIn}
              disabled={!gisLoaded}
            >
              <span className="google-btn-icon">G</span>
              {gisLoaded ? 'Sign in with Google' : 'Loading...'}
            </button>

            <button
              className="google-skip-btn"
              onClick={dismissPrompt}
            >
              Skip for now
            </button>
          </div>

          <p className="google-prompt-note">
            You can always sign in later using the button in the navigation bar.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GoogleSignInPrompt;
