// Citation fetcher utility for PubMed and DOI

/**
 * Fetch citation details from PubMed by PMID
 * Uses NCBI E-utilities API (free, no API key required for reasonable use)
 */
export async function fetchFromPubMed(pmid) {
  const cleanPmid = pmid.toString().trim();

  try {
    // Use efetch to get detailed citation info in XML format
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${cleanPmid}&retmode=xml`
    );

    if (!response.ok) {
      throw new Error(`PubMed API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    // Check for errors
    const error = xml.querySelector('ERROR');
    if (error) {
      throw new Error(error.textContent);
    }

    const article = xml.querySelector('PubmedArticle');
    if (!article) {
      throw new Error('Article not found');
    }

    // Extract citation details
    const title = article.querySelector('ArticleTitle')?.textContent || '';
    const abstractText = article.querySelector('Abstract AbstractText')?.textContent || '';

    // Get authors
    const authorNodes = article.querySelectorAll('Author');
    const authors = Array.from(authorNodes).map(author => {
      const lastName = author.querySelector('LastName')?.textContent || '';
      const firstName = author.querySelector('ForeName')?.textContent || '';
      const initials = author.querySelector('Initials')?.textContent || '';
      return lastName ? `${lastName} ${initials || firstName}` : '';
    }).filter(Boolean).join(', ');

    // Get journal info
    const journal = article.querySelector('Journal Title')?.textContent ||
                   article.querySelector('ISOAbbreviation')?.textContent || '';
    const volume = article.querySelector('Volume')?.textContent || '';
    const issue = article.querySelector('Issue')?.textContent || '';
    const pages = article.querySelector('MedlinePgn')?.textContent || '';

    // Get year
    const pubDate = article.querySelector('PubDate');
    const year = pubDate?.querySelector('Year')?.textContent ||
                pubDate?.querySelector('MedlineDate')?.textContent?.substring(0, 4) || '';

    // Get DOI if available
    const doiNode = article.querySelector('ArticleId[IdType="doi"]');
    const doi = doiNode?.textContent || '';

    return {
      id: `pmid-${cleanPmid}-${Date.now()}`,
      pmid: cleanPmid,
      doi,
      title,
      authors,
      journal,
      year,
      volume,
      issue,
      pages,
      abstract: abstractText,
      url: `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`,
      source: 'pubmed',
      dateAdded: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching PMID ${cleanPmid}:`, error);
    throw new Error(`Failed to fetch PMID ${cleanPmid}: ${error.message}`);
  }
}

/**
 * Fetch citation details from DOI using CrossRef API
 */
export async function fetchFromDOI(doi) {
  // Clean up DOI - remove URL prefix if present
  let cleanDoi = doi.trim();
  if (cleanDoi.startsWith('https://doi.org/')) {
    cleanDoi = cleanDoi.replace('https://doi.org/', '');
  } else if (cleanDoi.startsWith('http://doi.org/')) {
    cleanDoi = cleanDoi.replace('http://doi.org/', '');
  } else if (cleanDoi.startsWith('doi:')) {
    cleanDoi = cleanDoi.replace('doi:', '');
  }

  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('DOI not found');
      }
      throw new Error(`CrossRef API error: ${response.status}`);
    }

    const data = await response.json();
    const work = data.message;

    // Extract authors
    const authors = (work.author || []).map(a => {
      if (a.family && a.given) {
        return `${a.family} ${a.given.charAt(0)}`;
      }
      return a.name || '';
    }).filter(Boolean).join(', ');

    // Extract year
    const published = work.published || work['published-print'] || work['published-online'];
    const year = published?.['date-parts']?.[0]?.[0]?.toString() || '';

    // Get title
    const title = Array.isArray(work.title) ? work.title[0] : work.title || '';

    // Get journal
    const journal = Array.isArray(work['container-title'])
      ? work['container-title'][0]
      : work['container-title'] || '';

    return {
      id: `doi-${Date.now()}`,
      pmid: '',
      doi: cleanDoi,
      title,
      authors,
      journal,
      year,
      volume: work.volume || '',
      issue: work.issue || '',
      pages: work.page || '',
      abstract: work.abstract ? work.abstract.replace(/<[^>]*>/g, '') : '',
      url: `https://doi.org/${cleanDoi}`,
      source: 'crossref',
      dateAdded: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching DOI ${cleanDoi}:`, error);
    throw new Error(`Failed to fetch DOI ${cleanDoi}: ${error.message}`);
  }
}

/**
 * Parse input string to extract PMIDs and DOIs
 * Supports comma, space, newline, or semicolon separated values
 */
export function parseIdentifiers(input) {
  const identifiers = [];

  // Split by common delimiters
  const parts = input.split(/[,;\s\n]+/).filter(Boolean);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check if it's a DOI (contains slash or starts with 10.)
    if (trimmed.includes('/') || trimmed.startsWith('10.') ||
        trimmed.toLowerCase().startsWith('doi:') ||
        trimmed.toLowerCase().includes('doi.org')) {
      identifiers.push({ type: 'doi', value: trimmed });
    }
    // Check if it's a PMID (numeric only, optionally prefixed)
    else if (/^(pmid[:\s]*)?(\d+)$/i.test(trimmed)) {
      const pmid = trimmed.replace(/^pmid[:\s]*/i, '');
      identifiers.push({ type: 'pmid', value: pmid });
    }
    // If it's just numbers, assume PMID
    else if (/^\d+$/.test(trimmed)) {
      identifiers.push({ type: 'pmid', value: trimmed });
    }
  }

  return identifiers;
}

/**
 * Fetch multiple citations from a mixed input of PMIDs and DOIs
 * Returns { success: [], failed: [] }
 */
export async function fetchMultipleCitations(input) {
  const identifiers = parseIdentifiers(input);
  const results = { success: [], failed: [] };

  // Process in parallel with a small batch size to avoid rate limiting
  const batchSize = 5;

  for (let i = 0; i < identifiers.length; i += batchSize) {
    const batch = identifiers.slice(i, i + batchSize);

    const promises = batch.map(async ({ type, value }) => {
      try {
        let citation;
        if (type === 'pmid') {
          citation = await fetchFromPubMed(value);
        } else {
          citation = await fetchFromDOI(value);
        }
        return { success: true, citation, identifier: { type, value } };
      } catch (error) {
        return { success: false, error: error.message, identifier: { type, value } };
      }
    });

    const batchResults = await Promise.all(promises);

    for (const result of batchResults) {
      if (result.success) {
        results.success.push(result.citation);
      } else {
        results.failed.push({
          identifier: result.identifier,
          error: result.error
        });
      }
    }

    // Small delay between batches to be nice to the APIs
    if (i + batchSize < identifiers.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
