/**
 * Cavero Fragrances — Full Reset + New Category / Product Seed
 *
 * WHAT THIS DOES:
 *   1. Wipes all products, variants, and categories
 *   2. Creates 4 new categories with images from "Attar images/Category Photos/"
 *   3. Copies product images from "Attar images/" → uploads/products/
 *   4. Seeds 10 products with correct category assignments
 *      (multi-category stored in specifications.categories[] JSONB)
 *   5. Seeds 3 variants per product (27 total)
 *
 * NEW CATEGORIES:
 *   Men's Fragrances  → IMG_3675.PNG
 *   Women's Fragrances → IMG_3676.PNG
 *   Unisex Fragrances  → IMG_3677.PNG
 *   Oud Collection     → IMG_3678.PNG
 *
 * Run from project root:
 *   node backend/auth-service/scripts/seed-new-setup.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const fs        = require('fs');
const sequelize = require('../config/db');

const PROJECT_ROOT   = path.join(__dirname, '../../..');
const ATTAR_DIR      = path.join(PROJECT_ROOT, 'Attar images');
const CAT_PHOTO_DIR  = path.join(ATTAR_DIR, 'Category Photos');
const PROD_UPLOADS   = path.join(PROJECT_ROOT, 'src', 'assets', 'uploads', 'products');
const CAT_UPLOADS    = path.join(PROJECT_ROOT, 'src', 'assets', 'uploads', 'categories');

// ── Ensure uploads/categories folder exists ───────────────────────────────────
if (!fs.existsSync(CAT_UPLOADS)) fs.mkdirSync(CAT_UPLOADS, { recursive: true });

// ── Copy product images ───────────────────────────────────────────────────────
function copyProductImages(folderName, slug) {
  const srcDir = path.join(ATTAR_DIR, folderName);
  const map = [
    { candidates: ['Hero page.jpg', 'Hero Page.jpg'], dest: `${slug}-1.jpg` },
    { candidates: ['2nd page.jpg'],                   dest: `${slug}-2.jpg` },
    { candidates: ['3rd page.jpg'],                   dest: `${slug}-3.jpg` },
  ];
  for (const { candidates, dest } of map) {
    for (const c of candidates) {
      const src = path.join(srcDir, c);
      if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(PROD_UPLOADS, dest)); break; }
    }
  }
}

// ── Category definitions ──────────────────────────────────────────────────────
// Photos order: IMG_3675=Men's, IMG_3676=Women's, IMG_3677=Unisex, IMG_3678=Oud
const CATEGORIES = [
  {
    name: "Men's Fragrances",
    slug: 'mens-fragrances',
    description: 'Bold, fresh, and powerful fragrances crafted for the modern man.',
    srcPhoto: 'IMG_3675.PNG',
    destPhoto: 'mens-fragrances.png',
    sort_order: 1,
    meta_title: "Men's Fragrances | Cavero Fragrances",
    meta_description: 'Shop premium men\'s perfumes — EDP, EDT, and attars. Bold woody, fresh, and oriental fragrances. Cavero Fragrances.',
  },
  {
    name: "Women's Fragrances",
    slug: 'womens-fragrances',
    description: 'Elegant and feminine fragrances for the confident modern woman.',
    srcPhoto: 'IMG_3676.PNG',
    destPhoto: 'womens-fragrances.png',
    sort_order: 2,
    meta_title: "Women's Fragrances | Cavero Fragrances",
    meta_description: 'Shop premium women\'s perfumes — floral, woody, and oriental EDPs. Graceful and long-lasting. Cavero Fragrances.',
  },
  {
    name: 'Unisex Fragrances',
    slug: 'unisex-fragrances',
    description: 'Gender-fluid fragrances loved by all — sophisticated, versatile, and unforgettable.',
    srcPhoto: 'IMG_3677.PNG',
    destPhoto: 'unisex-fragrances.png',
    sort_order: 3,
    meta_title: 'Unisex Fragrances | Cavero Fragrances',
    meta_description: 'Shop unisex perfumes for men and women — oud, gourmand, spicy, and fresh fragrances. Cavero Fragrances.',
  },
  {
    name: 'Oud Collection',
    slug: 'oud-collection',
    description: 'The finest Arabian Oud and Attar fragrances — deep, rich, and timeless.',
    srcPhoto: 'IMG_3678.PNG',
    destPhoto: 'oud-collection.png',
    sort_order: 4,
    meta_title: 'Oud Collection | Premium Arabian Oud | Cavero Fragrances',
    meta_description: 'Explore Cavero\'s Oud Collection — authentic Arabian oud attars and EDP fragrances. Rich, warm, and long-lasting.',
  },
];

// ── Product definitions ───────────────────────────────────────────────────────
// primaryCategory  = category_id FK
// categories[]     = all slugs (including primary) for multi-category JSONB filter
const PRODUCTS = [
  // ── Men's Fragrances ────────────────────────────────────────────────────────
  {
    name: 'Avento',
    slug: 'avento',
    sku: 'CAV-AVN-002',
    imageFolder: 'Avento',
    primaryCategory: 'mens-fragrances',
    categories: ['mens-fragrances'],
    short_description: 'A bold and adventurous EDP with a fresh woody signature. Built for the modern man who leaves a lasting impression.',
    description: 'Avento is a powerful Eau de Parfum that opens with a burst of bergamot and lemon before unfolding into a sophisticated heart of lavender and geranium. The dry-down reveals a warm sandalwood and musk base that lingers for hours. Ideal for office, evenings, and special occasions.',
    price: 599, compare_price: 799, stock: 999,
    is_featured: false,
    ingredients: 'Top: Bergamot, Lemon\nMiddle: Lavender, Geranium\nBase: Sandalwood, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best applied after a shower on moisturised skin.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Woody Fresh', gender: 'Men' },
    seo_title: 'Avento EDP for Men | Fresh Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Avento EDP — a bold fresh woody fragrance for men by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-AVN-002-30ML',  price: 599,  compare_price: 799,  stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-AVN-002-50ML',  price: 899,  compare_price: 1199, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-AVN-002-100ML', price: 1499, compare_price: 1999, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Issey Miyake',
    slug: 'issey-miyake',
    sku: 'CAV-ISS-003',
    imageFolder: 'Issey Miyake',
    primaryCategory: 'mens-fragrances',
    categories: ['mens-fragrances'],
    short_description: 'A fresh and aquatic unisex EDT. Clean, light, and universally appealing for every season.',
    description: 'Inspired by the iconic aquatic fragrance tradition, this Eau de Toilette opens with bright bergamot and clean aquatic notes before flowing into a soft heart of lily and jasmine. The base of sandalwood, amber, and musk gives it a gentle warmth. Light enough for daily wear, memorable enough for special moments.',
    price: 649, compare_price: 849, stock: 999,
    is_featured: false,
    ingredients: 'Top: Aquatic, Bergamot\nMiddle: Lily, Jasmine\nBase: Sandalwood, Amber, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Reapply midday for a refreshing boost.',
    specifications_base: { concentration: 'EDT', fragrance_family: 'Fresh Aquatic', gender: 'Men' },
    seo_title: 'Issey Miyake EDT for Men | Fresh Aquatic Perfume | Cavero Fragrances',
    seo_description: 'Buy Issey Miyake inspired EDT — a clean fresh aquatic fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-ISS-003-30ML',  price: 649,  compare_price: 849,  stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-ISS-003-50ML',  price: 1099, compare_price: 1449, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-ISS-003-100ML', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Musk Rijali',
    slug: 'musk-rijali',
    sku: 'CAV-MSK-004',
    imageFolder: 'Musk Rijali',
    primaryCategory: 'mens-fragrances',
    categories: ['mens-fragrances'],
    short_description: 'A classic masculine musk attar enriched with saffron and amber. Warm, sensual, and deeply Arabian.',
    description: 'Musk Rijali is a time-honoured Arabian attar blending the richness of pure musk with warm saffron and deep amber. The opening note of saffron gradually gives way to a musk and rose heart, grounding into an oud and amber base. A fragrance that evokes the heritage of Arabian grooming traditions.',
    price: 449, compare_price: 599, stock: 999,
    is_featured: false,
    ingredients: 'Top: Saffron\nMiddle: Rose, Musk\nBase: Amber, Oud',
    calories: 'Apply a small drop on pulse points — wrists, inner elbow, and neck. Do not rub. Let it warm naturally with your skin for full fragrance development.',
    specifications_base: { concentration: 'Attar / Itr', fragrance_family: 'Oriental Musk', gender: 'Men' },
    seo_title: 'Musk Rijali Attar for Men | Arabian Musk Itr | Cavero Fragrances',
    seo_description: 'Buy Musk Rijali — a rich masculine musk attar with saffron and amber by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml',  sku: 'CAV-MSK-004-3ML',  price: 449,  compare_price: 599,  stock: 333, threshold: 20, sort: 0 },
      { name: '6ml',  sku: 'CAV-MSK-004-6ML',  price: 799,  compare_price: 1099, stock: 333, threshold: 20, sort: 1 },
      { name: '12ml', sku: 'CAV-MSK-004-12ML', price: 1299, compare_price: 1699, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Red Aura',
    slug: 'red-aura',
    sku: 'CAV-RAU-006',
    imageFolder: 'Red Aura',
    primaryCategory: 'mens-fragrances',
    categories: ['mens-fragrances'],
    short_description: 'A bold unisex EDP with a fiery spicy-woody character. For those who command attention wherever they go.',
    description: 'Red Aura is a daring Eau de Parfum that makes a statement from the very first spray. A fiery opening of orange and bergamot transitions into a spicy geranium and cedar heart. The dry-down is a rich blend of amber, musk, and patchouli — powerful and unforgettable. Designed for bold personalities who wear their confidence as a perfume.',
    price: 699, compare_price: 949, stock: 999,
    is_featured: false,
    ingredients: 'Top: Orange, Bergamot\nMiddle: Geranium, Cedar\nBase: Amber, Musk, Patchouli',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are sufficient given its powerful projection.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Spicy Woody', gender: 'Men' },
    seo_title: 'Red Aura EDP for Men | Bold Spicy Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Red Aura EDP — a bold spicy woody fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-RAU-006-30ML',  price: 699,  compare_price: 949,  stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-RAU-006-50ML',  price: 1199, compare_price: 1599, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-RAU-006-100ML', price: 1999, compare_price: 2699, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Tobacco Vanilla',
    slug: 'tobacco-vanilla',
    sku: 'CAV-TBV-009',
    imageFolder: 'Tobacco Vanilla',
    primaryCategory: 'mens-fragrances',
    categories: ['mens-fragrances', 'unisex-fragrances'],
    short_description: 'A rich gourmand EDP. Aged tobacco meets sweet vanilla in an irresistibly warm and luxurious blend.',
    description: 'Tobacco Vanilla is a sophisticated gourmand Eau de Parfum for those who appreciate rich, indulgent fragrances. The opening is a warm and smoky tobacco accord balanced with bright bergamot. The heart of sweet vanilla and tonka bean adds a creamy, addictive quality. A deep base of sandalwood and amber makes this a truly unforgettable evening fragrance.',
    price: 799, compare_price: 1099, stock: 999,
    is_featured: false,
    ingredients: 'Top: Tobacco, Bergamot\nMiddle: Vanilla, Tonka Bean\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best worn in evenings — the warmth of skin amplifies the vanilla accord beautifully.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Gourmand', gender: 'Men' },
    seo_title: 'Tobacco Vanilla EDP | Gourmand Perfume | Cavero Fragrances',
    seo_description: 'Buy Tobacco Vanilla EDP — a rich and indulgent gourmand fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-TBV-009-30ML',  price: 799,  compare_price: 1099, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-TBV-009-50ML',  price: 1399, compare_price: 1899, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-TBV-009-100ML', price: 2299, compare_price: 3099, stock: 333, threshold: 20, sort: 2 },
    ],
  },

  // ── Women's Fragrances ──────────────────────────────────────────────────────
  {
    name: 'Shanaya',
    slug: 'shanaya',
    sku: 'CAV-SHA-008',
    imageFolder: 'Shanaya',
    primaryCategory: 'womens-fragrances',
    categories: ['womens-fragrances'],
    short_description: 'A graceful floral EDP designed for the modern Indian woman. Light, joyful, and irresistibly feminine.',
    description: 'Shanaya is a fresh and joyful floral Eau de Parfum designed for the confident modern Indian woman. It opens with a lively bergamot and pink pepper accord before blossoming into a romantic heart of rose and jasmine. The gentle base of musk and sandalwood leaves a soft, warm trail that complements everyday wear beautifully.',
    price: 599, compare_price: 799, stock: 999,
    is_featured: false,
    ingredients: 'Top: Bergamot, Pink Pepper\nMiddle: Rose, Jasmine\nBase: Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are ideal for daytime wear.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Floral', gender: 'Women' },
    seo_title: 'Shanaya EDP for Women | Floral Perfume India | Cavero Fragrances',
    seo_description: 'Buy Shanaya EDP — a graceful floral fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-SHA-008-30ML',  price: 599,  compare_price: 799,  stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-SHA-008-50ML',  price: 999,  compare_price: 1299, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-SHA-008-100ML', price: 1699, compare_price: 2199, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Oud & Roses',
    slug: 'oud-and-roses',
    sku: 'CAV-ORS-005',
    imageFolder: 'Oud & Roses',
    primaryCategory: 'womens-fragrances',
    categories: ['womens-fragrances', 'oud-collection', 'unisex-fragrances'],
    short_description: 'A feminine masterpiece blending the elegance of Bulgarian roses with the depth of pure Arabian oud.',
    description: "Oud & Roses is Cavero's signature women's EDP — a luxurious blend that opens with a bright burst of rose and bergamot before revealing a rich heart of Arabian oud and patchouli. The base of sandalwood and warm amber creates a long-lasting trail that is both feminine and powerful. A fragrance for women who appreciate depth and elegance.",
    price: 899, compare_price: 1199, stock: 999,
    is_featured: true,
    ingredients: 'Top: Rose, Bergamot\nMiddle: Oud, Patchouli\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Layer with an unscented body lotion for extended wear.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Floral Woody', gender: 'Women' },
    seo_title: 'Oud & Roses EDP for Women | Floral Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy Oud & Roses EDP — a luxurious floral woody fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-ORS-005-30ML',  price: 899,  compare_price: 1199, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-ORS-005-50ML',  price: 1499, compare_price: 1999, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-ORS-005-100ML', price: 2499, compare_price: 3299, stock: 333, threshold: 20, sort: 2 },
    ],
  },

  // ── Oud Collection ──────────────────────────────────────────────────────────
  {
    name: 'Ameer Al Oudh',
    slug: 'ameer-al-oudh',
    sku: 'CAV-AOD-001',
    imageFolder: 'Ameer Al Oudh',
    primaryCategory: 'oud-collection',
    categories: ['oud-collection', 'unisex-fragrances'],
    short_description: 'A commanding oud attar crafted from the finest Agarwood. Deep, rich, and long-lasting — a signature of Arabian royalty.',
    description: 'Ameer Al Oudh is a premium concentrated attar inspired by the grand tradition of Arabian perfumery. Crafted from pure Agarwood extract, it opens with a warm saffron note before settling into a rich oud and rose heart. The base of amber and musk ensures all-day longevity on skin and clothes. A true collector\'s attar.',
    price: 399, compare_price: 549, stock: 999,
    is_featured: true,
    ingredients: 'Top: Saffron\nMiddle: Rose, Oud\nBase: Amber, Musk',
    calories: 'Apply a small drop on pulse points — wrists, inner elbow, and neck. Do not rub. Let it warm naturally with your skin for full fragrance development.',
    specifications_base: { concentration: 'Attar / Itr', fragrance_family: 'Oriental Oud', gender: 'Unisex' },
    seo_title: 'Ameer Al Oudh Attar Itr | Premium Arabian Oud | Cavero Fragrances',
    seo_description: 'Buy Ameer Al Oudh — a rich and intense Arabian oud attar by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml',  sku: 'CAV-AOD-001-3ML',  price: 399,  compare_price: 549,  stock: 333, threshold: 20, sort: 0 },
      { name: '6ml',  sku: 'CAV-AOD-001-6ML',  price: 699,  compare_price: 949,  stock: 333, threshold: 20, sort: 1 },
      { name: '12ml', sku: 'CAV-AOD-001-12ML', price: 1299, compare_price: 1699, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'White Oudh',
    slug: 'white-oudh',
    sku: 'CAV-WOU-010',
    imageFolder: 'White Oudh',
    primaryCategory: 'oud-collection',
    categories: ['oud-collection', 'unisex-fragrances'],
    short_description: 'A refined EDP celebrating the purity of white oud. Clean, creamy, and sophisticatedly modern.',
    description: 'White Oudh is a contemporary Eau de Parfum that reimagines the classic Arabian oud through a modern lens. The opening of bergamot and cardamom gives it a bright and inviting character. The heart of white oud and rose is clean and creamy — far from the traditional heavy oud. The base of amber, musk, and sandalwood anchors it with warmth and depth. Perfect for those new to oud fragrances.',
    price: 649, compare_price: 849, stock: 999,
    is_featured: true,
    ingredients: 'Top: Bergamot, Cardamom\nMiddle: White Oud, Rose\nBase: Amber, Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays give excellent projection throughout the day.',
    specifications_base: { concentration: 'EDP', fragrance_family: 'Woody Oud', gender: 'Unisex' },
    seo_title: 'White Oudh EDP | Modern Arabian Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy White Oudh EDP — a clean and modern oud fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml',  sku: 'CAV-WOU-010-30ML',  price: 649,  compare_price: 849,  stock: 333, threshold: 20, sort: 0 },
      { name: '50ml',  sku: 'CAV-WOU-010-50ML',  price: 1099, compare_price: 1449, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', sku: 'CAV-WOU-010-100ML', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },

  // ── Unisex Fragrances ───────────────────────────────────────────────────────
  {
    name: 'Saffron',
    slug: 'saffron',
    sku: 'CAV-SAF-007',
    imageFolder: 'Saffron',
    primaryCategory: 'unisex-fragrances',
    categories: ['unisex-fragrances'],
    short_description: 'An opulent Parfum Extrait built around rare saffron. Rich, warm, and intoxicatingly complex.',
    description: "Saffron is Cavero's most precious offering — a Parfum Extrait of the highest concentration built around the rarest ingredient in perfumery. The opening reveals a spiced saffron and cardamom accord of exceptional intensity. The heart of rose and oud is deep and meditative. The base of sandalwood, amber, and vanilla grounds the fragrance into a warm, lasting signature that endures for 12+ hours.",
    price: 649, compare_price: 899, stock: 999,
    is_featured: true,
    ingredients: 'Top: Saffron, Cardamom\nMiddle: Rose, Oud\nBase: Sandalwood, Amber, Vanilla',
    calories: 'Apply 1–2 small drops on pulse points — wrists, neck, and behind ears. Do not rub. This is highly concentrated — a little goes a very long way.',
    specifications_base: { concentration: 'Parfum Extrait', fragrance_family: 'Oriental Spicy', gender: 'Unisex' },
    seo_title: 'Saffron Parfum Extrait | Luxury Arabian Attar | Cavero Fragrances',
    seo_description: 'Buy Saffron Parfum Extrait — the most concentrated and opulent fragrance by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml',  sku: 'CAV-SAF-007-3ML',  price: 649,  compare_price: 899,  stock: 333, threshold: 20, sort: 0 },
      { name: '6ml',  sku: 'CAV-SAF-007-6ML',  price: 1099, compare_price: 1499, stock: 333, threshold: 20, sort: 1 },
      { name: '12ml', sku: 'CAV-SAF-007-12ML', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },
];

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to cavero_db\n');

    // ── STEP 1: Wipe products, variants, categories ───────────────────────────
    console.log('Clearing existing data...');
    await sequelize.query('DELETE FROM product_variants');
    await sequelize.query('DELETE FROM products');
    await sequelize.query('DELETE FROM categories');
    console.log('  ✓ products, variants, categories cleared\n');

    // ── STEP 2: Copy category images ──────────────────────────────────────────
    console.log('Copying category images...');
    for (const cat of CATEGORIES) {
      const src = path.join(CAT_PHOTO_DIR, cat.srcPhoto);
      const dest = path.join(CAT_UPLOADS, cat.destPhoto);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${cat.name} → ${cat.destPhoto}`);
      } else {
        console.warn(`  ⚠ Not found: ${src}`);
      }
    }
    console.log('');

    // ── STEP 3: Copy product images ───────────────────────────────────────────
    console.log('Copying product images...');
    for (const p of PRODUCTS) {
      try {
        copyProductImages(p.imageFolder, p.slug);
        console.log(`  ✓ ${p.name}`);
      } catch (e) {
        console.warn(`  ⚠ ${p.name}: ${e.message}`);
      }
    }
    console.log('');

    // ── STEP 4: Seed categories ───────────────────────────────────────────────
    console.log('Seeding categories...');
    const catIdMap = {}; // slug → id

    for (const cat of CATEGORIES) {
      const imageUrl = `/uploads/categories/${cat.destPhoto}`;
      const [rows] = await sequelize.query(`
        INSERT INTO categories
          (name, slug, description, image_url, status, is_featured, sort_order,
           meta_title, meta_description, "createdAt", "updatedAt")
        VALUES
          (:name, :slug, :description, :image_url, true, false, :sort_order,
           :meta_title, :meta_description, NOW(), NOW())
        RETURNING id
      `, {
        replacements: {
          name:             cat.name,
          slug:             cat.slug,
          description:      cat.description,
          image_url:        imageUrl,
          sort_order:       cat.sort_order,
          meta_title:       cat.meta_title,
          meta_description: cat.meta_description,
        },
      });
      catIdMap[cat.slug] = rows[0].id;
      console.log(`  ✓ ${cat.name} (id=${rows[0].id})`);
    }
    console.log('');

    // ── STEP 5: Seed products + variants ──────────────────────────────────────
    console.log('Seeding products and variants...');
    for (const p of PRODUCTS) {
      const categoryId = catIdMap[p.primaryCategory];
      if (!categoryId) {
        console.error(`  ✗ Primary category not found: ${p.primaryCategory} — skipping ${p.name}`);
        continue;
      }

      // Merge categories array into specifications
      const specifications = {
        ...p.specifications_base,
        categories: p.categories,
      };

      const images = [1, 2, 3].map(i => ({
        filename:     `${p.slug}-${i}.jpg`,
        originalname: `${p.slug}-${i}.jpg`,
        path:         `uploads/products/${p.slug}-${i}.jpg`,
        url:          `/uploads/products/${p.slug}-${i}.jpg`,
        mimetype:     'image/jpeg',
        size:         0,
      }));

      const [rows] = await sequelize.query(`
        INSERT INTO products
          (name, slug, sku, short_description, description,
           price, compare_price, stock,
           category_id, weight, weight_unit,
           is_featured, status, is_published, track_quantity,
           ingredients, calories, images, specifications,
           seo_title, seo_description,
           rating, review_count,
           "createdAt", "updatedAt")
        VALUES
          (:name, :slug, :sku, :short_description, :description,
           :price, :compare_price, :stock,
           :category_id, 0, 'ml',
           :is_featured, true, true, true,
           :ingredients, :calories, :images, :specifications,
           :seo_title, :seo_description,
           0, 0,
           NOW(), NOW())
        RETURNING id
      `, {
        replacements: {
          name:              p.name,
          slug:              p.slug,
          sku:               p.sku,
          short_description: p.short_description,
          description:       p.description,
          price:             p.price,
          compare_price:     p.compare_price,
          stock:             p.stock,
          category_id:       categoryId,
          is_featured:       p.is_featured,
          ingredients:       p.ingredients,
          calories:          p.calories,
          images:            JSON.stringify(images),
          specifications:    JSON.stringify(specifications),
          seo_title:         p.seo_title,
          seo_description:   p.seo_description,
        },
      });

      const productId = rows[0].id;

      for (const v of p.variants) {
        await sequelize.query(`
          INSERT INTO product_variants
            (product_id, name, sku, price, compare_price, stock,
             low_stock_threshold, is_active, sort_order,
             "createdAt", "updatedAt")
          VALUES
            (:product_id, :name, :sku, :price, :compare_price, :stock,
             :threshold, true, :sort,
             NOW(), NOW())
        `, {
          replacements: {
            product_id:   productId,
            name:         v.name,
            sku:          v.sku,
            price:        v.price,
            compare_price: v.compare_price,
            stock:        v.stock,
            threshold:    v.threshold,
            sort:         v.sort,
          },
        });
      }

      const cats = p.categories.join(', ');
      const vars = p.variants.map(v => v.name).join(', ');
      console.log(`  ✓ ${p.name.padEnd(20)} categories: [${cats}]   variants: ${vars}`);
    }

    // ── STEP 6: Summary ───────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('✅  SEED COMPLETE');
    console.log('══════════════════════════════════════════════════════');
    console.log('');
    console.log('  CATEGORIES (4):');
    CATEGORIES.forEach(c => console.log(`    ${c.sort_order}. ${c.name} (/${c.slug})`));
    console.log('');
    console.log('  PRODUCTS (10) + VARIANTS (30):');
    console.log('    Men\'s Fragrances : Avento, Issey Miyake, Musk Rijali, Red Aura, Tobacco Vanilla');
    console.log('    Women\'s Fragrances: Shanaya, Oud & Roses');
    console.log('    Oud Collection   : Ameer Al Oudh, White Oudh');
    console.log('    Unisex Fragrances: Saffron');
    console.log('');
    console.log('  MULTI-CATEGORY (cross-listed):');
    console.log('    Tobacco Vanilla  → Men\'s + Unisex');
    console.log('    Oud & Roses      → Women\'s + Oud Collection + Unisex');
    console.log('    Ameer Al Oudh    → Oud Collection + Unisex');
    console.log('    White Oudh       → Oud Collection + Unisex');
    console.log('══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
