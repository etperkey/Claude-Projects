import './WalkerControls.css';

function WalkerControls({ canGoBack, onBack, onRestart, onStop, isTerminal }) {
  return (
    <div className="walker-controls">
      <div className="walker-controls-left">
        <button
          className="walker-ctrl-btn"
          onClick={onBack}
          disabled={!canGoBack}
        >
          &larr; Back
        </button>
        <button className="walker-ctrl-btn" onClick={onRestart}>
          Restart
        </button>
      </div>
      <div className="walker-controls-right">
        {!isTerminal && (
          <button className="walker-ctrl-btn stop" onClick={onStop}>
            Stop Here
          </button>
        )}
      </div>
    </div>
  );
}

export default WalkerControls;
