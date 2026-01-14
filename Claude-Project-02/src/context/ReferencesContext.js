import React, { createContext, useContext, useState, useEffect } from 'react';

const LITERATURE_KEY = 'research-dashboard-literature';

const ReferencesContext = createContext();

export function ReferencesProvider({ children }) {
  const [allReferences, setAllReferences] = useState({});

  // Load all references from localStorage
  useEffect(() => {
    const loadReferences = () => {
      const saved = localStorage.getItem(LITERATURE_KEY);
      if (saved) {
        try {
          setAllReferences(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load references:', e);
        }
      }
    };

    loadReferences();

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === LITERATURE_KEY) {
        loadReferences();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-tab updates
    const handleRefUpdate = () => loadReferences();
    window.addEventListener('references-updated', handleRefUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('references-updated', handleRefUpdate);
    };
  }, []);

  // Get references for a specific project
  const getProjectReferences = (projectId) => {
    return allReferences[projectId] || [];
  };

  // Get all references across all projects
  const getAllReferences = () => {
    return Object.entries(allReferences).flatMap(([projectId, refs]) =>
      refs.map(ref => ({ ...ref, projectId }))
    );
  };

  // Format citation in AMA style
  const formatCitation = (ref, includeNumber = false, number = null) => {
    let citation = '';

    if (ref.authors) {
      const authorList = ref.authors.split(', ');
      if (authorList.length > 3) {
        citation += `${authorList.slice(0, 3).join(', ')}, et al`;
      } else {
        citation += ref.authors;
      }
      citation += '. ';
    }

    if (ref.title) {
      citation += ref.title;
      if (!ref.title.endsWith('.') && !ref.title.endsWith('?')) {
        citation += '.';
      }
      citation += ' ';
    }

    if (ref.journal) {
      citation += `${ref.journal}. `;
    }

    if (ref.year) {
      citation += ref.year;
      if (ref.volume) {
        citation += `;${ref.volume}`;
        if (ref.pages) {
          citation += `:${ref.pages}`;
        }
      }
      citation += '.';
    }

    if (ref.doi) {
      citation += ` doi:${ref.doi}`;
    }

    if (includeNumber && number !== null) {
      return `${number}. ${citation.trim()}`;
    }

    return citation.trim();
  };

  // Search references by query
  const searchReferences = (projectId, query) => {
    const refs = getProjectReferences(projectId);
    if (!query.trim()) return refs;

    const lowerQuery = query.toLowerCase();
    return refs.filter(ref =>
      ref.title?.toLowerCase().includes(lowerQuery) ||
      ref.authors?.toLowerCase().includes(lowerQuery) ||
      ref.year?.includes(query) ||
      ref.pmid?.includes(query)
    );
  };

  // Notify that references were updated
  const notifyUpdate = () => {
    window.dispatchEvent(new Event('references-updated'));
  };

  return (
    <ReferencesContext.Provider value={{
      allReferences,
      getProjectReferences,
      getAllReferences,
      formatCitation,
      searchReferences,
      notifyUpdate
    }}>
      {children}
    </ReferencesContext.Provider>
  );
}

export function useReferences() {
  const context = useContext(ReferencesContext);
  if (!context) {
    throw new Error('useReferences must be used within a ReferencesProvider');
  }
  return context;
}

export default ReferencesContext;
