import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { loadGuideline } from '../utils/guidelineLoader';
import { buildPageGraph, getPageList } from '../utils/graphUtils';

const GuidelineContext = createContext(null);

export function GuidelineProvider({ children }) {
  const { guidelineId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [guideline, setGuideline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mode = searchParams.get('mode') || 'flowchart';
  const currentPageId = searchParams.get('page') || null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadGuideline(guidelineId)
      .then((data) => {
        if (!cancelled) {
          setGuideline(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [guidelineId]);

  const pages = guideline ? getPageList(guideline) : [];
  const activePage = currentPageId || (pages.length > 0 ? pages[0].id : null);

  const { pageNodes, pageEdges } = guideline
    ? buildPageGraph(guideline.nodes, guideline.edges, activePage)
    : { pageNodes: [], pageEdges: [] };

  const setMode = useCallback((newMode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', newMode);
      return next;
    });
  }, [setSearchParams]);

  const setPage = useCallback((pageId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', pageId);
      return next;
    });
  }, [setSearchParams]);

  const value = {
    guidelineId,
    guideline,
    loading,
    error,
    mode,
    setMode,
    pages,
    activePage,
    setPage,
    pageNodes,
    pageEdges,
    allNodes: guideline?.nodes || [],
    allEdges: guideline?.edges || [],
  };

  return (
    <GuidelineContext.Provider value={value}>
      {children}
    </GuidelineContext.Provider>
  );
}

export function useGuideline() {
  const ctx = useContext(GuidelineContext);
  if (!ctx) throw new Error('useGuideline must be used within GuidelineProvider');
  return ctx;
}
