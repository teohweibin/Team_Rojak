import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, type, referenceNo, note } = body;

    if (!productId || quantity === undefined || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty < 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    let inventory = await db.inventory.findFirst({
      where: { productId },
    });

    if (!inventory) {
      inventory = await db.inventory.create({
        data: {
          productId,
          quantity: 0,
        },
      });
    }

    const currentQty = inventory.quantity ?? 0;
    let newQty = currentQty;

    switch (type) {
      case 'purchase_received':
      case 'customer_return':
        newQty = currentQty + qty;
        break;

      case 'sale_delivery':
      case 'supplier_return':
      case 'damaged_lost':
        newQty = Math.max(0, currentQty - qty);
        break;

      case 'stock_count_correction':
        newQty = qty;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid movement type' },
          { status: 400 }
        );
    }

    const updatedInventory = await db.inventory.update({
      where: { id: inventory.id },
      data: { quantity: newQty },
    });

    await db.sale.create({
      data: {
        productId,
        quantity:
          type === 'sale_delivery' ||
          type === 'supplier_return' ||
          type === 'damaged_lost'
            ? -qty
            : qty,
        unitPrice: product.unitPriceMyr ?? 0,
        total: type === 'sale_delivery' ? qty * (product.unitPriceMyr ?? 0) : 0,
        date: new Date(),
      },
    });

    return NextResponse.json({
      inventory: updatedInventory,
      movement: {
        productId,
        type,
        quantity: qty,
        previousQuantity: currentQty,
        newQuantity: newQty,
        referenceNo,
        note,
      },
    });
  } catch (error) {
    console.error('Inventory movement failed:', error);

    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}