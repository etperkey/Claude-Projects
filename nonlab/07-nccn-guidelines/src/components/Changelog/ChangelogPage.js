import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllRegulatoryEvents,
  getBeyondNccnNodes,
  getWithdrawnNodes,
  getGuidelineVersions,
  groupEventsByYear,
} from '../../utils/changelogUtils';
import './ChangelogPage.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  if (d) return `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
  if (m) return `${MONTHS[parseInt(m,10)-1]} ${y}`;
  return y;
}

function statusChipClass(status) {
  return 'cl-chip cl-chip-' + status;
}

function EventRow({ ev }) {
  return (
    <li className="cl-event">
      <div className="cl-event-date">{formatDate(ev.date)}</div>
      <div className="cl-event-body">
        <div className="cl-event-line">
          <Link to={`/guidelines/${ev.guidelineId}`} className="cl-event-disease">
            {ev.guidelineName}
          </Link>
          <span className={statusChipClass(ev.status)}>
            {ev.agency} {ev.statusLabel}
          </span>
          {ev.nodeStatus === 'beyond-nccn' && (
            <span className="cl-chip cl-chip-beyond">Beyond NCCN</span>
          )}
          {ev.nodeStatus === 'withdrawn' && (
            <span className="cl-chip cl-chip-withdrawn-node">Withdrawn</span>
          )}
        </div>
        <div className="cl-event-node">{ev.nodeLabel}</div>
        {ev.notes && <div className="cl-event-notes">{ev.notes}</div>}
        {ev.url && (
          <a
            href={ev.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cl-event-source"
          >
            Source &rarr;
          </a>
        )}
      </div>
    </li>
  );
}

function ChangelogPage() {
  const [filter, setFilter] = useState('all');

  const events = useMemo(() => getAllRegulatoryEvents(), []);
  const beyond = useMemo(() => getBeyondNccnNodes(), []);
  const withdrawn = useMemo(() => getWithdrawnNodes(), []);
  const versions = useMemo(() => getGuidelineVersions(), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'recent') {
      const cutoff = '2024-01-01';
      return events.filter((e) => e.date >= cutoff);
    }
    if (filter === 'withdrawn') return events.filter((e) => e.status === 'withdrawn');
    if (filter === 'crl') return events.filter((e) => e.status === 'crl');
    if (filter === 'beyond') return events.filter((e) => e.nodeStatus === 'beyond-nccn');
    return events;
  }, [events, filter]);

  const groups = useMemo(() => groupEventsByYear(filtered), [filtered]);

  return (
    <div className="changelog-page">
      <div className="cl-header">
        <h1>Changelog &amp; Regulatory Timeline</h1>
        <p className="cl-subtitle">
          All regulatory events (approvals, withdrawals, CRLs) and Beyond-NCCN
          entries across the {versions.length} guidelines in this viewer,
          aggregated from node-level data.
        </p>
      </div>

      <section className="cl-section">
        <h2>Summary</h2>
        <div className="cl-summary-cards">
          <div className="cl-card">
            <div className="cl-card-num">{events.length}</div>
            <div className="cl-card-label">Total regulatory events</div>
          </div>
          <div className="cl-card">
            <div className="cl-card-num">{withdrawn.length}</div>
            <div className="cl-card-label">Withdrawn treatments</div>
          </div>
          <div className="cl-card">
            <div className="cl-card-num">{beyond.length}</div>
            <div className="cl-card-label">Beyond-NCCN entries</div>
          </div>
          <div className="cl-card">
            <div className="cl-card-num">{versions.length}</div>
            <div className="cl-card-label">Guidelines covered</div>
          </div>
        </div>
      </section>

      <section className="cl-section">
        <h2>Regulatory Timeline</h2>
        <div className="cl-filters">
          <button
            className={`cl-filter ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All events ({events.length})
          </button>
          <button
            className={`cl-filter ${filter === 'recent' ? 'active' : ''}`}
            onClick={() => setFilter('recent')}
          >
            2024+ ({events.filter((e) => e.date >= '2024-01-01').length})
          </button>
          <button
            className={`cl-filter ${filter === 'withdrawn' ? 'active' : ''}`}
            onClick={() => setFilter('withdrawn')}
          >
            Withdrawals ({events.filter((e) => e.status === 'withdrawn').length})
          </button>
          <button
            className={`cl-filter ${filter === 'crl' ? 'active' : ''}`}
            onClick={() => setFilter('crl')}
          >
            CRLs ({events.filter((e) => e.status === 'crl').length})
          </button>
          <button
            className={`cl-filter ${filter === 'beyond' ? 'active' : ''}`}
            onClick={() => setFilter('beyond')}
          >
            Beyond NCCN ({events.filter((e) => e.nodeStatus === 'beyond-nccn').length})
          </button>
        </div>

        {groups.map(([year, yearEvents]) => (
          <div key={year} className="cl-year">
            <h3 className="cl-year-heading">{year}</h3>
            <ul className="cl-events">
              {yearEvents.map((ev, i) => (
                <EventRow key={`${ev.guidelineId}-${ev.nodeId}-${ev.date}-${i}`} ev={ev} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="cl-section">
        <h2>Guideline Versions</h2>
        <table className="cl-versions">
          <thead>
            <tr>
              <th>Guideline</th>
              <th>Category</th>
              <th>Version</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link to={`/guidelines/${v.id}`}>{v.name}</Link>
                </td>
                <td>{v.category}</td>
                <td>
                  <code>v{v.version}</code>
                </td>
                <td>
                  {v.nccnUrl && (
                    <a
                      href={v.nccnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      NCCN.org &rarr;
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default ChangelogPage;
