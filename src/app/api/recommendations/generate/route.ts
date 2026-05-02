import { db } from '@/lib/db';
import { zai } from '@/lib/zai';
import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  sentiment?: string;
  relevance?: string;
}

function formatAlphaDate(dateStr: string) {
  if (!dateStr) return new Date().toISOString();
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(9, 11) || '00';
  const minute = dateStr.slice(11, 13) || '00';
  const second = dateStr.slice(13, 15) || '00';
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

async function fetchMarketNews(): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.error('Missing ALPHA_VANTAGE_API_KEY');
      return [];
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
      'Asia',
    ].join(',');

    const url =
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
      `&keywords=${encodeURIComponent(keywords)}` +
      `&apikey=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      console.error('Alpha Vantage request failed:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.feed) return [];

    return data.feed.slice(0, 8).map((item: any) => ({
      title: item.title || 'Untitled News',
      summary: item.summary || 'No summary available.',
      date: formatAlphaDate(item.time_published),
      source: item.source || 'Unknown Source',
      url: item.url || '',
      sentiment: item.overall_sentiment_label || '',
      relevance: item.relevance_score || '',
    }));
  } catch (error) {
    console.error('Market news fetch failed:', error);
    return [];
  }
}

export async function POST() {
  try {
    const products = await db.product.findMany({
      take: 4,
      include: { supplier: true, inventory: true, sales: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    const salesAgg = await db.sale.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
    });
    const salesMap = new Map(salesAgg.map((s) => [s.productId, s._sum.quantity || 0]));

    const productSummaries = products.map((p) => {
      const totalSold = salesMap.get(p.id) || 0;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        cat: p.category,
        price: p.unitPriceMyr,
        reorder: p.reorderPoint,
        leadDays: p.leadTimeDays,
        stock: p.inventory?.quantity || 0,
        avgDaily: Math.round((totalSold / 30) * 10) / 10,
        supplier: p.supplier.name,
        country: p.supplier.country,
        currency: p.supplier.currency,
      };
    });

    // Fetch real market news from Alpha Vantage
    const newsItems = await fetchMarketNews();
    const newsContext = newsItems.length > 0
      ? newsItems
          .map((n, i) => {
            let line = `[${i + 1}] "${n.title}" (${n.source}, ${n.date})`;
            if (n.sentiment) line += ` — Sentiment: ${n.sentiment}`;
            line += ` — ${n.summary}`;
            return line;
          })
          .join('\n')
      : '';

    const prompt = `You are a supply chain intelligence analyst for a Malaysian SME. Analyze the product data below alongside real-time market news intelligence to generate up to 5 actionable recommendations.

RECOMMENDATION TYPES:
- "reorder": Stock is low or will run out before next delivery. Factor in lead time, supplier country risks, and any supply chain disruptions in the news.
- "price_adjust": Demand patterns, market sentiment, commodity price shifts, or currency fluctuations warrant a price change. Reference specific news if relevant.
- "supplier_switch": Current supplier has risks (geopolitical, currency, reliability) and alternatives should be considered. Cite news about trade disruptions.

PRIORITY: "critical" (immediate action needed), "high" (act within days), "medium" (monitor and plan)

PRODUCT DATA:
${JSON.stringify(productSummaries)}

MARKET NEWS INTELLIGENCE:
${newsContext || '(No market news available — base reasoning on product data only)'}

INSTRUCTIONS:
1. Cross-reference each product with the market news above. If news mentions supply chain disruptions, tariffs, currency shifts, or commodity changes that affect a product, factor that into your recommendation.
2. For each recommendation, write a "reasoning" field (3-4 sentences) that explains:
   - What specific data point or metric triggered this recommendation
   - How relevant market news (if any) supports or amplifies the risk/opportunity
   - What the business impact would be if no action is taken
3. In "newsReferences", list the news item numbers [1-based] that are directly relevant. Use [] if none apply.

Respond ONLY with a valid JSON array. Each item:
{"productId","type","priority","message","savingsMyr","reasoning","newsReferences"}`;

    const completion = await zai.chat.completions.create({
      model: 'GLM-5.1',
      messages: [
        { role: 'system', content: 'You are a supply chain intelligence AI. You cross-reference real-time market news with inventory data to produce actionable, evidence-backed recommendations. Always cite specific data and news in your reasoning. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });
    }

    let recommendations: Array<{
      productId: string;
      type: string;
      priority: string;
      message: string;
      savingsMyr: number | null;
      reasoning: string;
      newsReferences: number[];
    }>;
    try {
      let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const arrStart = cleaned.indexOf('[');
      const arrEnd = cleaned.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd !== -1) {
        cleaned = cleaned.slice(arrStart, arrEnd + 1);
      }
      recommendations = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 });
    }

    if (!Array.isArray(recommendations)) {
      return NextResponse.json({ error: 'AI response is not an array', raw: content }, { status: 500 });
    }

    const validRecs = recommendations.filter(
      (rec) => rec.productId && rec.type && rec.message && products.some((p) => p.id === rec.productId)
    );

    const created = await db.recommendation.createMany({
      data: validRecs.map((rec) => {
        const refLinks: Array<{ title: string; url: string }> = [];
        if (Array.isArray(rec.newsReferences)) {
          for (const idx of rec.newsReferences) {
            const newsItem = newsItems[idx - 1];
            if (newsItem) {
              refLinks.push({ title: newsItem.title, url: newsItem.url });
            }
          }
        }

        return {
          productId: rec.productId,
          type: rec.type,
          priority: rec.priority || 'medium',
          message: rec.message,
          savingsMyr: rec.savingsMyr || null,
          reasoning: rec.reasoning || null,
          newsReferences: refLinks.length > 0 ? JSON.stringify(refLinks) : null,
          status: 'pending',
        };
      }),
    });

    return NextResponse.json({ generated: created.count });
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
