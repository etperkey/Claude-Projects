import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import CategoryBadge from '../../shared/CategoryBadge';
import EvidenceLevelBadge from '../../shared/EvidenceLevelBadge';
import RegulatoryChip from '../../shared/RegulatoryChip';
import './nodeStyles.css';

function normalizeRegulatory(reg) {
  if (!reg) return [];
  return Array.isArray(reg) ? reg : [reg];
}

function BaseNode({ data, className }) {
  const isBeyondNccn = data.status === 'beyond-nccn';
  const isWithdrawn = data.status === 'withdrawn';
  const regArray = normalizeRegulatory(data.regulatory);

  const classes = [
    'custom-node',
    className,
    isBeyondNccn ? 'node-beyond-nccn' : '',
    isWithdrawn ? 'node-withdrawn' : '',
  ].filter(Boolean).join(' ');

  const hasFooter =
    data.category ||
    data.evidenceLevel ||
    regArray.length > 0 ||
    (data.footnoteRefs && data.footnoteRefs.length > 0);

  return (
    <div className={classes}>
      {isBeyondNccn && <span className="beyond-nccn-pill">Beyond NCCN</span>}
      {isWithdrawn && <span className="withdrawn-pill">Withdrawn</span>}
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      {data.options && data.options.length > 0 && (
        <div className="node-options">
          {data.options.map((opt, i) => (
            <span key={i}>{opt.label}</span>
          ))}
        </div>
      )}
      {hasFooter && (
        <div className="node-footer">
          {data.category && <CategoryBadge category={data.category} />}
          {data.evidenceLevel && <EvidenceLevelBadge level={data.evidenceLevel} />}
          {regArray.map((r, i) => (
            <RegulatoryChip key={i} regulatory={r} compact />
          ))}
          {data.footnoteRefs && data.footnoteRefs.length > 0 && (
            <span className="node-footnotes">
              [{data.footnoteRefs.join(', ')}]
            </span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(BaseNode);
