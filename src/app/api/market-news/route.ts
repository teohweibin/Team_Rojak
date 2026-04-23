import { getZAI } from '@/lib/zai';
import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
}

export async function GET() {
  try {
    const zai = await getZAI();

    const queries = [
      'Malaysia supply chain news 2026',
      'MYR ringgit exchange rate news',
      'commodity prices Asia 2026',
      'manufacturing trade news Southeast Asia',
    ];

    const allItems: NewsItem[] = [];

    for (const query of queries) {
      try {
        const results = await zai.functions.invoke('web_search', {
          query,
          num: 3,
          recency_days: 7,
        });

        for (const item of results) {
          allItems.push({
            title: item.name,
            summary: item.snippet,
            date: item.date || new Date().toISOString().split('T')[0],
            source: item.host_name,
            url: item.url,
          });
        }
      } catch (err) {
        console.error(`Search failed for "${query}":`, err);
      }
    }

    const seen = new Set<string>();
    const unique = allItems.filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json(unique.slice(0, 12));
  } catch (error) {
    console.error('Market news fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch market news' }, { status: 500 });
  }
}
