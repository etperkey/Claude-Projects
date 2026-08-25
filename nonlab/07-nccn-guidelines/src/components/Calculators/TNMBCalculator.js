import { useState } from 'react';
import './Calculators.css';

const T_OPTIONS = [
  { value: 'T1a', label: 'T1a', desc: 'Patch only, <10% BSA' },
  { value: 'T1b', label: 'T1b', desc: 'Plaque ± patch, <10% BSA' },
  { value: 'T2a', label: 'T2a', desc: 'Patch only, ≥10% BSA' },
  { value: 'T2b', label: 'T2b', desc: 'Plaque ± patch, ≥10% BSA' },
  { value: 'T3',  label: 'T3',  desc: 'One or more tumors ≥1 cm' },
  { value: 'T4',  label: 'T4',  desc: 'Erythroderma ≥80% BSA' },
];

const N_OPTIONS = [
  { value: 'N0', label: 'N0', desc: 'No clinically abnormal lymph nodes' },
  { value: 'N1', label: 'N1', desc: 'Clinically abnormal; pathologically uninvolved' },
  { value: 'N2', label: 'N2', desc: 'Clinically abnormal; pathologically involved (early)' },
  { value: 'N3', label: 'N3', desc: 'Clinically abnormal; partial/complete effacement' },
];

const M_OPTIONS = [
  { value: 'M0', label: 'M0', desc: 'No visceral organ involvement' },
  { value: 'M1', label: 'M1', desc: 'Visceral involvement (pathology confirmed)' },
];

const B_OPTIONS = [
  { value: 'B0', label: 'B0', desc: 'No significant blood involvement (<5% Sezary cells)' },
  { value: 'B1', label: 'B1', desc: 'Low blood burden (>5% Sezary cells but not B2)' },
  { value: 'B2', label: 'B2', desc: 'High blood burden (≥1000/µL Sezary cells + positive clone)' },
];

function computeStage(T, N, M, B) {
  if (!T || !N || !M || !B) return null;

  // Simplify T to numeric tier
  const tNum = T.startsWith('T1') ? 1 : T.startsWith('T2') ? 2 : T === 'T3' ? 3 : 4;
  const nNum = parseInt(N[1]);
  const mNum = parseInt(M[1]);
  const bNum = parseInt(B[1]);

  if (mNum === 1) return 'IVB';
  if (nNum === 3) return 'IVA2';
  if (bNum === 2) return 'IVA1';

  if (tNum === 4 && nNum <= 2 && mNum === 0) {
    return bNum === 0 ? 'IIIA' : 'IIIB';
  }

  if (tNum === 3 && nNum <= 2 && mNum === 0 && bNum <= 1) return 'IIB';

  if ((tNum === 1 || tNum === 2) && (nNum === 1 || nNum === 2) && mNum === 0 && bNum <= 1) {
    return 'IIA';
  }

  if (tNum === 2 && nNum === 0 && mNum === 0 && bNum <= 1) return 'IB';
  if (tNum === 1 && nNum === 0 && mNum === 0 && bNum <= 1) return 'IA';

  return null;
}

const STAGE_CONFIG = {
  IA:   { color: '#16a34a', tier: 'Early',                prognosis: 'Median OS: >30 years' },
  IB:   { color: '#16a34a', tier: 'Early',                prognosis: 'Median OS: ~12–15 years' },
  IIA:  { color: '#ca8a04', tier: 'Early/Intermediate',   prognosis: 'Median OS: ~12–15 years' },
  IIB:  { color: '#ca8a04', tier: 'Early/Intermediate',   prognosis: 'Median OS: ~5 years' },
  IIIA: { color: '#ea580c', tier: 'Advanced',             prognosis: 'Median OS: ~4 years' },
  IIIB: { color: '#ea580c', tier: 'Advanced',             prognosis: 'Median OS: ~4 years' },
  IVA1: { color: '#dc2626', tier: 'Advanced',             prognosis: 'Median OS: ~2–3 years' },
  IVA2: { color: '#dc2626', tier: 'Advanced',             prognosis: 'Median OS: ~2–3 years' },
  IVB:  { color: '#dc2626', tier: 'Advanced',             prognosis: 'Median OS: ~2–3 years' },
};

function RadioGroup({ label, options, selected, onChange, groupName }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '6px', color: 'var(--color-text)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className="calc-factor"
            style={{
              background: selected === opt.value ? 'var(--color-bg)' : undefined,
              borderColor: selected === opt.value ? 'var(--color-primary)' : undefined,
            }}
          >
            <input
              type="radio"
              name={groupName}
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, minWidth: '32px', fontSize: 'var(--font-size-sm)' }}>{opt.label}</span>
              <span className="calc-factor-label" style={{ color: 'var(--color-text-secondary)' }}>{opt.desc}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TNMBCalculator() {
  const [T, setT] = useState(null);
  const [N, setN] = useState(null);
  const [M, setM] = useState(null);
  const [B, setB] = useState(null);

  const stage = computeStage(T, N, M, B);
  const config = stage ? STAGE_CONFIG[stage] : null;

  const allSelected = T && N && M && B;

  return (
    <div className="calculator">
      <div className="calc-header">
        <h3>TNMB Calculator</h3>
        <span className="calc-subtitle">MF/SS Staging — ISCL/EORTC Criteria</span>
      </div>

      <RadioGroup
        label="T — Skin Involvement"
        options={T_OPTIONS}
        selected={T}
        onChange={setT}
        groupName="tnmb-t"
      />

      <RadioGroup
        label="N — Lymph Node Involvement"
        options={N_OPTIONS}
        selected={N}
        onChange={setN}
        groupName="tnmb-n"
      />

      <RadioGroup
        label="M — Visceral Involvement"
        options={M_OPTIONS}
        selected={M}
        onChange={setM}
        groupName="tnmb-m"
      />

      <RadioGroup
        label="B — Blood Involvement"
        options={B_OPTIONS}
        selected={B}
        onChange={setB}
        groupName="tnmb-b"
      />

      {allSelected && (
        <div className="calc-results">
          {stage ? (
            <>
              <div className="calc-risk-row">
                <span className="calc-risk-label">TNMB:</span>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                  {T} {N} {M} {B}
                </span>
              </div>
              <div className="calc-risk-row">
                <span className="calc-risk-label">Stage:</span>
                <span className="calc-risk-badge" style={{ background: config.color, fontSize: 'var(--font-size-sm)', padding: '3px 14px' }}>
                  Stage {stage}
                </span>
                <span className="calc-risk-stat">{config.tier}</span>
              </div>
              <div className="calc-risk-row">
                <span className="calc-risk-label">Prognosis:</span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{config.prognosis}</span>
              </div>
              {(stage === 'IVA1' || stage === 'IVA2' || stage === 'IVB' || stage === 'IIIA' || stage === 'IIIB') && (
                <div className="calc-prophylaxis recommended">
                  Advanced-stage MF/SS — consider systemic therapy. If B2 with T4 erythroderma, evaluate for Sezary syndrome criteria.
                </div>
              )}
              {(stage === 'IA' || stage === 'IB') && (
                <div className="calc-prophylaxis not-recommended">
                  Early-stage MF — skin-directed therapy preferred. Avoid aggressive systemic treatment. Stage IA has median OS &gt;30 years.
                </div>
              )}
            </>
          ) : (
            <div className="calc-note">
              Unable to determine stage from this combination. Please verify T, N, M, B values.
            </div>
          )}
        </div>
      )}

      {!allSelected && (
        <div className="calc-note" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          Select one option for each of T, N, M, and B to compute stage.
        </div>
      )}

      <div className="calc-reference">
        Olsen EA et al. Blood. 2007;110(6):1713–1722. PMID: 17540844 (ISCL/EORTC staging criteria)
      </div>
    </div>
  );
}

export default TNMBCalculator;
