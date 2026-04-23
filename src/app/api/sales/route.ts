import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      include: { product: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, unitPrice, date } = body;

    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sale = await db.sale.create({
      data: {
        productId,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
