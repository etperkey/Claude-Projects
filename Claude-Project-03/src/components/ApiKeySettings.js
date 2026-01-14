import React, { useState, useEffect } from 'react';
import { useApiKeys, AI_PROVIDERS, PROVIDER_NAMES, PROVIDER_CAPABILITIES } from '../context/ApiKeysContext';

function ApiKeySettings() {
  const {
    claudeApiKey,
    openaiApiKey,
    geminiApiKey,
    setClaudeApiKey,
    setOpenaiApiKey,
    setGeminiApiKey,
    isSettingsOpen,
    closeSettings,
    validateClaudeKey,
    validateOpenaiKey,
    validateGeminiKey,
    summarizationProvider,
    embeddingsProvider,
    setSummarizationProvider,
    setEmbeddingsProvider,
    hasKeyForProvider
  } = useApiKeys();

  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [claudeError, setClaudeError] = useState('');
  const [openaiError, setOpenaiError] = useState('');
  const [geminiError, setGeminiError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Initialize with existing keys when modal opens
  useEffect(() => {
    if (isSettingsOpen) {
      setClaudeKey(claudeApiKey || '');
      setOpenaiKey(openaiApiKey || '');
      setGeminiKey(geminiApiKey || '');
      setClaudeError('');
      setOpenaiError('');
      setGeminiError('');
      setSaveStatus('');
    }
  }, [isSettingsOpen, claudeApiKey, openaiApiKey, geminiApiKey]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    let hasError = false;

    // Validate Claude key if provided
    if (claudeKey) {
      const claudeValidation = validateClaudeKey(claudeKey);
      if (!claudeValidation.valid) {
        setClaudeError(claudeValidation.message);
        hasError = true;
      } else {
        setClaudeError('');
      }
    } else {
      setClaudeError('');
    }

    // Validate OpenAI key if provided
    if (openaiKey) {
      const openaiValidation = validateOpenaiKey(openaiKey);
      if (!openaiValidation.valid) {
        setOpenaiError(openaiValidation.message);
        hasError = true;
      } else {
        setOpenaiError('');
      }
    } else {
      setOpenaiError('');
    }

    // Validate Gemini key if provided
    if (geminiKey) {
      const geminiValidation = validateGeminiKey(geminiKey);
      if (!geminiValidation.valid) {
        setGeminiError(geminiValidation.message);
        hasError = true;
      } else {
        setGeminiError('');
      }
    } else {
      setGeminiError('');
    }

    if (hasError) return;

    // Save keys
    setClaudeApiKey(claudeKey);
    setOpenaiApiKey(openaiKey);
    setGeminiApiKey(geminiKey);
    setSaveStatus('Settings saved successfully!');

    setTimeout(() => {
      setSaveStatus('');
      closeSettings();
    }, 1500);
  };

  const handleClear = (type) => {
    if (type === 'claude') {
      setClaudeKey('');
      setClaudeApiKey('');
      setClaudeError('');
    } else if (type === 'openai') {
      setOpenaiKey('');
      setOpenaiApiKey('');
      setOpenaiError('');
    } else if (type === 'gemini') {
      setGeminiKey('');
      setGeminiApiKey('');
      setGeminiError('');
    }
  };

  // Get providers that support a feature and have API keys configured
  const getSummarizationProviders = () => {
    return Object.values(AI_PROVIDERS).filter(p => PROVIDER_CAPABILITIES[p]?.summarization);
  };

  const getEmbeddingsProviders = () => {
    return Object.values(AI_PROVIDERS).filter(p => PROVIDER_CAPABILITIES[p]?.embeddings);
  };

  // Check if provider will have key after save
  const willHaveKey = (provider) => {
    if (provider === AI_PROVIDERS.CLAUDE) return Boolean(claudeKey);
    if (provider === AI_PROVIDERS.OPENAI) return Boolean(openaiKey);
    if (provider === AI_PROVIDERS.GEMINI) return Boolean(geminiKey);
    return false;
  };

  return (
    <div className="api-settings-overlay" onClick={closeSettings}>
      <div className="api-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="api-settings-header">
          <h2>AI Settings</h2>
          <button className="close-btn" onClick={closeSettings}>&times;</button>
        </div>

        <div className="api-settings-content">
          <p className="api-settings-intro">
            Configure API keys and select preferred AI providers for different features.
          </p>

          {/* API Keys Section */}
          <div className="settings-section">
            <h3>API Keys</h3>
            <p className="section-description">
              Enter API keys for the AI services you want to use. Keys are stored locally in your browser.
            </p>

            {/* Claude API Key */}
            <div className="api-key-section">
              <label htmlFor="claude-key">
                <span className="key-label">Claude API Key</span>
                <span className="key-description">Anthropic - Summarization only</span>
              </label>
              <div className="key-input-group">
                <input
                  id="claude-key"
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={(e) => {
                    setClaudeKey(e.target.value);
                    setClaudeError('');
                  }}
                  placeholder="sk-ant-..."
                  className={claudeError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  title={showClaudeKey ? 'Hide key' : 'Show key'}
                >
                  {showClaudeKey ? '🙈' : '👁️'}
                </button>
                {claudeKey && (
                  <button
                    type="button"
                    className="clear-key-btn"
                    onClick={() => handleClear('claude')}
                    title="Clear key"
                  >
                    &times;
                  </button>
                )}
              </div>
              {claudeError && <span className="key-error">{claudeError}</span>}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="get-key-link"
              >
                Get a Claude API key
              </a>
            </div>

            {/* OpenAI API Key */}
            <div className="api-key-section">
              <label htmlFor="openai-key">
                <span className="key-label">OpenAI API Key</span>
                <span className="key-description">ChatGPT - Summarization & Embeddings</span>
              </label>
              <div className="key-input-group">
                <input
                  id="openai-key"
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    setOpenaiError('');
                  }}
                  placeholder="sk-..."
                  className={openaiError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  title={showOpenaiKey ? 'Hide key' : 'Show key'}
                >
                  {showOpenaiKey ? '🙈' : '👁️'}
                </button>
                {openaiKey && (
                  <button
                    type="button"
                    className="clear-key-btn"
                    onClick={() => handleClear('openai')}
                    title="Clear key"
                  >
                    &times;
                  </button>
                )}
              </div>
              {openaiError && <span className="key-error">{openaiError}</span>}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="get-key-link"
              >
                Get an OpenAI API key
              </a>
            </div>

            {/* Gemini API Key */}
            <div className="api-key-section">
              <label htmlFor="gemini-key">
                <span className="key-label">Gemini API Key</span>
                <span className="key-description">Google - Summarization & Embeddings</span>
              </label>
              <div className="key-input-group">
                <input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setGeminiError('');
                  }}
                  placeholder="AI..."
                  className={geminiError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? '🙈' : '👁️'}
                </button>
                {geminiKey && (
                  <button
                    type="button"
                    className="clear-key-btn"
                    onClick={() => handleClear('gemini')}
                    title="Clear key"
                  >
                    &times;
                  </button>
                )}
              </div>
              {geminiError && <span className="key-error">{geminiError}</span>}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="get-key-link"
              >
                Get a Gemini API key
              </a>
            </div>
          </div>

          {/* Provider Preferences Section */}
          <div className="settings-section">
            <h3>Default AI Providers</h3>
            <p className="section-description">
              Choose which AI provider to use for each feature. You can also change providers per-action.
            </p>

            {/* Summarization Provider */}
            <div className="provider-section">
              <label htmlFor="summarization-provider">
                <span className="provider-label">Paper Summarization</span>
                <span className="provider-description">AI used to summarize research papers in Literature Manager</span>
              </label>
              <select
                id="summarization-provider"
                value={summarizationProvider}
                onChange={(e) => setSummarizationProvider(e.target.value)}
                className="provider-select"
              >
                {getSummarizationProviders().map(provider => (
                  <option
                    key={provider}
                    value={provider}
                    disabled={!willHaveKey(provider)}
                  >
                    {PROVIDER_NAMES[provider]} {!willHaveKey(provider) ? '(No API key)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Embeddings Provider */}
            <div className="provider-section">
              <label htmlFor="embeddings-provider">
                <span className="provider-label">Semantic Search</span>
                <span className="provider-description">AI used for semantic search embeddings</span>
              </label>
              <select
                id="embeddings-provider"
                value={embeddingsProvider}
                onChange={(e) => setEmbeddingsProvider(e.target.value)}
                className="provider-select"
              >
                {getEmbeddingsProviders().map(provider => (
                  <option
                    key={provider}
                    value={provider}
                    disabled={!willHaveKey(provider)}
                  >
                    {PROVIDER_NAMES[provider]} {!willHaveKey(provider) ? '(No API key)' : ''}
                  </option>
                ))}
              </select>
              <span className="provider-note">
                Note: Claude does not support embeddings. Use OpenAI or Gemini for semantic search.
              </span>
            </div>
          </div>

          {saveStatus && (
            <div className="save-status success">{saveStatus}</div>
          )}

          <div className="api-settings-note">
            <strong>Security Note:</strong> API keys are stored in your browser's local storage.
            They are never sent to our servers, only to their respective API providers.
          </div>
        </div>

        <div className="api-settings-footer">
          <button className="cancel-btn" onClick={closeSettings}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApiKeySettings;
