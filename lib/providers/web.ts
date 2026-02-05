import { WebSnippet } from '@prisma/client';
import { listWebSources, getWebConfig } from '@/lib/web-config';

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

export async function performWebSearch(query: string): Promise<WebSearchResult[]> {
  const cfg = await getWebConfig();
  const useWebFlag = process.env.USE_WEB === 'true';
  if (!cfg.webEnabled || !useWebFlag) return [];
  const allowlist = (await listWebSources()).filter((s) => s.enabled);
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const include_domains = allowlist.length ? allowlist.map((s) => s.domain) : undefined;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ query, include_domains, max_results: 3 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.content || item.snippet,
      source: 'tavily',
    }));
  } catch (err) {
    console.error('Web search failed', err);
    return [];
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
