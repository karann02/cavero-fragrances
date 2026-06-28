/**
 * Cavero Fragrances — Seed Remaining 9 Products + Variants
 *
 * Seeds: Avento, Issey Miyake, Musk Rijali, Oud & Roses, Red Aura,
 *        Saffron, Shanaya, Tobacco Vanilla, White Oudh
 *
 * Run from project root:
 *   node backend/auth-service/scripts/seed-9-products.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const fs   = require('fs');
const sequelize = require('../config/db');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const ATTAR_DIR    = path.join(PROJECT_ROOT, 'Attar images');
const UPLOADS_DIR  = path.join(PROJECT_ROOT, 'src', 'assets', 'uploads', 'products');

// ── Copy images from source folder → uploads/products ────────────────────────
function copyImages(folderName, slug) {
  const srcDir = path.join(ATTAR_DIR, folderName);
  const map = [
    { candidates: ['Hero page.jpg', 'Hero Page.jpg'], dest: `${slug}-1.jpg` },
    { candidates: ['2nd page.jpg'],                   dest: `${slug}-2.jpg` },
    { candidates: ['3rd page.jpg'],                   dest: `${slug}-3.jpg` },
  ];
  for (const { candidates, dest } of map) {
    let copied = false;
    for (const candidate of candidates) {
      const srcPath = path.join(srcDir, candidate);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(UPLOADS_DIR, dest));
        copied = true;
        break;
      }
    }
    if (!copied) console.warn(`    ⚠  Image not found: ${dest} (tried: ${candidates.join(', ')})`);
  }
}

// ── Product definitions ───────────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: 'Avento',
    slug: 'avento',
    sku: 'CAV-AVN-002',
    imageFolder: 'Avento',
    categoryName: "Men's Fragrances",
    short_description: 'A bold and adventurous EDP with a fresh woody signature. Built for the modern man who leaves a lasting impression.',
    description: 'Avento is a powerful Eau de Parfum that opens with a burst of bergamot and lemon before unfolding into a sophisticated heart of lavender and geranium. The dry-down reveals a warm sandalwood and musk base that lingers for hours. Ideal for office, evenings, and special occasions.',
    price: 599, compare_price: 799, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Bergamot, Lemon\nMiddle: Lavender, Geranium\nBase: Sandalwood, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best applied after a shower on moisturised skin.',
    specifications: { concentration: 'EDP', fragrance_family: 'Woody Fresh', gender: 'Men' },
    seo_title: 'Avento EDP for Men | Fresh Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Avento EDP — a bold fresh woody fragrance for men by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Free gift on orders above ₹999.',
    variants: [
      { name: '30ml',  sku: 'CAV-AVN-002-30ML',  price: 599,  compare_price: 799,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-AVN-002-50ML',  price: 899,  compare_price: 1199, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-AVN-002-100ML', price: 1499, compare_price: 1999, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Issey Miyake',
    slug: 'issey-miyake',
    sku: 'CAV-ISS-003',
    imageFolder: 'Issey Miyake',
    categoryName: 'Unisex & Niche',
    short_description: 'A fresh and aquatic unisex EDT. Clean, light, and universally appealing for every season.',
    description: 'Inspired by the iconic aquatic fragrance tradition, this Eau de Toilette opens with bright bergamot and clean aquatic notes before flowing into a soft heart of lily and jasmine. The base of sandalwood, amber, and musk gives it a gentle warmth. Light enough for daily wear, memorable enough for special moments.',
    price: 649, compare_price: 849, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Aquatic, Bergamot\nMiddle: Lily, Jasmine\nBase: Sandalwood, Amber, Musk',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Reapply midday for a refreshing boost.',
    specifications: { concentration: 'EDT', fragrance_family: 'Fresh Aquatic', gender: 'Unisex' },
    seo_title: 'Issey Miyake EDT Unisex | Fresh Aquatic Perfume | Cavero Fragrances',
    seo_description: 'Buy Issey Miyake inspired EDT — a clean fresh aquatic fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Shop now.',
    variants: [
      { name: '30ml',  sku: 'CAV-ISS-003-30ML',  price: 649,  compare_price: 849,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-ISS-003-50ML',  price: 1099, compare_price: 1449, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-ISS-003-100ML', price: 1799, compare_price: 2399, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Musk Rijali',
    slug: 'musk-rijali',
    sku: 'CAV-MSK-004',
    imageFolder: 'Musk Rijali',
    categoryName: "Men's Fragrances",
    short_description: 'A classic masculine musk attar enriched with saffron and amber. Warm, sensual, and deeply Arabian.',
    description: 'Musk Rijali is a time-honoured Arabian attar blending the richness of pure musk with warm saffron and deep amber. The opening note of saffron gradually gives way to a musk and rose heart, grounding into an oud and amber base. A fragrance that evokes the heritage of Arabian grooming traditions.',
    price: 449, compare_price: 599, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Saffron\nMiddle: Rose, Musk\nBase: Amber, Oud',
    calories: 'Apply a small drop on pulse points — wrists, inner elbow, and neck. Do not rub. Let it warm naturally with your skin for full fragrance development.',
    specifications: { concentration: 'Attar / Itr', fragrance_family: 'Oriental Musk', gender: 'Men' },
    seo_title: 'Musk Rijali Attar for Men | Arabian Musk Itr | Cavero Fragrances',
    seo_description: 'Buy Musk Rijali — a rich masculine musk attar with saffron and amber by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml',  sku: 'CAV-MSK-004-3ML',  price: 449,  compare_price: 599,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '6ml',  sku: 'CAV-MSK-004-6ML',  price: 799,  compare_price: 1099, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '12ml', sku: 'CAV-MSK-004-12ML', price: 1299, compare_price: 1699, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Oud & Roses',
    slug: 'oud-and-roses',
    sku: 'CAV-ORS-005',
    imageFolder: 'Oud & Roses',
    categoryName: "Women's Fragrances",
    short_description: 'A feminine masterpiece blending the elegance of Bulgarian roses with the depth of pure Arabian oud.',
    description: "Oud & Roses is Cavero's signature women's EDP — a luxurious blend that opens with a bright burst of rose and bergamot before revealing a rich heart of Arabian oud and patchouli. The base of sandalwood and warm amber creates a long-lasting trail that is both feminine and powerful. A fragrance for women who appreciate depth and elegance.",
    price: 899, compare_price: 1199, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Rose, Bergamot\nMiddle: Oud, Patchouli\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Layer with an unscented body lotion for extended wear.',
    specifications: { concentration: 'EDP', fragrance_family: 'Floral Woody', gender: 'Women' },
    seo_title: 'Oud & Roses EDP for Women | Floral Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy Oud & Roses EDP — a luxurious floral woody fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Free gift on orders above ₹999.',
    variants: [
      { name: '30ml',  sku: 'CAV-ORS-005-30ML',  price: 899,  compare_price: 1199, stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-ORS-005-50ML',  price: 1499, compare_price: 1999, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-ORS-005-100ML', price: 2499, compare_price: 3299, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Red Aura',
    slug: 'red-aura',
    sku: 'CAV-RAU-006',
    imageFolder: 'Red Aura',
    categoryName: 'Unisex & Niche',
    short_description: 'A bold unisex EDP with a fiery spicy-woody character. For those who command attention wherever they go.',
    description: 'Red Aura is a daring unisex Eau de Parfum that makes a statement from the very first spray. A fiery opening of orange and bergamot transitions into a spicy geranium and cedar heart. The dry-down is a rich blend of amber, musk, and patchouli — powerful and unforgettable. Designed for bold personalities who wear their confidence as a perfume.',
    price: 699, compare_price: 949, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Orange, Bergamot\nMiddle: Geranium, Cedar\nBase: Amber, Musk, Patchouli',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are sufficient given its powerful projection.',
    specifications: { concentration: 'EDP', fragrance_family: 'Spicy Woody', gender: 'Unisex' },
    seo_title: 'Red Aura EDP Unisex | Bold Spicy Woody Perfume | Cavero Fragrances',
    seo_description: 'Buy Red Aura EDP — a bold spicy woody unisex fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Shop now with free gift offer.',
    variants: [
      { name: '30ml',  sku: 'CAV-RAU-006-30ML',  price: 699,  compare_price: 949,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-RAU-006-50ML',  price: 1199, compare_price: 1599, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-RAU-006-100ML', price: 1999, compare_price: 2699, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Saffron',
    slug: 'saffron',
    sku: 'CAV-SAF-007',
    imageFolder: 'Saffron',
    categoryName: 'Oud & Attar',
    short_description: 'An opulent Parfum Extrait built around rare saffron. Rich, warm, and intoxicatingly complex.',
    description: "Saffron is Cavero's most precious offering — a Parfum Extrait of the highest concentration built around the rarest ingredient in perfumery. The opening reveals a spiced saffron and cardamom accord of exceptional intensity. The heart of rose and oud is deep and meditative. The base of sandalwood, amber, and vanilla grounds the fragrance into a warm, lasting signature that endures for 12+ hours. A crown jewel for the true fragrance connoisseur.",
    price: 649, compare_price: 899, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Saffron, Cardamom\nMiddle: Rose, Oud\nBase: Sandalwood, Amber, Vanilla',
    calories: 'Apply 1–2 small drops on pulse points — wrists, neck, and behind ears. Do not rub. This is highly concentrated — a little goes a very long way.',
    specifications: { concentration: 'Parfum Extrait', fragrance_family: 'Oriental Spicy', gender: 'Unisex' },
    seo_title: 'Saffron Parfum Extrait | Luxury Arabian Attar | Cavero Fragrances',
    seo_description: 'Buy Saffron Parfum Extrait — the most concentrated and opulent fragrance by Cavero Fragrances. Available in 3ml, 6ml, 12ml.',
    variants: [
      { name: '3ml',  sku: 'CAV-SAF-007-3ML',  price: 649,  compare_price: 899,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '6ml',  sku: 'CAV-SAF-007-6ML',  price: 1099, compare_price: 1499, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '12ml', sku: 'CAV-SAF-007-12ML', price: 1799, compare_price: 2399, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Shanaya',
    slug: 'shanaya',
    sku: 'CAV-SHA-008',
    imageFolder: 'Shanaya',
    categoryName: "Women's Fragrances",
    short_description: 'A graceful floral EDP designed for the modern Indian woman. Light, joyful, and irresistibly feminine.',
    description: 'Shanaya is a fresh and joyful floral Eau de Parfum designed for the confident modern Indian woman. It opens with a lively bergamot and pink pepper accord before blossoming into a romantic heart of rose and jasmine. The gentle base of musk and sandalwood leaves a soft, warm trail that complements everyday wear beautifully.',
    price: 599, compare_price: 799, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Bergamot, Pink Pepper\nMiddle: Rose, Jasmine\nBase: Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays are ideal for daytime wear.',
    specifications: { concentration: 'EDP', fragrance_family: 'Floral', gender: 'Women' },
    seo_title: 'Shanaya EDP for Women | Floral Perfume India | Cavero Fragrances',
    seo_description: 'Buy Shanaya EDP — a graceful floral fragrance for women by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Free gift on orders above ₹999.',
    variants: [
      { name: '30ml',  sku: 'CAV-SHA-008-30ML',  price: 599,  compare_price: 799,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-SHA-008-50ML',  price: 999,  compare_price: 1299, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-SHA-008-100ML', price: 1699, compare_price: 2199, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'Tobacco Vanilla',
    slug: 'tobacco-vanilla',
    sku: 'CAV-TBV-009',
    imageFolder: 'Tobacco Vanilla',
    categoryName: 'Unisex & Niche',
    short_description: 'A rich gourmand EDP. Aged tobacco meets sweet vanilla in an irresistibly warm and luxurious blend.',
    description: 'Tobacco Vanilla is a sophisticated gourmand Eau de Parfum for those who appreciate rich, indulgent fragrances. The opening is a warm and smoky tobacco accord balanced with bright bergamot. The heart of sweet vanilla and tonka bean adds a creamy, addictive quality. A deep base of sandalwood and amber makes this a truly unforgettable evening fragrance.',
    price: 799, compare_price: 1099, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Tobacco, Bergamot\nMiddle: Vanilla, Tonka Bean\nBase: Sandalwood, Amber',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. Best worn in evenings — the warmth of skin amplifies the vanilla accord beautifully.',
    specifications: { concentration: 'EDP', fragrance_family: 'Gourmand', gender: 'Unisex' },
    seo_title: 'Tobacco Vanilla EDP | Gourmand Perfume Unisex | Cavero Fragrances',
    seo_description: 'Buy Tobacco Vanilla EDP — a rich and indulgent gourmand fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Free gift on orders above ₹999.',
    variants: [
      { name: '30ml',  sku: 'CAV-TBV-009-30ML',  price: 799,  compare_price: 1099, stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-TBV-009-50ML',  price: 1399, compare_price: 1899, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-TBV-009-100ML', price: 2299, compare_price: 3099, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
  {
    name: 'White Oudh',
    slug: 'white-oudh',
    sku: 'CAV-WOU-010',
    imageFolder: 'White Oudh',
    categoryName: 'Oud & Attar',
    short_description: 'A refined EDP celebrating the purity of white oud. Clean, creamy, and sophisticatedly modern.',
    description: 'White Oudh is a contemporary Eau de Parfum that reimagines the classic Arabian oud through a modern lens. The opening of bergamot and cardamom gives it a bright and inviting character. The heart of white oud and rose is clean and creamy — far from the traditional heavy oud. The base of amber, musk, and sandalwood anchors it with warmth and depth. Perfect for those new to oud fragrances.',
    price: 649, compare_price: 849, stock: 999,
    weight: 0, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Bergamot, Cardamom\nMiddle: White Oud, Rose\nBase: Amber, Musk, Sandalwood',
    calories: 'Spray on pulse points (wrists, neck, behind ears) from 10–15 cm distance. Do not rub. 2–3 sprays give excellent projection throughout the day.',
    specifications: { concentration: 'EDP', fragrance_family: 'Woody Oud', gender: 'Unisex' },
    seo_title: 'White Oudh EDP | Modern Arabian Oud Perfume | Cavero Fragrances',
    seo_description: 'Buy White Oudh EDP — a clean and modern oud fragrance by Cavero Fragrances. Available in 30ml, 50ml, 100ml. Free gift on orders above ₹999.',
    variants: [
      { name: '30ml',  sku: 'CAV-WOU-010-30ML',  price: 649,  compare_price: 849,  stock: 333, low_stock_threshold: 20, sort_order: 0 },
      { name: '50ml',  sku: 'CAV-WOU-010-50ML',  price: 1099, compare_price: 1449, stock: 333, low_stock_threshold: 20, sort_order: 1 },
      { name: '100ml', sku: 'CAV-WOU-010-100ML', price: 1799, compare_price: 2399, stock: 333, low_stock_threshold: 20, sort_order: 2 },
    ],
  },
];

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to cavero_db\n');

    // 1. Load category IDs dynamically (safe after manual re-add in admin)
    const categories = await sequelize.query(
      'SELECT id, name FROM categories',
      { type: sequelize.QueryTypes.SELECT }
    );
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c.id; });
    console.log('Categories loaded:');
    Object.entries(catMap).forEach(([name, id]) => console.log(`  ${id} → ${name}`));
    console.log('');

    // 2. Copy images from Attar images/ → uploads/products/
    console.log('Copying product images...');
    for (const p of PRODUCTS) {
      try {
        copyImages(p.imageFolder, p.slug);
        console.log(`  ✓ ${p.name}`);
      } catch (e) {
        console.warn(`  ⚠ ${p.name}: ${e.message}`);
      }
    }
    console.log('');

    // 3. Seed each product + its variants
    console.log('Seeding products and variants...');
    let seeded = 0;
    let skipped = 0;

    for (const p of PRODUCTS) {
      // Skip if already exists
      const existing = await sequelize.query(
        'SELECT id FROM products WHERE slug = :slug',
        { replacements: { slug: p.slug }, type: sequelize.QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        console.log(`  ⏭  Already exists — skipped: ${p.name}`);
        skipped++;
        continue;
      }

      const categoryId = catMap[p.categoryName];
      if (!categoryId) {
        console.error(`  ✗ Category not found: "${p.categoryName}" — skipping ${p.name}`);
        skipped++;
        continue;
      }

      // Build images array (3 images per product)
      const images = [1, 2, 3].map(i => ({
        filename:     `${p.slug}-${i}.jpg`,
        originalname: `${p.slug}-${i}.jpg`,
        path:         `uploads/products/${p.slug}-${i}.jpg`,
        url:          `/uploads/products/${p.slug}-${i}.jpg`,
        mimetype:     'image/jpeg',
        size:         0,
      }));

      // Insert product
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
           :category_id, :weight, :weight_unit,
           :is_featured, :status, :is_published, true,
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
          weight:            p.weight,
          weight_unit:       p.weight_unit,
          is_featured:       p.is_featured,
          status:            p.status,
          is_published:      p.is_published,
          ingredients:       p.ingredients,
          calories:          p.calories,
          images:            JSON.stringify(images),
          specifications:    JSON.stringify(p.specifications),
          seo_title:         p.seo_title,
          seo_description:   p.seo_description,
        },
      });

      const productId = rows[0].id;

      // Insert variants
      for (const v of p.variants) {
        await sequelize.query(`
          INSERT INTO product_variants
            (product_id, name, sku, price, compare_price, stock,
             low_stock_threshold, is_active, sort_order,
             "createdAt", "updatedAt")
          VALUES
            (:product_id, :name, :sku, :price, :compare_price, :stock,
             :low_stock_threshold, true, :sort_order,
             NOW(), NOW())
        `, {
          replacements: {
            product_id:          productId,
            name:                v.name,
            sku:                 v.sku,
            price:               v.price,
            compare_price:       v.compare_price,
            stock:               v.stock,
            low_stock_threshold: v.low_stock_threshold,
            sort_order:          v.sort_order,
          },
        });
      }

      const variantNames = p.variants.map(v => v.name).join(', ');
      console.log(`  ✓ ${p.name} — variants: ${variantNames}`);
      seeded++;
    }

    // 4. Summary
    console.log('\n────────────────────────────────────────────────');
    console.log(`✅  Done!  ${seeded} products seeded,  ${skipped} skipped`);
    console.log('────────────────────────────────────────────────');
    console.log('  Products: Avento, Issey Miyake, Musk Rijali,');
    console.log('            Oud & Roses, Red Aura, Saffron,');
    console.log('            Shanaya, Tobacco Vanilla, White Oudh');
    console.log('  Variants: 3 per product (27 total)');
    console.log('  Images:   3 per product copied to uploads/products/');
    console.log('────────────────────────────────────────────────\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
