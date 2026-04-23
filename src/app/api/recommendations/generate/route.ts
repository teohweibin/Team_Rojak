import { db } from '@/lib/db';
import { ilmu } from '@/lib/ilmu';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true, sales: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productSummaries = await Promise.all(
      products.map(async (p) => {
        const qty = p.inventory?.quantity || 0;
        const salesAgg = await db.sale.aggregate({
          where: { productId: p.id, date: { gte: thirtyDaysAgo } },
          _sum: { quantity: true },
        });
        const totalSold = salesAgg._sum.quantity || 0;
        const avgDaily = Math.round((totalSold / 30) * 10) / 10;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          unitPriceMyr: p.unitPriceMyr,
          reorderPoint: p.reorderPoint,
          leadTimeDays: p.leadTimeDays,
          currentStock: qty,
          avgDailySales: avgDaily,
          supplier: p.supplier.name,
          supplierCountry: p.supplier.country,
          supplierCurrency: p.supplier.currency,
        };
      })
    );

    const prompt = `You are an expert supply chain analyst for a Malaysian SME. Analyze the following product inventory data and generate actionable recommendations.

For each product that needs attention, create a recommendation with one of these types:
- "reorder": Stock is low or will run out before the next delivery
- "price_adjust": Pricing could be optimized based on demand/supply
- "supplier_switch": A better supplier option may exist (consider country/currency risk)

Product Data:
${JSON.stringify(productSummaries, null, 2)}

Respond with ONLY a JSON array of recommendations. Each recommendation must have:
- "productId": the product id
- "type": one of "reorder", "price_adjust", "supplier_switch"
- "priority": one of "critical", "high", "medium"
- "message": a clear, specific recommendation message (1-2 sentences)
- "savingsMyr": estimated annual savings in MYR (number, or null if not applicable)

Focus on the most impactful recommendations (max 5). Only recommend products that genuinely need attention.`;

    const completion = await ilmu.chat.completions.create({
      model: 'ilmu-glm-5.1',
      messages: [
        { role: 'system', content: 'You are a supply chain optimization AI. Always respond with valid JSON only, no markdown or explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });
    }

    let recommendations: Array<{ productId: string; type: string; priority: string; message: string; savingsMyr: number | null }>;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 });
    }

    if (!Array.isArray(recommendations)) {
      return NextResponse.json({ error: 'AI response is not an array', raw: content }, { status: 500 });
    }

    const created: Awaited<ReturnType<typeof db.recommendation.create>>[] = [];
    for (const rec of recommendations) {
      if (!rec.productId || !rec.type || !rec.message) continue;

      const product = products.find((p) => p.id === rec.productId);
      if (!product) continue;

      const saved = await db.recommendation.create({
        data: {
          productId: rec.productId,
          type: rec.type,
          priority: rec.priority || 'medium',
          message: rec.message,
          savingsMyr: rec.savingsMyr || null,
          status: 'pending',
        },
      });
      created.push(saved);
    }

    return NextResponse.json({ generated: created.length, recommendations: created });
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
