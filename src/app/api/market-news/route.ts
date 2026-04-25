import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
}

function formatAlphaDate(dateStr: string) {
  // Alpha Vantage format: 20260422T120000
  if (!dateStr) return new Date().toISOString();

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(9, 11) || '00';
  const minute = dateStr.slice(11, 13) || '00';
  const second = dateStr.slice(13, 15) || '00';

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export async function GET() {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ALPHA_VANTAGE_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const keywords = [
      'supply chain',
      'trade',
      'logistics',
      'manufacturing',
      'commodity',
      'inventory',
      'tariff',
      'Malaysia',
      'Asia'
    ].join(',');

    const url =
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
      `&keywords=${encodeURIComponent(keywords)}` +
      `&apikey=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Alpha Vantage news');
    }

    const data = await response.json();

    if (!data.feed) {
      return NextResponse.json([]);
    }

    const news: NewsItem[] = data.feed.slice(0, 12).map((item: any) => ({
      title: item.title || 'Untitled News',
      summary: item.summary || 'No summary available.',
      date: formatAlphaDate(item.time_published),
      source: item.source || 'Unknown Source',
      url: item.url || '',
    }));

    return NextResponse.json(news);
  } catch (error) {
    console.error('Market news fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market news' },
      { status: 500 }
    );
  }
}