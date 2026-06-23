import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL is not set in environment variables. Database operations will fail.');
}

export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema and indexes...');
    
    // Create the products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable pg_trgm extension for fast pattern matching (e.g., ILIKE '%search%')
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      await client.query('CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);');
      console.log('Successfully enabled pg_trgm extension and created trigram index on product names.');
    } catch (err: any) {
      console.warn('Could not create pg_trgm extension. Falling back to standard indexes. Error:', err.message);
      // Fallback: create normal index for name prefix queries
      await client.query('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);');
    }

    // Create standard indexes for filtering and sorting
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);');
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
