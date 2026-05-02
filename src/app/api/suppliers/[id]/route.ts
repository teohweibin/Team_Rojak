import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// 1. GET HANDLER - Fetch single supplier details
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

// 2. PUT HANDLER - Merged version to fix "Duplicate Identifier"
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        country: data.country,
        currency: data.currency,
      },
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// 3. DELETE HANDLER
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Check if supplier has products before deleting to prevent database errors
  const productCount = await db.product.count({ where: { supplierId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete supplier with existing products' }, 
      { status: 400 }
    );
  }
  
  await db.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}