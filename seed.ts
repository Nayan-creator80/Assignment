import { pool, initDatabase } from './db.js';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Kitchen',
  'Books',
  'Sports & Outdoors',
  'Beauty & Personal Care',
  'Automotive',
  'Toys & Games',
  'Health & Household',
  'Garden & Outdoor'
];

const ADJECTIVES = [
  'Wireless',
  'Ultra-Portable',
  'Premium',
  'Eco-Friendly',
  'Ergonomic',
  'Heavy-Duty',
  'Minimalist',
  'Vintage',
  'Smart',
  'Compact',
  'Professional',
  'Luxury',
  'Multi-functional',
  'Waterproof',
  'Rechargeable'
];

const PRODUCT_TYPES = [
  'Headphones',
  'Backpack',
  'Coffee Maker',
  'Yoga Mat',
  'Water Bottle',
  'Smartphone Stand',
  'Desk Lamp',
  'Running Shoes',
  'Sunglasses',
  'Notebook',
  'Bluetooth Speaker',
  'Air Purifier',
  'Knife Set',
  'Power Bank'
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in the environment variables.');
    process.exit(1);
  }

  // Ensure DB is initialized
  await initDatabase();

  const totalProducts = 200000;
  const batchSize = 5000;
  const client = await pool.connect();

  try {
    console.log(`Starting database seed of ${totalProducts} products...`);
    const startTime = Date.now();

    // 1. Clear existing products
    console.log('Clearing existing products...');
    await client.query('TRUNCATE TABLE products;');

    // Begin single transaction
    await client.query('BEGIN');

    let insertedCount = 0;
    const now = new Date();

    for (let i = 0; i < totalProducts; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalProducts - i);
      const valueRows = [];
      const queryParams: any[] = [];

      for (let j = 0; j < currentBatchSize; j++) {
        const prodIndex = i + j + 1;
        
        // Generate pseudo-realistic product details
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const type = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        
        const id = `PROD-${String(prodIndex).padStart(6, '0')}`;
        const name = `${adj} ${type} #${prodIndex}`;
        const price = parseFloat((Math.random() * 990 + 9.99).toFixed(2)); // $9.99 to $999.99
        
        // Generate dates within last 90 days
        const daysAgo = Math.random() * 90;
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        // updated_at is either same as created_at or slightly newer
        const updatedDaysAgo = Math.max(0, daysAgo - Math.random() * daysAgo);
        const updatedAt = new Date(now.getTime() - updatedDaysAgo * 24 * 60 * 60 * 1000);

        const paramOffset = queryParams.length;
        valueRows.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4}, $${paramOffset + 5}, $${paramOffset + 6})`
        );
        
        queryParams.push(id, name, category, price, createdAt.toISOString(), updatedAt.toISOString());
      }

      const query = `
        INSERT INTO products (id, name, category, price, created_at, updated_at)
        VALUES ${valueRows.join(', ')}
      `;

      await client.query(query, queryParams);
      insertedCount += currentBatchSize;

      if (insertedCount % 50000 === 0) {
        console.log(`Progress: Seeded ${insertedCount}/${totalProducts} products...`);
      }
    }

    // Commit transaction
    console.log('Committing database transaction...');
    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nSUCCESS: Seeded ${insertedCount} products in ${duration} seconds!`);
  } catch (error) {
    console.error('Error during seeding, rolling back transaction:', error);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Unhandled seed error:', err);
  process.exit(1);
});
