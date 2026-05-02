import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.inventory.deleteMany({ where: { productId: id } });
    await db.sale.deleteMany({ where: { productId: id } });
    await db.recommendation.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedProduct = await db.product.update({
      where: { id: id },
      data: {
        name: body.name,
        reorderPoint: body.reorderPoint,
        leadTimeDays: body.leadTimeDays,
        // Add other fields if necessary
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}