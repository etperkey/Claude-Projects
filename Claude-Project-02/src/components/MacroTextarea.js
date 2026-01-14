import React, { useRef, useEffect } from 'react';
import { useTextMacros, MACRO_CATEGORIES } from '../hooks/useTextMacros';
import { useGoogleAuth } from '../context/GoogleAuthContext';

function MacroDropdown({
  filteredMacros,
  selectedIndex,
  onSelect,
  onMouseEnter,
  position
}) {
  const dropdownRef = useRef(null);

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current) {
      const selected = dropdownRef.current.querySelector('.macro-item.selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Group macros by category
  const groupedMacros = MACRO_CATEGORIES.map(cat => ({
    ...cat,
    macros: filteredMacros.filter(m => m.category === cat.id)
  })).filter(cat => cat.macros.length > 0);

  // If filtering, show flat list instead of grouped
  const isFiltering = filteredMacros.length < 20;

  return (
    <div
      className="macro-dropdown"
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: Math.min(position.top, window.innerHeight - 300),
        left: Math.min(position.left, window.innerWidth - 250),
        zIndex: 10000
      }}
    >
      <div className="macro-dropdown-header">
        <span className="macro-dropdown-title">@ Commands</span>
        <span className="macro-dropdown-hint">↑↓ navigate • Enter select • Esc close</span>
      </div>

      <div className="macro-dropdown-content">
        {isFiltering ? (
          // Flat list when filtering
          filteredMacros.map((macro, index) => (
            <div
              key={macro.trigger}
              className={`macro-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(macro)}
              onMouseEnter={() => onMouseEnter(index)}
            >
              <span className="macro-icon">{macro.icon}</span>
              <span className="macro-trigger">{macro.trigger}</span>
              <span className="macro-label">{macro.label}</span>
            </div>
          ))
        ) : (
          // Grouped list
          groupedMacros.map(category => (
            <div key={category.id} className="macro-category">
              <div className="macro-category-header">
                <span className="macro-category-icon">{category.icon}</span>
                <span className="macro-category-label">{category.label}</span>
              </div>
              {category.macros.map((macro) => {
                const globalIndex = filteredMacros.indexOf(macro);
                return (
                  <div
                    key={macro.trigger}
                    className={`macro-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(macro)}
                    onMouseEnter={() => onMouseEnter(globalIndex)}
                  >
                    <span className="macro-icon">{macro.icon}</span>
                    <span className="macro-trigger">{macro.trigger}</span>
                    <span className="macro-label">{macro.label}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {filteredMacros.length === 0 && (
          <div className="macro-empty">No matching commands</div>
        )}
      </div>
    </div>
  );
}

function MacroTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  projectName = null,
  ...props
}) {
  const textareaRef = useRef(null);
  const { user } = useGoogleAuth();

  // Context for macros
  const context = {
    userName: user?.name,
    userEmail: user?.email,
    projectName
  };

  const {
    showDropdown,
    setShowDropdown,
    dropdownPosition,
    filteredMacros,
    selectedIndex,
    setSelectedIndex,
    handleInputChange,
    handleKeyDown,
    handleMacroClick
  } = useTextMacros(textareaRef, value, onChange, context);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, setShowDropdown]);

  return (
    <div className="macro-textarea-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type @ for commands...'}
        className={`macro-textarea ${className}`}
        rows={rows}
        {...props}
      />

      {showDropdown && filteredMacros.length > 0 && (
        <MacroDropdown
          filteredMacros={filteredMacros}
          selectedIndex={selectedIndex}
          onSelect={handleMacroClick}
          onMouseEnter={setSelectedIndex}
          position={dropdownPosition}
        />
      )}
    </div>
  );
}

// Also export a simple input version
export function MacroInput({
  value,
  onChange,
  placeholder,
  className = '',
  projectName = null,
  ...props
}) {
  const inputRef = useRef(null);
  const { user } = useGoogleAuth();

  const context = {
    userName: user?.name,
    userEmail: user?.email,
    projectName
  };

  const {
    showDropdown,
    setShowDropdown,
    dropdownPosition,
    filteredMacros,
    selectedIndex,
    setSelectedIndex,
    handleInputChange,
    handleKeyDown,
    handleMacroClick
  } = useTextMacros(inputRef, value, onChange, context);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, setShowDropdown]);

  return (
    <div className="macro-input-wrapper">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type @ for commands...'}
        className={`macro-input ${className}`}
        {...props}
      />

      {showDropdown && filteredMacros.length > 0 && (
        <MacroDropdown
          filteredMacros={filteredMacros}
          selectedIndex={selectedIndex}
          onSelect={handleMacroClick}
          onMouseEnter={setSelectedIndex}
          position={dropdownPosition}
        />
      )}
    </div>
  );
}

export default MacroTextarea;
