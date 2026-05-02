import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
}

function formatAlphaDate(dateStr: string) {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Alpha Vantage raw: 20260502T230000
  // Goal: 2026-05-02
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing Key' }, { status: 500 });

    // 1. Calculate the date for 1 week ago
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Format to YYYYMMDDTHHMM (e.g., 20240425T0000)
    const timeFrom = lastWeek.toISOString().replace(/[-:]/g, '').split('.')[0].slice(0, 13);

    const keywords = [
      'supply chain', 'trade', 'logistics', 'manufacturing', 
      'commodity', 'inventory', 'tariff', 'Malaysia', 'Asia', 
      'market', 'sales', 'finance', 'war', 'conflict', 
      'economic impact', 'inflation', 'business', 'stocks', 'economy'
    ].join(',');

    // 2. Add &time_from and &limit=50 to the URL
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
            `&keywords=${encodeURIComponent(keywords)}` +
            `&time_from=${timeFrom}` + 
            `&limit=100` + // Requesting more to ensure we have enough after filtering
            `&apikey=${apiKey}`;

    const response = await fetch(url, { next: { revalidate: 1800 } });
    const data = await response.json();

    if (!data.feed) return NextResponse.json([]);

    // 3. Return the results (the slice is optional, you can keep all 50)
    const news = data.feed.map((item: any) => ({
      title: item.title,
      summary: item.summary,
      date: formatAlphaDate(item.time_published), // Now sends "2026-05-02"
      source: item.source,
      url: item.url,
      sentiment: item.overall_sentiment_label
    }));

    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}