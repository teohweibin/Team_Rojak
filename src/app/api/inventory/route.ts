import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: {
        supplier: true,
        inventory: true,
      },
      orderBy: { name: 'asc' },
    });

    const enriched = await Promise.all(
      products.map(async (p: any) => {
        const inventoryRecord = Array.isArray(p.inventory)
          ? p.inventory[0]
          : p.inventory;

        const qty = inventoryRecord?.quantity ?? 0;

        let status: string;

        if (qty === 0) status = 'Out of Stock';
        else if (qty < p.reorderPoint * 0.3) status = 'Critical';
        else if (qty < p.reorderPoint) status = 'Low';
        else status = 'Healthy';

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesAgg = await db.sale.aggregate({
          where: {
            productId: p.id,
            date: { gte: thirtyDaysAgo },
          },
          _sum: { quantity: true },
        });

        const totalSold = salesAgg._sum.quantity ?? 0;
        const avgDaily = totalSold / 30;
        const daysCover =
          avgDaily > 0 ? Math.round((qty / avgDaily) * 10) / 10 : 0;

        return {
          ...p,
          inventory: inventoryRecord,
          quantity: qty,
          value: qty * p.unitPriceMyr,
          status,
          daysCover,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Failed to fetch inventory:', error);

    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}