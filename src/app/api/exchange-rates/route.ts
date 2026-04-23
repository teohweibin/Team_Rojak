import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const rates = await db.exchangeRate.findMany();
    return NextResponse.json(rates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromCurrency, toCurrency, rate } = body;

    if (!fromCurrency || !toCurrency || !rate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert
    const existing = await db.exchangeRate.findFirst({
      where: { fromCurrency, toCurrency },
    });

    if (existing) {
      const updated = await db.exchangeRate.update({
        where: { id: existing.id },
        data: { rate },
      });
      return NextResponse.json(updated);
    }

    const newRate = await db.exchangeRate.create({
      data: { fromCurrency, toCurrency, rate },
    });

    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update exchange rate' }, { status: 500 });
  }
}
