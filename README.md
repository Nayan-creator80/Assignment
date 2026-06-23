# ⚡ HyperCatalog | 200,000 Product Search Engine

HyperCatalog is a high-performance, full-stack product catalog search engine designed to manage and query **200,000 products** with sub-millisecond database response times. The project features an indexed PostgreSQL schema, an optimized Node.js seeding script, an Express REST API, and a glassmorphic React dashboard displaying database query speeds.

---

## 🚀 Key Features

- **Fast Seeding**: Insert 200,000 products in under 5 seconds utilizing single-transaction batched multi-row inserts.
- **Instant Search**: Trigram index-powered (`pg_trgm`) fuzzy search supporting queries across product names and categories.
- **Comprehensive Filtering**: Fast filters for category selection and price ranges, with column indexes for pagination and sorting.
- **Premium UX/UI**: Responsive glassmorphic layout, dark mode, skeleton loading states, and search speed telemetry showing database performance.

---

## 🛠️ Tech Stack

- **Database**: PostgreSQL (Hosted on [Neon](https://neon.tech/))
- **Backend**: Node.js, Express, TypeScript, pg-pool
- **Frontend**: React (Vite), TypeScript, Vanilla CSS, Lucide Icons

---

## 💻 Local Setup

### 1. Database Setup
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).
2. Copy your connection string (`postgresql://...`).

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and paste your database connection string in `DATABASE_URL`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. **Database Seeding**: Run the high-performance seed script to generate and insert the 200,000 products:
   ```bash
   npm run seed
   ```
   *(This will truncate the table, generate the dataset, and bulk-insert everything in chunks of 5,000 within a single transaction in seconds).*
6. Start the backend server in development mode:
   ```bash
   npm run dev
   ```
   The backend will be running at `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5173`. Open it in your browser!

---

## 🌐 Hosting & Deployment

This project is fully compatible with free hosting tiers that do not require credit cards:

### 1. Database: Neon
- Sign up on [Neon.tech](https://neon.tech/) and create a free project.
- Neon databases automatically scale down to zero when idle, making them perfect for free-tier hosting.

### 2. Backend: Render
1. Sign up on [Render.com](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the project.
4. Set the following settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: *Your Neon connection URL*
   - `PORT`: `10000` (or leave empty to let Render assign one)

### 3. Frontend: Vercel / Netlify
1. Build the production build of the frontend:
   ```bash
   cd frontend
   ```
2. Make sure you set the env variable for the backend API URL (optional: create `.env` with `VITE_API_URL=https://your-backend.onrender.com/api`).
3. Deploy the `frontend` folder directly to **Vercel** or **Netlify** by pointing the build output directory to `dist`.

---

## ⚡ How It's Optimized (Why it's so fast)

1. **Transactional Bulk Seeding**: Instead of running 200,000 individual `INSERT` commands in a slow loop, the seed script wraps insertions in a single SQL transaction and batches them in groups of 5,000. This minimizes database commit overhead and network roundtrips, completing the seed in under 5 seconds.
2. **Postgres Trigram Indexes**: We enable the `pg_trgm` extension in Postgres and apply a GIN index on the `name` column. This enables sub-millisecond response times even when performing wildcard fuzzy text matches (e.g., `ILIKE '%headphones%'`) on 200,000 rows.
3. **Column-Specific Indexing**: Separate indexes are placed on the `category`, `price`, and `created_at` fields, allowing the database to instantly sort, filter, and page through records without scanning the full table.
4. **Single-Query Pagination**: We fetch both the current page products and the total matching count in a single query using `count(*) OVER()` to optimize round-trip times.
