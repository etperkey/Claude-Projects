import { findNode } from '../../utils/graphUtils';
import './CaseSummary.css';

/**
 * Generate a narrative case summary from the walker path.
 */
function generateSummary(pathSteps, allNodes, wasStopped) {
  const sections = {
    diagnosis: [],
    workup: [],
    decisions: [],
    treatment: [],
    response: [],
    surveillance: [],
  };

  pathSteps.forEach((step) => {
    const node = findNode(allNodes, step.nodeId);
    if (!node) return;

    switch (node.type) {
      case 'diagnosis':
        sections.diagnosis.push(node.label);
        break;
      case 'workup':
        sections.workup.push(node.label + (node.detail ? `: ${node.detail}` : ''));
        break;
      case 'decision': {
        const chosen = node.options?.[step.selectedOption];
        if (chosen) {
          sections.decisions.push({
            question: node.label,
            answer: chosen.label,
            detail: chosen.description,
          });
        }
        break;
      }
      case 'treatment':
        sections.treatment.push({
          label: node.label,
          detail: node.detail,
          category: node.category,
        });
        break;
      case 'response':
        sections.response.push(node.label + (node.detail ? `: ${node.detail}` : ''));
        break;
      case 'surveillance':
        sections.surveillance.push(node.label + (node.detail ? `: ${node.detail}` : ''));
        break;
      default:
        break;
    }
  });

  return { sections, wasStopped };
}

function buildExportText(summary, pathSteps, guidelineName) {
  const title = `NCCN ${guidelineName || 'Guideline'} Decision Path Summary`;
  const lines = [title, '='.repeat(title.length), ''];

  if (summary.sections.diagnosis.length > 0) {
    lines.push('DIAGNOSIS:', ...summary.sections.diagnosis.map((d) => `  ${d}`), '');
  }

  if (summary.sections.workup.length > 0) {
    lines.push('WORKUP:', ...summary.sections.workup.map((w) => `  ${w}`), '');
  }

  if (summary.sections.decisions.length > 0) {
    lines.push('CLINICAL DECISIONS:');
    summary.sections.decisions.forEach((d) => {
      lines.push(`  ${d.question} -> ${d.answer}`);
    });
    lines.push('');
  }

  if (summary.sections.treatment.length > 0) {
    lines.push('TREATMENT:');
    summary.sections.treatment.forEach((t) => {
      lines.push(`  ${t.label}${t.category ? ` (Cat ${t.category})` : ''}`);
    });
    lines.push('');
  }

  if (summary.sections.response.length > 0) {
    lines.push('RESPONSE:', ...summary.sections.response.map((r) => `  ${r}`), '');
  }

  if (summary.sections.surveillance.length > 0) {
    lines.push('FOLLOW-UP:', ...summary.sections.surveillance.map((s) => `  ${s}`), '');
  }

  if (summary.wasStopped) {
    lines.push('---', 'Note: Pathway was stopped before reaching a terminal step.', '');
  }

  lines.push('---', `Steps taken: ${pathSteps.length}`, `Generated: ${new Date().toLocaleDateString()}`);
  return lines.join('\n');
}

function CaseSummary({ pathSteps, allNodes, wasStopped, onRestart, guidelineName }) {
  const summary = generateSummary(pathSteps, allNodes, wasStopped);

  const handleExport = () => {
    const text = buildExportText(summary, pathSteps, guidelineName);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (guidelineName || 'guideline').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `nccn-${slug}-case-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { sections } = summary;

  return (
    <div className="case-summary">
      <div className="case-summary-header">
        <h2>Case Summary</h2>
        {wasStopped && (
          <span className="case-summary-badge stopped">Stopped early</span>
        )}
        {!wasStopped && (
          <span className="case-summary-badge complete">Pathway complete</span>
        )}
      </div>

      {sections.diagnosis.length > 0 && (
        <div className="case-section">
          <h3>Diagnosis</h3>
          <ul>
            {sections.diagnosis.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {sections.workup.length > 0 && (
        <div className="case-section">
          <h3>Workup</h3>
          <ul>
            {sections.workup.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {sections.decisions.length > 0 && (
        <div className="case-section">
          <h3>Clinical Decisions</h3>
          <div className="case-decisions">
            {sections.decisions.map((d, i) => (
              <div key={i} className="case-decision-item">
                <span className="case-decision-q">{d.question}</span>
                <span className="case-decision-arrow">&rarr;</span>
                <span className="case-decision-a">{d.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sections.treatment.length > 0 && (
        <div className="case-section">
          <h3>Treatment</h3>
          <ul>
            {sections.treatment.map((t, i) => (
              <li key={i}>
                <strong>{t.label}</strong>
                {t.category && <span className="case-cat-badge">Cat {t.category}</span>}
                {t.detail && <p className="case-treatment-detail">{t.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.response.length > 0 && (
        <div className="case-section">
          <h3>Response Assessment</h3>
          <ul>
            {sections.response.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {sections.surveillance.length > 0 && (
        <div className="case-section">
          <h3>Follow-up</h3>
          <ul>
            {sections.surveillance.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="case-summary-actions">
        <button className="case-action-btn primary" onClick={handleExport}>
          Export Summary
        </button>
        <button className="case-action-btn" onClick={onRestart}>
          Start New Case
        </button>
      </div>
    </div>
  );
}

export default CaseSummary;
