/**
 * seed-new-images-products.js
 * Seeds the 9 remaining real products (Ameer Al Oudh is added manually) using the
 * images in  C:\Users\DELL\Downloads\New Images\<PRODUCT>\(1st pic.jpeg, 2nd pic.jpeg).
 *
 * - Does NOT touch existing categories or the manually-added Ameer Al Oudh.
 * - Copies each product's 2 images into src/assets/uploads/products with unique
 *   filenames and stores them in products.images JSONB in the SAME shape the admin
 *   upload produces (path/size/filename/mimetype/originalname).
 * - Concentration uses the short codes the storefront filter expects (EDP/EDT/etc).
 *
 * Run:  node backend/auth-service/scripts/seed-new-images-products.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/db');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const NEW_IMAGES_DIR = 'C:\\Users\\DELL\\Downloads\\New Images';
const PROD_UPLOADS = path.join(PROJECT_ROOT, 'src', 'assets', 'uploads', 'products');

if (!fs.existsSync(PROD_UPLOADS)) fs.mkdirSync(PROD_UPLOADS, { recursive: true });

// folder = subfolder name in "New Images"
const PRODUCTS = [
  {
    name: 'Avento', slug: 'avento', folder: 'AVENTO',
    primaryCategory: 'mens-fragrances', categories: ['mens-fragrances'],
    short_description: 'A bold and adventurous EDP with a fresh woody signature. Built for the modern man who leaves a lasting impression.',
    description: 'Avento is a powerful Eau de Parfum that opens with a burst of bergamot and lemon before unfolding into a sophisticated heart of lavender and geranium. The dry-down reveals a warm sandalwood and musk base that lingers for hours. Ideal for office, evenings, and special occasions.',
    price: 599, compare_price: 799, is_featured: false,
    ingredients: 'Top: Bergamot, Lemon\nMiddle: Lavender, Geranium\nBase: Sandalwood, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best applied after a shower on moisturised skin.',
    spec: { concentration: 'EDP', fragrance_family: 'Woody Fresh', gender: 'Men' },
    seo_title: 'Avento EDP for Men | Fresh Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Avento EDP — a bold fresh woody fragrance for men by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 599, compare_price: 799, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 899, compare_price: 1199, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 1499, compare_price: 1999, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Issey Miyake', slug: 'issey-miyake', folder: 'ISSEY MIYAKE',
    primaryCategory: 'mens-fragrances', categories: ['mens-fragrances'],
    short_description: 'A fresh and aquatic unisex EDT. Clean, light, and universally appealing for every season.',
    description: 'Inspired by the iconic aquatic fragrance tradition, this Eau de Toilette opens with bright bergamot and clean aquatic notes before flowing into a soft heart of lily and jasmine. The base of sandalwood, amber, and musk gives it a gentle warmth. Light enough for daily wear, memorable enough for special moments.',
    price: 649, compare_price: 849, is_featured: false,
    ingredients: 'Top: Aquatic, Bergamot\nMiddle: Lily, Jasmine\nBase: Sandalwood, Amber, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Reapply midday for a refreshing boost.',
    spec: { concentration: 'EDT', fragrance_family: 'Fresh Aquatic', gender: 'Men' },
    seo_title: 'Issey Miyake EDT for Men | Fresh Aquatic Perfume | Cavero Fragrances',
    seo_description: 'Buy Issey Miyake inspired EDT — a clean fresh aquatic fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 649, compare_price: 849, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 1099, compare_price: 1449, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Musk Rijali', slug: 'musk-rijali', folder: 'MUSK RIJALI',
    primaryCategory: 'mens-fragrances', categories: ['mens-fragrances'],
    short_description: 'A classic masculine musk attar enriched with saffron and amber. Warm, sensual, and deeply Arabian.',
    description: 'Musk Rijali is a time-honoured Arabian attar blending the richness of pure musk with warm saffron and deep amber. The opening note of saffron gradually gives way to a musk and rose heart, grounding into an oud and amber base. A fragrance that evokes the heritage of Arabian grooming traditions.',
    price: 449, compare_price: 599, is_featured: false,
    ingredients: 'Top: Saffron\nMiddle: Rose, Musk\nBase: Amber, Oud',
    calories: 'Apply a small drop on pulse points — wrists, inner elbow, and neck. Do not rub. Let it warm naturally with your skin for full fragrance development.',
    spec: { concentration: 'Attar / Itr', fragrance_family: 'Oriental Musk', gender: 'Men' },
    seo_title: 'Musk Rijali Attar for Men | Arabian Musk Itr | Cavero Fragrances',
    seo_description: 'Buy Musk Rijali — a rich masculine musk attar with saffron and amber by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml', price: 449, compare_price: 599, stock: 333, threshold: 20, sort: 0 },
      { name: '6ml', price: 799, compare_price: 1099, stock: 333, threshold: 20, sort: 1 },
      { name: '12ml', price: 1299, compare_price: 1699, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Red Aura', slug: 'red-aura', folder: 'RED AURA',
    primaryCategory: 'mens-fragrances', categories: ['mens-fragrances'],
    short_description: 'A bold unisex EDP with a fiery spicy-woody character. For those who command attention wherever they go.',
    description: 'Red Aura is a daring Eau de Parfum that makes a statement from the very first spray. A fiery opening of orange and bergamot transitions into a spicy geranium and cedar heart. The dry-down is a rich blend of amber, musk, and patchouli — powerful and unforgettable. Designed for bold personalities who wear their confidence as a perfume.',
    price: 699, compare_price: 949, is_featured: false,
    ingredients: 'Top: Orange, Bergamot\nMiddle: Geranium, Cedar\nBase: Amber, Musk, Patchouli',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are sufficient given its powerful projection.',
    spec: { concentration: 'EDP', fragrance_family: 'Spicy Woody', gender: 'Men' },
    seo_title: 'Red Aura EDP for Men | Bold Spicy Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Red Aura EDP — a bold spicy woody fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 699, compare_price: 949, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 1199, compare_price: 1599, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 1999, compare_price: 2699, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Tobacco Vanilla', slug: 'tobacco-vanilla', folder: 'TOBACCO VANILLA',
    primaryCategory: 'mens-fragrances', categories: ['mens-fragrances', 'unisex-fragrances'],
    short_description: 'A rich gourmand EDP. Aged tobacco meets sweet vanilla in an irresistibly warm and luxurious blend.',
    description: 'Tobacco Vanilla is a sophisticated gourmand Eau de Parfum for those who appreciate rich, indulgent fragrances. The opening is a warm and smoky tobacco accord balanced with bright bergamot. The heart of sweet vanilla and tonka bean adds a creamy, addictive quality. A deep base of sandalwood and amber makes this a truly unforgettable evening fragrance.',
    price: 799, compare_price: 1099, is_featured: false,
    ingredients: 'Top: Tobacco, Bergamot\nMiddle: Vanilla, Tonka Bean\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best worn in evenings — the warmth of skin amplifies the vanilla accord beautifully.',
    spec: { concentration: 'EDP', fragrance_family: 'Gourmand', gender: 'Men' },
    seo_title: 'Tobacco Vanilla EDP | Gourmand Perfume | Cavero Fragrances',
    seo_description: 'Buy Tobacco Vanilla EDP — a rich and indulgent gourmand fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 799, compare_price: 1099, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 1399, compare_price: 1899, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 2299, compare_price: 3099, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Shanaya', slug: 'shanaya', folder: 'SHANAYA',
    primaryCategory: 'womens-fragrances', categories: ['womens-fragrances'],
    short_description: 'A graceful floral EDP designed for the modern Indian woman. Light, joyful, and irresistibly feminine.',
    description: 'Shanaya is a fresh and joyful floral Eau de Parfum designed for the confident modern Indian woman. It opens with a lively bergamot and pink pepper accord before blossoming into a romantic heart of rose and jasmine. The gentle base of musk and sandalwood leaves a soft, warm trail that complements everyday wear beautifully.',
    price: 599, compare_price: 799, is_featured: false,
    ingredients: 'Top: Bergamot, Pink Pepper\nMiddle: Rose, Jasmine\nBase: Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are ideal for daytime wear.',
    spec: { concentration: 'EDP', fragrance_family: 'Floral', gender: 'Women' },
    seo_title: 'Shanaya EDP for Women | Floral Perfume India | Cavero Fragrances',
    seo_description: 'Buy Shanaya EDP — a graceful floral fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 599, compare_price: 799, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 999, compare_price: 1299, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 1699, compare_price: 2199, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Oud & Roses', slug: 'oud-and-roses', folder: 'OUD & ROSES',
    primaryCategory: 'womens-fragrances', categories: ['womens-fragrances', 'oud-collection', 'unisex-fragrances'],
    short_description: 'A feminine masterpiece blending the elegance of Bulgarian roses with the depth of pure Arabian oud.',
    description: "Oud & Roses is Cavero's signature women's EDP — a luxurious blend that opens with a bright burst of rose and bergamot before revealing a rich heart of Arabian oud and patchouli. The base of sandalwood and warm amber creates a long-lasting trail that is both feminine and powerful. A fragrance for women who appreciate depth and elegance.",
    price: 899, compare_price: 1199, is_featured: true,
    ingredients: 'Top: Rose, Bergamot\nMiddle: Oud, Patchouli\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Layer with an unscented body lotion for extended wear.',
    spec: { concentration: 'EDP', fragrance_family: 'Floral Woody', gender: 'Women' },
    seo_title: 'Oud & Roses EDP for Women | Floral Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy Oud & Roses EDP — a luxurious floral woody fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 899, compare_price: 1199, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 1499, compare_price: 1999, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 2499, compare_price: 3299, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'White Oudh', slug: 'white-oudh', folder: 'WHITE OUDH',
    primaryCategory: 'oud-collection', categories: ['oud-collection', 'unisex-fragrances'],
    short_description: 'A refined EDP celebrating the purity of white oud. Clean, creamy, and sophisticatedly modern.',
    description: 'White Oudh is a contemporary Eau de Parfum that reimagines the classic Arabian oud through a modern lens. The opening of bergamot and cardamom gives it a bright and inviting character. The heart of white oud and rose is clean and creamy — far from the traditional heavy oud. The base of amber, musk, and sandalwood anchors it with warmth and depth. Perfect for those new to oud fragrances.',
    price: 649, compare_price: 849, is_featured: true,
    ingredients: 'Top: Bergamot, Cardamom\nMiddle: White Oud, Rose\nBase: Amber, Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays give excellent projection throughout the day.',
    spec: { concentration: 'EDP', fragrance_family: 'Woody Oud', gender: 'Unisex' },
    seo_title: 'White Oudh EDP | Modern Arabian Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy White Oudh EDP — a clean and modern oud fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml.',
    variants: [
      { name: '30ml', price: 649, compare_price: 849, stock: 333, threshold: 20, sort: 0 },
      { name: '50ml', price: 1099, compare_price: 1449, stock: 333, threshold: 20, sort: 1 },
      { name: '100ml', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },
  {
    name: 'Saffron', slug: 'saffron', folder: 'SAFFRON',
    primaryCategory: 'unisex-fragrances', categories: ['unisex-fragrances'],
    short_description: 'An opulent Parfum Extrait built around rare saffron. Rich, warm, and intoxicatingly complex.',
    description: "Saffron is Cavero's most precious offering — a Parfum Extrait of the highest concentration built around the rarest ingredient in perfumery. The opening reveals a spiced saffron and cardamom accord of exceptional intensity. The heart of rose and oud is deep and meditative. The base of sandalwood, amber, and vanilla grounds the fragrance into a warm, lasting signature that endures for 12+ hours.",
    price: 649, compare_price: 899, is_featured: true,
    ingredients: 'Top: Saffron, Cardamom\nMiddle: Rose, Oud\nBase: Sandalwood, Amber, Vanilla',
    calories: 'Apply 1–2 small drops on pulse points — wrists, neck, and behind ears. Do not rub. This is highly concentrated — a little goes a very long way.',
    spec: { concentration: 'Parfum Extrait', fragrance_family: 'Oriental Spicy', gender: 'Unisex' },
    seo_title: 'Saffron Parfum Extrait | Luxury Arabian Attar | Cavero Fragrances',
    seo_description: 'Buy Saffron Parfum Extrait — the most concentrated and opulent fragrance by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml', price: 649, compare_price: 899, stock: 333, threshold: 20, sort: 0 },
      { name: '6ml', price: 1099, compare_price: 1499, stock: 333, threshold: 20, sort: 1 },
      { name: '12ml', price: 1799, compare_price: 2399, stock: 333, threshold: 20, sort: 2 },
    ],
  },
];

function rand() { return Math.floor(100000000 + Math.random() * 900000000); }

function copyImages(folder, slug) {
  const srcDir = path.join(NEW_IMAGES_DIR, folder);
  const sources = ['1st pic.jpeg', '2nd pic.jpeg'];
  const images = [];
  sources.forEach((file, i) => {
    const src = path.join(srcDir, file);
    if (!fs.existsSync(src)) { console.warn(`  ⚠ missing image: ${src}`); return; }
    const filename = `images-${Date.now()}-${rand()}.jpeg`;
    const dest = path.join(PROD_UPLOADS, filename);
    fs.copyFileSync(src, dest);
    images.push({
      path: dest,
      size: fs.statSync(dest).size,
      filename,
      mimetype: 'image/jpeg',
      originalname: file,
    });
  });
  return images;
}

async function seed() {
  await sequelize.authenticate();
  console.log('Connected to cavero_db\n');

  // slug -> category_id
  const cats = await sequelize.query('SELECT id, slug FROM categories', { type: sequelize.QueryTypes.SELECT });
  const catId = {};
  cats.forEach(c => { catId[c.slug] = c.id; });

  for (const p of PRODUCTS) {
    const exists = await sequelize.query('SELECT id FROM products WHERE slug = :slug', {
      replacements: { slug: p.slug }, type: sequelize.QueryTypes.SELECT,
    });
    if (exists.length) { console.log(`–  ${p.name} already exists, skipping`); continue; }

    const images = copyImages(p.folder, p.slug);
    const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
    const specifications = { ...p.spec, categories: p.categories };
    const sku = `CAV-${p.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 10)}`;

    const inserted = await sequelize.query(
      `INSERT INTO products
        (category_id, name, slug, short_description, description, price, compare_price, stock, sku,
         images, status, is_featured, is_published, specifications, ingredients, calories,
         weight_unit, seo_title, seo_description, "createdAt", "updatedAt")
       VALUES
        (:category_id, :name, :slug, :short_description, :description, :price, :compare_price, :stock, :sku,
         CAST(:images AS jsonb), true, :is_featured, true, CAST(:specifications AS jsonb), :ingredients, :calories,
         'ml', :seo_title, :seo_description, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          category_id: catId[p.primaryCategory],
          name: p.name, slug: p.slug,
          short_description: p.short_description, description: p.description,
          price: p.price, compare_price: p.compare_price, stock: totalStock, sku,
          images: JSON.stringify(images),
          is_featured: p.is_featured,
          specifications: JSON.stringify(specifications),
          ingredients: p.ingredients, calories: p.calories,
          seo_title: p.seo_title, seo_description: p.seo_description,
        },
        type: sequelize.QueryTypes.INSERT,
      }
    );
    const productId = inserted[0][0].id;

    for (const v of p.variants) {
      await sequelize.query(
        `INSERT INTO product_variants
          (product_id, name, sku, price, compare_price, stock, low_stock_threshold, is_active, sort_order, "createdAt", "updatedAt")
         VALUES
          (:product_id, :name, :sku, :price, :compare_price, :stock, :threshold, true, :sort, NOW(), NOW())`,
        {
          replacements: {
            product_id: productId, name: v.name, sku: `${sku}-${v.name.toUpperCase()}`,
            price: v.price, compare_price: v.compare_price, stock: v.stock,
            threshold: v.threshold, sort: v.sort,
          },
          type: sequelize.QueryTypes.INSERT,
        }
      );
    }
    console.log(`✓  ${p.name.padEnd(16)} — ${images.length} img, ${p.variants.length} variants, stock ${totalStock}`);
  }

  console.log('\n✅ Seed complete.');
  await sequelize.close();
}

seed().catch(err => { console.error('FATAL:', err); process.exit(1); });
