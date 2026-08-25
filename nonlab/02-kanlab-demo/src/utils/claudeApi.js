/**
 * Claude API integration for paper summarization
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-haiku-20240307'; // Fast and cost-effective for summarization

/**
 * Generate a summary of a research paper using Claude API
 * @param {string} apiKey - Claude API key
 * @param {object} paper - Paper object with title, authors, abstract, journal, year
 * @returns {Promise<object>} - Summary object with summary text and key findings
 */
export async function summarizePaper(apiKey, paper) {
  if (!apiKey) {
    throw new Error('Claude API key is required');
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

Respond in JSON format:
{
  "summary": "Your 2-3 sentence summary here",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Claude API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 400) {
        throw new Error(errorData.error?.message || 'Bad request to Claude API');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      throw new Error('No response from Claude API');
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        keyFindings: parsed.keyFindings || [],
        generatedAt: new Date().toISOString(),
        modelUsed: MODEL
      };
    } catch (parseError) {
      // If JSON parsing fails, extract text manually
      return {
        summary: content.trim(),
        keyFindings: [],
        generatedAt: new Date().toISOString(),
        modelUsed: MODEL
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
 * @param {string} apiKey - Claude API key
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

    // Add a small delay between requests to avoid rate limiting
    if (i < papers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Check if the Claude API key is valid by making a test request
 * @param {string} apiKey - Claude API key to validate
 * @returns {Promise<boolean>} - True if valid, throws error otherwise
 */
export async function validateClaudeApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi'
          }
        ]
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
 * Note: Claude does not offer a native embeddings API.
 * For semantic search, please use OpenAI or Gemini embeddings.
 * These functions are provided for API consistency but will throw errors.
 */

/**
 * Generate embedding - NOT SUPPORTED by Claude
 * @throws {Error} Always throws - Claude doesn't support embeddings
 */
export async function generateEmbedding() {
  throw new Error('Claude does not offer a native embeddings API. Please use OpenAI or Gemini for semantic search.');
}

/**
 * Generate batch embeddings - NOT SUPPORTED by Claude
 * @throws {Error} Always throws - Claude doesn't support embeddings
 */
export async function generateBatchEmbeddings() {
  throw new Error('Claude does not offer a native embeddings API. Please use OpenAI or Gemini for semantic search.');
}

/**
 * Check if Claude supports embeddings
 * @returns {boolean} - Always false
 */
export function supportsEmbeddings() {
  return false;
}

/**
 * Get embedding dimension - N/A for Claude
 * @returns {number} - Returns 0 as Claude doesn't support embeddings
 */
export function getEmbeddingDimension() {
  return 0;
}
