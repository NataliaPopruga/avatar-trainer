import { WebSnippet } from '@prisma/client';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

function mockResults(query: string): WebSearchResult[] {
  return [
    {
      title: 'Best practices for handling angry customers',
      url: 'https://example.com/customer-support/deescalation',
      snippet: `Guidance on calming language, acknowledgement, and setting next steps related to ${query}`,
      source: 'mock',
    },
  ];
}

export async function performWebSearch(query: string, allowDomains?: string[]): Promise<WebSearchResult[]> {
  const useWeb = process.env.USE_WEB === 'true';
  const apiKey = process.env.TAVILY_API_KEY;
  if (!useWeb || !apiKey) return mockResults(query);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ query, include_domains: allowDomains, max_results: 3 }),
    });
    if (!res.ok) return mockResults(query);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.content || item.snippet,
      source: 'tavily',
    }));
  } catch (err) {
    console.error('Web search failed', err);
    return mockResults(query);
  }
}

export function mapWebSnippets(raw: WebSnippet[]) {
  return raw.map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    createdAt: item.createdAt,
  }));
}
