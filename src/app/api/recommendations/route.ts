import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'all' ? { status } : {};

    const recommendations = await db.recommendation.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, type, priority, message, savingsMyr, reasoning, newsReferences } = body;

    if (!productId || !type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recommendation = await db.recommendation.create({
      data: {
        productId,
        type,
        priority: priority || 'medium',
        message,
        savingsMyr: savingsMyr || null,
        reasoning: reasoning || null,
        newsReferences: newsReferences || null,
        status: 'pending',
      },
    });

    return NextResponse.json(recommendation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 });
  }
}
