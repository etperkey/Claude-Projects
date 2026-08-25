import CategoryBadge from '../shared/CategoryBadge';
import EvidenceLevelBadge from '../shared/EvidenceLevelBadge';
import ReferenceList from '../shared/ReferenceList';
import RegulatoryChip from '../shared/RegulatoryChip';
import '../Flowchart/nodes/nodeStyles.css';

const TYPE_LABELS = {
  diagnosis: { label: 'Diagnosis', color: '#2563eb' },
  workup: { label: 'Workup', color: '#0d9488' },
  decision: { label: 'Decision', color: '#d97706' },
  treatment: { label: 'Treatment', color: '#16a34a' },
  response: { label: 'Response', color: '#7c3aed' },
  surveillance: { label: 'Surveillance', color: '#6b7280' },
  reference: { label: 'Reference', color: '#0ea5e9' },
};

function normalizeRegulatory(reg) {
  if (!reg) return [];
  return Array.isArray(reg) ? reg : [reg];
}

function NodeDetailPanel({ node, footnotes, references, onClose, onNavigate }) {
  const typeInfo = TYPE_LABELS[node.type] || { label: node.type, color: '#6b7280' };
  const regArray = normalizeRegulatory(node.regulatory);

  return (
    <div className="node-detail-panel">
      <div className="node-detail-panel-header">
        <div>
          <span
            className="node-type-badge"
            style={{ background: typeInfo.color + '22', color: typeInfo.color }}
          >
            {typeInfo.label}
          </span>
          {node.status === 'beyond-nccn' && (
            <span
              className="node-type-badge"
              style={{ background: '#7c3aed22', color: '#7c3aed', marginLeft: 6 }}
            >
              Beyond NCCN
            </span>
          )}
          {node.status === 'withdrawn' && (
            <span
              className="node-type-badge"
              style={{ background: '#dc262622', color: '#dc2626', marginLeft: 6 }}
            >
              Withdrawn
            </span>
          )}
          <h3>{node.label}</h3>
        </div>
        <button className="node-detail-panel-close" onClick={onClose}>&times;</button>
      </div>
      <div className="node-detail-panel-body">
        {node.detail && <p>{node.detail}</p>}

        {(node.category || node.evidenceLevel) && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {node.category && <CategoryBadge category={node.category} />}
            {node.evidenceLevel && <EvidenceLevelBadge level={node.evidenceLevel} />}
          </div>
        )}

        {regArray.map((r, i) => (
          <RegulatoryChip key={i} regulatory={r} />
        ))}

        {node.question && (
          <div style={{ marginTop: 12 }}>
            <strong>Question:</strong> {node.question}
            {node.options && (
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                {node.options.map((opt, i) => (
                  <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>{opt.label}</strong>
                    {opt.description && <> — {opt.description}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {node.type === 'reference' && node.targetPage && (
          <button
            style={{
              marginTop: 12,
              padding: '6px 14px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate(node.targetPage)}
          >
            Go to {node.targetPage}
          </button>
        )}

        {node.footnoteRefs && node.footnoteRefs.length > 0 && footnotes && (
          <div style={{ marginTop: 12, borderTop: '1px solid #e9ecef', paddingTop: 8 }}>
            <strong style={{ fontSize: 12 }}>Footnotes:</strong>
            {node.footnoteRefs.map((ref) => (
              <p key={ref} style={{ fontSize: 12, marginTop: 4, color: '#6c757d' }}>
                <strong style={{ color: '#2563eb' }}>[{ref}]</strong>{' '}
                {footnotes[ref] || 'Not found'}
              </p>
            ))}
          </div>
        )}

        <ReferenceList
          referenceIds={node.referenceIds}
          allReferences={references}
          compact
        />
      </div>
    </div>
  );
}

export default NodeDetailPanel;
