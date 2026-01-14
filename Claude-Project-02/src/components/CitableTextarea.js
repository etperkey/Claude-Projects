import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useReferences } from '../context/ReferencesContext';

function CitableTextarea({
  value,
  onChange,
  projectId,
  placeholder,
  rows = 4,
  className = '',
  ...props
}) {
  const { getProjectReferences, formatCitation } = useReferences();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerType, setTriggerType] = useState(null); // 'cite', 'bracket', or 'refs'
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  const references = getProjectReferences(projectId);

  // Parse existing citations in the text and build a map of ref ID -> appearance order
  const citationMap = useMemo(() => {
    if (!value) return { order: [], refToNum: {}, numToRef: {} };

    // Find all [refId:XXX] markers in the text
    const citationRegex = /\[refId:([^\]]+)\]/g;
    const order = [];
    const refToNum = {};
    let match;

    while ((match = citationRegex.exec(value)) !== null) {
      const refId = match[1];
      if (!refToNum[refId]) {
        order.push(refId);
        refToNum[refId] = order.length;
      }
    }

    // Also build reverse map
    const numToRef = {};
    order.forEach((refId, idx) => {
      numToRef[idx + 1] = refId;
    });

    return { order, refToNum, numToRef };
  }, [value]);

  // Get the display number for a reference (order of first appearance, or next available)
  const getDisplayNumber = (refId) => {
    if (citationMap.refToNum[refId]) {
      return citationMap.refToNum[refId];
    }
    // New citation, will be next number
    return citationMap.order.length + 1;
  };

  // Detect @cite, [@, or @refs trigger
  const detectTrigger = (text, cursorPos) => {
    const beforeCursor = text.substring(0, cursorPos);

    // Check for @refs or @references to insert reference list
    const refsTriggerMatch = beforeCursor.match(/@refs?$/i) || beforeCursor.match(/@references?$/i);
    if (refsTriggerMatch) {
      return { type: 'refs', query: '', fullMatch: refsTriggerMatch[0] };
    }

    // Look for @cite: or [@
    const citeTriggerMatch = beforeCursor.match(/@cite:(\S*)$/i);
    const bracketTriggerMatch = beforeCursor.match(/\[@(\S*)$/);

    if (citeTriggerMatch) {
      return { type: 'cite', query: citeTriggerMatch[1], fullMatch: citeTriggerMatch[0] };
    }
    if (bracketTriggerMatch) {
      return { type: 'bracket', query: bracketTriggerMatch[1], fullMatch: bracketTriggerMatch[0] };
    }
    return null;
  };

  // Filter references based on query
  const filterReferences = (query) => {
    if (!query) return references.slice(0, 10);

    const lowerQuery = query.toLowerCase();
    return references.filter(ref =>
      ref.title?.toLowerCase().includes(lowerQuery) ||
      ref.authors?.toLowerCase().includes(lowerQuery) ||
      ref.year?.includes(query) ||
      ref.pmid?.includes(query)
    ).slice(0, 10);
  };

  // Handle text change
  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(e);

    const trigger = detectTrigger(newValue, cursorPos);

    if (trigger) {
      setTriggerType(trigger.type);

      if (trigger.type === 'refs') {
        // Show option to insert reference list
        setSuggestions([{ type: 'insert-refs', label: 'Insert Reference List' }]);
        setSelectedIndex(0);
        setShowSuggestions(true);
        setSearchQuery('');
      } else if (references.length > 0) {
        const filtered = filterReferences(trigger.query);
        setSuggestions(filtered);
        setSearchQuery(trigger.query);
        setSelectedIndex(0);
        setShowSuggestions(filtered.length > 0);
      }

      // Calculate position for suggestions dropdown
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const lines = newValue.substring(0, cursorPos).split('\n');
        const currentLine = lines.length - 1;

        setTriggerPosition({
          top: rect.top + (currentLine * lineHeight) + lineHeight + window.scrollY,
          left: rect.left + 10
        });
      }
    } else {
      setShowSuggestions(false);
      setTriggerType(null);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (triggerType === 'refs') {
          insertReferenceList();
        } else if (suggestions[selectedIndex]) {
          insertCitation(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Insert citation at cursor with order-based numbering
  const insertCitation = (ref) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = value;

    const trigger = detectTrigger(text, cursorPos);
    if (!trigger) return;

    const beforeTrigger = text.substring(0, cursorPos - trigger.fullMatch.length);
    const afterCursor = text.substring(cursorPos);

    // Get the display number (order of appearance)
    const displayNum = getDisplayNumber(ref.id);

    // Insert as [N] with hidden marker for tracking: [N][refId:XXX]
    // The refId marker is hidden/stripped when displaying but used for tracking
    const insertion = `[${displayNum}][refId:${ref.id}]`;

    const newValue = beforeTrigger + insertion + afterCursor;
    const newCursorPos = beforeTrigger.length + insertion.length;

    const syntheticEvent = {
      target: { value: newValue, selectionStart: newCursorPos }
    };
    onChange(syntheticEvent);

    setShowSuggestions(false);

    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }
    }, 0);
  };

  // Insert reference list at cursor
  const insertReferenceList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = value;

    const trigger = detectTrigger(text, cursorPos);
    if (!trigger) return;

    const beforeTrigger = text.substring(0, cursorPos - trigger.fullMatch.length);
    const afterCursor = text.substring(cursorPos);

    // Build the reference list based on order of appearance
    let refList = '\n\nReferences:\n';

    if (citationMap.order.length === 0) {
      refList += '(No citations in this text yet)\n';
    } else {
      citationMap.order.forEach((refId, index) => {
        const ref = references.find(r => r.id === refId);
        if (ref) {
          refList += `${index + 1}. ${formatCitation(ref)}\n`;
        }
      });
    }

    const newValue = beforeTrigger + refList + afterCursor;
    const newCursorPos = beforeTrigger.length + refList.length;

    const syntheticEvent = {
      target: { value: newValue, selectionStart: newCursorPos }
    };
    onChange(syntheticEvent);

    setShowSuggestions(false);

    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }
    }, 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get short author name
  const getShortAuthor = (authors) => {
    if (!authors) return 'Unknown';
    const firstAuthor = authors.split(',')[0].trim();
    return firstAuthor.length > 20 ? firstAuthor.substring(0, 20) + '...' : firstAuthor;
  };

  // Format value for display (hide refId markers)
  const displayValue = value?.replace(/\[refId:[^\]]+\]/g, '') || '';

  return (
    <div className="citable-textarea-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type @cite: or [@ to insert a citation, @refs to insert reference list..."}
        rows={rows}
        className={`citable-textarea ${className}`}
        {...props}
      />

      {references.length > 0 && (
        <div className="citation-hint">
          <code>@cite:</code> or <code>[@</code> to cite • <code>@refs</code> to insert reference list
          {citationMap.order.length > 0 && (
            <span className="citation-count"> • {citationMap.order.length} citation{citationMap.order.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="citation-suggestions"
          style={{
            position: 'fixed',
            top: triggerPosition.top,
            left: triggerPosition.left,
            zIndex: 9999
          }}
        >
          {triggerType === 'refs' ? (
            <>
              <div className="suggestions-header">Insert Reference List</div>
              <div
                className="suggestion-item selected refs-insert"
                onClick={insertReferenceList}
              >
                <span className="suggestion-icon">📚</span>
                <div className="suggestion-content">
                  <span className="suggestion-title">
                    Insert {citationMap.order.length} reference{citationMap.order.length !== 1 ? 's' : ''} in citation order
                  </span>
                </div>
              </div>
              <div className="suggestions-footer">
                Enter to insert • Esc to cancel
              </div>
            </>
          ) : (
            <>
              <div className="suggestions-header">
                Select reference {searchQuery && `(matching "${searchQuery}")`}
              </div>
              {suggestions.map((ref, index) => {
                const displayNum = getDisplayNumber(ref.id);
                const isAlreadyCited = citationMap.refToNum[ref.id];
                return (
                  <div
                    key={ref.id}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''} ${isAlreadyCited ? 'already-cited' : ''}`}
                    onClick={() => insertCitation(ref)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="suggestion-number">[{displayNum}]</span>
                    <div className="suggestion-content">
                      <span className="suggestion-author">{getShortAuthor(ref.authors)}</span>
                      {ref.year && <span className="suggestion-year">({ref.year})</span>}
                      <span className="suggestion-title">{ref.title?.substring(0, 60)}{ref.title?.length > 60 ? '...' : ''}</span>
                    </div>
                    {isAlreadyCited && <span className="already-cited-badge">cited</span>}
                  </div>
                );
              })}
              <div className="suggestions-footer">
                ↑↓ Navigate • Enter/Tab Select • Esc Close
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CitableTextarea;
