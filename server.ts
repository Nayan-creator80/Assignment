import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Main search, sort, filter and pagination endpoint
app.get('/api/products', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = (page - 1) * limit;

  const search = req.query.search as string;
  const category = req.query.category as string;
  const minPrice = parseFloat(req.query.minPrice as string);
  const maxPrice = parseFloat(req.query.maxPrice as string);
  
  const sortBy = req.query.sortBy as string || 'created_at';
  const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Protect against SQL injection on order-by column names
  const allowedSortColumns = ['name', 'price', 'created_at', 'updated_at'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (!isNaN(minPrice)) {
      params.push(minPrice);
      conditions.push(`price >= $${params.length}`);
    }

    if (!isNaN(maxPrice)) {
      params.push(maxPrice);
      conditions.push(`price <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query pagination count & items in a single request to optimize DB performance
    const queryParams = [...params];
    
    // Add page/limit parameters
    queryParams.push(limit);
    const limitPlaceholder = `$${queryParams.length}`;
    
    queryParams.push(offset);
    const offsetPlaceholder = `$${queryParams.length}`;

    const sqlQuery = `
      SELECT id, name, category, price, created_at, updated_at, count(*) OVER() AS total_count
      FROM products
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const startHrTime = process.hrtime();
    const result = await pool.query(sqlQuery, queryParams);
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000).toFixed(2);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    // Remove the temporary total_count from each product record and parse price as float
    const products = result.rows.map(row => {
      const { total_count, ...product } = row;
      return {
        ...product,
        price: parseFloat(product.price)
      };
    });

    res.json({
      success: true,
      executionTimeMs: elapsedMs,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      products
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics endpoint
app.get('/api/products/stats', async (req, res) => {
  try {
    const startHrTime = process.hrtime();
    
    const countResult = await pool.query('SELECT COUNT(*) as total FROM products;');
    const priceResult = await pool.query('SELECT MIN(price) as min_price, MAX(price) as max_price, AVG(price) as avg_price FROM products;');
    const categoriesResult = await pool.query('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC;');
    
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000).toFixed(2);

    res.json({
      success: true,
      executionTimeMs: elapsedMs,
      stats: {
        totalProducts: parseInt(countResult.rows[0].total),
        minPrice: parseFloat(priceResult.rows[0].min_price || '0'),
        maxPrice: parseFloat(priceResult.rows[0].max_price || '0'),
        avgPrice: parseFloat(priceResult.rows[0].avg_price || '0').toFixed(2),
        categories: categoriesResult.rows.map(row => ({
          name: row.category,
          count: parseInt(row.count)
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single product fetch
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = result.rows[0];
    product.price = parseFloat(product.price);
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  const { id, name, category, price } = req.body;
  if (!id || !name || !category || isNaN(parseFloat(price))) {
    return res.status(400).json({ success: false, message: 'Missing or invalid fields' });
  }

  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO products (id, name, category, price, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [id, name, category, parseFloat(price), now, now]
    );
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price } = req.body;

  try {
    const checkResult = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const current = checkResult.rows[0];
    const newName = name !== undefined ? name : current.name;
    const newCategory = category !== undefined ? category : current.category;
    const newPrice = price !== undefined ? parseFloat(price) : current.price;
    const now = new Date().toISOString();

    const result = await pool.query(
      `UPDATE products
       SET name = $1, category = $2, price = $3, updated_at = $4
       WHERE id = $5
       RETURNING *;`,
      [newName, newCategory, newPrice, now, id]
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = $1;', [id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize database schema and start server
async function startServer() {
  try {
    // If DATABASE_URL is not provided, we skip initialization and warn the developer
    if (process.env.DATABASE_URL) {
      await initDatabase();
    } else {
      console.warn('DATABASE_URL is not set. Skipping schema initialization.');
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
