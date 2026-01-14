import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useApiKeys, AI_PROVIDERS, PROVIDER_NAMES, PROVIDER_CAPABILITIES } from './ApiKeysContext';
import * as openaiApi from '../utils/openaiEmbeddings';
import * as geminiApi from '../utils/geminiApi';
import { findTopKSimilar, generateChecksum } from '../utils/openaiEmbeddings';
import {
  initDatabase,
  storeEmbeddingsBatch,
  getAllEmbeddings,
  clearAllEmbeddings,
  getEmbeddingsMetadata,
  hasValidEmbedding
} from '../utils/embeddingsDb';
import { researchProjects } from '../data/projects';

const SemanticSearchContext = createContext(null);

const CUSTOM_PROJECTS_KEY = 'research-dashboard-custom-projects';
const TASK_STORAGE_KEY = 'research-dashboard-tasks';
const NOTEBOOK_KEY = 'research-dashboard-lab-notebook';
const LITERATURE_KEY = 'research-dashboard-literature';
const PROTOCOLS_KEY = 'research-dashboard-protocols';
const RESULTS_KEY = 'research-dashboard-results';
const RESEARCH_NOTES_KEY = 'research-dashboard-research-notes';
const EMBEDDINGS_PROVIDER_KEY = 'research-dashboard-embeddings-provider';

// Content type definitions
const CONTENT_TYPES = {
  PROJECT: 'project',
  TASK: 'task',
  NOTEBOOK: 'notebook',
  REFERENCE: 'reference',
  PROTOCOL: 'protocol',
  RESULT: 'result',
  NOTE: 'note'
};

// Get API module for provider
const getApiModule = (provider) => {
  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return openaiApi;
    case AI_PROVIDERS.GEMINI:
      return geminiApi;
    default:
      return openaiApi;
  }
};

export function SemanticSearchProvider({ children }) {
  const {
    getApiKeyForProvider,
    hasKeyForProvider,
    embeddingsProvider,
    getAvailableProvidersForEmbeddings
  } = useApiKeys();

  // Track which provider was used for current embeddings
  const [currentEmbeddingsProvider, setCurrentEmbeddingsProvider] = useState(() => {
    const saved = localStorage.getItem(EMBEDDINGS_PROVIDER_KEY);
    return saved || AI_PROVIDERS.OPENAI;
  });

  // Check if any embeddings provider is available
  const hasAnyEmbeddingsProvider = useCallback(() => {
    return getAvailableProvidersForEmbeddings().length > 0;
  }, [getAvailableProvidersForEmbeddings]);
  const [indexingStatus, setIndexingStatus] = useState({
    isIndexing: false,
    progress: 0,
    total: 0,
    currentType: ''
  });
  const [lastIndexed, setLastIndexed] = useState(null);
  const [embeddingsCount, setEmbeddingsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const indexingRef = useRef(false);

  // Initialize database and load metadata on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        const metadata = await getEmbeddingsMetadata();
        setEmbeddingsCount(metadata.totalCount);
        setLastIndexed(metadata.lastUpdated ? new Date(metadata.lastUpdated) : null);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize embeddings database:', error);
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  // Extract text from different content types
  const extractText = useCallback((type, item, projectTitle = '') => {
    switch (type) {
      case CONTENT_TYPES.PROJECT:
        return `${item.title} ${item.subtitle || ''} ${item.description || ''}`.trim();

      case CONTENT_TYPES.TASK:
        return `${item.title} ${item.description || ''} Project: ${projectTitle}`.trim();

      case CONTENT_TYPES.NOTEBOOK:
        return `${item.title} ${item.content || ''} Tags: ${(item.tags || []).join(' ')}`.trim();

      case CONTENT_TYPES.REFERENCE:
        return `${item.title} ${item.authors || ''} ${item.abstract || ''} ${item.notes || ''} ${item.aiSummary?.summary || ''} Tags: ${(item.tags || []).join(' ')}`.trim();

      case CONTENT_TYPES.PROTOCOL:
      case CONTENT_TYPES.RESULT:
        return `${item.title} ${item.description || ''} Tags: ${(item.tags || []).join(' ')}`.trim();

      case CONTENT_TYPES.NOTE:
        return `${item.title || ''} ${item.content || item.description || ''} ${item.rationale || ''} ${item.hypothesis || ''} ${item.approach || ''} ${item.expectedOutcomes || ''}`.trim();

      default:
        return '';
    }
  }, []);

  // Get all content to index
  const getAllContent = useCallback(() => {
    const content = [];

    // Get all projects
    let customProjects = [];
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) customProjects = JSON.parse(saved);
    } catch {}

    const allProjects = [...researchProjects, ...customProjects];
    const customProjectIds = new Set(customProjects.map(p => p.id));

    // Add projects
    allProjects.forEach(project => {
      content.push({
        id: `project-${project.id}`,
        contentType: CONTENT_TYPES.PROJECT,
        contentId: project.id,
        projectId: project.id,
        title: project.title,
        text: extractText(CONTENT_TYPES.PROJECT, project)
      });
    });

    // Get saved tasks
    let savedTasks = {};
    try {
      const saved = localStorage.getItem(TASK_STORAGE_KEY);
      if (saved) savedTasks = JSON.parse(saved);
    } catch {}

    // Add tasks
    allProjects.forEach(project => {
      let projectTasks;
      if (customProjectIds.has(project.id)) {
        projectTasks = project.tasks;
      } else {
        projectTasks = savedTasks[project.id] || project.tasks;
      }

      if (projectTasks) {
        Object.entries(projectTasks).forEach(([column, tasks]) => {
          if (Array.isArray(tasks)) {
            tasks.forEach(task => {
              content.push({
                id: `task-${task.id}`,
                contentType: CONTENT_TYPES.TASK,
                contentId: task.id,
                projectId: project.id,
                title: task.title,
                column,
                text: extractText(CONTENT_TYPES.TASK, task, project.title)
              });
            });
          }
        });
      }
    });

    // Add lab notebook entries
    try {
      const saved = localStorage.getItem(NOTEBOOK_KEY);
      if (saved) {
        const entries = JSON.parse(saved);
        entries.forEach(entry => {
          if (!entry.isArchived) {
            content.push({
              id: `notebook-${entry.id}`,
              contentType: CONTENT_TYPES.NOTEBOOK,
              contentId: entry.id,
              projectId: entry.projectId,
              title: entry.title,
              text: extractText(CONTENT_TYPES.NOTEBOOK, entry)
            });
          }
        });
      }
    } catch {}

    // Add literature/references
    try {
      const saved = localStorage.getItem(LITERATURE_KEY);
      if (saved) {
        const allRefs = JSON.parse(saved);
        Object.entries(allRefs).forEach(([projectId, refs]) => {
          if (Array.isArray(refs)) {
            refs.forEach(ref => {
              content.push({
                id: `reference-${ref.id}`,
                contentType: CONTENT_TYPES.REFERENCE,
                contentId: ref.id,
                projectId,
                title: ref.title,
                text: extractText(CONTENT_TYPES.REFERENCE, ref)
              });
            });
          }
        });
      }
    } catch {}

    // Add protocols
    try {
      const saved = localStorage.getItem(PROTOCOLS_KEY);
      if (saved) {
        const allProtocols = JSON.parse(saved);
        Object.entries(allProtocols).forEach(([projectId, protocols]) => {
          if (Array.isArray(protocols)) {
            protocols.forEach(protocol => {
              content.push({
                id: `protocol-${protocol.id}`,
                contentType: CONTENT_TYPES.PROTOCOL,
                contentId: protocol.id,
                projectId,
                title: protocol.title,
                text: extractText(CONTENT_TYPES.PROTOCOL, protocol)
              });
            });
          }
        });
      }
    } catch {}

    // Add results
    try {
      const saved = localStorage.getItem(RESULTS_KEY);
      if (saved) {
        const allResults = JSON.parse(saved);
        Object.entries(allResults).forEach(([projectId, results]) => {
          if (Array.isArray(results)) {
            results.forEach(result => {
              content.push({
                id: `result-${result.id}`,
                contentType: CONTENT_TYPES.RESULT,
                contentId: result.id,
                projectId,
                title: result.title,
                text: extractText(CONTENT_TYPES.RESULT, result)
              });
            });
          }
        });
      }
    } catch {}

    // Add research notes (specific aims, misc notes)
    try {
      const saved = localStorage.getItem(RESEARCH_NOTES_KEY);
      if (saved) {
        const allNotes = JSON.parse(saved);
        Object.entries(allNotes).forEach(([projectId, notes]) => {
          // Add background as a note
          if (notes.background) {
            content.push({
              id: `note-background-${projectId}`,
              contentType: CONTENT_TYPES.NOTE,
              contentId: `background-${projectId}`,
              projectId,
              title: 'Background',
              text: extractText(CONTENT_TYPES.NOTE, { content: notes.background })
            });
          }

          // Add specific aims
          if (Array.isArray(notes.specificAims)) {
            notes.specificAims.forEach(aim => {
              content.push({
                id: `note-aim-${aim.id}`,
                contentType: CONTENT_TYPES.NOTE,
                contentId: aim.id,
                projectId,
                title: aim.title,
                text: extractText(CONTENT_TYPES.NOTE, aim)
              });
            });
          }

          // Add misc notes
          if (Array.isArray(notes.miscNotes)) {
            notes.miscNotes.forEach(note => {
              content.push({
                id: `note-misc-${note.id}`,
                contentType: CONTENT_TYPES.NOTE,
                contentId: note.id,
                projectId,
                title: note.title,
                text: extractText(CONTENT_TYPES.NOTE, note)
              });
            });
          }
        });
      }
    } catch {}

    return content;
  }, [extractText]);

  // Index all content with specified provider
  const indexAllContent = useCallback(async (force = false, provider = null) => {
    // Determine which provider to use
    const targetProvider = provider || embeddingsProvider;

    if (!hasKeyForProvider(targetProvider) || indexingRef.current) {
      return;
    }

    // If provider changed, force re-index
    if (targetProvider !== currentEmbeddingsProvider && !force) {
      force = true;
      await clearAllEmbeddings();
    }

    indexingRef.current = true;
    const content = getAllContent();

    // Filter content that needs indexing
    const toIndex = [];
    for (const item of content) {
      const checksum = generateChecksum(item.text);
      const isValid = await hasValidEmbedding(item.id, checksum);

      if (force || !isValid) {
        toIndex.push({ ...item, checksum });
      }
    }

    if (toIndex.length === 0) {
      indexingRef.current = false;
      setIndexingStatus({ isIndexing: false, progress: 0, total: 0, currentType: '' });
      return;
    }

    const providerName = PROVIDER_NAMES[targetProvider] || targetProvider;
    setIndexingStatus({
      isIndexing: true,
      progress: 0,
      total: toIndex.length,
      currentType: `Preparing with ${providerName}...`
    });

    try {
      const apiKey = getApiKeyForProvider(targetProvider);
      const apiModule = getApiModule(targetProvider);
      const texts = toIndex.map(item => item.text);

      const embeddings = await apiModule.generateBatchEmbeddings(
        apiKey,
        texts,
        (current, total) => {
          setIndexingStatus(prev => ({
            ...prev,
            progress: current,
            currentType: `Indexing ${current}/${total} items with ${providerName}`
          }));
        }
      );

      // Prepare embeddings for storage
      const embeddingsToStore = toIndex.map((item, index) => ({
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        projectId: item.projectId,
        title: item.title,
        text: item.text,
        checksum: item.checksum,
        embedding: embeddings[index],
        provider: targetProvider
      })).filter(e => e.embedding !== null);

      // Store in IndexedDB
      if (embeddingsToStore.length > 0) {
        await storeEmbeddingsBatch(embeddingsToStore);
      }

      // Save provider used
      setCurrentEmbeddingsProvider(targetProvider);
      localStorage.setItem(EMBEDDINGS_PROVIDER_KEY, targetProvider);

      const metadata = await getEmbeddingsMetadata();
      setEmbeddingsCount(metadata.totalCount);
      setLastIndexed(new Date());

      setIndexingStatus({
        isIndexing: false,
        progress: toIndex.length,
        total: toIndex.length,
        currentType: 'Complete'
      });
    } catch (error) {
      console.error('Indexing error:', error);
      setIndexingStatus({
        isIndexing: false,
        progress: 0,
        total: 0,
        currentType: 'Error'
      });
    }

    indexingRef.current = false;
  }, [embeddingsProvider, hasKeyForProvider, getApiKeyForProvider, currentEmbeddingsProvider, getAllContent]);

  // Search with semantic similarity
  const search = useCallback(async (query, options = {}) => {
    const {
      contentTypes = null, // null = all types
      projectId = null,
      limit = 20,
      threshold = 0.35
    } = options;

    // Use the provider that was used to create the embeddings
    const targetProvider = currentEmbeddingsProvider;

    if (!query || !hasKeyForProvider(targetProvider)) {
      return [];
    }

    try {
      // Generate embedding for query using the same provider as the stored embeddings
      const apiKey = getApiKeyForProvider(targetProvider);
      const apiModule = getApiModule(targetProvider);
      const queryEmbedding = await apiModule.generateEmbedding(apiKey, query);

      // Get all embeddings from IndexedDB
      let embeddings = await getAllEmbeddings();

      // Filter by content types if specified
      if (contentTypes && contentTypes.length > 0) {
        embeddings = embeddings.filter(e => contentTypes.includes(e.contentType));
      }

      // Filter by project if specified
      if (projectId) {
        embeddings = embeddings.filter(e => e.projectId === projectId);
      }

      // Find similar
      const results = findTopKSimilar(queryEmbedding, embeddings, limit, threshold);

      // Get project titles for context
      let customProjects = [];
      try {
        const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
        if (saved) customProjects = JSON.parse(saved);
      } catch {}
      const allProjects = [...researchProjects, ...customProjects];
      const projectMap = new Map(allProjects.map(p => [p.id, p.title]));

      // Enrich results with project title
      return results.map(r => ({
        ...r,
        projectTitle: projectMap.get(r.projectId) || 'Unknown Project'
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, [currentEmbeddingsProvider, hasKeyForProvider, getApiKeyForProvider]);

  // Clear all embeddings and re-index with specified provider
  const reindexAll = useCallback(async (provider = null) => {
    await clearAllEmbeddings();
    setEmbeddingsCount(0);
    setLastIndexed(null);
    await indexAllContent(true, provider);
  }, [indexAllContent]);

  // Auto-index when an API key becomes available
  useEffect(() => {
    if (isInitialized && hasAnyEmbeddingsProvider() && embeddingsCount === 0) {
      indexAllContent();
    }
  }, [isInitialized, hasAnyEmbeddingsProvider, embeddingsCount, indexAllContent]);

  const value = {
    indexingStatus,
    lastIndexed,
    embeddingsCount,
    isInitialized,
    hasAnyEmbeddingsProvider,
    currentEmbeddingsProvider,
    indexAllContent,
    reindexAll,
    search,
    CONTENT_TYPES,
    PROVIDER_NAMES,
    AI_PROVIDERS
  };

  return (
    <SemanticSearchContext.Provider value={value}>
      {children}
    </SemanticSearchContext.Provider>
  );
}

export function useSemanticSearch() {
  const context = useContext(SemanticSearchContext);
  if (!context) {
    throw new Error('useSemanticSearch must be used within SemanticSearchProvider');
  }
  return context;
}
