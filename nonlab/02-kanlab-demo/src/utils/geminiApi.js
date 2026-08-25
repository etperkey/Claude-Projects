/**
 * Google Gemini API integration for summarization and embeddings
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const SUMMARIZATION_MODEL = 'gemini-1.5-flash'; // Fast and cost-effective
const EMBEDDING_MODEL = 'text-embedding-004'; // Latest embedding model

/**
 * Generate a summary of a research paper using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {object} paper - Paper object with title, authors, abstract, journal, year
 * @returns {Promise<object>} - Summary object with summary text and key findings
 */
export async function summarizePaper(apiKey, paper) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (!paper.abstract) {
    throw new Error('Paper abstract is required for summarization');
  }

  const prompt = `You are a research assistant helping to summarize scientific papers. Analyze the following paper and provide:
1. A concise summary (2-3 sentences) of the main findings and significance
2. 3-5 key findings or takeaways as bullet points

Paper Details:
Title: ${paper.title || 'Unknown'}
Authors: ${paper.authors || 'Unknown'}
Journal: ${paper.journal || 'Unknown'} (${paper.year || 'Unknown'})

Abstract:
${paper.abstract}

Respond in JSON format only, no additional text:
{
  "summary": "Your 2-3 sentence summary here",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/${SUMMARIZATION_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400 && errorData.error?.message?.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        keyFindings: parsed.keyFindings || [],
        generatedAt: new Date().toISOString(),
        modelUsed: SUMMARIZATION_MODEL
      };
    } catch (parseError) {
      return {
        summary: content.trim(),
        keyFindings: [],
        generatedAt: new Date().toISOString(),
        modelUsed: SUMMARIZATION_MODEL
      };
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Generate summaries for multiple papers in batch
 * @param {string} apiKey - Gemini API key
 * @param {array} papers - Array of paper objects
 * @param {function} onProgress - Progress callback (current, total)
 * @returns {Promise<array>} - Array of results with paper id and summary or error
 */
export async function summarizePapersBatch(apiKey, papers, onProgress) {
  const results = [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    if (onProgress) {
      onProgress(i + 1, papers.length);
    }

    try {
      const summary = await summarizePaper(apiKey, paper);
      results.push({
        id: paper.id,
        success: true,
        summary
      });
    } catch (error) {
      results.push({
        id: paper.id,
        success: false,
        error: error.message
      });
    }

    // Add delay between requests to avoid rate limiting
    if (i < papers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results;
}

/**
 * Generate embedding for a single text using Gemini
 * @param {string} apiKey - Gemini API key
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector (768 dimensions)
 */
export async function generateEmbedding(apiKey, text) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text is required for embedding');
  }

  // Truncate text if too long
  const truncatedText = text.slice(0, 25000);

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: {
            parts: [{ text: truncatedText }]
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400 && errorData.error?.message?.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string} apiKey - Gemini API key
 * @param {string[]} texts - Array of texts to embed
 * @param {function} onProgress - Progress callback (current, total)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateBatchEmbeddings(apiKey, texts, onProgress) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts array is required');
  }

  const embeddings = [];
  const batchSize = 10; // Process in smaller batches

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }

    // Process batch items sequentially (Gemini doesn't have batch endpoint)
    for (const text of batch) {
      try {
        const embedding = await generateEmbedding(apiKey, text);
        embeddings.push(embedding);
      } catch (error) {
        embeddings.push(null);
        console.error('Gemini embedding error:', error);
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

/**
 * Validate a Gemini API key by making a test request
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} - True if valid
 */
export async function validateGeminiApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key');
    }

    return response.ok;
  } catch (error) {
    if (error.message === 'Invalid API key') {
      throw error;
    }
    throw new Error('Could not validate API key. Please check your connection.');
  }
}

/**
 * Get embedding dimension for Gemini model
 * @returns {number} - Embedding dimension (768 for text-embedding-004)
 */
export function getEmbeddingDimension() {
  return 768;
}

/**
 * Check if Gemini supports embeddings
 * @returns {boolean} - Always true
 */
export function supportsEmbeddings() {
  return true;
}
