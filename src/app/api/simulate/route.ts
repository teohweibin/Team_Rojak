import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const products = await db.product.findMany({
      include: { supplier: true, inventory: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const simulations = await Promise.all(
      products.map(async (p) => {
        const qty = p.inventory?.quantity || 0;
        const salesAgg = await db.sale.aggregate({
          where: { productId: p.id, date: { gte: thirtyDaysAgo } },
          _sum: { quantity: true },
        });
        const totalSold = salesAgg._sum.quantity || 0;
        const avgDaily = totalSold / 30;
        const daysUntilStockout = avgDaily > 0 ? Math.round(qty / avgDaily) : Infinity;
        const projectedLostSales = daysUntilStockout < p.leadTimeDays && avgDaily > 0
          ? Math.round((p.leadTimeDays - daysUntilStockout) * avgDaily * p.unitPriceMyr)
          : 0;

        const optimalOrderQty = Math.max(0, Math.ceil(avgDaily * p.leadTimeDays * 1.5) - qty);
        const orderCost = optimalOrderQty * p.unitPriceMyr;

        return {
          productName: p.name,
          sku: p.sku,
          currentStock: qty,
          avgDailySales: Math.round(avgDaily * 10) / 10,
          daysUntilStockout: daysUntilStockout === Infinity ? 'N/A' : daysUntilStockout,
          leadTimeDays: p.leadTimeDays,
          riskLevel: daysUntilStockout < p.leadTimeDays ? 'HIGH' : daysUntilStockout < p.leadTimeDays * 2 ? 'MEDIUM' : 'LOW',
          projectedLostSales,
          recommendedOrderQty: optimalOrderQty,
          estimatedOrderCost: orderCost,
        };
      })
    );

    const totalLostSales = simulations.reduce((sum, s) => sum + s.projectedLostSales, 0);
    const totalOrderCost = simulations.reduce((sum, s) => sum + s.estimatedOrderCost, 0);
    const highRiskItems = simulations.filter(s => s.riskLevel === 'HIGH').length;

    return NextResponse.json({
      summary: { totalLostSales, totalOrderCost, highRiskItems, totalProducts: products.length },
      simulations,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
