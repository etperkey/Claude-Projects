import './WalkerSummary.css';

const TYPE_COLORS = {
  diagnosis: 'var(--color-diagnosis)',
  workup: 'var(--color-workup)',
  decision: 'var(--color-decision)',
  treatment: 'var(--color-treatment)',
  response: 'var(--color-response)',
  surveillance: 'var(--color-surveillance)',
  reference: 'var(--color-reference)',
};

function WalkerSummary({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="walker-summary">
      <h3>Path Summary</h3>
      <div className="summary-steps">
        {steps.map((step, i) => (
          <div key={i} className="summary-step">
            <div
              className="summary-step-dot"
              style={{ background: TYPE_COLORS[step.type] || '#94a3b8' }}
            />
            {i < steps.length - 1 && <div className="summary-step-line" />}
            <div className="summary-step-info">
              <span className="summary-step-type">{step.type}</span>
              <span className="summary-step-label">{step.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WalkerSummary;
