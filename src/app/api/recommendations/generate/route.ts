import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { prompt } = await request.json();

  try {
    const { default: AI } = await import('z-ai-web-dev-sdk');
    const ai = new AI();

    // Gather inventory data for AI analysis
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true, sales: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await db.sale.groupBy({
      by: ['productId'],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { quantity: true, total: true },
    });

    const exchangeRates = await db.exchangeRate.findMany();

    const inventorySummary = products.map((p) => {
      const sales = salesData.find((s) => s.productId === p.id);
      const velocity = (sales?._sum.quantity || 0) / 30;
      const inv = p.inventory;
      const daysCover = velocity > 0 ? Math.floor((inv?.quantity || 0) / velocity) : 999;
      let status = 'Healthy';
      if (!inv || inv.quantity === 0) status = 'Out of Stock';
      else if (inv.quantity < p.reorderPoint * 0.3) status = 'Critical';
      else if (inv.quantity < p.reorderPoint) status = 'Low';

      return {
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPriceMyr,
        reorderPoint: p.reorderPoint,
        leadTime: p.leadTimeDays,
        supplier: p.supplier.name,
        supplierCurrency: p.supplier.currency,
        stock: inv?.quantity || 0,
        dailyVelocity: velocity.toFixed(2),
        daysCover,
        status,
        totalRevenue30d: sales?._sum.total || 0,
      };
    });

    const rates = exchangeRates.map((r) => `${r.fromCurrency}/${r.toCurrency}: ${r.rate}`).join(', ');

    const systemPrompt = `You are a supply chain AI advisor for a Malaysian coffee shop and goods business. Analyze inventory data and generate actionable recommendations. Currency is MYR. Current exchange rates: ${rates}. 

Respond ONLY with a JSON array of recommendations. Each object must have:
- "productId": the exact product name to match
- "type": one of "reorder", "price_adjust", "supplier_switch"
- "priority": one of "critical", "high", "medium"
- "message": clear actionable recommendation (2-3 sentences)
- "savingsMyr": estimated savings in MYR (number or null)

Generate 2-4 relevant recommendations based on the data. Only include recommendations that make sense.`;

    const userMessage = `Analyze this inventory data and generate recommendations:\n${JSON.stringify(inventorySummary, null, 2)}`;

    const completion = await ai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '[]';

    // Parse the AI response - try to extract JSON array
    let recommendations: Array<{
      productId: string;
      type: string;
      priority: string;
      message: string;
      savingsMyr: number | null;
    }> = [];

    try {
      // Try to find JSON array in the response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        recommendations = JSON.parse(match[0]);
      }
    } catch {
      // Fallback: create generic recommendation
      recommendations = [{
        productId: products[0]?.name || 'Unknown',
        type: 'reorder',
        priority: 'medium',
        message: 'Review inventory levels and place reorders for items approaching their reorder points.',
        savingsMyr: null,
      }];
    }

    // Map product names to IDs and save to DB
    const savedRecommendations = [];
    for (const rec of recommendations) {
      const product = products.find(
        (p) => p.name.toLowerCase() === rec.productId.toLowerCase()
      );
      if (product) {
        const saved = await db.recommendation.create({
          data: {
            productId: product.id,
            type: rec.type,
            priority: rec.priority,
            message: rec.message,
            status: 'pending',
            savingsMyr: rec.savingsMyr,
          },
          include: { product: true },
        });
        savedRecommendations.push(saved);
      }
    }

    return NextResponse.json(savedRecommendations);
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
