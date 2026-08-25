import { useState } from 'react';
import './Calculators.css';

// MIPI-c (Hoster 2016): combines simplified MIPI with Ki-67 to improve discrimination in MCL
// Score 0-3 from simplified MIPI groups combined with Ki-67 >=30% vs <30%
const SMIPI_GROUPS = [
  { value: 'low', label: 'sMIPI Low (0-3 pts)' },
  { value: 'int', label: 'sMIPI Intermediate (4-5 pts)' },
  { value: 'high', label: 'sMIPI High (6-11 pts)' },
];

// Cross-tabulation of sMIPI x Ki-67 yields 4 MIPI-c groups with distinct OS
function classify(smipi, highKi67) {
  // Reference: Hoster E, Rosenwald A, Berger F, et al. JCO 2016
  // MIPI-c groups and median OS:
  if (smipi === 'low' && !highKi67) {
    return { group: 'Low', color: '#16a34a', os5yr: '85%', median: 'not reached' };
  }
  if (smipi === 'low' && highKi67) {
    return { group: 'Low-Intermediate', color: '#84cc16', os5yr: '72%', median: '~7-8 yrs' };
  }
  if (smipi === 'int' && !highKi67) {
    return { group: 'Low-Intermediate', color: '#84cc16', os5yr: '72%', median: '~7-8 yrs' };
  }
  if (smipi === 'int' && highKi67) {
    return { group: 'High-Intermediate', color: '#ea580c', os5yr: '43%', median: '~4-5 yrs' };
  }
  if (smipi === 'high' && !highKi67) {
    return { group: 'High-Intermediate', color: '#ea580c', os5yr: '43%', median: '~4-5 yrs' };
  }
  return { group: 'High', color: '#dc2626', os5yr: '17%', median: '~1.5 yrs' };
}

function MIPIcCalculator() {
  const [smipi, setSmipi] = useState('low');
  const [highKi67, setHighKi67] = useState(false);

  const risk = classify(smipi, highKi67);

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>MIPI-c Calculator</h3>
        <span className="calc-subtitle">Combined MIPI + Ki-67 for MCL (Hoster 2016)</span>
      </div>

      <div className="calc-factors">
        <div className="calc-factor-group">
          <div className="calc-factor-label-bold">Simplified MIPI group</div>
          <select value={smipi} onChange={(e) => setSmipi(e.target.value)}>
            {SMIPI_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <label className="calc-factor">
          <input
            type="checkbox"
            checked={highKi67}
            onChange={(e) => setHighKi67(e.target.checked)}
          />
          <span className="calc-factor-label">Ki-67 &ge; 30% (high proliferation)</span>
        </label>
      </div>

      <div className="calc-results">
        <div className="calc-risk-row">
          <span className="calc-risk-label">MIPI-c Risk:</span>
          <span className="calc-risk-badge" style={{ background: risk.color }}>
            {risk.group}
          </span>
          <span className="calc-risk-stat">5-yr OS ~{risk.os5yr}</span>
        </div>
        <div className="calc-note" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
          Median OS: {risk.median}. Ki-67 >=30% is a strong independent poor prognostic factor. MIPI-c provides better discrimination than sMIPI alone, especially separating intermediate-risk patients.
        </div>
      </div>

      <div className="calc-reference">
        Hoster E, Rosenwald A, Berger F, et al. Prognostic value of Ki-67 index, cytology, and growth pattern in mantle-cell lymphoma: results from randomized trials of the European MCL Network. <em>J Clin Oncol.</em> 2016;34(12):1386-1394. <a href="https://pubmed.ncbi.nlm.nih.gov/26926679/" target="_blank" rel="noopener noreferrer">PMID 26926679</a>
      </div>
    </div>
  );
}

export default MIPIcCalculator;
