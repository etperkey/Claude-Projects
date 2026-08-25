import './ReferenceList.css';

function isValidPmid(pmid) {
  return /^\d+$/.test(String(pmid));
}

function pubmedUrl(pmid) {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

function ReferenceList({ referenceIds, allReferences, compact }) {
  if (!referenceIds || referenceIds.length === 0 || !allReferences) return null;

  const refs = referenceIds
    .map((id) => allReferences.find((r) => r.id === id))
    .filter(Boolean);

  if (refs.length === 0) return null;

  return (
    <div className={`reference-list ${compact ? 'compact' : ''}`}>
      <div className="reference-list-header">
        <span className="reference-list-icon">📚</span>
        <span>Primary References</span>
      </div>
      <div className="reference-items">
        {refs.map((ref) => (
          <div key={ref.id} className="reference-item">
            <div className="reference-short-label">{ref.shortLabel}</div>
            <div className="reference-citation">{ref.citation}</div>
            {ref.pmid && isValidPmid(ref.pmid) ? (
              <a
                href={pubmedUrl(ref.pmid)}
                target="_blank"
                rel="noopener noreferrer"
                className="reference-pmid-link"
              >
                PMID: {ref.pmid}
              </a>
            ) : ref.pmid ? (
              <span className="reference-pmid-link">PMID: {ref.pmid}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferenceList;
