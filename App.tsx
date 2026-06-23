import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Database,
  SearchCode
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  created_at: string;
  updated_at: string;
}

interface CategoryStat {
  name: string;
  count: number;
}

interface DBStats {
  totalProducts: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: string;
  categories: CategoryStat[];
}

export default function App() {
  // Query Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<DBStats | null>(null);
  
  // UX States
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<string>('0.00');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Fetch Database Statistics
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_URL}/products/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (category && category !== 'All') queryParams.append('category', category);
      if (minPrice) queryParams.append('minPrice', minPrice);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);

      const res = await fetch(`${API_URL}/products?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setQueryTime(data.executionTimeMs);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch (err: any) {
      setError('Connection to backend failed. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, minPrice, maxPrice, sortBy, sortOrder, API_URL]);

  // Initialize statistics
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch products when queries change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset Filters
  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setPage(1);
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    if (type === 'min') setMinPrice(value);
    if (type === 'max') setMaxPrice(value);
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  // Generate pagination buttons
  const renderPagination = () => {
    const buttons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button key={1} onClick={() => setPage(1)} className={`pagination-btn ${page === 1 ? 'active' : ''}`}>
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="dots-start" className="pagination-info">...</span>);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`pagination-btn ${page === p ? 'active' : ''}`}
        >
          {p}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="dots-end" className="pagination-info">...</span>);
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setPage(totalPages)}
          className={`pagination-btn ${page === totalPages ? 'active' : ''}`}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const categories = stats?.categories?.map(c => c.name) || [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports & Outdoors',
    'Beauty & Personal Care', 'Automotive', 'Toys & Games', 'Health & Household', 'Garden & Outdoor'
  ];

  return (
    <>
      <div className="bg-mesh"></div>
      <div className="app-container">
        
        {/* Header Dashboard Banner */}
        <header className="dashboard-header glass-panel">
          <div className="brand-section">
            <div className="brand-icon">
              <Database className="brand-svg" size={32} color="#06b6d4" />
            </div>
            <div>
              <h1 className="brand-title">
                Hyper<span className="gradient-text">Catalog</span>
              </h1>
              <p className="brand-subtitle">Highly optimized PostgreSQL search engine for large catalogs</p>
            </div>
          </div>
          
          <div className="flex-between" style={{ gap: '1rem' }}>
            <button className="clear-btn" onClick={() => { fetchProducts(); fetchStats(); }} style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.05)' }}>
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </header>

        {/* Database Performance Stats Bar */}
        <section className="metrics-grid">
          <div className="metric-card glass-panel">
            <div className="metric-title">Catalog Volume</div>
            <div className="metric-value">
              {statsLoading ? '...' : stats?.totalProducts?.toLocaleString() || '0'} 
              <span className="metric-unit">Products</span>
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--accent-cyan': 'var(--accent-violet)' } as React.CSSProperties}>
            <div className="metric-title">DB Query Speed</div>
            <div className="metric-value">
              {loading ? '...' : `${queryTime}`} 
              <span className="metric-unit">ms</span>
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--accent-cyan': '#10b981' } as React.CSSProperties}>
            <div className="metric-title">Average Price</div>
            <div className="metric-value">
              <span className="metric-unit" style={{ marginRight: '2px' }}>$</span>
              {statsLoading ? '...' : stats?.avgPrice || '0.00'}
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--accent-cyan': 'var(--accent-rose)' } as React.CSSProperties}>
            <div className="metric-title">Categories</div>
            <div className="metric-value">
              {statsLoading ? '...' : stats?.categories?.length || 0}
              <span className="metric-unit">Active</span>
            </div>
          </div>
        </section>

        {/* Search and Filters Controller Panel */}
        <section className="filter-panel glass-panel">
          <div className="search-row">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by product name or category (e.g. Wireless Headphones)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button className="clear-btn" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>

          {/* Horizontal Category Slider */}
          <div className="filter-group">
            <div className="filter-label">Quick Category Selection</div>
            <div className="category-chips">
              <button 
                onClick={() => handleCategorySelect('All')} 
                className={`category-chip ${category === 'All' ? 'active' : ''}`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`category-chip ${category === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Filtering details row */}
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Price Range ($)</label>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  className="price-input"
                />
                <span className="price-sep">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  className="price-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select value={sortBy} onChange={handleSortByChange}>
                <option value="created_at">Date Added</option>
                <option value="price">Price</option>
                <option value="name">Product Name</option>
                <option value="updated_at">Last Modified</option>
              </select>
            </div>

            <div className="filter-group">
              <button 
                onClick={toggleSortOrder} 
                className="pagination-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
              >
                <ArrowUpDown size={16} /> Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>
        </section>

        {/* Catalog Query Output Grid */}
        <main>
          {error && (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{error}</p>
              <button className="clear-btn" onClick={() => fetchProducts()} style={{ margin: '1rem auto 0 auto' }}>
                Retry Connection
              </button>
            </div>
          )}

          {!error && loading && (
            <div className="products-grid">
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          )}

          {!error && !loading && products.length === 0 && (
            <div className="no-results glass-panel">
              <SearchCode size={48} className="no-results-icon" />
              <h3 className="no-results-title">No products found</h3>
              <p>Try clearing your filters or broadening your search criteria.</p>
            </div>
          )}

          {!error && !loading && products.length > 0 && (
            <>
              <div className="products-grid">
                {products.map((product) => (
                  <article key={product.id} className="product-card glass-panel">
                    <div className="product-header">
                      <span className="product-id">{product.id}</span>
                      <h2 className="product-name" title={product.name}>{product.name}</h2>
                      <span className="product-category">{product.category}</span>
                    </div>
                    <div className="product-footer">
                      <div className="product-price">${parseFloat(product.price as any).toFixed(2)}</div>
                      <div className="product-date">
                        Added: {new Date(product.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  
                  {renderPagination()}
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="pagination-btn"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing {products.length} of {totalCount.toLocaleString()} products (Query took {queryTime}ms)
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
