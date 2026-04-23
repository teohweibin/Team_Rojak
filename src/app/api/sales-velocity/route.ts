import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all products
    const products = await db.product.findMany({ orderBy: { name: 'asc' } });

    // Compute velocity for each
    const velocityData = await Promise.all(
      products.map(async (p) => {
        const agg = await db.sale.aggregate({
          where: { productId: p.id, date: { gte: thirtyDaysAgo } },
          _sum: { quantity: true },
        });
        const totalSold = agg._sum.quantity || 0;
        return {
          productId: p.id,
          productName: p.name,
          avgPerDay: Math.round((totalSold / 30) * 10) / 10,
        };
      })
    );

    // Get daily revenue for chart
    const sales = await db.sale.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const revenueByDate: Record<string, number> = {};
    for (const s of sales) {
      const dateKey = s.date.toISOString().split('T')[0];
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + s.total;
    }

    const revenueChart = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }));

    return NextResponse.json({ velocityData, revenueChart });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sales velocity' }, { status: 500 });
  }
}
