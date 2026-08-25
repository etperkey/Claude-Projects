import { useState, useCallback, useMemo } from 'react';

// Format helpers
const formatDate = (date, format = 'short') => {
  const options = {
    short: { month: 'numeric', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    iso: null // Special case
  };

  if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }

  return date.toLocaleDateString('en-US', options[format] || options.short);
};

const formatTime = (date, format = '12h') => {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Get relative dates
const getRelativeDate = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
};

const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date;
};

const getEndOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (6 - day));
  return date;
};

const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date;
};

const getEndOfMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date;
};

// Define all available macros
export const TEXT_MACROS = [
  // Date macros
  {
    trigger: '@today',
    label: 'Today\'s date',
    category: 'dates',
    icon: '📅',
    getValue: () => formatDate(new Date())
  },
  {
    trigger: '@tomorrow',
    label: 'Tomorrow\'s date',
    category: 'dates',
    icon: '📅',
    getValue: () => formatDate(getRelativeDate(1))
  },
  {
    trigger: '@yesterday',
    label: 'Yesterday\'s date',
    category: 'dates',
    icon: '📅',
    getValue: () => formatDate(getRelativeDate(-1))
  },
  {
    trigger: '@date-iso',
    label: 'Today (ISO format)',
    category: 'dates',
    icon: '📅',
    getValue: () => formatDate(new Date(), 'iso')
  },
  {
    trigger: '@date-long',
    label: 'Today (long format)',
    category: 'dates',
    icon: '📅',
    getValue: () => formatDate(new Date(), 'long')
  },

  // Time macros
  {
    trigger: '@now',
    label: 'Current time',
    category: 'time',
    icon: '🕐',
    getValue: () => formatTime(new Date())
  },
  {
    trigger: '@time-24',
    label: 'Current time (24h)',
    category: 'time',
    icon: '🕐',
    getValue: () => formatTime(new Date(), '24h')
  },
  {
    trigger: '@datetime',
    label: 'Date and time',
    category: 'time',
    icon: '🕐',
    getValue: () => `${formatDate(new Date())} ${formatTime(new Date())}`
  },
  {
    trigger: '@timestamp',
    label: 'ISO timestamp',
    category: 'time',
    icon: '🕐',
    getValue: () => new Date().toISOString()
  },

  // Week/Month macros
  {
    trigger: '@week',
    label: 'Week number',
    category: 'calendar',
    icon: '📆',
    getValue: () => {
      const date = new Date();
      const start = new Date(date.getFullYear(), 0, 1);
      const diff = date - start;
      const oneWeek = 1000 * 60 * 60 * 24 * 7;
      return `Week ${Math.ceil(diff / oneWeek)}`;
    }
  },
  {
    trigger: '@month',
    label: 'Current month',
    category: 'calendar',
    icon: '📆',
    getValue: () => new Date().toLocaleDateString('en-US', { month: 'long' })
  },
  {
    trigger: '@year',
    label: 'Current year',
    category: 'calendar',
    icon: '📆',
    getValue: () => new Date().getFullYear().toString()
  },
  {
    trigger: '@quarter',
    label: 'Current quarter',
    category: 'calendar',
    icon: '📆',
    getValue: () => `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
  },

  // Date ranges
  {
    trigger: '@this-week',
    label: 'This week range',
    category: 'ranges',
    icon: '📊',
    getValue: () => `${formatDate(getStartOfWeek())} - ${formatDate(getEndOfWeek())}`
  },
  {
    trigger: '@this-month',
    label: 'This month range',
    category: 'ranges',
    icon: '📊',
    getValue: () => `${formatDate(getStartOfMonth())} - ${formatDate(getEndOfMonth())}`
  },
  {
    trigger: '@next-week',
    label: 'Next week date',
    category: 'ranges',
    icon: '📊',
    getValue: () => formatDate(getRelativeDate(7))
  },
  {
    trigger: '@next-month',
    label: 'Next month date',
    category: 'ranges',
    icon: '📊',
    getValue: () => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      return formatDate(date);
    }
  },

  // Research-specific
  {
    trigger: '@exp-id',
    label: 'Experiment ID',
    category: 'research',
    icon: '🧪',
    getValue: () => `EXP-${formatDate(new Date(), 'iso').replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  },
  {
    trigger: '@sample-id',
    label: 'Sample ID',
    category: 'research',
    icon: '🧫',
    getValue: () => `S${Date.now().toString(36).toUpperCase()}`
  },
  {
    trigger: '@batch',
    label: 'Batch number',
    category: 'research',
    icon: '📦',
    getValue: () => `BATCH-${formatDate(new Date(), 'iso')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
  },
  {
    trigger: '@protocol-ver',
    label: 'Protocol version',
    category: 'research',
    icon: '📋',
    getValue: () => `v${new Date().getFullYear()}.${new Date().getMonth() + 1}.1`
  },

  // Utility
  {
    trigger: '@uuid',
    label: 'Generate UUID',
    category: 'utility',
    icon: '🔑',
    getValue: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  },
  {
    trigger: '@random',
    label: 'Random number',
    category: 'utility',
    icon: '🎲',
    getValue: () => Math.floor(Math.random() * 10000).toString()
  },
  {
    trigger: '@checkbox',
    label: 'Empty checkbox',
    category: 'utility',
    icon: '☑️',
    getValue: () => '[ ] '
  },
  {
    trigger: '@checked',
    label: 'Checked checkbox',
    category: 'utility',
    icon: '✅',
    getValue: () => '[x] '
  },
  {
    trigger: '@bullet',
    label: 'Bullet point',
    category: 'utility',
    icon: '•',
    getValue: () => '• '
  },
  {
    trigger: '@divider',
    label: 'Section divider',
    category: 'utility',
    icon: '➖',
    getValue: () => '\n---\n'
  }
];

// Categories for grouping in UI
export const MACRO_CATEGORIES = [
  { id: 'dates', label: 'Dates', icon: '📅' },
  { id: 'time', label: 'Time', icon: '🕐' },
  { id: 'calendar', label: 'Calendar', icon: '📆' },
  { id: 'ranges', label: 'Date Ranges', icon: '📊' },
  { id: 'research', label: 'Research', icon: '🧪' },
  { id: 'utility', label: 'Utility', icon: '🔧' }
];

// Hook for text macro functionality
export function useTextMacros(inputRef, value, onChange, context = {}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get macros with context-aware values (e.g., user name, project name)
  const macrosWithContext = useMemo(() => {
    const contextMacros = [];

    if (context.userName) {
      contextMacros.push({
        trigger: '@me',
        label: 'Your name',
        category: 'utility',
        icon: '👤',
        getValue: () => context.userName
      });
    }

    if (context.userEmail) {
      contextMacros.push({
        trigger: '@email',
        label: 'Your email',
        category: 'utility',
        icon: '📧',
        getValue: () => context.userEmail
      });
    }

    if (context.projectName) {
      contextMacros.push({
        trigger: '@project',
        label: 'Project name',
        category: 'utility',
        icon: '📁',
        getValue: () => context.projectName
      });
    }

    return [...contextMacros, ...TEXT_MACROS];
  }, [context]);

  // Filter macros based on input
  const filteredMacros = useMemo(() => {
    if (!filterText) return macrosWithContext;

    const search = filterText.toLowerCase();
    return macrosWithContext.filter(macro =>
      macro.trigger.toLowerCase().includes(search) ||
      macro.label.toLowerCase().includes(search)
    );
  }, [filterText, macrosWithContext]);

  // Detect @ trigger and show dropdown
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Find if we're typing after an @
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setFilterText(atMatch[0]);
      setShowDropdown(true);
      setSelectedIndex(0);

      // Calculate dropdown position
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        // Rough calculation - could be improved with a hidden span
        const lineHeight = 24;
        const charWidth = 8;
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const currentCol = lines[lines.length - 1].length;

        setDropdownPosition({
          top: rect.top + (currentLine * lineHeight) + lineHeight + window.scrollY,
          left: rect.left + (currentCol * charWidth) + window.scrollX
        });
      }
    } else {
      setShowDropdown(false);
      setFilterText('');
    }

    onChange(newValue);
  }, [onChange, inputRef]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredMacros.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (filteredMacros.length > 0) {
          e.preventDefault();
          insertMacro(filteredMacros[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  }, [showDropdown, filteredMacros, selectedIndex]);

  // Insert selected macro
  const insertMacro = useCallback((macro) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);

    // Find the @ position
    const atMatch = textBeforeCursor.match(/@\w*$/);
    if (!atMatch) return;

    const atPos = cursorPos - atMatch[0].length;
    const macroValue = macro.getValue();

    const newValue = value.slice(0, atPos) + macroValue + textAfterCursor;
    onChange(newValue);

    // Set cursor position after inserted value
    setTimeout(() => {
      const newCursorPos = atPos + macroValue.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);

    setShowDropdown(false);
    setFilterText('');
  }, [value, onChange, inputRef]);

  // Click handler for dropdown items
  const handleMacroClick = useCallback((macro) => {
    insertMacro(macro);
  }, [insertMacro]);

  return {
    showDropdown,
    setShowDropdown,
    dropdownPosition,
    filteredMacros,
    selectedIndex,
    setSelectedIndex,
    handleInputChange,
    handleKeyDown,
    handleMacroClick,
    macrosWithContext
  };
}

// Simple utility to replace all macros in text (for non-interactive use)
export function expandMacros(text, context = {}) {
  let result = text;

  // Add context macros
  const allMacros = [...TEXT_MACROS];
  if (context.userName) {
    allMacros.push({ trigger: '@me', getValue: () => context.userName });
  }
  if (context.userEmail) {
    allMacros.push({ trigger: '@email', getValue: () => context.userEmail });
  }
  if (context.projectName) {
    allMacros.push({ trigger: '@project', getValue: () => context.projectName });
  }

  // Sort by trigger length (longest first) to avoid partial replacements
  allMacros.sort((a, b) => b.trigger.length - a.trigger.length);

  for (const macro of allMacros) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(macro.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\w)', 'g');
    result = result.replace(regex, macro.getValue());
  }

  return result;
}

export default useTextMacros;
