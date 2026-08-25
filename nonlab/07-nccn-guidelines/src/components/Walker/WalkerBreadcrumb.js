import './WalkerBreadcrumb.css';

const TYPE_COLORS = {
  diagnosis: 'var(--color-diagnosis)',
  workup: 'var(--color-workup)',
  decision: 'var(--color-decision)',
  treatment: 'var(--color-treatment)',
  response: 'var(--color-response)',
  surveillance: 'var(--color-surveillance)',
  reference: 'var(--color-reference)',
};

function WalkerBreadcrumb({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="walker-breadcrumb">
      {steps.map((step, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-arrow">&rarr;</span>}
          <span
            className={`breadcrumb-label ${i === steps.length - 1 ? 'current' : ''}`}
            style={{ borderBottomColor: TYPE_COLORS[step.type] || 'transparent' }}
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export default WalkerBreadcrumb;
