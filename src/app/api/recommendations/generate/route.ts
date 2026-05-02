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

interface AiRecommendation {
  productId: string;
  type: 'reorder' | 'price_adjust' | 'supplier_switch';
  priority: 'critical' | 'high' | 'medium';
  message: string;
  savingsMyr: number | null;
  reasoning: string;
  newsReferences: number[];
}

const MAX_PRODUCTS = 4;
const MAX_NEWS_ITEMS = 5;
const MAX_NEWS_SUMMARY_CHARS = 220;
const MAX_AI_RECOMMENDATIONS = 3;

function truncateText(text: string, maxChars: number) {
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars).trim()}...` : text;
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

function safeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getInventoryQuantity(inventory: any) {
  if (Array.isArray(inventory)) {
    return safeNumber(inventory[0]?.quantity, 0);
  }

  return safeNumber(inventory?.quantity, 0);
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
      'logistics',
      'tariff',
      'manufacturing',
      'commodity',
      'Malaysia',
      'Asia',
    ].join(',');

    const url =
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
      `&keywords=${encodeURIComponent(keywords)}` +
      `&sort=LATEST` +
      `&limit=${MAX_NEWS_ITEMS}` +
      `&apikey=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      console.error('Alpha Vantage request failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.feed || !Array.isArray(data.feed)) {
      return [];
    }

    return data.feed.slice(0, MAX_NEWS_ITEMS).map((item: any) => ({
      title: truncateText(item.title || 'Untitled News', 120),
      summary: truncateText(item.summary || '', MAX_NEWS_SUMMARY_CHARS),
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

function buildCompactPrompt(productSummaries: any[], newsItems: NewsItem[]) {
  const newsBlock =
    newsItems.length > 0
      ? newsItems
          .map((n, index) => {
            const sentiment = n.sentiment ? ` sentiment=${n.sentiment}` : '';
            return `${index + 1}. ${n.title} | ${n.source} | ${n.date}${sentiment} | ${n.summary}`;
          })
          .join('\n')
      : 'No news available. Use product data only.';

  return `
You are generating inventory recommendations for a Malaysian SME.

Return ONLY valid JSON array. Max ${MAX_AI_RECOMMENDATIONS} items.

Allowed type:
- reorder
- price_adjust
- supplier_switch

Allowed priority:
- critical
- high
- medium

Rules:
- Recommend only when action is useful.
- Use news only if directly relevant.
- Keep message <= 120 chars.
- Keep reasoning <= 260 chars.
- newsReferences must use 1-based news numbers, or [].
- savingsMyr can be null.

JSON shape:
[
  {
    "productId": "string",
    "type": "reorder|price_adjust|supplier_switch",
    "priority": "critical|high|medium",
    "message": "short action",
    "savingsMyr": number|null,
    "reasoning": "short evidence-based reason",
    "newsReferences": [1]
  }
]

Products:
${JSON.stringify(productSummaries)}

News:
${newsBlock}
`.trim();
}

function cleanAiJson(content: string) {
  let cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');

  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    cleaned = cleaned.slice(arrStart, arrEnd + 1);
  }

  return cleaned;
}

function isValidRecommendation(
  rec: Partial<AiRecommendation>,
  validProductIds: Set<string>
): rec is AiRecommendation {
  const validTypes = ['reorder', 'price_adjust', 'supplier_switch'];
  const validPriorities = ['critical', 'high', 'medium'];

  return Boolean(
    rec.productId &&
      validProductIds.has(rec.productId) &&
      rec.type &&
      validTypes.includes(rec.type) &&
      rec.message &&
      typeof rec.message === 'string' &&
      rec.priority &&
      validPriorities.includes(rec.priority)
  );
}

export async function POST() {
  try {
    const products = await db.product.findMany({
      take: MAX_PRODUCTS,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        unitPriceMyr: true,
        reorderPoint: true,
        leadTimeDays: true,
        supplier: {
          select: {
            name: true,
            country: true,
            currency: true,
          },
        },
        inventory: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    const salesAgg = await db.sale.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
    });

    const salesMap = new Map(
      salesAgg.map((sale) => [sale.productId, sale._sum.quantity || 0])
    );

    const productSummaries = products.map((product) => {
      const stock = getInventoryQuantity(product.inventory);
      const totalSold = safeNumber(salesMap.get(product.id), 0);
      const avgDaily = Math.round((totalSold / 30) * 10) / 10;
      const reorderPoint = safeNumber(product.reorderPoint, 0);
      const leadDays = safeNumber(product.leadTimeDays, 0);

      const daysCover =
        avgDaily > 0 ? Math.round((stock / avgDaily) * 10) / 10 : null;

      let risk = 'healthy';

      if (stock <= 0) {
        risk = 'out_of_stock';
      } else if (stock < reorderPoint) {
        risk = 'below_reorder';
      } else if (daysCover !== null && daysCover <= leadDays) {
        risk = 'lead_time_risk';
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        cat: product.category,
        price: product.unitPriceMyr,
        stock,
        reorder: reorderPoint,
        leadDays,
        avgDaily,
        daysCover,
        risk,
        supplier: product.supplier?.name || 'Unknown',
        country: product.supplier?.country || 'Unknown',
        currency: product.supplier?.currency || 'Unknown',
      };
    });

    const newsItems = await fetchMarketNews();
    const prompt = buildCompactPrompt(productSummaries, newsItems);

    const completion = await zai.chat.completions.create({
      model: 'glm-4.7-flash',
      messages: [
        {
          role: 'system',
          content:
            'You are a concise supply-chain recommendation engine. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'AI returned empty response' },
        { status: 500 }
      );
    }

    let recommendations: AiRecommendation[];

    try {
      const cleaned = cleanAiJson(content);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: 'AI response is not an array', raw: content },
          { status: 500 }
        );
      }

      recommendations = parsed;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: content },
        { status: 500 }
      );
    }

    const validProductIds = new Set(products.map((product) => product.id));

    const validRecs = recommendations
      .filter((rec) => isValidRecommendation(rec, validProductIds))
      .slice(0, MAX_AI_RECOMMENDATIONS);

    if (validRecs.length === 0) {
      return NextResponse.json({
        generated: 0,
        message: 'No useful recommendations generated',
      });
    }

    const created = await db.recommendation.createMany({
      data: validRecs.map((rec) => {
        const refLinks: Array<{ title: string; url: string }> = [];

        if (Array.isArray(rec.newsReferences)) {
          for (const idx of rec.newsReferences) {
            const newsItem = newsItems[idx - 1];

            if (newsItem) {
              refLinks.push({
                title: newsItem.title,
                url: newsItem.url,
              });
            }
          }
        }

        return {
          productId: rec.productId,
          type: rec.type,
          priority: rec.priority || 'medium',
          message: truncateText(rec.message, 180),
          savingsMyr: rec.savingsMyr ?? null,
          reasoning: rec.reasoning ? truncateText(rec.reasoning, 500) : null,
          newsReferences:
            refLinks.length > 0 ? JSON.stringify(refLinks) : null,
          status: 'pending',
        };
      }),
    });

    return NextResponse.json({
      generated: created.count,
    });
  } catch (error) {
    console.error('Recommendation generation failed:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate recommendations';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}