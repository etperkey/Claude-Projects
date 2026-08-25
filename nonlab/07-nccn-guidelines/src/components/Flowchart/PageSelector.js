import './PageSelector.css';

function PageSelector({ pages, activePage, onPageChange }) {
  if (!pages || pages.length <= 1) return null;

  return (
    <div className="page-selector">
      <span className="page-selector-label">Algorithm Page:</span>
      <div className="page-tabs">
        {pages.map((p) => (
          <button
            key={p.id}
            className={`page-tab ${p.id === activePage ? 'active' : ''}`}
            onClick={() => onPageChange(p.id)}
          >
            <span className="page-tab-id">{p.id}</span>
            <span className="page-tab-title">{p.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PageSelector;
