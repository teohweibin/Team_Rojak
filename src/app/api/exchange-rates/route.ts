import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const TARGET_CURRENCIES = ['USD', 'EUR', 'CNY'];

export async function GET() {
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=MYR&to=${TARGET_CURRENCIES.join(',')}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch live exchange rates');
    }

    const data = await response.json();
    const ratesMap = data.rates;

    for (const currency of TARGET_CURRENCIES) {
      const rate = ratesMap[currency];

      if (!rate) continue;

      const existing = await db.exchangeRate.findFirst({
        where: {
          fromCurrency: 'MYR',
          toCurrency: currency,
        },
      });

      if (existing) {
        await db.exchangeRate.update({
          where: { id: existing.id },
          data: { rate },
        });
      } else {
        await db.exchangeRate.create({
          data: {
            fromCurrency: 'MYR',
            toCurrency: currency,
            rate,
          },
        });
      }
    }

    const rates = await db.exchangeRate.findMany({
      orderBy: { toCurrency: 'asc' },
    });

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Exchange rate fetch failed:', error);

    try {
      const fallbackRates = await db.exchangeRate.findMany({
        orderBy: { toCurrency: 'asc' },
      });

      return NextResponse.json(fallbackRates);
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch exchange rates' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromCurrency, toCurrency, rate } = body;

    if (!fromCurrency || !toCurrency || rate === undefined || rate === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const parsedRate = Number(rate);

    if (Number.isNaN(parsedRate) || parsedRate <= 0) {
      return NextResponse.json(
        { error: 'Invalid exchange rate' },
        { status: 400 }
      );
    }

    const existing = await db.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
      },
    });

    if (existing) {
      const updated = await db.exchangeRate.update({
        where: { id: existing.id },
        data: { rate: parsedRate },
      });

      return NextResponse.json(updated);
    }

    const newRate = await db.exchangeRate.create({
      data: {
        fromCurrency,
        toCurrency,
        rate: parsedRate,
      },
    });

    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    console.error('Exchange rate update failed:', error);

    return NextResponse.json(
      { error: 'Failed to update exchange rate' },
      { status: 500 }
    );
  }
}