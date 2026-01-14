import React, { useState, useEffect, useCallback } from 'react';
import { useSyncTrigger } from '../context/DataSyncContext';
import { useApiKeys, AI_PROVIDERS, PROVIDER_NAMES, PROVIDER_CAPABILITIES } from '../context/ApiKeysContext';
import { useTrash, TRASH_ITEM_TYPES } from '../context/TrashContext';
import { useToast } from '../context/ToastContext';
import MacroTextarea from './MacroTextarea';
import FileAttachments from './FileAttachments';
import { fetchMultipleCitations, fetchFromPubMed, fetchFromDOI } from '../utils/citationFetcher';
import * as claudeApi from '../utils/claudeApi';
import * as openaiApi from '../utils/openaiEmbeddings';
import * as geminiApi from '../utils/geminiApi';

const LITERATURE_KEY = 'research-dashboard-literature';

function LiteratureManager({ projectId, projectTitle }) {
  const triggerSync = useSyncTrigger();
  const {
    getApiKeyForProvider,
    hasKeyForProvider,
    openSettings,
    summarizationProvider,
    getAvailableProvidersForSummarization
  } = useApiKeys();
  const { moveToTrash } = useTrash();
  const { showSuccess } = useToast();
  const [references, setReferences] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [selectedRef, setSelectedRef] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState({ message: '', type: '' });
  const [bulkPmids, setBulkPmids] = useState('');
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0, importing: false });
  const [summarizingId, setSummarizingId] = useState(null);
  const [batchSummarizing, setBatchSummarizing] = useState({ active: false, current: 0, total: 0 });
  const [selectedSummaryProvider, setSelectedSummaryProvider] = useState(summarizationProvider);

  // Get the appropriate API module for a provider
  const getApiModule = (provider) => {
    switch (provider) {
      case AI_PROVIDERS.CLAUDE:
        return claudeApi;
      case AI_PROVIDERS.OPENAI:
        return openaiApi;
      case AI_PROVIDERS.GEMINI:
        return geminiApi;
      default:
        return claudeApi;
    }
  };

  // Check if any summarization provider is available
  const hasAnySummarizationProvider = () => {
    return getAvailableProvidersForSummarization().length > 0;
  };

  // Form state
  const [newRef, setNewRef] = useState({
    pmid: '',
    doi: '',
    title: '',
    authors: '',
    journal: '',
    year: '',
    volume: '',
    pages: '',
    abstract: '',
    notes: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Load references from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LITERATURE_KEY);
    if (saved) {
      try {
        const all = JSON.parse(saved);
        if (all[projectId]) {
          setReferences(all[projectId]);
        }
      } catch (e) {
        console.error('Failed to load references:', e);
      }
    }
  }, [projectId]);

  // Save references
  const saveReferences = useCallback((newRefs) => {
    try {
      const saved = localStorage.getItem(LITERATURE_KEY);
      const all = saved ? JSON.parse(saved) : {};
      all[projectId] = newRefs;
      localStorage.setItem(LITERATURE_KEY, JSON.stringify(all));
      setReferences(newRefs);
      triggerSync();
    } catch (e) {
      console.error('Failed to save references:', e);
    }
  }, [projectId, triggerSync]);

  // Fetch from PubMed by PMID
  const fetchFromPubMed = async (pmid) => {
    if (!pmid.trim()) return;

    setIsLoading(true);
    setFetchStatus({ message: 'Fetching from PubMed...', type: 'info' });

    try {
      // Use PubMed E-utilities API
      const response = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`
      );
      const data = await response.json();

      if (data.result && data.result[pmid]) {
        const article = data.result[pmid];

        // Format authors
        const authors = article.authors
          ? article.authors.map(a => a.name).join(', ')
          : '';

        // Extract year from pubdate
        const year = article.pubdate ? article.pubdate.split(' ')[0] : '';

        setNewRef(prev => ({
          ...prev,
          pmid: pmid,
          title: article.title || '',
          authors: authors,
          journal: article.source || article.fulljournalname || '',
          year: year,
          volume: article.volume || '',
          pages: article.pages || '',
          doi: article.elocationid?.replace('doi: ', '') || ''
        }));

        // Fetch abstract separately
        const abstractResponse = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`
        );
        const abstractText = await abstractResponse.text();

        // Extract abstract from the response (it's in a specific format)
        const abstractMatch = abstractText.match(/Abstract\n([\s\S]*?)(?=\n\n|$)/i);
        if (abstractMatch) {
          setNewRef(prev => ({
            ...prev,
            abstract: abstractMatch[1].trim()
          }));
        }

        setFetchStatus({ message: 'Article found!', type: 'success' });
      } else {
        setFetchStatus({ message: 'PMID not found', type: 'error' });
      }
    } catch (error) {
      console.error('PubMed fetch error:', error);
      setFetchStatus({ message: 'Failed to fetch from PubMed', type: 'error' });
    }

    setIsLoading(false);
    setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
  };

  // Bulk import multiple PMIDs and/or DOIs
  const handleBulkImport = async () => {
    if (!bulkPmids.trim()) {
      setFetchStatus({ message: 'Enter PMIDs or DOIs to import', type: 'error' });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
      return;
    }

    // Check for existing PMIDs and DOIs to avoid duplicates
    const existingPmids = new Set(references.map(r => r.pmid).filter(Boolean));
    const existingDois = new Set(references.map(r => r.doi).filter(Boolean));

    setBulkImportProgress({ current: 0, total: 1, importing: true });
    setFetchStatus({ message: 'Fetching references...', type: 'info' });

    try {
      const results = await fetchMultipleCitations(bulkPmids);

      // Filter out duplicates
      const newReferences = results.success.filter(ref => {
        if (ref.pmid && existingPmids.has(ref.pmid)) return false;
        if (ref.doi && existingDois.has(ref.doi)) return false;
        return true;
      }).map(ref => ({
        ...ref,
        notes: '',
        tags: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const duplicateCount = results.success.length - newReferences.length;

      // Save all new references
      if (newReferences.length > 0) {
        saveReferences([...newReferences, ...references]);
      }

      setBulkImportProgress({ current: 0, total: 0, importing: false });
      setBulkPmids('');

      let message = '';
      if (newReferences.length > 0) {
        message = `Imported ${newReferences.length} reference${newReferences.length !== 1 ? 's' : ''}`;
      }
      if (duplicateCount > 0) {
        message += message ? ` (${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped)` : `${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped`;
      }
      if (results.failed.length > 0) {
        message += message ? `, ${results.failed.length} failed` : `${results.failed.length} failed`;
      }

      const type = results.failed.length > 0 ? 'warning' : newReferences.length > 0 ? 'success' : 'info';
      setFetchStatus({ message: message || 'No new references to import', type });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 4000);
    } catch (error) {
      console.error('Bulk import error:', error);
      setBulkImportProgress({ current: 0, total: 0, importing: false });
      setFetchStatus({ message: 'Import failed: ' + error.message, type: 'error' });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 4000);
    }
  };

  // Add reference
  const handleAddReference = () => {
    if (!newRef.title.trim()) {
      setFetchStatus({ message: 'Title is required', type: 'error' });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
      return;
    }

    const reference = {
      id: `ref-${Date.now()}`,
      ...newRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveReferences([reference, ...references]);
    resetForm();
    setShowAddForm(false);
  };

  // Update reference
  const handleUpdateReference = (refId, updates) => {
    const updated = references.map(r =>
      r.id === refId
        ? { ...r, ...updates, updatedAt: new Date().toISOString() }
        : r
    );
    saveReferences(updated);
    if (selectedRef?.id === refId) {
      setSelectedRef({ ...selectedRef, ...updates });
    }
  };

  // Delete reference (move to trash)
  const handleDeleteReference = (refId) => {
    const ref = references.find(r => r.id === refId);
    if (!ref) return;

    // Move to trash instead of permanent deletion
    moveToTrash(TRASH_ITEM_TYPES.REFERENCE, ref, {
      projectId,
      projectTitle
    });

    // Remove from active references
    const updated = references.filter(r => r.id !== refId);
    saveReferences(updated);
    if (selectedRef?.id === refId) {
      setSelectedRef(null);
    }
    showSuccess(`"${ref.title || 'Reference'}" moved to trash`);
  };

  // Summarize a single paper using selected AI provider
  const handleSummarize = async (refId, provider = selectedSummaryProvider) => {
    if (!hasKeyForProvider(provider)) {
      openSettings();
      return;
    }

    const ref = references.find(r => r.id === refId);
    if (!ref || !ref.abstract) {
      setFetchStatus({ message: 'Abstract required for summarization', type: 'error' });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
      return;
    }

    setSummarizingId(refId);
    const providerName = PROVIDER_NAMES[provider] || provider;
    setFetchStatus({ message: `Generating summary with ${providerName}...`, type: 'info' });

    try {
      const apiKey = getApiKeyForProvider(provider);
      const apiModule = getApiModule(provider);
      const aiSummary = await apiModule.summarizePaper(apiKey, ref);
      // Add provider info to the summary
      aiSummary.provider = provider;
      handleUpdateReference(refId, { aiSummary });
      setFetchStatus({ message: `Summary generated with ${providerName}!`, type: 'success' });
    } catch (error) {
      console.error('Summarization error:', error);
      setFetchStatus({ message: error.message || 'Failed to generate summary', type: 'error' });
    }

    setSummarizingId(null);
    setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
  };

  // Batch summarize all papers without summaries
  const handleBatchSummarize = async (provider = selectedSummaryProvider) => {
    if (!hasKeyForProvider(provider)) {
      openSettings();
      return;
    }

    const refsToSummarize = references.filter(r => r.abstract && !r.aiSummary);
    if (refsToSummarize.length === 0) {
      setFetchStatus({ message: 'No papers to summarize (all have summaries or no abstracts)', type: 'info' });
      setTimeout(() => setFetchStatus({ message: '', type: '' }), 3000);
      return;
    }

    setBatchSummarizing({ active: true, current: 0, total: refsToSummarize.length });
    const providerName = PROVIDER_NAMES[provider] || provider;
    setFetchStatus({ message: `Summarizing ${refsToSummarize.length} papers with ${providerName}...`, type: 'info' });

    try {
      const apiKey = getApiKeyForProvider(provider);
      const apiModule = getApiModule(provider);
      const results = await apiModule.summarizePapersBatch(
        apiKey,
        refsToSummarize,
        (current, total) => setBatchSummarizing({ active: true, current, total })
      );

      // Update references with summaries
      const successCount = results.filter(r => r.success).length;
      const updatedRefs = references.map(ref => {
        const result = results.find(r => r.id === ref.id);
        if (result?.success) {
          return {
            ...ref,
            aiSummary: { ...result.summary, provider },
            updatedAt: new Date().toISOString()
          };
        }
        return ref;
      });

      saveReferences(updatedRefs);
      setFetchStatus({
        message: `Summarized ${successCount} of ${refsToSummarize.length} papers with ${providerName}`,
        type: successCount === refsToSummarize.length ? 'success' : 'warning'
      });
    } catch (error) {
      console.error('Batch summarization error:', error);
      setFetchStatus({ message: 'Batch summarization failed', type: 'error' });
    }

    setBatchSummarizing({ active: false, current: 0, total: 0 });
    setTimeout(() => setFetchStatus({ message: '', type: '' }), 4000);
  };

  // Reset form
  const resetForm = () => {
    setNewRef({
      pmid: '',
      doi: '',
      title: '',
      authors: '',
      journal: '',
      year: '',
      volume: '',
      pages: '',
      abstract: '',
      notes: '',
      tags: []
    });
    setTagInput('');
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !newRef.tags.includes(tagInput.trim())) {
      setNewRef({
        ...newRef,
        tags: [...newRef.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Format citation (AMA style)
  // Format: Author(s). Title. Journal. Year;Volume(Issue):Pages. doi:DOI
  const formatCitation = (ref) => {
    let citation = '';

    // Authors - AMA uses "et al" after 6 authors, but commonly after 3
    if (ref.authors) {
      const authorList = ref.authors.split(', ');
      if (authorList.length > 3) {
        citation += `${authorList.slice(0, 3).join(', ')}, et al`;
      } else {
        citation += ref.authors;
      }
      citation += '. ';
    }

    // Title
    if (ref.title) {
      citation += ref.title;
      // Ensure title ends with period
      if (!ref.title.endsWith('.') && !ref.title.endsWith('?')) {
        citation += '.';
      }
      citation += ' ';
    }

    // Journal
    if (ref.journal) {
      citation += `${ref.journal}. `;
    }

    // Year;Volume:Pages
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

    // DOI
    if (ref.doi) {
      citation += ` doi:${ref.doi}`;
    }

    return citation.trim();
  };

  // Generate Google Scholar search link
  const getGoogleScholarLink = (ref) => {
    const query = encodeURIComponent(ref.title);
    return `https://scholar.google.com/scholar?q=${query}`;
  };

  // Generate PubMed link
  const getPubMedLink = (pmid) => {
    return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  };

  // Generate DOI link
  const getDOILink = (doi) => {
    return `https://doi.org/${doi}`;
  };

  // Get all unique tags
  const allTags = [...new Set(references.flatMap(r => r.tags || []))];

  // Filter references
  const filteredReferences = references.filter(ref => {
    const matchesSearch = !searchTerm ||
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.journal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = filterTag === 'all' || ref.tags?.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  // Export references as CSV
  const handleExportCSV = () => {
    const rows = [['PMID', 'DOI', 'Title', 'Authors', 'Journal', 'Year', 'Tags', 'Abstract', 'Summary']];

    filteredReferences.forEach(ref => {
      rows.push([
        ref.pmid || '',
        ref.doi || '',
        (ref.title || '').replace(/"/g, '""'),
        (ref.authors || '').replace(/"/g, '""'),
        (ref.journal || '').replace(/"/g, '""'),
        ref.year || '',
        (ref.tags || []).join('; '),
        (ref.abstract || '').replace(/"/g, '""'),
        (ref.aiSummary || '').replace(/"/g, '""')
      ]);
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `references-${projectId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export references as JSON
  const handleExportJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      projectId,
      projectTitle,
      totalReferences: filteredReferences.length,
      references: filteredReferences
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `references-${projectId || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export references as BibTeX
  const handleExportBibTeX = () => {
    const bibtexEntries = filteredReferences.map(ref => {
      const key = `ref${ref.id}`;
      const authors = ref.authors || 'Unknown';
      const title = ref.title || 'Untitled';
      const journal = ref.journal || '';
      const year = ref.year || '';
      const doi = ref.doi || '';
      const pmid = ref.pmid || '';

      return `@article{${key},
  author = {${authors}},
  title = {${title}},
  journal = {${journal}},
  year = {${year}},
  doi = {${doi}},
  pmid = {${pmid}}
}`;
    }).join('\n\n');

    const blob = new Blob([bibtexEntries], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `references-${projectId || 'all'}-${new Date().toISOString().split('T')[0]}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="literature-manager">
      {fetchStatus.message && (
        <div className={`sync-status-bar ${fetchStatus.type}`}>
          {fetchStatus.message}
          <button onClick={() => setFetchStatus({ message: '', type: '' })}>x</button>
        </div>
      )}

      <div className="literature-toolbar">
        <button
          className="add-ref-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Add Reference
        </button>

        <div className="ai-summarize-group">
          <select
            className="provider-select-inline"
            value={selectedSummaryProvider}
            onChange={(e) => setSelectedSummaryProvider(e.target.value)}
            disabled={batchSummarizing.active}
            title="Select AI provider for summarization"
          >
            {Object.values(AI_PROVIDERS)
              .filter(p => PROVIDER_CAPABILITIES[p]?.summarization)
              .map(provider => (
                <option
                  key={provider}
                  value={provider}
                  disabled={!hasKeyForProvider(provider)}
                >
                  {PROVIDER_NAMES[provider]} {!hasKeyForProvider(provider) ? '(No key)' : ''}
                </option>
              ))}
          </select>
          <button
            className="batch-summarize-btn"
            onClick={() => handleBatchSummarize(selectedSummaryProvider)}
            disabled={batchSummarizing.active || references.length === 0 || !hasAnySummarizationProvider()}
            title={hasAnySummarizationProvider() ? 'Summarize all papers with abstracts' : 'Configure an API key first'}
          >
            {batchSummarizing.active
              ? `Summarizing ${batchSummarizing.current}/${batchSummarizing.total}...`
              : 'AI Summarize All'}
          </button>
        </div>

        <div className="literature-filters">
          <input
            type="text"
            className="literature-search"
            placeholder="Search references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="literature-tag-filter"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="all">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="export-dropdown">
          <button
            className="export-refs-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={filteredReferences.length === 0}
            title="Export references"
          >
            📥 Export
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <button onClick={() => { handleExportCSV(); setShowExportMenu(false); }}>
                📄 CSV (spreadsheet)
              </button>
              <button onClick={() => { handleExportJSON(); setShowExportMenu(false); }}>
                💾 JSON (backup)
              </button>
              <button onClick={() => { handleExportBibTeX(); setShowExportMenu(false); }}>
                📚 BibTeX (citation)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Reference Form */}
      {showAddForm && (
        <div className="add-ref-form">
          <div className="ref-form-header">
            <h3>Add Reference</h3>
            <button className="close-btn" onClick={() => { setShowAddForm(false); resetForm(); }}>
              &times;
            </button>
          </div>

          {/* PMID Lookup */}
          <div className="pmid-lookup">
            <label>Lookup by PMID:</label>
            <div className="pmid-input-row">
              <input
                type="text"
                placeholder="Enter PMID (e.g., 12345678)"
                value={newRef.pmid}
                onChange={(e) => setNewRef({ ...newRef, pmid: e.target.value })}
              />
              <button
                onClick={() => fetchFromPubMed(newRef.pmid)}
                disabled={isLoading || !newRef.pmid.trim()}
              >
                {isLoading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Bulk PMID/DOI Import */}
          <div className="bulk-pmid-section">
            <label>Bulk Import (PMIDs & DOIs):</label>
            <textarea
              className="bulk-pmid-input"
              placeholder="Enter PMIDs and/or DOIs (comma, space, or newline separated)&#10;Examples: 12345678, 10.1000/xyz123, 23456789"
              value={bulkPmids}
              onChange={(e) => setBulkPmids(e.target.value)}
              rows={3}
              disabled={bulkImportProgress.importing}
            />
            <div className="bulk-import-actions">
              <button
                className="btn-bulk-import"
                onClick={handleBulkImport}
                disabled={bulkImportProgress.importing || !bulkPmids.trim()}
              >
                {bulkImportProgress.importing
                  ? `Importing ${bulkImportProgress.current}/${bulkImportProgress.total}...`
                  : 'Import All'}
              </button>
              {bulkImportProgress.importing && (
                <div className="bulk-progress-bar">
                  <div
                    className="bulk-progress-fill"
                    style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="ref-form-divider">
            <span>or enter manually</span>
          </div>

          {/* Manual Entry Fields */}
          <div className="ref-form-fields">
            <div className="ref-form-row">
              <label>Title *</label>
              <input
                type="text"
                value={newRef.title}
                onChange={(e) => setNewRef({ ...newRef, title: e.target.value })}
                placeholder="Article title"
              />
            </div>

            <div className="ref-form-row">
              <label>Authors</label>
              <input
                type="text"
                value={newRef.authors}
                onChange={(e) => setNewRef({ ...newRef, authors: e.target.value })}
                placeholder="Smith J, Doe A, ..."
              />
            </div>

            <div className="ref-form-row-split">
              <div className="ref-form-row">
                <label>Journal</label>
                <input
                  type="text"
                  value={newRef.journal}
                  onChange={(e) => setNewRef({ ...newRef, journal: e.target.value })}
                  placeholder="Journal name"
                />
              </div>
              <div className="ref-form-row">
                <label>Year</label>
                <input
                  type="text"
                  value={newRef.year}
                  onChange={(e) => setNewRef({ ...newRef, year: e.target.value })}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="ref-form-row-split">
              <div className="ref-form-row">
                <label>Volume</label>
                <input
                  type="text"
                  value={newRef.volume}
                  onChange={(e) => setNewRef({ ...newRef, volume: e.target.value })}
                  placeholder="12"
                />
              </div>
              <div className="ref-form-row">
                <label>Pages</label>
                <input
                  type="text"
                  value={newRef.pages}
                  onChange={(e) => setNewRef({ ...newRef, pages: e.target.value })}
                  placeholder="123-456"
                />
              </div>
            </div>

            <div className="ref-form-row">
              <label>DOI</label>
              <input
                type="text"
                value={newRef.doi}
                onChange={(e) => setNewRef({ ...newRef, doi: e.target.value })}
                placeholder="10.1000/xyz123"
              />
            </div>

            <div className="ref-form-row">
              <label>Abstract</label>
              <textarea
                value={newRef.abstract}
                onChange={(e) => setNewRef({ ...newRef, abstract: e.target.value })}
                placeholder="Article abstract..."
                rows={4}
              />
            </div>

            <div className="ref-form-row">
              <label>Notes</label>
              <MacroTextarea
                value={newRef.notes}
                onChange={(notes) => setNewRef({ ...newRef, notes })}
                placeholder="Your notes about this reference... (type @ for commands)"
                rows={3}
              />
            </div>

            <div className="ref-form-row">
              <label>Tags</label>
              <div className="ref-tags-input">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                />
                <button onClick={handleAddTag}>+</button>
              </div>
              {newRef.tags.length > 0 && (
                <div className="ref-tags-list">
                  {newRef.tags.map(tag => (
                    <span key={tag} className="ref-tag">
                      {tag}
                      <button onClick={() => setNewRef({
                        ...newRef,
                        tags: newRef.tags.filter(t => t !== tag)
                      })}>x</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ref-form-actions">
            <button className="btn-cancel" onClick={() => { setShowAddForm(false); resetForm(); }}>
              Cancel
            </button>
            <button className="btn-submit" onClick={handleAddReference}>
              Add Reference
            </button>
          </div>
        </div>
      )}

      {/* References List */}
      <div className="references-list">
        {filteredReferences.length === 0 ? (
          <div className="references-empty">
            <p>No references yet.</p>
            <p className="hint">Add references by PMID or enter them manually.</p>
          </div>
        ) : (
          filteredReferences.map((ref, index) => (
            <div
              key={ref.id}
              className={`reference-item ${selectedRef?.id === ref.id ? 'expanded' : ''}`}
            >
              <div
                className="reference-main"
                onClick={() => setSelectedRef(selectedRef?.id === ref.id ? null : ref)}
              >
                <div className="reference-citation">
                  <span className="reference-number">{index + 1}.</span>
                  <p className="citation-text">{formatCitation(ref)}</p>
                </div>

                <div className="reference-badges">
                  {ref.pmid && (
                    <span className="ref-badge pmid">PMID</span>
                  )}
                  {ref.doi && (
                    <span className="ref-badge doi">DOI</span>
                  )}
                  {ref.tags?.map(tag => (
                    <span key={tag} className="ref-badge tag">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Expanded View */}
              {selectedRef?.id === ref.id && (
                <div className="reference-expanded">
                  {/* Links */}
                  <div className="reference-links">
                    {ref.pmid && (
                      <a
                        href={getPubMedLink(ref.pmid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ref-link pubmed"
                      >
                        PubMed
                      </a>
                    )}
                    <a
                      href={getGoogleScholarLink(ref)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ref-link scholar"
                    >
                      Google Scholar
                    </a>
                    {ref.doi && (
                      <a
                        href={getDOILink(ref.doi)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ref-link doi"
                      >
                        DOI: {ref.doi}
                      </a>
                    )}
                  </div>

                  {/* Abstract */}
                  {ref.abstract && (
                    <div className="reference-abstract">
                      <h4>Abstract</h4>
                      <p>{ref.abstract}</p>
                    </div>
                  )}

                  {/* AI Summary */}
                  <div className="reference-ai-summary">
                    <h4>AI Summary</h4>
                    {ref.aiSummary ? (
                      <div className="ai-summary-content">
                        <p className="ai-summary-text">{ref.aiSummary.summary}</p>
                        {ref.aiSummary.keyFindings && ref.aiSummary.keyFindings.length > 0 && (
                          <div className="ai-key-findings">
                            <strong>Key Findings:</strong>
                            <ul>
                              {ref.aiSummary.keyFindings.map((finding, i) => (
                                <li key={i}>{finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="ai-summary-meta">
                          <span>
                            Generated {new Date(ref.aiSummary.generatedAt).toLocaleDateString()}
                            {ref.aiSummary.provider && ` with ${PROVIDER_NAMES[ref.aiSummary.provider] || ref.aiSummary.provider}`}
                          </span>
                          <div className="regenerate-group">
                            <select
                              className="provider-select-small"
                              value={selectedSummaryProvider}
                              onChange={(e) => setSelectedSummaryProvider(e.target.value)}
                              disabled={summarizingId === ref.id}
                            >
                              {Object.values(AI_PROVIDERS)
                                .filter(p => PROVIDER_CAPABILITIES[p]?.summarization)
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
                              className="btn-regenerate"
                              onClick={() => handleSummarize(ref.id, selectedSummaryProvider)}
                              disabled={summarizingId === ref.id || !hasKeyForProvider(selectedSummaryProvider)}
                            >
                              {summarizingId === ref.id ? 'Regenerating...' : 'Regenerate'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ai-summary-empty">
                        {ref.abstract ? (
                          <div className="generate-summary-group">
                            <select
                              className="provider-select-small"
                              value={selectedSummaryProvider}
                              onChange={(e) => setSelectedSummaryProvider(e.target.value)}
                              disabled={summarizingId === ref.id}
                            >
                              {Object.values(AI_PROVIDERS)
                                .filter(p => PROVIDER_CAPABILITIES[p]?.summarization)
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
                              className="btn-summarize"
                              onClick={() => handleSummarize(ref.id, selectedSummaryProvider)}
                              disabled={summarizingId === ref.id || !hasKeyForProvider(selectedSummaryProvider)}
                            >
                              {summarizingId === ref.id ? 'Generating...' : 'Generate Summary'}
                            </button>
                          </div>
                        ) : (
                          <p className="no-abstract-hint">Add an abstract to enable AI summarization</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="reference-notes">
                    <h4>Notes</h4>
                    <MacroTextarea
                      value={ref.notes || ''}
                      onChange={(notes) => handleUpdateReference(ref.id, { notes })}
                      placeholder="Add your notes... (type @ for commands)"
                      rows={3}
                    />
                  </div>

                  {/* Attachments */}
                  <div className="reference-attachments">
                    <h4>Attachments</h4>
                    <FileAttachments
                      attachments={ref.attachments || []}
                      onUpdate={(attachments) => handleUpdateReference(ref.id, { attachments })}
                      acceptedTypes={['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                      maxFiles={5}
                    />
                  </div>

                  {/* Actions */}
                  <div className="reference-actions">
                    <button
                      className="btn-action copy"
                      onClick={() => {
                        navigator.clipboard.writeText(`${index + 1}. ${formatCitation(ref)}`);
                        setFetchStatus({ message: 'Citation copied!', type: 'success' });
                        setTimeout(() => setFetchStatus({ message: '', type: '' }), 2000);
                      }}
                    >
                      Copy Citation
                    </button>
                    <button
                      className="btn-action danger"
                      onClick={() => handleDeleteReference(ref.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reference Count */}
      <div className="references-count">
        {filteredReferences.length} reference{filteredReferences.length !== 1 ? 's' : ''}
        {filterTag !== 'all' && ` tagged "${filterTag}"`}
      </div>
    </div>
  );
}

export default LiteratureManager;
