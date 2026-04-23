import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST() {
  try {
    const zai = await ZAI.create();

    // Fetch current inventory and sales data
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exchangeRates = await db.exchangeRate.findMany();

    // Build a data summary for the AI
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

    // Get sales velocity
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
      const daysCover = avgDaily > 0 ? Math.round((item.currentStock / avgDaily) * 10) / 10 : 0;
      return { ...item, avgDailySales: Math.round(avgDaily * 10) / 10, daysCover };
    });

    const rateInfo = exchangeRates.map((r) => `${r.fromCurrency}/${r.toCurrency}: ${r.rate}`).join(', ');

    const prompt = `You are an expert inventory management AI for a Malaysian business (currency: MYR). Analyze the following inventory data and generate 2-5 actionable stock refill recommendations. Focus on items that are Critical, Low, or Out of Stock.

Current exchange rates: ${rateInfo}

Inventory data:
${JSON.stringify(enrichedSummary, null, 2)}

Respond ONLY with a valid JSON array of recommendation objects. Each object must have:
- "sku": the product SKU (string)
- "type": one of "reorder", "price_adjust", or "supplier_switch" (string)
- "priority": one of "critical", "high", or "medium" (string)
- "message": a clear, specific recommendation message (string)
- "savingsMyr": estimated savings in MYR (number, can be 0)

Do NOT include any text outside the JSON array. Do NOT wrap in markdown code blocks.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an inventory management AI. Always respond with valid JSON arrays only. No markdown, no explanation, just the JSON array.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let aiContent = completion.choices[0]?.message?.content || '[]';

    // Clean up any markdown wrapping
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let recommendations: Array<{
      sku: string;
      type: string;
      priority: string;
      message: string;
      savingsMyr: number;
    }>;

    try {
      recommendations = JSON.parse(aiContent);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid response', raw: aiContent },
        { status: 500 }
      );
    }

    // Save recommendations to database
    const savedRecs = [];
    for (const rec of recommendations) {
      const product = products.find((p) => p.sku === rec.sku);
      if (!product) continue;

      // Skip if there's already a pending recommendation for this product
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
    });
  } catch (error) {
    console.error('AI recommendation generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI recommendations' },
      { status: 500 }
    );
  }
}
