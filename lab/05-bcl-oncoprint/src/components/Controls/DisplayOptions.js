import React from 'react';
import { useFilter } from '../../context/FilterContext';
import DrugSelector from './DrugSelector';
import './DisplayOptions.css';

function DisplayOptions() {
  const {
    showCNV, toggleCNV, showSNV, toggleSNV, showCRISPR, toggleCRISPR,
    showRNAi, toggleRNAi, showExpression, toggleExpression,
    showProteomics, toggleProteomics, showDrugSensitivity, toggleDrugSensitivity
  } = useFilter();

  return (
    <div className="control-section display-options">
      <h3>Display Options</h3>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showSNV}
          onChange={toggleSNV}
        />
        <span className="toggle-label">Show SNV data</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showCNV}
          onChange={toggleCNV}
        />
        <span className="toggle-label">Show full CNV data</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showCRISPR}
          onChange={toggleCRISPR}
        />
        <span className="toggle-label">Show CRISPR dependency</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showRNAi}
          onChange={toggleRNAi}
        />
        <span className="toggle-label">Show RNAi dependency</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showExpression}
          onChange={toggleExpression}
        />
        <span className="toggle-label">Show gene expression</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showProteomics}
          onChange={toggleProteomics}
        />
        <span className="toggle-label">Show proteomics</span>
      </label>

      <label className="toggle-option">
        <input
          type="checkbox"
          checked={showDrugSensitivity}
          onChange={toggleDrugSensitivity}
        />
        <span className="toggle-label">Show drug sensitivity</span>
      </label>

      {showDrugSensitivity && <DrugSelector />}

      <div className="legend-note">
        <strong>GoF:</strong> missense at known cancer hotspot (excludes TSG hotspots)
        <br />
        <strong>LoF:</strong> frameshift, nonsense, splice — loss of function
        <br />
        <strong>Biallelic:</strong> high VAF ≥85%{showCNV && ' or mutation + CN loss'}
        <br />
        <strong>Fusion:</strong> IG-partner translocation (RNA-seq + curated literature)
        {showCNV && (
          <>
            <br />
            <strong>CN values:</strong> relative copy number (CN/ploidy); 1.0 = diploid normal
          </>
        )}
        {showCRISPR && (
          <>
            <br />
            <strong>CRISPR:</strong> red = essential (knockout kills), blue = loss helps growth (DepMap 24Q4 Chronos). Hatch = no data.
          </>
        )}
        {showRNAi && (
          <>
            <br />
            <strong>RNAi:</strong> red = essential (knockdown kills), blue = loss helps growth (DEMETER2). Hatch = no data. 10/94 lines screened.
          </>
        )}
        {showExpression && (
          <>
            <br />
            <strong>Expression:</strong> gray = not expressed, yellow → orange → red = increasing expression (DepMap 24Q4 RNA-seq, log2(TPM+1)). Hatch = no data.
          </>
        )}
        {showProteomics && (
          <>
            <br />
            <strong>Proteomics:</strong> blue = low protein, white = average, red = high protein (ProCan-DepMapSanger z-score). Hatch = no data.
          </>
        )}
        {showDrugSensitivity && (
          <>
            <br />
            <strong>Drug:</strong> red = sensitive (low AUC), white = neutral, blue = resistant (high AUC). Select a drug above. Hatch = no data.
          </>
        )}
      </div>
    </div>
  );
}

export default DisplayOptions;
