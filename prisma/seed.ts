import { db } from '../src/lib/db';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await db.sale.deleteMany();
  await db.inventoryMovement.deleteMany();
  await db.recommendation.deleteMany();
  await db.inventory.deleteMany();
  await db.sale.deleteMany();
  await db.product.deleteMany();
  await db.supplier.deleteMany();
  await db.exchangeRate.deleteMany();

  // Create suppliers
  const suppliers = await Promise.all([
    db.supplier.create({ data: { name: 'Pacific Source US', country: 'United States', currency: 'USD' } }),
    db.supplier.create({ data: { name: 'Bavaria Werke', country: 'Germany', currency: 'EUR' } }),
    db.supplier.create({ data: { name: 'Shenzhen Goods Co.', country: 'China', currency: 'CNY' } }),
    db.supplier.create({ data: { name: 'KL Local Distributors', country: 'Malaysia', currency: 'MYR' } }),
  ]);

  // Create products
  const products = await Promise.all([
    db.product.create({ data: { sku: 'ESP-A100', name: 'Espresso Machine A100', category: 'Appliances', unitPriceMyr: 1850, reorderPoint: 12, leadTimeDays: 21, supplierId: suppliers[0].id } }),
    db.product.create({ data: { sku: 'GRD-X200', name: 'Burr Grinder X200', category: 'Appliances', unitPriceMyr: 620, reorderPoint: 20, leadTimeDays: 28, supplierId: suppliers[1].id } }),
    db.product.create({ data: { sku: 'BEAN-12K', name: 'Single Origin Beans 1kg', category: 'Consumables', unitPriceMyr: 78, reorderPoint: 60, leadTimeDays: 14, supplierId: suppliers[2].id } }),
    db.product.create({ data: { sku: 'FILT-100', name: 'Filter Papers (100ct)', category: 'Consumables', unitPriceMyr: 18.5, reorderPoint: 80, leadTimeDays: 5, supplierId: suppliers[3].id } }),
    db.product.create({ data: { sku: 'MUG-CER', name: 'Ceramic Mug 8oz', category: 'Tableware', unitPriceMyr: 32, reorderPoint: 40, leadTimeDays: 14, supplierId: suppliers[2].id } }),
    db.product.create({ data: { sku: 'MILK-FRT', name: 'Milk Frother Pro', category: 'Appliances', unitPriceMyr: 240, reorderPoint: 15, leadTimeDays: 21, supplierId: suppliers[0].id } }),
    db.product.create({ data: { sku: 'TU-522', name: 'Tofu', category: 'Vegetables', unitPriceMyr: 5.9, reorderPoint: 150, leadTimeDays: 5, supplierId: suppliers[3].id } }),
  ]);

  // Create inventory
  const inventories = [
    { productId: products[0].id, quantity: 4 },   // ESP-A100 - Critical
    { productId: products[1].id, quantity: 22 },   // GRD-X200 - Healthy
    { productId: products[2].id, quantity: 35 },   // BEAN-12K - Low
    { productId: products[3].id, quantity: 140 },  // FILT-100 - Healthy
    { productId: products[4].id, quantity: 18 },   // MUG-CER - Critical
    { productId: products[5].id, quantity: 0 },    // MILK-FRT - Out of Stock
    { productId: products[6].id, quantity: 0 },    // TU-522 - Out of Stock
  ];

  await Promise.all(
    inventories.map(inv => db.inventory.create({ data: inv }))
  );

  // Generate 30 days of sales history
  const salesData: { productId: string; quantity: number; unitPrice: number; total: number; date: Date }[] = [];
  const today = new Date('2026-04-23');

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // Daily sales patterns (randomized slightly)
    const seed = dayOffset * 7 + 3;
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Espresso Machine: ~1 per day
    salesData.push({ productId: products[0].id, quantity: rand(0, 2), unitPrice: 1850, total: 0, date });
    // Burr Grinder: ~1 per day
    salesData.push({ productId: products[1].id, quantity: rand(0, 2), unitPrice: 620, total: 0, date });
    // Beans: ~7 per day
    salesData.push({ productId: products[2].id, quantity: rand(5, 11), unitPrice: 78, total: 0, date });
    // Filter Papers: ~5 per day
    salesData.push({ productId: products[3].id, quantity: rand(2, 7), unitPrice: 18.5, total: 0, date });
    // Mugs: ~3 per day
    salesData.push({ productId: products[4].id, quantity: rand(1, 4), unitPrice: 32, total: 0, date });
    // Milk Frother: ~1 per day
    salesData.push({ productId: products[5].id, quantity: rand(0, 1), unitPrice: 240, total: 0, date });
    // Tofu: 0 sales (out of stock)
    // salesData.push({ productId: products[6].id, quantity: 0, unitPrice: 5.9, total: 0, date });
  }

  // Calculate totals and create sales
  await Promise.all(
    salesData
      .filter(s => s.quantity > 0)
      .map(s => {
        s.total = s.quantity * s.unitPrice;
        return db.sale.create({ data: s });
      })
  );

  // Create recommendations
  await Promise.all([
    db.recommendation.create({
      data: {
        productId: products[5].id,
        type: 'reorder',
        priority: 'critical',
        message: 'Milk Frother Pro is out of stock. Based on current sales velocity (1.0/day), place an urgent order. With 21-day lead time, you risk losing ~21 units of sales.',
        status: 'pending',
        savingsMyr: 0,
      }
    }),
    db.recommendation.create({
      data: {
        productId: products[2].id,
        type: 'reorder',
        priority: 'high',
        message: 'Single Origin Beans 1kg stock is low (35 units, 4.7 days cover). Reorder 120 units to maintain safe stock levels. Current supplier: Shenzhen Goods Co. (CNY).',
        status: 'pending',
        savingsMyr: 156,
      }
    }),
    db.recommendation.create({
      data: {
        productId: products[0].id,
        type: 'supplier_switch',
        priority: 'medium',
        message: 'Consider switching Espresso Machine A100 supplier to a closer regional distributor. Current USD-based pricing is sensitive to exchange rate fluctuations. A MYR-based supplier could save 3-5% on forex costs.',
        status: 'pending',
        savingsMyr: 648.88,
      }
    }),
  ]);

  // Create exchange rates
  await Promise.all([
    db.exchangeRate.create({ data: { fromCurrency: 'USD', toCurrency: 'MYR', rate: 4.72 } }),
    db.exchangeRate.create({ data: { fromCurrency: 'EUR', toCurrency: 'MYR', rate: 5.08 } }),
    db.exchangeRate.create({ data: { fromCurrency: 'CNY', toCurrency: 'MYR', rate: 0.65 } }),
  ]);

  console.log('✅ Seed complete!');
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
