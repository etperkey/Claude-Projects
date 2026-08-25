import './EvidenceLevelBadge.css';

const LEVELS = {
  'phase-3': { label: 'Phase 3', tooltip: 'Phase 3 randomized evidence' },
  'phase-2': { label: 'Phase 2', tooltip: 'Phase 2 trial evidence' },
  'phase-1-2': { label: 'Phase 1/2', tooltip: 'Phase 1/2 trial evidence' },
  'ex-us-approved': { label: 'Ex-US Approved', tooltip: 'Approved outside the United States (e.g., EMA, PMDA)' },
  'trial-in-progress': { label: 'Trial in Progress', tooltip: 'Pivotal trial enrolling; results not yet reported' },
  'case-series': { label: 'Case Series', tooltip: 'Retrospective or prospective case series evidence' },
  'consensus': { label: 'Expert Consensus', tooltip: 'Consensus/panel opinion without randomized evidence' },
};

function EvidenceLevelBadge({ level }) {
  if (!level) return null;
  const meta = LEVELS[level] || { label: level, tooltip: level };
  const cls = `ev-${level.replace(/\//g, '-').replace(/\s/g, '-').toLowerCase()}`;

  return (
    <span className={`evidence-level-badge ${cls}`} title={meta.tooltip}>
      {meta.label}
    </span>
  );
}

export default EvidenceLevelBadge;
