export interface Product {
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

const PRODUCT_TYPES: Record<string, string[]> = {
  'Power Tools': [
    'Cordless Drill/Driver',
    'Circular Saw',
    'Jigsaw',
    'Impact Driver',
    'Angle Grinder',
    'Reciprocating Saw',
    'Random Orbital Sander',
    'Router',
    'Drill Press',
    'Brad Nailer',
    'Oscillating Multi-Tool',
  ],
  'Hand Tools': [
    'Claw Hammer',
    'Screwdriver Set',
    'Combination Wrench Set',
    'Needle-Nose Pliers',
    'Torpedo Level',
    'Tape Measure 25ft',
    'Utility Knife',
    'Chisel Set',
    'Hand Saw',
    'Adjustable Wrench',
    'Pry Bar',
  ],
  'Building Materials': [
    '2x4x8 Lumber',
    'Plywood Sheet 4x8',
    '60lb Concrete Mix',
    '1/2in Drywall Sheet',
    'Insulation Roll R-19',
    'Cement Board 3x5',
    'OSB Panel',
    'Roofing Shingles 3-Tab',
    'Deck Board 5/4x6',
    'Furring Strip 1x3',
    'Pressure-Treated Post 4x4',
  ],
  Plumbing: [
    '1/2in PVC Pipe 10ft',
    '3/4in Copper Elbow',
    '1/2in Ball Valve',
    'Rainfall Shower Head',
    'Toilet Wax Ring',
    'P-Trap Kit',
    'Anode Rod',
    'Faucet Cartridge',
    'Gate Valve 1in',
    'Sump Pump Float',
    'Drain Snake 25ft',
  ],
  Electrical: [
    '14/2 Wire 250ft',
    'Duplex Outlet 15A',
    '20A Circuit Breaker',
    'Single-Pole Switch',
    '1in EMT Conduit',
    '4in Square Junction Box',
    'Wire Nut Assortment',
    'GFCI Outlet 20A',
    'Smart Dimmer Switch',
    '200A Panel Load Center',
    'Wire Stripper Tool',
  ],
  'Paint & Supplies': [
    'Interior Flat Paint 1gal',
    'Exterior Satin 1gal',
    '9in Paint Roller Kit',
    'Angle Sash Brush 2.5in',
    'Drywall Primer 1gal',
    'Paint Tray Liner',
    'Blue Masking Tape 2in',
    'Spray Paint Gloss',
    'Deck Stain 1gal',
    "Painter's Tape 1.5in",
    'Epoxy Floor Coating Kit',
  ],
  Flooring: [
    'Laminate Flooring 20sqft',
    'Vinyl Plank Flooring',
    'Porcelain Floor Tile 12x12',
    'Unsanded Grout 25lb',
    'Foam Underlayment 100sqft',
    '3/4in Hardwood Strip',
    'Carpet Tile 20pk',
    'Tile Adhesive 50lb',
    'Reducer Strip',
    'Threshold Bar',
    'Self-Leveling Compound',
  ],
  Lighting: [
    'LED A19 4-Pack 800lm',
    '6in Recessed LED',
    '52in Ceiling Fan w/Light',
    'PAR38 LED Flood 2-Pack',
    'Under Cabinet LED Strip',
    'LED Motion Light 3000lm',
    'Smart Bulb RGBW',
    '4ft LED Shop Light',
    'Outdoor Post Light',
    'Track Lighting 4-Light',
    'Plug-In Pendant Light',
  ],
  Hardware: [
    'Wood Screw Coarse 1lb',
    '3/8in x 3.5in Lag Bolt',
    'Drywall Anchor Kit 100pc',
    '3.5in Door Hinge Pair',
    'Cabinet Cup Pull',
    'Keyed Entry Handleset',
    'Full Extension Drawer Slide',
    '90deg Corner Brace 4pk',
    'Heavy Duty Hook 4pk',
    'Shelf Bracket Pair',
    'Carriage Bolt Box',
  ],
  'Outdoor & Garden': [
    '50ft Garden Hose',
    '21in Self-Propel Mower',
    'Pop-Up Sprinkler Head',
    'Long Handle Shovel',
    '4cf Wheelbarrow',
    'Electric Pressure Washer',
    'Cordless Leaf Blower',
    'Hedge Trimmer 22in',
    'Aerator Spreader',
    'Post Hole Digger',
    'Garden Kneeler Pad',
  ],
  'Doors & Windows': [
    '32in Interior Prehung Door',
    '36in Fiberglass Entry Door',
    '36in Steel Storm Door',
    '36x48 Double-Hung Window',
    'Window Screen 18x20',
    'Adjustable Threshold',
    'Door Bottom Seal',
    'Automatic Door Closer',
    'Barn Door Hardware Kit',
    'French Door 60x80',
    'Sliding Patio Door Screen',
  ],
  'Kitchen & Bath': [
    'Pull-Down Kitchen Faucet',
    '30in Bathroom Vanity',
    'Elongated 2-Piece Toilet',
    'Ventilation Bath Fan 110CFM',
    '33x22 Undermount Sink',
    'Towel Bar 24in',
    'Soap Dispenser Pump',
    'Frameless Shower Door 60in',
    'Pedestal Sink',
    'Kitchen Drain Strainer',
    'Toilet Seat Soft-Close',
  ],
};

const CATEGORY_BRANDS: Record<string, string[]> = {
  'Power Tools': [
    'DeWalt',
    'Milwaukee',
    'Makita',
    'Bosch',
    'Ridgid',
    'Ryobi',
    'Craftsman',
    'Black+Decker',
  ],
  'Hand Tools': [
    'Stanley',
    'Klein Tools',
    'Irwin',
    'Craftsman',
    'Tekton',
    'Husky',
    'Kobalt',
    'Channellock',
  ],
  'Building Materials': [
    'Georgia-Pacific',
    'USG',
    'Quikrete',
    'National Gypsum',
    'Owens Corning',
    'James Hardie',
    'LP Building',
    'CertainTeed',
  ],
  Plumbing: [
    'SharkBite',
    'Charlotte Pipe',
    'Nibco',
    'Watts',
    'Sioux Chief',
    'Mueller',
    'Eastman',
    'Everbilt',
  ],
  Electrical: [
    'Southwire',
    'Leviton',
    'Siemens',
    'Eaton',
    'Pass & Seymour',
    'Ideal',
    'Gardner Bender',
    'Hubbell',
  ],
  'Paint & Supplies': [
    'Behr',
    'Rust-Oleum',
    'Valspar',
    'Zinsser',
    '3M',
    'Purdy',
    'FrogTape',
    'Wooster',
  ],
  Flooring: [
    'Pergo',
    'Armstrong',
    'LifeProof',
    'Shaw',
    'Mohawk',
    'TrafficMaster',
    'Merola',
    'Laticrete',
  ],
  Lighting: [
    'GE',
    'Philips',
    'Lutron',
    'Hampton Bay',
    'Progress Lighting',
    'Halo',
    'Cree',
    'Commercial Electric',
  ],
  Hardware: [
    'Everbilt',
    'Hillman',
    'Richelieu',
    'Liberty',
    'National Hardware',
    'Prime-Line',
    'ClosetMaid',
    'Schlage',
  ],
  'Outdoor & Garden': [
    'Craftsman',
    'Husqvarna',
    'Toro',
    'Orbit',
    'Fiskars',
    'Sun Joe',
    'EGO',
    'Troy-Bilt',
  ],
  'Doors & Windows': [
    'JELD-WEN',
    'Masonite',
    'Andersen',
    'Pella',
    'ReliaBilt',
    'Larson',
    'Pemko',
    'Therma-Tru',
  ],
  'Kitchen & Bath': [
    'Moen',
    'Delta',
    'Kohler',
    'American Standard',
    'Pfister',
    'Glacier Bay',
    'Kingston Brass',
    'Toto',
  ],
};

const PRICE_RANGES: Record<string, [number, number]> = {
  'Power Tools': [29, 599],
  'Hand Tools': [5, 149],
  'Building Materials': [8, 499],
  Plumbing: [3, 299],
  Electrical: [4, 199],
  'Paint & Supplies': [5, 89],
  Flooring: [15, 299],
  Lighting: [8, 299],
  Hardware: [3, 79],
  'Outdoor & Garden': [19, 799],
  'Doors & Windows': [49, 1499],
  'Kitchen & Bath': [29, 999],
};

function seeded(n: number): number {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

function randInRange(min: number, max: number, seed: number): number {
  return +(min + seeded(seed) * (max - min)).toFixed(2);
}

function generateProducts(): Product[] {
  const products: Product[] = [];
  const categories = Object.keys(PRODUCT_TYPES);

  outer: for (let ci = 0; ci < categories.length; ci++) {
    const category = categories[ci];
    const types = PRODUCT_TYPES[category];
    const brands = CATEGORY_BRANDS[category];
    const [minP, maxP] = PRICE_RANGES[category];

    for (let ti = 0; ti < types.length; ti++) {
      for (let bi = 0; bi < brands.length; bi++) {
        if (products.length >= 1000) break outer;

        const idx = products.length;
        const seed = idx * 97 + ci * 13 + ti * 7 + bi * 3;

        const basePrice = randInRange(minP, maxP, seed);
        const onSale = seeded(seed + 1) > 0.7;
        const price = onSale
          ? +(basePrice * (1 - randInRange(0.1, 0.35, seed + 2))).toFixed(2)
          : basePrice;
        const originalPrice = onSale ? basePrice : basePrice;
        const rating = +(3.0 + seeded(seed + 3) * 2.0).toFixed(1);
        const reviewCount = Math.floor(seeded(seed + 4) * 4998) + 1;
        const inStock = seeded(seed + 5) > 0.15;
        const imageUrl = `https://picsum.photos/seed/prod${idx + 1}/400/300`;
        const sku = `HD-${String(ci + 1).padStart(2, '0')}${String(ti + 1).padStart(2, '0')}${String(bi + 1).padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`;

        products.push({
          id: `prod-${idx + 1}`,
          name: `${brands[bi]} ${types[ti]}`,
          category,
          brand: brands[bi],
          price,
          originalPrice,
          rating,
          reviewCount,
          inStock,
          onSale,
          imageUrl,
          sku,
        });
      }
    }
  }

  return products;
}

export const PRODUCTS: Product[] = generateProducts();

export const ALL_CATEGORIES = Object.keys(PRODUCT_TYPES);

export const ALL_BRANDS = [...new Set(Object.values(CATEGORY_BRANDS).flat())].sort();
