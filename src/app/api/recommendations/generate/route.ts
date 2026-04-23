import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

type AIRecommendation = {
  sku: string;
  type: string;
  priority: string;
  message: string;
  savingsMyr: number;
};

async function callIlmuWithRetry(
  url: string,
  apiKey: string,
  prompt: string,
  retries = 2
) {
  let lastStatus = 0;
  let lastText = '';

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ilmu-glm-5.1',
        messages: [
          {
            role: 'system',
            content:
              'You are an inventory management AI. Always respond with valid JSON arrays only. No markdown, no explanation, just the JSON array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
      }),
    });

    const rawText = await response.text();
    console.log(`ILMU attempt ${attempt} status:`, response.status);
    console.log(`ILMU attempt ${attempt} raw response:`, rawText);

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        rawText,
      };
    }

    lastStatus = response.status;
    lastText = rawText;

    if (
      (response.status === 502 ||
        response.status === 503 ||
        response.status === 504) &&
      attempt <= retries
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      continue;
    }

    break;
  }

  return {
    ok: false,
    status: lastStatus,
    rawText: lastText,
  };
}

export async function POST() {
  try {
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exchangeRates = await db.exchangeRate.findMany();

    const inventorySummary = products.map((p) => {
      const qty = p.inventory?.quantity || 0;
      let status = 'Healthy';

      if (qty === 0) status = 'Out of Stock';
      else if (qty < p.reorderPoint * 0.3) status = 'Critical';
      else if (qty < p.reorderPoint) status = 'Low';

      return {
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPriceMyr: p.unitPriceMyr,
        currentStock: qty,
        reorderPoint: p.reorderPoint,
        leadTimeDays: p.leadTimeDays,
        supplier: p.supplier.name,
        supplierCurrency: p.supplier.currency,
        status,
      };
    });

    const salesData: Record<string, { total: number; days: number }> = {};

    for (const p of products) {
      const agg = await db.sale.aggregate({
        where: { productId: p.id, date: { gte: thirtyDaysAgo } },
        _sum: { quantity: true, total: true },
      });

      salesData[p.id] = {
        total: agg._sum.quantity || 0,
        days: 30,
      };
    }

    const enrichedSummary = inventorySummary.map((item) => {
      const p = products.find((pr) => pr.sku === item.sku);
      if (!p) return item;

      const sales = salesData[p.id] || { total: 0, days: 30 };
      const avgDaily = sales.total / sales.days;
      const daysCover =
        avgDaily > 0
          ? Math.round((item.currentStock / avgDaily) * 10) / 10
          : 0;

      return {
        ...item,
        avgDailySales: Math.round(avgDaily * 10) / 10,
        daysCover,
      };
    });

    const rateInfo = exchangeRates
      .map((r) => `${r.fromCurrency}/${r.toCurrency}: ${r.rate}`)
      .join(', ');

    if (!process.env.ILMU_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ILMU_API_KEY in environment variables' },
        { status: 500 }
      );
    }

    if (!process.env.ILMU_BASE_URL) {
      return NextResponse.json(
        { error: 'Missing ILMU_BASE_URL in environment variables' },
        { status: 500 }
      );
    }

    const targetItems = enrichedSummary.filter(
      (item) =>
        item.status === 'Critical' ||
        item.status === 'Low' ||
        item.status === 'Out of Stock'
    );

    const fallbackItems = [...enrichedSummary]
      .sort((a, b) => {
        const aDays =
          typeof a.daysCover === 'number'
            ? a.daysCover
            : Number.POSITIVE_INFINITY;
        const bDays =
          typeof b.daysCover === 'number'
            ? b.daysCover
            : Number.POSITIVE_INFINITY;

        if (aDays !== bDays) return aDays - bDays;
        return a.currentStock - b.currentStock;
      })
      .slice(0, 5);

    if (enrichedSummary.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        recommendations: [],
        message: 'No products found in inventory.',
      });
    }

    const itemsForAI = targetItems.length > 0 ? targetItems : fallbackItems;

    const prompt = `You are an expert inventory management AI for a Malaysian business (currency: MYR).

Analyze the following inventory data and generate 2-5 actionable stock refill recommendations.

Rules:
- Prioritize items with status "Critical", "Low", or "Out of Stock".
- If all items appear healthy, recommend the products with the lowest daysCover or lowest stock as preventive actions.
- Keep recommendations practical and specific.
- Prefer "reorder" unless "price_adjust" or "supplier_switch" is clearly more suitable.
- savingsMyr should be a realistic estimate, or 0 if no clear savings can be estimated.

Current exchange rates: ${rateInfo}

Inventory data:
${JSON.stringify(itemsForAI, null, 2)}

Respond ONLY with a valid JSON array of recommendation objects.
Each object must have:
- "sku": the product SKU (string)
- "type": one of "reorder", "price_adjust", or "supplier_switch" (string)
- "priority": one of "critical", "high", or "medium" (string)
- "message": a clear, specific recommendation message (string)
- "savingsMyr": estimated savings in MYR (number, can be 0)

Do NOT include any text outside the JSON array.
Do NOT wrap in markdown code blocks.`;

    console.log('Items sent to AI:', JSON.stringify(itemsForAI, null, 2));

    const ilmuResult = await callIlmuWithRetry(
      `${process.env.ILMU_BASE_URL}/chat/completions`,
      process.env.ILMU_API_KEY,
      prompt
    );

    let recommendations: AIRecommendation[] = [];

    if (ilmuResult.ok) {
      try {
        const completion = JSON.parse(ilmuResult.rawText);
        let aiContent = completion.choices?.[0]?.message?.content || '[]';

        aiContent = aiContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        recommendations = JSON.parse(aiContent);
      } catch (parseError) {
        console.log('AI JSON parse failed, switching to fallback:', parseError);
      }
    } else {
      console.log(
        'ILMU failed after retries, switching to fallback:',
        ilmuResult.status
      );
    }

    console.log('Final recommendations from AI:', recommendations);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      recommendations = itemsForAI.slice(0, 3).map((item) => ({
        sku: item.sku,
        type: 'reorder',
        priority:
          item.status === 'Out of Stock' || item.status === 'Critical'
            ? 'critical'
            : item.status === 'Low'
            ? 'high'
            : 'medium',
        message:
          item.status === 'Out of Stock'
            ? `${item.name} is out of stock. Reorder immediately to avoid lost sales.`
            : item.status === 'Critical'
            ? `${item.name} is at critical stock level. Place a reorder now to cover lead time demand.`
            : item.status === 'Low'
            ? `${item.name} is below its reorder point. Replenish stock soon to prevent stockout risk.`
            : `${item.name} has one of the lowest stock cover levels. Consider preventive replenishment.`,
        savingsMyr: 0,
      }));
    }

    const savedRecs = [];

    for (const rec of recommendations) {
      const product = products.find((p) => p.sku === rec.sku);
      if (!product) continue;

      const existing = await db.recommendation.findFirst({
        where: { productId: product.id, status: 'pending' },
      });
      if (existing) continue;

      const saved = await db.recommendation.create({
        data: {
          productId: product.id,
          type: rec.type || 'reorder',
          priority: rec.priority || 'medium',
          message: rec.message || 'Review recommended',
          savingsMyr: rec.savingsMyr || 0,
          status: 'pending',
        },
      });

      savedRecs.push(saved);
    }

    return NextResponse.json({
      success: true,
      count: savedRecs.length,
      recommendations: savedRecs,
      source: ilmuResult.ok
        ? targetItems.length > 0
          ? 'priority-items'
          : 'fallback-items'
        : 'local-fallback',
    });
  } catch (error) {
    console.error('AI recommendation generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI recommendations' },
      { status: 500 }
    );
  }
}