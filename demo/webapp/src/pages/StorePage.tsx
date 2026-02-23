import React from 'react'
import { useStateWithAi, reactAI } from '@bnbarak/reactai/react'

type BannerTheme = 'dark' | 'light' | 'accent'
type Category = 'All' | 'Electronics' | 'Fashion' | 'Books' | 'Home'

const BANNER_THEMES: Record<BannerTheme, React.CSSProperties> = {
  dark:   { background: 'black', color: 'white' },
  light:  { background: '#f5f5f5', color: 'black' },
  accent: { background: '#111', color: 'white', borderLeft: '6px solid white' },
}

interface ProductCardProps {
  name: string
  category: Category
  price: number
  badge: string
  featured: boolean
  inStock: boolean
}

const ProductCardInner = ({ name, category, price, badge, featured, inStock }: ProductCardProps) => (
  <div
    style={{
      border: featured ? '2px solid black' : '1px solid #ddd',
      padding: 20,
      position: 'relative',
      fontFamily: 'monospace',
    }}
  >
    {featured && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'black',
          color: 'white',
          fontSize: 10,
          letterSpacing: 2,
          textAlign: 'center',
          padding: '3px 0',
          textTransform: 'uppercase',
        }}
      >
        Featured
      </div>
    )}
    {badge && (
      <span
        style={{
          position: 'absolute',
          top: featured ? 22 : 8,
          right: 8,
          background: badge === 'NEW' ? '#2e7d32' : '#c62828',
          color: 'white',
          fontSize: 10,
          letterSpacing: 1,
          padding: '2px 6px',
          textTransform: 'uppercase',
        }}
      >
        {badge}
      </span>
    )}
    <div style={{ marginTop: featured ? 20 : 0, marginBottom: 8, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {category}
    </div>
    <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12 }}>{name}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 20, fontWeight: 'bold' }}>${price}</span>
      {!inStock && (
        <span style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Out of stock</span>
      )}
    </div>
  </div>
)

const ProductCard = reactAI(ProductCardInner, {
  key: 'product-card',
  description: 'An e-commerce product card showing name, category, price, badge, and featured status.',
})

const PRODUCTS: Array<ProductCardProps & { id: string; productKey: string }> = [
  { id: 'headphones',  productKey: 'product-headphones',  name: 'Wireless Headphones', category: 'Electronics', price: 89.99,  badge: 'SALE', featured: false, inStock: true  },
  { id: 'keyboard',    productKey: 'product-keyboard',    name: 'Mechanical Keyboard',  category: 'Electronics', price: 129,    badge: '',     featured: true,  inStock: true  },
  { id: 'shirt',       productKey: 'product-shirt',       name: 'Linen Shirt',          category: 'Fashion',     price: 39.99,  badge: 'SALE', featured: false, inStock: true  },
  { id: 'book',        productKey: 'product-book',        name: 'React Deep Dive',      category: 'Books',       price: 34.99,  badge: 'NEW',  featured: false, inStock: true  },
  { id: 'lamp',        productKey: 'product-lamp',        name: 'Desk Lamp',            category: 'Home',        price: 44.99,  badge: 'SALE', featured: false, inStock: false },
  { id: 'shoes',       productKey: 'product-shoes',       name: 'Running Shoes',        category: 'Fashion',     price: 79.99,  badge: '',     featured: false, inStock: true  },
]

export const StorePage = () => {
  const [banner, , bannerRef] = useStateWithAi(
    'Store promotional banner',
    { headline: 'Free Shipping on Orders Over $50', subtext: 'Use code FREESHIP at checkout', ctaLabel: 'Shop Now', theme: 'dark' as BannerTheme },
    { theme: ['dark', 'light', 'accent'] },
  )

  const [filter, , filterRef] = useStateWithAi(
    'Store category filter',
    { activeCategory: 'All' as Category },
    { activeCategory: ['All', 'Electronics', 'Fashion', 'Books', 'Home'] },
  )

  const bannerStyle = BANNER_THEMES[banner.theme as BannerTheme] ?? BANNER_THEMES.dark
  const activeCategory = filter.activeCategory as Category

  return (
    <div style={{ fontFamily: 'monospace' }}>
      <div
        ref={bannerRef as React.RefObject<HTMLDivElement>}
        style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...bannerStyle }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{String(banner.headline)}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{String(banner.subtext)}</div>
        </div>
        <button
          style={{
            padding: '8px 20px',
            border: `1px solid ${bannerStyle.color}`,
            background: 'transparent',
            color: bannerStyle.color,
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          {String(banner.ctaLabel)}
        </button>
      </div>

      <div style={{ padding: '16px 32px 0' }}>
        <div
          ref={filterRef as React.RefObject<HTMLDivElement>}
          style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}
        >
          {(['All', 'Electronics', 'Fashion', 'Books', 'Home'] as Category[]).map((cat) => (
            <button
              key={cat}
              style={{
                padding: '6px 16px',
                border: '1px solid black',
                background: activeCategory === cat ? 'black' : 'white',
                color: activeCategory === cat ? 'white' : 'black',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingBottom: 32 }}>
          {PRODUCTS.map((p) => (
            <div
              key={p.id}
              style={{ display: activeCategory === 'All' || activeCategory === p.category ? 'block' : 'none' }}
            >
              <ProductCard
                name={p.name}
                category={p.category}
                price={p.price}
                badge={p.badge}
                featured={p.featured}
                inStock={p.inStock}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
