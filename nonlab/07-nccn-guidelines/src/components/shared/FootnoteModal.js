import { useGuideline } from '../../context/GuidelineContext';
import './FootnoteModal.css';

function FootnoteModal({ footnoteRefs, onClose }) {
  const { guideline } = useGuideline();

  if (!footnoteRefs || footnoteRefs.length === 0) return null;

  return (
    <div className="footnote-overlay" onClick={onClose}>
      <div className="footnote-modal" onClick={(e) => e.stopPropagation()}>
        <div className="footnote-modal-header">
          <h3>Footnotes</h3>
          <button className="footnote-close" onClick={onClose}>&times;</button>
        </div>
        <div className="footnote-modal-body">
          {footnoteRefs.map((ref) => (
            <div key={ref} className="footnote-item">
              <span className="footnote-ref">{ref}</span>
              <span className="footnote-text">
                {guideline?.footnotes?.[ref] || 'Footnote not found'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FootnoteModal;
