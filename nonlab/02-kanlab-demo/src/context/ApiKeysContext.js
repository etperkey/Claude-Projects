import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ApiKeysContext = createContext();

const API_KEYS_STORAGE_KEY = 'research-dashboard-api-keys';
const PROVIDER_PREFS_STORAGE_KEY = 'research-dashboard-ai-providers';

// Available AI providers
export const AI_PROVIDERS = {
  CLAUDE: 'claude',
  OPENAI: 'openai',
  GEMINI: 'gemini'
};

// Provider display names
export const PROVIDER_NAMES = {
  [AI_PROVIDERS.CLAUDE]: 'Claude',
  [AI_PROVIDERS.OPENAI]: 'ChatGPT (OpenAI)',
  [AI_PROVIDERS.GEMINI]: 'Gemini'
};

// Which providers support which features
export const PROVIDER_CAPABILITIES = {
  [AI_PROVIDERS.CLAUDE]: { summarization: true, embeddings: false },
  [AI_PROVIDERS.OPENAI]: { summarization: true, embeddings: true },
  [AI_PROVIDERS.GEMINI]: { summarization: true, embeddings: true }
};

export function ApiKeysProvider({ children }) {
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem(API_KEYS_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : {
        claudeApiKey: '',
        openaiApiKey: '',
        geminiApiKey: ''
      };
    } catch {
      return {
        claudeApiKey: '',
        openaiApiKey: '',
        geminiApiKey: ''
      };
    }
  });

  // Provider preferences for different features
  const [providerPrefs, setProviderPrefs] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_PREFS_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : {
        summarization: AI_PROVIDERS.CLAUDE,
        embeddings: AI_PROVIDERS.OPENAI
      };
    } catch {
      return {
        summarization: AI_PROVIDERS.CLAUDE,
        embeddings: AI_PROVIDERS.OPENAI
      };
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist API keys
  useEffect(() => {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Persist provider preferences
  useEffect(() => {
    localStorage.setItem(PROVIDER_PREFS_STORAGE_KEY, JSON.stringify(providerPrefs));
  }, [providerPrefs]);

  const setClaudeApiKey = useCallback((key) => {
    setApiKeys(prev => ({ ...prev, claudeApiKey: key }));
  }, []);

  const setOpenaiApiKey = useCallback((key) => {
    setApiKeys(prev => ({ ...prev, openaiApiKey: key }));
  }, []);

  const setGeminiApiKey = useCallback((key) => {
    setApiKeys(prev => ({ ...prev, geminiApiKey: key }));
  }, []);

  const clearApiKeys = useCallback(() => {
    setApiKeys({
      claudeApiKey: '',
      openaiApiKey: '',
      geminiApiKey: ''
    });
  }, []);

  const hasClaudeKey = Boolean(apiKeys.claudeApiKey);
  const hasOpenaiKey = Boolean(apiKeys.openaiApiKey);
  const hasGeminiKey = Boolean(apiKeys.geminiApiKey);

  // Get API key for a specific provider
  const getApiKeyForProvider = useCallback((provider) => {
    switch (provider) {
      case AI_PROVIDERS.CLAUDE:
        return apiKeys.claudeApiKey;
      case AI_PROVIDERS.OPENAI:
        return apiKeys.openaiApiKey;
      case AI_PROVIDERS.GEMINI:
        return apiKeys.geminiApiKey;
      default:
        return '';
    }
  }, [apiKeys]);

  // Check if a provider has an API key configured
  const hasKeyForProvider = useCallback((provider) => {
    return Boolean(getApiKeyForProvider(provider));
  }, [getApiKeyForProvider]);

  // Set provider preference for a feature
  const setSummarizationProvider = useCallback((provider) => {
    if (PROVIDER_CAPABILITIES[provider]?.summarization) {
      setProviderPrefs(prev => ({ ...prev, summarization: provider }));
    }
  }, []);

  const setEmbeddingsProvider = useCallback((provider) => {
    if (PROVIDER_CAPABILITIES[provider]?.embeddings) {
      setProviderPrefs(prev => ({ ...prev, embeddings: provider }));
    }
  }, []);

  // Get available providers for a feature (that have API keys configured)
  const getAvailableProvidersForSummarization = useCallback(() => {
    return Object.values(AI_PROVIDERS).filter(
      p => PROVIDER_CAPABILITIES[p]?.summarization && hasKeyForProvider(p)
    );
  }, [hasKeyForProvider]);

  const getAvailableProvidersForEmbeddings = useCallback(() => {
    return Object.values(AI_PROVIDERS).filter(
      p => PROVIDER_CAPABILITIES[p]?.embeddings && hasKeyForProvider(p)
    );
  }, [hasKeyForProvider]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  // Validate Claude API key format (starts with sk-ant-)
  const validateClaudeKey = useCallback((key) => {
    if (!key) return { valid: false, message: 'API key is required' };
    if (!key.startsWith('sk-ant-')) {
      return { valid: false, message: 'Claude API key should start with sk-ant-' };
    }
    return { valid: true, message: '' };
  }, []);

  // Validate OpenAI API key format (starts with sk-)
  const validateOpenaiKey = useCallback((key) => {
    if (!key) return { valid: false, message: 'API key is required' };
    if (!key.startsWith('sk-')) {
      return { valid: false, message: 'OpenAI API key should start with sk-' };
    }
    return { valid: true, message: '' };
  }, []);

  // Validate Gemini API key format (typically starts with AI)
  const validateGeminiKey = useCallback((key) => {
    if (!key) return { valid: false, message: 'API key is required' };
    // Gemini keys can have various formats, just check it's not empty and reasonable length
    if (key.length < 20) {
      return { valid: false, message: 'Gemini API key appears too short' };
    }
    return { valid: true, message: '' };
  }, []);

  return (
    <ApiKeysContext.Provider value={{
      // API keys
      claudeApiKey: apiKeys.claudeApiKey,
      openaiApiKey: apiKeys.openaiApiKey,
      geminiApiKey: apiKeys.geminiApiKey,
      setClaudeApiKey,
      setOpenaiApiKey,
      setGeminiApiKey,
      clearApiKeys,
      hasClaudeKey,
      hasOpenaiKey,
      hasGeminiKey,
      getApiKeyForProvider,
      hasKeyForProvider,
      // Provider preferences
      summarizationProvider: providerPrefs.summarization,
      embeddingsProvider: providerPrefs.embeddings,
      setSummarizationProvider,
      setEmbeddingsProvider,
      getAvailableProvidersForSummarization,
      getAvailableProvidersForEmbeddings,
      // Settings modal
      isSettingsOpen,
      openSettings,
      closeSettings,
      // Validation
      validateClaudeKey,
      validateOpenaiKey,
      validateGeminiKey
    }}>
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error('useApiKeys must be used within ApiKeysProvider');
  }
  return context;
}
