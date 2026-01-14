import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSemanticSearch } from '../context/SemanticSearchContext';
import { useApiKeys, AI_PROVIDERS, PROVIDER_NAMES, PROVIDER_CAPABILITIES } from '../context/ApiKeysContext';
import { researchProjects } from '../data/projects';

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';

// Content type configuration
const CONTENT_TYPE_CONFIG = {
  project: { label: 'Projects', icon: '📁', color: '#3498db' },
  task: { label: 'Tasks', icon: '✓', color: '#27ae60' },
  notebook: { label: 'Lab Notebook', icon: '📓', color: '#9b59b6' },
  reference: { label: 'Literature', icon: '📚', color: '#e67e22' },
  protocol: { label: 'Protocols', icon: '📋', color: '#1abc9c' },
  result: { label: 'Results', icon: '📊', color: '#e74c3c' },
  note: { label: 'Notes', icon: '📝', color: '#f39c12' }
};

function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [results, setResults] = useState({ keyword: [], semantic: [] });
  const [searchMode, setSearchMode] = useState('semantic'); // 'keyword' or 'semantic'
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const {
    openSettings,
    hasKeyForProvider,
    getAvailableProvidersForEmbeddings,
    embeddingsProvider
  } = useApiKeys();
  const {
    search,
    indexingStatus,
    embeddingsCount,
    indexAllContent,
    reindexAll,
    CONTENT_TYPES,
    hasAnyEmbeddingsProvider,
    currentEmbeddingsProvider
  } = useSemanticSearch();

  const [selectedEmbeddingsProvider, setSelectedEmbeddingsProvider] = useState(embeddingsProvider);

  // Check if semantic search is available
  const canUseSemanticSearch = hasAnyEmbeddingsProvider();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyword search (original implementation)
  const performKeywordSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      return [];
    }

    const lowerQuery = searchQuery.toLowerCase();
    const results = [];

    // Get all projects
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    const customProjectIds = new Set(customProjects.map(p => p.id));
    const allProjects = [...researchProjects, ...customProjects];

    // Search projects
    if (filter === 'all' || filter === 'project') {
      allProjects.forEach(p => {
        if (
          p.title.toLowerCase().includes(lowerQuery) ||
          p.subtitle?.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            id: `project-${p.id}`,
            contentType: 'project',
            contentId: p.id,
            projectId: p.id,
            title: p.title,
            subtitle: p.subtitle,
            projectTitle: p.title,
            color: p.color
          });
        }
      });
    }

    // Search tasks
    if (filter === 'all' || filter === 'task') {
      let savedTasks = {};
      try {
        const saved = localStorage.getItem(TASK_STORAGE_KEY);
        if (saved) savedTasks = JSON.parse(saved);
      } catch {}

      allProjects.forEach(project => {
        let projectTasks;
        if (customProjectIds.has(project.id)) {
          projectTasks = project.tasks;
        } else {
          projectTasks = savedTasks[project.id] || project.tasks;
        }
        if (!projectTasks) return;

        Object.entries(projectTasks).forEach(([column, tasks]) => {
          if (!Array.isArray(tasks)) return;
          tasks.forEach(task => {
            const matchesQuery =
              task.title.toLowerCase().includes(lowerQuery) ||
              task.description?.toLowerCase().includes(lowerQuery);

            const matchesPriority =
              priorityFilter === 'all' || task.priority === priorityFilter;

            if (matchesQuery && matchesPriority) {
              results.push({
                id: `task-${task.id}`,
                contentType: 'task',
                contentId: task.id,
                projectId: project.id,
                title: task.title,
                projectTitle: project.title,
                column,
                priority: task.priority
              });
            }
          });
        });
      });
    }

    return results;
  }, [filter, priorityFilter]);

  // Perform semantic search
  const performSemanticSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || !canUseSemanticSearch) {
      return [];
    }

    // Map filter to content types
    let contentTypes = null;
    if (filter !== 'all') {
      contentTypes = [filter];
    }

    setIsSearching(true);
    try {
      const results = await search(searchQuery, {
        contentTypes,
        limit: 30,
        threshold: 0.3
      });
      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [filter, canUseSemanticSearch, search]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ keyword: [], semantic: [] });
      return;
    }

    // Always do keyword search immediately
    const keywordResults = performKeywordSearch(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchMode === 'semantic' && canUseSemanticSearch) {
      setResults({ keyword: keywordResults, semantic: [] });

      // Debounce semantic search
      searchTimeoutRef.current = setTimeout(async () => {
        const semanticResults = await performSemanticSearch(query);
        setResults({ keyword: keywordResults, semantic: semanticResults });
      }, 500);
    } else {
      setResults({ keyword: keywordResults, semantic: [] });
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchMode, canUseSemanticSearch, performKeywordSearch, performSemanticSearch]);

  const handleResultClick = (result) => {
    if (result.contentType === 'project') {
      navigate(`/project/${result.contentId}`);
    } else {
      navigate(`/project/${result.projectId}`);
    }
    onClose();
  };

  const getDisplayResults = () => {
    if (searchMode === 'semantic' && canUseSemanticSearch && results.semantic.length > 0) {
      return results.semantic;
    }
    return results.keyword;
  };

  const displayResults = getDisplayResults();

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal semantic-search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={searchMode === 'semantic' ? "Search semantically across all content..." : "Search by keyword..."}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>
          <button className="search-close" onClick={onClose}>
            ESC
          </button>
        </div>

        {/* Search Mode Toggle */}
        <div className="search-mode-toggle">
          <button
            className={`mode-btn ${searchMode === 'keyword' ? 'active' : ''}`}
            onClick={() => setSearchMode('keyword')}
          >
            Keyword
          </button>
          <button
            className={`mode-btn ${searchMode === 'semantic' ? 'active' : ''}`}
            onClick={() => {
              if (!canUseSemanticSearch) {
                openSettings();
              } else {
                setSearchMode('semantic');
              }
            }}
            title={!canUseSemanticSearch ? 'Configure an API key for semantic search' : 'AI-powered semantic search'}
          >
            Semantic
            {!canUseSemanticSearch && <span className="mode-badge">Setup</span>}
          </button>

          {searchMode === 'semantic' && canUseSemanticSearch && (
            <div className="indexing-status">
              {indexingStatus.isIndexing ? (
                <span className="indexing-active">
                  {indexingStatus.currentType || `Indexing ${indexingStatus.progress}/${indexingStatus.total}...`}
                </span>
              ) : (
                <span className="indexing-count">
                  {embeddingsCount} items ({PROVIDER_NAMES[currentEmbeddingsProvider] || 'Unknown'})
                  <div className="provider-reindex-group">
                    <select
                      className="provider-select-mini"
                      value={selectedEmbeddingsProvider}
                      onChange={(e) => setSelectedEmbeddingsProvider(e.target.value)}
                      title="Select embeddings provider"
                    >
                      {Object.values(AI_PROVIDERS)
                        .filter(p => PROVIDER_CAPABILITIES[p]?.embeddings)
                        .map(provider => (
                          <option
                            key={provider}
                            value={provider}
                            disabled={!hasKeyForProvider(provider)}
                          >
                            {PROVIDER_NAMES[provider]}
                          </option>
                        ))}
                    </select>
                    <button
                      className="reindex-btn"
                      onClick={() => reindexAll(selectedEmbeddingsProvider)}
                      disabled={indexingStatus.isIndexing || !hasKeyForProvider(selectedEmbeddingsProvider)}
                      title={`Reindex with ${PROVIDER_NAMES[selectedEmbeddingsProvider]}`}
                    >
                      ↻
                    </button>
                  </div>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Type Filters */}
        <div className="search-filters">
          <div className="filter-group content-type-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => (
              <button
                key={type}
                className={`filter-btn ${filter === type ? 'active' : ''}`}
                onClick={() => setFilter(type)}
                title={config.label}
              >
                {config.icon}
              </button>
            ))}
          </div>

          {(filter === 'all' || filter === 'task') && (
            <div className="filter-group">
              <select
                className="priority-filter"
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>

        <div className="search-results">
          {!query && (
            <div className="search-placeholder">
              <p>
                {searchMode === 'semantic'
                  ? 'Search by meaning across all your research content'
                  : 'Start typing to search by keyword'}
              </p>
              <div className="search-tips">
                {searchMode === 'semantic' ? (
                  <span>💡 Try: "experiments about cell proliferation" or "papers on immunotherapy"</span>
                ) : (
                  <span>💡 Search by task title, project name, or description</span>
                )}
              </div>
            </div>
          )}

          {isSearching && (
            <div className="search-loading">
              <span className="loading-spinner">⟳</span>
              <span>Searching...</span>
            </div>
          )}

          {query && !isSearching && displayResults.length === 0 && (
            <div className="search-no-results">
              <p>No results found for "{query}"</p>
              {searchMode === 'semantic' && embeddingsCount === 0 && (
                <p className="no-results-hint">
                  No content indexed yet.
                  <button onClick={() => indexAllContent()}>Index now</button>
                </p>
              )}
            </div>
          )}

          {displayResults.length > 0 && (
            <div className="results-section semantic-results">
              <h3>
                {searchMode === 'semantic' && canUseSemanticSearch
                  ? `Semantic Results (${PROVIDER_NAMES[currentEmbeddingsProvider] || 'AI'})`
                  : 'Results'}
                ({displayResults.length})
              </h3>
              {displayResults.map((result, index) => {
                const typeConfig = CONTENT_TYPE_CONFIG[result.contentType] || {};
                return (
                  <div
                    key={result.id || index}
                    className="search-result-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <div
                      className="result-type-icon"
                      style={{ backgroundColor: typeConfig.color || '#666' }}
                      title={typeConfig.label}
                    >
                      {typeConfig.icon || '?'}
                    </div>
                    <div className="result-content">
                      <span className="result-title">{result.title}</span>
                      <span className="result-meta">
                        {result.projectTitle}
                        {result.column && ` • ${result.column}`}
                        {result.priority && (
                          <span className={`priority-badge ${result.priority}`}>
                            {result.priority}
                          </span>
                        )}
                      </span>
                    </div>
                    {result.similarity !== undefined && (
                      <div className="similarity-score" title="Relevance score">
                        {Math.round(result.similarity * 100)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
