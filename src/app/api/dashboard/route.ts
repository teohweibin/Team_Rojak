import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true },
    });

    const recommendations = await db.recommendation.findMany({
      where: { status: 'pending' },
    });

    // Inventory value
    const totalValue = products.reduce((sum, p) => {
      const qty = p.inventory?.quantity || 0;
      return sum + qty * p.unitPriceMyr;
    }, 0);

    // At risk stock
    let criticalCount = 0;
    let lowCount = 0;
    for (const p of products) {
      const qty = p.inventory?.quantity || 0;
      if (qty === 0) continue;
      if (qty < p.reorderPoint * 0.3) criticalCount++;
      else if (qty < p.reorderPoint) lowCount++;
    }

    // Pending recommendations
    const pendingRecs = recommendations.length;
    const totalSavings = recommendations.reduce((sum, r) => sum + (r.savingsMyr || 0), 0);

    // Exchange rates
    const exchangeRates = await db.exchangeRate.findMany();

    // Recent movements
    const movements = await db.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      inventoryValue: totalValue,
      productCount: products.length,
      criticalCount,
      lowCount,
      pendingRecommendations: pendingRecs,
      totalSavings,
      exchangeRates,
      recentMovements: movements,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
