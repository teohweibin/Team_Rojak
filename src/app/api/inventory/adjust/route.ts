import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, type, note } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find or create inventory
    let inventory = await db.inventory.findUnique({
      where: { productId },
    });

    if (inventory) {
      if (type === 'in') {
        inventory = await db.inventory.update({
          where: { productId },
          data: { quantity: { increment: quantity } },
        });
      } else if (type === 'out') {
        inventory = await db.inventory.update({
          where: { productId },
          data: { quantity: { decrement: quantity } },
        });
      } else if (type === 'adjustment') {
        inventory = await db.inventory.update({
          where: { productId },
          data: { quantity },
        });
      }
    } else {
      inventory = await db.inventory.create({
        data: { productId, quantity: type === 'out' ? -quantity : quantity },
      });
    }

    // Record movement
    await db.inventoryMovement.create({
      data: { productId, type, quantity, note },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 });
  }
}
