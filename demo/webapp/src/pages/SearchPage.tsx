import React, { useEffect, useMemo, useState } from 'react';
import { useSession, useStateWithAi } from '@bnbarak/reactai/react';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  onSale: boolean;
  imageUrl: string;
  sku: string;
}

const PAGE_SIZE = 24;

const ALL_CATEGORIES = [
  'Power Tools',
  'Hand Tools',
  'Building Materials',
  'Plumbing',
  'Electrical',
  'Paint & Supplies',
  'Flooring',
  'Lighting',
  'Hardware',
  'Outdoor & Garden',
  'Doors & Windows',
  'Kitchen & Bath',
];

const ALL_BRANDS = [
  '3M',
  'American Standard',
  'Andersen',
  'Armstrong',
  'Behr',
  'Black+Decker',
  'Bosch',
  'CertainTeed',
  'Charlotte Pipe',
  'Channellock',
  'ClosetMaid',
  'Commercial Electric',
  'Craftsman',
  'Cree',
  'Delta',
  'DeWalt',
  'Eastman',
  'Eaton',
  'EGO',
  'Everbilt',
  'Fiskars',
  'FrogTape',
  'Gardner Bender',
  'GE',
  'Georgia-Pacific',
  'Glacier Bay',
  'Halo',
  'Hampton Bay',
  'Hillman',
  'Hubbell',
  'Husqvarna',
  'Husky',
  'Ideal',
  'Irwin',
  'James Hardie',
  'JELD-WEN',
  'Kingston Brass',
  'Klein Tools',
  'Kobalt',
  'Kohler',
  'Laticrete',
  'Larson',
  'Leviton',
  'Liberty',
  'LifeProof',
  'LP Building',
  'Lutron',
  'Makita',
  'Masonite',
  'Merola',
  'Milwaukee',
  'Moen',
  'Mohawk',
  'Mueller',
  'National Gypsum',
  'National Hardware',
  'Nibco',
  'Owens Corning',
  'Pass & Seymour',
  'Pella',
  'Pemko',
  'Pergo',
  'Pfister',
  'Philips',
  'Prime-Line',
  'Progress Lighting',
  'Purdy',
  'Quikrete',
  'ReliaBilt',
  'Richelieu',
  'Ridgid',
  'Rust-Oleum',
  'Ryobi',
  'Schlage',
  'Shaw',
  'SharkBite',
  'Siemens',
  'Sioux Chief',
  'Stanley',
  'Sun Joe',
  'Tekton',
  'Therma-Tru',
  'Toro',
  'Toto',
  'TrafficMaster',
  'Troy-Bilt',
  'USG',
  'Valspar',
  'Watts',
  'Wooster',
  'Zinsser',
];

interface SearchProductCardProps {
  product: Product;
}

const SearchProductCard = ({ product }: SearchProductCardProps) => (
  <div
    style={{
      border: '1px solid #e0e0e0',
      fontFamily: 'monospace',
      position: 'relative',
      transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
    }}
  >
    <div style={{ position: 'relative', overflow: 'hidden', height: 160 }}>
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />
      {product.onSale && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#c62828',
            color: 'white',
            fontSize: 9,
            fontWeight: 'bold',
            letterSpacing: 1,
            padding: '2px 6px',
            textTransform: 'uppercase',
          }}
        >
          Sale
        </span>
      )}
      {!product.inStock && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#888',
              fontWeight: 'bold',
              border: '1px solid #ccc',
              padding: '3px 8px',
              background: 'white',
            }}
          >
            Out of Stock
          </span>
        </div>
      )}
    </div>

    <div style={{ padding: '10px 12px 12px' }}>
      <div
        style={{
          fontSize: 9,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {product.category}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 'bold',
          lineHeight: 1.35,
          marginBottom: 2,
          minHeight: 32,
        }}
      >
        {product.name}
      </div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>{product.brand}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <span style={{ color: '#f59e0b', fontSize: 11 }}>
          {'★'.repeat(Math.round(product.rating))}
          {'☆'.repeat(5 - Math.round(product.rating))}
        </span>
        <span style={{ fontSize: 10, color: '#888' }}>
          ({product.reviewCount.toLocaleString()})
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>${product.price.toFixed(2)}</span>
        {product.onSale && (
          <span style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through' }}>
            ${product.originalPrice.toFixed(2)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 9, color: '#bbb', marginTop: 4, letterSpacing: 0.3 }}>
        SKU: {product.sku}
      </div>
    </div>
  </div>
);

const FilterSectionHeader = ({ label }: { label: string }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 10,
      paddingBottom: 6,
      borderBottom: '1px solid #e0e0e0',
    }}
  >
    {label}
  </div>
);

const btnStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 10,
  padding: '3px 8px',
  border: '1px solid',
  borderColor: active ? 'black' : '#ccc',
  background: active ? 'black' : 'white',
  color: active ? 'white' : '#444',
  cursor: 'pointer',
  fontFamily: 'monospace',
  letterSpacing: 0.3,
});

export const SearchPage = () => {
  const { serverUrl } = useSession();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    fetch(`${serverUrl}/products`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        if (cancelled) return;
        setAllProducts(data);
        setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl]);

  const [searchState, setSearchState, searchRef] = useStateWithAi(
    'Product search query',
    { query: '' },
    {},
  );

  const [sortState, setSortState, sortRef] = useStateWithAi(
    'Product sort order',
    { sortBy: 'relevance' },
    { sortBy: ['relevance', 'price-asc', 'price-desc', 'rating', 'reviews'] },
  );

  const [categoryState, setCategoryState, categoryRef] = useStateWithAi(
    'Product category filter',
    { activeCategory: 'All' },
    {
      activeCategory: [
        'All',
        'Power Tools',
        'Hand Tools',
        'Building Materials',
        'Plumbing',
        'Electrical',
        'Paint & Supplies',
        'Flooring',
        'Lighting',
        'Hardware',
        'Outdoor & Garden',
        'Doors & Windows',
        'Kitchen & Bath',
      ],
    },
  );

  const [brandState, setBrandState, brandRef] = useStateWithAi(
    'Product brand filter',
    { activeBrand: 'All' },
    { activeBrand: ['All', ...ALL_BRANDS] },
  );

  const [priceState, setPriceState, priceRef] = useStateWithAi(
    'Product price range filter',
    { minPrice: 0, maxPrice: 1500 },
    {},
  );

  const [availState, setAvailState, availRef] = useStateWithAi(
    'Product availability and rating filter',
    { inStockOnly: false, onSaleOnly: false, minRating: 0 },
    { minRating: [0, 3, 3.5, 4, 4.5] },
  );

  const filtered = useMemo(() => {
    let results = [...allProducts];

    const query = String(searchState.query).toLowerCase().trim();
    if (query) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      );
    }

    if (categoryState.activeCategory !== 'All') {
      results = results.filter((p) => p.category === categoryState.activeCategory);
    }

    if (brandState.activeBrand !== 'All') {
      results = results.filter((p) => p.brand === brandState.activeBrand);
    }

    const minP = Number(priceState.minPrice);
    const maxP = Number(priceState.maxPrice);
    results = results.filter((p) => p.price >= minP && p.price <= maxP);

    if (availState.inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    if (availState.onSaleOnly) {
      results = results.filter((p) => p.onSale);
    }

    const minR = Number(availState.minRating);
    if (minR > 0) {
      results = results.filter((p) => p.rating >= minR);
    }

    switch (sortState.sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        results.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return results;
  }, [allProducts, searchState, sortState, categoryState, brandState, priceState, availState]);

  useEffect(() => {
    setPage(1);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageProducts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const PRICE_PRESETS: Array<[number, number, string]> = [
    [0, 25, 'Under $25'],
    [25, 100, '$25–$100'],
    [100, 300, '$100–$300'],
    [300, 1000, '$300–$1K'],
    [0, 1500, 'Any'],
  ];

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* Search bar + sort row */}
      <div
        ref={searchRef as React.RefObject<HTMLDivElement>}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '2px solid black',
          flexShrink: 0,
          background: 'white',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
          <input
            value={String(searchState.query)}
            onChange={(e) => setSearchState({ ...searchState, query: e.target.value })}
            placeholder="Search 1,000 products — try 'drill', 'DeWalt', 'HD-0101'"
            style={{
              width: '100%',
              padding: '8px 8px 8px 30px',
              border: '1px solid black',
              fontFamily: 'monospace',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          ref={sortRef as React.RefObject<HTMLDivElement>}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>Sort by:</span>
          <select
            value={String(sortState.sortBy)}
            onChange={(e) => setSortState({ sortBy: e.target.value })}
            style={{
              border: '1px solid black',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '6px 8px',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviews</option>
          </select>
        </div>

        <span
          style={{
            fontSize: 11,
            color: '#888',
            whiteSpace: 'nowrap',
            minWidth: 80,
            textAlign: 'right',
          }}
        >
          {loadingProducts ? 'loading…' : `${filtered.length.toLocaleString()} results`}
        </span>
      </div>

      {/* Body: sidebar + grid */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: 210,
            flexShrink: 0,
            borderRight: '1px solid #ddd',
            overflowY: 'auto',
            padding: '16px 14px',
            background: '#fafafa',
          }}
        >
          {/* Category */}
          <div ref={categoryRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: 22 }}>
            <FilterSectionHeader label="Category" />
            {['All', ...ALL_CATEGORIES].map((cat) => (
              <label
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 5,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: categoryState.activeCategory === cat ? 'black' : '#444',
                  fontWeight: categoryState.activeCategory === cat ? 'bold' : 'normal',
                }}
              >
                <input
                  type="radio"
                  name="category"
                  checked={categoryState.activeCategory === cat}
                  onChange={() => setCategoryState({ activeCategory: cat })}
                  style={{ margin: 0 }}
                />
                {cat}
              </label>
            ))}
          </div>

          {/* Brand */}
          <div ref={brandRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: 22 }}>
            <FilterSectionHeader label="Brand" />
            <select
              value={String(brandState.activeBrand)}
              onChange={(e) => setBrandState({ activeBrand: e.target.value })}
              style={{
                width: '100%',
                border: '1px solid #ccc',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '5px 6px',
                background: 'white',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Brands</option>
              {ALL_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div ref={priceRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: 22 }}>
            <FilterSectionHeader label="Price" />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="number"
                value={Number(priceState.minPrice)}
                onChange={(e) => setPriceState({ ...priceState, minPrice: Number(e.target.value) })}
                placeholder="Min"
                min={0}
                style={{
                  width: '100%',
                  border: '1px solid #ccc',
                  padding: '4px 6px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>–</span>
              <input
                type="number"
                value={Number(priceState.maxPrice)}
                onChange={(e) => setPriceState({ ...priceState, maxPrice: Number(e.target.value) })}
                placeholder="Max"
                min={0}
                style={{
                  width: '100%',
                  border: '1px solid #ccc',
                  padding: '4px 6px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PRICE_PRESETS.map(([min, max, label]) => (
                <button
                  key={label}
                  onClick={() => setPriceState({ minPrice: min, maxPrice: max })}
                  style={btnStyle(
                    Number(priceState.minPrice) === min && Number(priceState.maxPrice) === max,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating + Availability combined — one aiRef for both */}
          <div ref={availRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: 22 }}>
            <FilterSectionHeader label="Rating" />
            {([0, 3, 3.5, 4, 4.5] as number[]).map((r) => (
              <label
                key={r}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 5,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: Number(availState.minRating) === r ? 'bold' : 'normal',
                  color: Number(availState.minRating) === r ? 'black' : '#444',
                }}
              >
                <input
                  type="radio"
                  name="rating"
                  checked={Number(availState.minRating) === r}
                  onChange={() => setAvailState({ ...availState, minRating: r })}
                  style={{ margin: 0 }}
                />
                {r === 0 ? (
                  'Any'
                ) : (
                  <span>
                    <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.floor(r))}</span>
                    {r % 1 !== 0 && <span style={{ color: '#f59e0b', opacity: 0.5 }}>½</span>}
                    {' & up'}
                  </span>
                )}
              </label>
            ))}

            <div style={{ marginTop: 14 }}>
              <FilterSectionHeader label="Availability" />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(availState.inStockOnly)}
                  onChange={(e) => setAvailState({ ...availState, inStockOnly: e.target.checked })}
                  style={{ margin: 0 }}
                />
                In Stock Only
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(availState.onSaleOnly)}
                  onChange={(e) => setAvailState({ ...availState, onSaleOnly: e.target.checked })}
                  style={{ margin: 0 }}
                />
                On Sale Only
              </label>
            </div>
          </div>

          {/* Reset all */}
          <button
            onClick={() => {
              setSearchState({ query: '' });
              setSortState({ sortBy: 'relevance' });
              setCategoryState({ activeCategory: 'All' });
              setBrandState({ activeBrand: 'All' });
              setPriceState({ minPrice: 0, maxPrice: 1500 });
              setAvailState({ inStockOnly: false, onSaleOnly: false, minRating: 0 });
            }}
            style={{
              width: '100%',
              padding: '6px 0',
              border: '1px solid black',
              background: 'white',
              fontFamily: 'monospace',
              fontSize: 10,
              cursor: 'pointer',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Reset Filters
          </button>
        </div>

        {/* Product grid + pagination */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loadingProducts ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                fontSize: 12,
                color: '#888',
              }}
            >
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: '#888' }}>No products match your filters.</span>
              <button
                onClick={() => {
                  setSearchState({ query: '' });
                  setSortState({ sortBy: 'relevance' });
                  setCategoryState({ activeCategory: 'All' });
                  setBrandState({ activeBrand: 'All' });
                  setPriceState({ minPrice: 0, maxPrice: 1500 });
                  setAvailState({ inStockOnly: false, onSaleOnly: false, minRating: 0 });
                }}
                style={{
                  fontSize: 11,
                  padding: '5px 14px',
                  border: '1px solid black',
                  background: 'black',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                  gap: 14,
                }}
              >
                {pageProducts.map((p) => (
                  <SearchProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 28,
                    paddingBottom: 16,
                  }}
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '5px 12px',
                      border: '1px solid black',
                      background: page === 1 ? '#eee' : 'black',
                      color: page === 1 ? '#aaa' : 'white',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      cursor: page === 1 ? 'default' : 'pointer',
                    }}
                  >
                    ← Prev
                  </button>

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p =
                      totalPages <= 7
                        ? i + 1
                        : page <= 4
                          ? i + 1
                          : page >= totalPages - 3
                            ? totalPages - 6 + i
                            : page - 3 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          width: 30,
                          height: 30,
                          border: '1px solid',
                          borderColor: page === p ? 'black' : '#ccc',
                          background: page === p ? 'black' : 'white',
                          color: page === p ? 'white' : '#444',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '5px 12px',
                      border: '1px solid black',
                      background: page === totalPages ? '#eee' : 'black',
                      color: page === totalPages ? '#aaa' : 'white',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      cursor: page === totalPages ? 'default' : 'pointer',
                    }}
                  >
                    Next →
                  </button>

                  <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                    Page {page} of {totalPages}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
