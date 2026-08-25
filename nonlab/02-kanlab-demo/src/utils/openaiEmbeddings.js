/**
 * OpenAI API integration for embeddings and summarization
 */

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cost-effective
const CHAT_MODEL = 'gpt-4o-mini'; // Fast and cost-effective for summarization

/**
 * Generate embedding for a single text
 * @param {string} apiKey - OpenAI API key
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(apiKey, text) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text is required for embedding');
  }

  // Truncate text if too long (max ~8000 tokens, roughly 32000 chars)
  const truncatedText = text.slice(0, 30000);

  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string} apiKey - OpenAI API key
 * @param {string[]} texts - Array of texts to embed
 * @param {function} onProgress - Progress callback (current, total)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateBatchEmbeddings(apiKey, texts, onProgress) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts array is required');
  }

  const embeddings = [];
  const batchSize = 20; // OpenAI allows up to 2048 inputs, but we batch for progress tracking

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 30000));

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }

    try {
      const response = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: batch
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const batchEmbeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);

      embeddings.push(...batchEmbeddings);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // On error, fill remaining with nulls
      for (let j = 0; j < batch.length; j++) {
        embeddings.push(null);
      }
      console.error('Batch embedding error:', error);
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find top K most similar embeddings to a query embedding
 * @param {number[]} queryEmbedding - The query embedding vector
 * @param {object[]} embeddings - Array of {id, embedding, ...metadata} objects
 * @param {number} k - Number of results to return
 * @param {number} threshold - Minimum similarity threshold (default 0.3)
 * @returns {object[]} - Top K results with similarity scores
 */
export function findTopKSimilar(queryEmbedding, embeddings, k = 10, threshold = 0.3) {
  if (!queryEmbedding || !embeddings || embeddings.length === 0) {
    return [];
  }

  const scored = embeddings
    .filter(item => item.embedding && Array.isArray(item.embedding))
    .map(item => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return scored;
}

/**
 * Generate a simple hash/checksum for text content
 * Used to detect if content has changed and needs re-embedding
 * @param {string} text - Text to hash
 * @returns {string} - Hash string
 */
export function generateChecksum(text) {
  if (!text) return '';

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Validate an OpenAI API key by making a test request
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} - True if valid
 */
export async function validateOpenaiApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: 'test'
      })
    });

    if (response.status === 401) {
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
 * Generate a summary of a research paper using OpenAI GPT
 * @param {string} apiKey - OpenAI API key
 * @param {object} paper - Paper object with title, authors, abstract, journal, year
 * @returns {Promise<object>} - Summary object with summary text and key findings
 */
export async function summarizePaper(apiKey, paper) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
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
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI API');
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
        modelUsed: CHAT_MODEL
      };
    } catch (parseError) {
      return {
        summary: content.trim(),
        keyFindings: [],
        generatedAt: new Date().toISOString(),
        modelUsed: CHAT_MODEL
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
 * @param {string} apiKey - OpenAI API key
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
 * Get embedding dimension for OpenAI model
 * @returns {number} - Embedding dimension (1536 for text-embedding-3-small)
 */
export function getEmbeddingDimension() {
  return 1536;
}

/**
 * Check if OpenAI supports embeddings
 * @returns {boolean} - Always true
 */
export function supportsEmbeddings() {
  return true;
}
