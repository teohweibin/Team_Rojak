import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: { products: true },
  });
  if (!supplier) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(supplier);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supplier = await db.supplier.update({
    where: { id },
    data: {
      name: body.name,
      country: body.country,
      currency: body.currency,
    },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productCount = await db.product.count({ where: { supplierId: id } });
  if (productCount > 0) {
    return NextResponse.json({ error: 'Cannot delete supplier with products' }, { status: 400 });
  }
  await db.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
