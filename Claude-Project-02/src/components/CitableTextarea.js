import React, { useState, useRef, useEffect } from 'react';
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
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  const references = getProjectReferences(projectId);

  // Detect @cite or [@ trigger
  const detectTrigger = (text, cursorPos) => {
    const beforeCursor = text.substring(0, cursorPos);

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

    if (trigger && references.length > 0) {
      const filtered = filterReferences(trigger.query);
      setSuggestions(filtered);
      setSearchQuery(trigger.query);
      setSelectedIndex(0);
      setShowSuggestions(filtered.length > 0);

      // Calculate position for suggestions dropdown
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();

        // Rough estimate of cursor position
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
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertCitation(suggestions[selectedIndex], selectedIndex);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Insert citation at cursor
  const insertCitation = (ref, index) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = value;

    const trigger = detectTrigger(text, cursorPos);
    if (!trigger) return;

    const beforeTrigger = text.substring(0, cursorPos - trigger.fullMatch.length);
    const afterCursor = text.substring(cursorPos);

    // Format the citation insertion
    const refNumber = references.findIndex(r => r.id === ref.id) + 1;
    let insertion;

    if (trigger.type === 'bracket') {
      // Insert as [1] style
      insertion = `[${refNumber}]`;
    } else {
      // Insert as inline citation
      insertion = `[${refNumber}]`;
    }

    const newValue = beforeTrigger + insertion + afterCursor;
    const newCursorPos = beforeTrigger.length + insertion.length;

    // Update the value
    const syntheticEvent = {
      target: { value: newValue, selectionStart: newCursorPos }
    };
    onChange(syntheticEvent);

    setShowSuggestions(false);

    // Set cursor position after React updates
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

  return (
    <div className="citable-textarea-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type @cite: or [@ to insert a citation..."}
        rows={rows}
        className={`citable-textarea ${className}`}
        {...props}
      />

      {references.length > 0 && (
        <div className="citation-hint">
          Type <code>@cite:</code> or <code>[@</code> to cite a reference
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
          <div className="suggestions-header">
            Select reference {searchQuery && `(matching "${searchQuery}")`}
          </div>
          {suggestions.map((ref, index) => {
            const refNumber = references.findIndex(r => r.id === ref.id) + 1;
            return (
              <div
                key={ref.id}
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => insertCitation(ref, index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="suggestion-number">[{refNumber}]</span>
                <div className="suggestion-content">
                  <span className="suggestion-author">{getShortAuthor(ref.authors)}</span>
                  {ref.year && <span className="suggestion-year">({ref.year})</span>}
                  <span className="suggestion-title">{ref.title?.substring(0, 60)}{ref.title?.length > 60 ? '...' : ''}</span>
                </div>
              </div>
            );
          })}
          <div className="suggestions-footer">
            ↑↓ Navigate • Enter/Tab Select • Esc Close
          </div>
        </div>
      )}
    </div>
  );
}

export default CitableTextarea;
