import { useState } from 'react';
import './Calculators.css';

const FACTORS = [
  { id: 'b2m', label: 'Beta-2 microglobulin > 3 mg/L', shortLabel: 'B2M' },
  { id: 'marrow', label: 'Bone marrow involvement', shortLabel: 'BM' },
];

// PRIMA-PI (Bachy 2018) — simplified 3-group prognostic index derived from PRIMA trial cohort
// 3-group stratification: Low (no factors), Int (B2M only), High (BM+ regardless of B2M, OR both)
// 5-yr PFS: Low 69%, Int 55%, High 37%
function classify(factors) {
  const bm = !!factors.marrow;
  const b2m = !!factors.b2m;
  if (bm || (b2m && bm)) {
    return { group: 'High', color: '#dc2626', pfs5yr: '37%', sos: 'Bone marrow involved' };
  }
  if (b2m) {
    return { group: 'Intermediate', color: '#ca8a04', pfs5yr: '55%', sos: 'Elevated B2M only' };
  }
  return { group: 'Low', color: '#16a34a', pfs5yr: '69%', sos: 'Neither risk factor' };
}

function PRIMAPICalculator() {
  const [factors, setFactors] = useState({});

  const toggle = (id) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const risk = classify(factors);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>PRIMA-PI Calculator</h3>
        <span className="calc-subtitle">Follicular Lymphoma Prognostic Index (Bachy 2018)</span>
      </div>

      <div className="calc-factors">
        {FACTORS.map((f) => (
          <label key={f.id} className="calc-factor">
            <input
              type="checkbox"
              checked={!!factors[f.id]}
              onChange={() => toggle(f.id)}
            />
            <span className="calc-factor-label">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="calc-results">
        <div className="calc-risk-row">
          <span className="calc-risk-label">PRIMA-PI:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
          <span className="calc-risk-stat">5-yr PFS ~{risk.pfs5yr}</span>
        </div>
        <div className="calc-note" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
          {risk.sos}. PRIMA-PI uses only 2 factors and provides a simpler 3-group stratification vs FLIPI/FLIPI-2. Validated in R-chemo + R-maintenance cohorts.
        </div>
      </div>

      <div className="calc-reference">
        Bachy E, Maurer MJ, Habermann TM, et al. A simplified scoring system in de novo follicular lymphoma treated initially with immunochemotherapy. <em>Blood.</em> 2018;132(1):49-58. <a href="https://pubmed.ncbi.nlm.nih.gov/29666118/" target="_blank" rel="noopener noreferrer">PMID 29666118</a>
      </div>
    </div>
  );
}

export default PRIMAPICalculator;
