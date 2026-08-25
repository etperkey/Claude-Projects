import CategoryBadge from '../shared/CategoryBadge';
import ReferenceList from '../shared/ReferenceList';
import InlineCalculator, { getCalculatorsForNode } from '../Calculators/InlineCalculator';
import './WalkerCurrentStep.css';

const TYPE_COLORS = {
  diagnosis: 'var(--color-diagnosis)',
  workup: 'var(--color-workup)',
  decision: 'var(--color-decision)',
  treatment: 'var(--color-treatment)',
  response: 'var(--color-response)',
  surveillance: 'var(--color-surveillance)',
  reference: 'var(--color-reference)',
};

function WalkerCurrentStep({ node, options, isTerminal, onSelect, footnotes, references }) {
  const borderColor = TYPE_COLORS[node.type] || 'var(--color-border)';
  const calculatorIds = getCalculatorsForNode(node.id);

  return (
    <div className="walker-step" style={{ borderLeftColor: borderColor }}>
      <div className="walker-step-type" style={{ color: borderColor }}>
        {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
      </div>
      <h2 className="walker-step-label">{node.label}</h2>

      {node.detail && (
        <p className="walker-step-detail">{node.detail}</p>
      )}

      {node.category && (
        <div className="walker-step-category">
          <CategoryBadge category={node.category} />
        </div>
      )}

      {node.footnoteRefs && node.footnoteRefs.length > 0 && footnotes && (
        <div className="walker-step-footnotes">
          {node.footnoteRefs.map((ref) => (
            <div key={ref} className="walker-footnote">
              <span className="walker-footnote-ref">[{ref}]</span>
              <span>{footnotes[ref]}</span>
            </div>
          ))}
        </div>
      )}

      <ReferenceList
        referenceIds={node.referenceIds}
        allReferences={references}
      />

      <InlineCalculator calculatorIds={calculatorIds} />

      {node.question && (
        <div className="walker-step-question">
          <h3>{node.question}</h3>
        </div>
      )}

      {!isTerminal && options.length > 0 && (
        <div className="walker-step-options">
          {options.map((opt) => (
            <button
              key={opt.optionIndex}
              className="walker-option-btn"
              onClick={() => onSelect(opt.optionIndex, opt.targetNodeId)}
            >
              <span className="walker-option-label">{opt.label}</span>
              {opt.description && (
                <span className="walker-option-desc">{opt.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {isTerminal && (
        <div className="walker-step-terminal">
          <p>End of this pathway. Use the controls below to go back or restart.</p>
        </div>
      )}
    </div>
  );
}

export default WalkerCurrentStep;
