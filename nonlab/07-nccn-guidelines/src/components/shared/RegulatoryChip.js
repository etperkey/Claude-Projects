import './RegulatoryChip.css';

const STATUS_META = {
  approved: { symbol: 'OK', label: 'Approved', cls: 'reg-approved' },
  accelerated: { symbol: '>>', label: 'Accelerated', cls: 'reg-accelerated' },
  breakthrough: { symbol: 'BT', label: 'Breakthrough', cls: 'reg-breakthrough' },
  crl: { symbol: '!', label: 'CRL', cls: 'reg-crl' },
  withdrawn: { symbol: 'X', label: 'Withdrawn', cls: 'reg-withdrawn' },
  trial: { symbol: '~', label: 'Trial', cls: 'reg-trial' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateCompact(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  if (d) return `${parseInt(m,10)}/${parseInt(d,10)}/${y.slice(2)}`;
  if (m) return `${m}/${y.slice(2)}`;
  return y;
}

function formatDateFull(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  if (d) return `${MONTH_NAMES[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
  if (m) return `${MONTH_NAMES[parseInt(m,10)-1]} ${y}`;
  return y;
}

function RegulatoryChip({ regulatory, compact = false }) {
  if (!regulatory) return null;
  const meta = STATUS_META[regulatory.status] || { symbol: '?', label: regulatory.status, cls: 'reg-trial' };
  const compactDate = formatDateCompact(regulatory.date);
  const fullDate = formatDateFull(regulatory.date);
  const agency = regulatory.agency || 'FDA';

  const title = [
    `${agency} ${meta.label}`,
    fullDate && `(${fullDate})`,
    regulatory.notes,
  ].filter(Boolean).join(' ');

  if (compact) {
    return (
      <span className={`regulatory-chip ${meta.cls}`} title={title}>
        {agency}{' '}{meta.symbol}{compactDate && ` ${compactDate}`}
      </span>
    );
  }

  return (
    <div className={`regulatory-chip regulatory-chip-full ${meta.cls}`}>
      <strong>{agency} {meta.label}</strong>
      {fullDate && <span> — {fullDate}</span>}
      {regulatory.notes && <div className="regulatory-notes">{regulatory.notes}</div>}
      {regulatory.url && (
        <div className="regulatory-source">
          <a
            href={regulatory.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Source &rarr;
          </a>
        </div>
      )}
    </div>
  );
}

export default RegulatoryChip;
