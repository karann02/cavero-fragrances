/**
 * Cavero Fragrances — Products + CMS Pages Seed
 * Run: node scripts/seed-products-cms.js
 */
require('dotenv').config();
const sequelize = require('../config/db');

// Category IDs  : 1=Men's, 2=Women's, 3=Unisex, 4=Oud & Attar, 5=Gift Sets, 6=Body Mists
// Brand IDs     : 1=Lattafa, 2=Armaf, 3=Rasasi, 4=Al Haramain, 5=Swiss Arabian, 6=Ajmal, 7=Cavero House

const PRODUCTS = [
  {
    name: 'Ameer Al Oudh',
    slug: 'ameer-al-oudh',
    sku: 'CAV-AAOUD-001',
    short_description: 'A majestic Oud attar inspired by royal Arabian traditions. Deep, warm, and long-lasting.',
    description: 'Ameer Al Oudh — "King of Oud" — is a rich, concentrated attar blending the finest agarwood with rose, sandalwood, and a warm musky base. Crafted for those who seek the authentic scent of the Arabian peninsula. Intense sillage, all-day longevity.',
    price: 1299, compare_price: 1699, stock: 50,
    category_id: 4, brand_id: 7,
    weight: 10, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Agarwood (Oud), Rose\nMiddle: Sandalwood, Amber\nBase: Musk, Vanilla, Saffron',
    calories: 'Apply a small amount on pulse points — wrists, neck, and behind ears. A little goes a long way with this concentrated attar.',
    specifications: { concentration: 'Attar / Itr', fragrance_family: 'Oriental / Oud', gender: 'Unisex' },
    images: ['ameer-al-oudh-1.jpg','ameer-al-oudh-2.jpg','ameer-al-oudh-3.jpg'],
    seo_title: 'Ameer Al Oudh Attar | Cavero Fragrances',
    seo_description: 'Buy Ameer Al Oudh — a premium Arabian oud attar with rose, sandalwood and amber. Long-lasting fragrance. Shop Cavero Fragrances.',
  },
  {
    name: 'Avento',
    slug: 'avento',
    sku: 'CAV-AVEN-001',
    short_description: 'Fresh, bold and powerful. A dynamic masculine scent for the modern man.',
    description: 'Avento is a powerhouse fresh fragrance for men. Opening with a burst of bergamot and pineapple, it evolves into a heart of jasmine and birch, settling into a warm base of ambergris, oakmoss and vanilla. Inspired by the celebrated Creed Aventus, it commands attention wherever you go.',
    price: 899, compare_price: 1199, stock: 75,
    category_id: 1, brand_id: 2,
    weight: 100, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Bergamot, Blackcurrant, Pineapple\nMiddle: Jasmine, Birch, Patchouli\nBase: Ambergris, Oakmoss, Vanilla',
    calories: 'Spray 2–3 times on pulse points. Best applied after showering for maximum longevity.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Fresh / Citrus', gender: 'Men' },
    images: ['avento-1.jpg','avento-2.jpg','avento-3.jpg'],
    seo_title: 'Avento EDP for Men | Cavero Fragrances',
    seo_description: 'Avento — a bold fresh EDP for men with bergamot, pineapple and ambergris. Best men\'s perfume. Shop Cavero Fragrances.',
  },
  {
    name: 'Issey Miyake',
    slug: 'issey-miyake',
    sku: 'CAV-ISSE-001',
    short_description: 'A clean, aquatic fragrance that captures the purity of water and sky.',
    description: 'Inspired by the iconic L\'Eau d\'Issey, this fresh aquatic fragrance opens with crisp notes of water lily, melon and cyclamen. The heart blooms with peony, freesia and lotus, while the base rests on a foundation of warm cedar, musk and amber. Universally loved — perfect for everyday wear.',
    price: 1099, compare_price: 1499, stock: 60,
    category_id: 3, brand_id: 7,
    weight: 100, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Water Lily, Melon, Cyclamen\nMiddle: Peony, Freesia, Lotus\nBase: Cedar, Musk, Amber',
    calories: 'Spray lightly on neck, wrists, and chest. Ideal for office, college, and daytime wear.',
    specifications: { concentration: 'Eau de Toilette (EDT)', fragrance_family: 'Aquatic', gender: 'Unisex' },
    images: ['issey-miyake-1.jpg','issey-miyake-2.jpg','issey-miyake-3.jpg'],
    seo_title: 'Issey Miyake Inspired Fragrance | Cavero Fragrances',
    seo_description: 'Issey Miyake-inspired clean aquatic fragrance. Fresh floral and cedar notes. Unisex everyday perfume. Shop Cavero Fragrances.',
  },
  {
    name: 'Musk Rijali',
    slug: 'musk-rijali',
    sku: 'CAV-MUSK-001',
    short_description: 'Pure, white and intoxicating musk attar. Gentle on skin, powerful in presence.',
    description: 'Musk Rijali is a traditional Arabian white musk attar known for its skin-close warmth and sensual trail. Lightweight yet persistent, it blends seamlessly with your natural skin chemistry, creating a unique scent that is unmistakably yours. Ideal as a standalone scent or layered under other fragrances.',
    price: 799, compare_price: 999, stock: 100,
    category_id: 1, brand_id: 4,
    weight: 6, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: White Musk, Rose\nMiddle: Amber, Sandalwood\nBase: Musk, Tonka Bean',
    calories: 'Dab a small amount on wrists, neck, and behind knees. Can be layered with your favourite EDP for a unique combination.',
    specifications: { concentration: 'Attar / Itr', fragrance_family: 'Musk', gender: 'Men' },
    images: ['musk-rijali-1.jpg','musk-rijali-2.jpg','musk-rijali-3.jpg'],
    seo_title: 'Musk Rijali Attar | Cavero Fragrances',
    seo_description: 'Pure white musk attar for men. Skin-friendly, long-lasting Arabian musk. Shop Musk Rijali at Cavero Fragrances.',
  },
  {
    name: 'Oud & Roses',
    slug: 'oud-and-roses',
    sku: 'CAV-OUDR-001',
    short_description: 'The timeless union of Oud and Rose — femininity meets depth.',
    description: 'Oud & Roses is a classic Oriental composition celebrating the most iconic pairing in perfumery. Bulgarian rose petals bloom over a rich bed of dark Hindi oud, with heart notes of geranium and patchouli leading to a warm base of ambergris, musk and cedarwood. Deeply romantic and utterly unforgettable.',
    price: 1499, compare_price: 1999, stock: 45,
    category_id: 2, brand_id: 3,
    weight: 75, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Bulgarian Rose, Saffron\nMiddle: Oud, Geranium, Patchouli\nBase: Ambergris, Musk, Cedarwood',
    calories: 'Spray on pulse points — wrists, neck, and décolletage. Perfect for evenings and special occasions.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Oriental / Oud', gender: 'Women' },
    images: ['oud-and-roses-1.jpg','oud-and-roses-2.jpg','oud-and-roses-3.jpg'],
    seo_title: 'Oud & Roses EDP for Women | Cavero Fragrances',
    seo_description: 'Oud & Roses — a rich oriental EDP for women combining Bulgarian rose and Hindi oud. Evening perfume. Shop Cavero Fragrances.',
  },
  {
    name: 'Red Aura',
    slug: 'red-aura',
    sku: 'CAV-RAUD-001',
    short_description: 'Bold, spicy and mysterious. A fiery aura that commands every room.',
    description: 'Red Aura is an intense and captivating unisex fragrance inspired by the power of fire and desire. Spicy pink pepper and cardamom open dramatically before a heart of oud, rose absolute and amber takes over. The deep base of tonka bean, labdanum and vanilla adds warmth and sensuality that lingers for hours.',
    price: 1199, compare_price: 1599, stock: 55,
    category_id: 3, brand_id: 7,
    weight: 100, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Pink Pepper, Cardamom, Bergamot\nMiddle: Oud, Rose Absolute, Amber\nBase: Tonka Bean, Labdanum, Vanilla',
    calories: 'Spray 2–3 times on chest, neck, and wrists. Best for evening wear and winter months.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Spicy / Amber', gender: 'Unisex' },
    images: ['red-aura-1.jpg','red-aura-2.jpg','red-aura-3.jpg'],
    seo_title: 'Red Aura EDP | Unisex Spicy Perfume | Cavero Fragrances',
    seo_description: 'Red Aura — bold spicy EDP with pink pepper, oud and vanilla. Unisex evening fragrance. Shop Cavero Fragrances.',
  },
  {
    name: 'Saffron',
    slug: 'saffron',
    sku: 'CAV-SAFF-001',
    short_description: 'Liquid gold in a bottle — rare saffron entwined with oud and precious woods.',
    description: 'Saffron is an ultra-premium concentrated perfume celebrating the world\'s most prized spice. Iranian saffron opens with its distinctive honeyed warmth, supported by a heart of oud, rose and jasmine. The base of sandalwood, amber and musk creates a trail that is regal, complex, and unforgettable. A true luxury fragrance.',
    price: 1799, compare_price: 2299, stock: 30,
    category_id: 4, brand_id: 4,
    weight: 12, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Iranian Saffron, Cardamom\nMiddle: Oud, Rose, Jasmine\nBase: Sandalwood, Amber, Musk',
    calories: 'Apply a small drop on wrists and neck. The concentrated formula means just 1–2 drops last all day.',
    specifications: { concentration: 'Parfum (Extrait)', fragrance_family: 'Oriental / Oud', gender: 'Unisex' },
    images: ['saffron-1.jpg','saffron-2.jpg','saffron-3.jpg'],
    seo_title: 'Saffron Parfum Extrait | Luxury Oud Fragrance | Cavero Fragrances',
    seo_description: 'Saffron Parfum — ultra-premium saffron and oud extrait de parfum. Rare luxury fragrance. Shop Cavero Fragrances.',
  },
  {
    name: 'Shanaya',
    slug: 'shanaya',
    sku: 'CAV-SHAN-001',
    short_description: 'A soft, feminine floral bouquet — light, graceful, and endlessly charming.',
    description: 'Shanaya is a gentle and romantic feminine fragrance crafted for the modern woman. A delicate opening of fresh peach and bergamot leads into a lush floral heart of jasmine, tuberose and white lily. The drydown settles into a warm, soft base of musk, vanilla and light cedarwood — clean, feminine and utterly beautiful.',
    price: 999, compare_price: 1299, stock: 65,
    category_id: 2, brand_id: 6,
    weight: 50, weight_unit: 'ml',
    is_featured: false, status: true, is_published: true,
    ingredients: 'Top: Peach, Bergamot, Green Apple\nMiddle: Jasmine, Tuberose, White Lily\nBase: Musk, Vanilla, Cedarwood',
    calories: 'Spray on neck, wrists, and hair for a long-lasting floral trail. Perfect for daily wear.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Floral', gender: 'Women' },
    images: ['shanaya-1.jpg','shanaya-2.jpg','shanaya-3.jpg'],
    seo_title: 'Shanaya Floral EDP for Women | Cavero Fragrances',
    seo_description: 'Shanaya — soft floral EDP for women with jasmine, tuberose and vanilla. Everyday feminine perfume. Shop Cavero Fragrances.',
  },
  {
    name: 'Tobacco Vanilla',
    slug: 'tobacco-vanilla',
    sku: 'CAV-TOBV-001',
    short_description: 'Dark, sweet and addictive. A luxurious gourmand for cool evenings.',
    description: 'Tobacco Vanilla is a rich, indulgent fragrance inspired by a fire-lit evening lounge. Opening with sweet Virginia tobacco and dried fruits, it deepens into a heart of rum, vanilla orchid and cacao. The base of balsam fir, amber and musk creates an intoxicating warmth that is impossible to forget.',
    price: 1399, compare_price: 1799, stock: 40,
    category_id: 3, brand_id: 7,
    weight: 100, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: Virginia Tobacco, Dried Fruits, Rum\nMiddle: Vanilla Orchid, Cacao, Cinnamon\nBase: Balsam Fir, Amber, Musk',
    calories: 'Spray 2–3 times on chest and wrists. Best suited for evening and winter wear. Extremely long-lasting.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Gourmand', gender: 'Unisex' },
    images: ['tobacco-vanilla-1.jpg','tobacco-vanilla-2.jpg','tobacco-vanilla-3.jpg'],
    seo_title: 'Tobacco Vanilla EDP | Gourmand Perfume | Cavero Fragrances',
    seo_description: 'Tobacco Vanilla — dark gourmand EDP with tobacco, vanilla and amber. Bestselling winter fragrance. Shop Cavero Fragrances.',
  },
  {
    name: 'White Oudh',
    slug: 'white-oudh',
    sku: 'CAV-WOUD-001',
    short_description: 'Pure and luminous — the lighter, brighter side of Oud.',
    description: 'White Oudh is a softer, more approachable interpretation of the classic Arabian oud. Light and creamy rather than dark and heavy, it blends white musk, sandalwood, and a touch of floral rose with sustainably sourced agarwood. The result is a fresh-oud fragrance that is perfect for everyday luxury.',
    price: 1099, compare_price: 1499, stock: 50,
    category_id: 4, brand_id: 1,
    weight: 100, weight_unit: 'ml',
    is_featured: true, status: true, is_published: true,
    ingredients: 'Top: White Musk, Rose, Bergamot\nMiddle: Agarwood (White Oud), Sandalwood\nBase: Vanilla, Amber, Musk',
    calories: 'Spray 2–3 times on pulse points. Suitable for both day and evening wear.',
    specifications: { concentration: 'Eau de Parfum (EDP)', fragrance_family: 'Oriental / Oud', gender: 'Unisex' },
    images: ['white-oudh-1.jpg','white-oudh-2.jpg','white-oudh-3.jpg'],
    seo_title: 'White Oudh EDP | Light Arabian Oud | Cavero Fragrances',
    seo_description: 'White Oudh — a fresh, luminous oud EDP with sandalwood and white musk. Light Arabian fragrance. Shop Cavero Fragrances.',
  },
];

const CMS_PAGES = [
  {
    title: 'Privacy Policy', slug: 'privacy-policy',
    meta_title: 'Privacy Policy | Cavero Fragrances',
    meta_description: 'Learn how Cavero Fragrances collects, uses, and protects your personal information.',
    content: `<h2>Privacy Policy</h2><p>Cavero Fragrance collects customer information including name, phone number, email address, shipping address, IP address, and order details for order fulfillment, fraud prevention, customer support, legal compliance, and marketing communications where permitted.</p><p>Information may be shared with Razorpay, courier partners, hosting providers, analytics providers, and governmental authorities when legally required. We do not sell customer data.</p>`
  },
  {
    title: 'Terms and Conditions', slug: 'terms-and-conditions',
    meta_title: 'Terms & Conditions | Cavero Fragrances',
    meta_description: 'Read the Terms and Conditions for using the Cavero Fragrances website and making purchases.',
    content: `<h2>Terms and Conditions</h2><p>By using this website, users agree to these Terms. Product descriptions, pricing, offers, availability, and website content may be modified without prior notice. We reserve the right to refuse, cancel, or limit any order suspected of fraud, abuse, reselling, chargeback risk, or policy violations.</p>`
  },
  {
    title: 'Shipping Policy', slug: 'shipping-policy',
    meta_title: 'Shipping Policy | Cavero Fragrances',
    meta_description: 'Cavero Fragrances shipping timelines, delivery estimates, and dispatch information.',
    content: `<h2>Shipping Policy</h2><p>Orders are generally processed within 1–5 business days. Delivery estimates are not guaranteed. Delays caused by courier companies, weather, strikes, customs, transportation disruptions, or force majeure events shall not create liability for Cavero Fragrance.</p>`
  },
  {
    title: 'Return & Refund Policy', slug: 'return-refund-policy',
    meta_title: 'Return & Refund Policy | Cavero Fragrances',
    meta_description: 'Cavero Fragrances return, refund and replacement policy for damaged or incorrect orders.',
    content: `<h2>Return, Refund and Replacement Policy</h2><p>Due to hygiene and contamination concerns, fragrance products are generally non-returnable once opened or used.</p><p>Returns are accepted only when the customer receives a <strong>damaged, leaking, defective, tampered, or incorrect product</strong>. Claims must be reported within <strong>48 hours of delivery</strong> and accompanied by a continuous unedited unboxing video recorded from opening the sealed package through product inspection.</p><p>Refunds or replacements are subject to verification by Cavero Fragrance.</p>`
  },
  {
    title: 'Cancellation Policy', slug: 'cancellation-policy',
    meta_title: 'Cancellation Policy | Cavero Fragrances',
    meta_description: 'Learn about order cancellation terms at Cavero Fragrances.',
    content: `<h2>Cancellation Policy</h2><p>Customers may request cancellation before dispatch. Once dispatched, orders cannot normally be cancelled.</p><p>Cavero Fragrance reserves the right to cancel orders due to stock issues, pricing errors, fraud concerns, operational issues, or regulatory requirements.</p>`
  },
  {
    title: 'COD Policy', slug: 'cod-policy',
    meta_title: 'Cash on Delivery Policy | Cavero Fragrances',
    meta_description: 'Terms for Cash on Delivery orders at Cavero Fragrances.',
    content: `<h2>Cash on Delivery (COD) Policy</h2><p>Cash on Delivery orders may be verified before dispatch. Orders may be cancelled if verification fails. Repeated refusal of COD deliveries may result in future order restrictions.</p>`
  },
  {
    title: 'Fragrance Disclaimer', slug: 'fragrance-disclaimer',
    meta_title: 'Fragrance Disclaimer | Cavero Fragrances',
    meta_description: 'Important disclaimer about fragrance performance, longevity and individual variation.',
    content: `<h2>Fragrance Disclaimer</h2><p>Fragrance perception, longevity, projection, and performance vary based on skin chemistry, climate, humidity, storage conditions, application method, and other individual factors. Any longevity or projection figures published are estimates only and are not guarantees.</p><h3>Allergy Disclaimer</h3><p>Customers are responsible for reviewing ingredient information and conducting patch testing where appropriate. Cavero Fragrance shall not be liable for allergic reactions, sensitivities, or skin responses except where required by applicable law.</p>`
  },
  {
    title: 'About Us', slug: 'about-us',
    meta_title: 'About Cavero Fragrances | Our Story',
    meta_description: 'Learn about Cavero Fragrances — our story, our passion for Arabian scents, and our commitment to luxury perfumery.',
    content: `<h2>About Cavero Fragrances</h2><p>Cavero Fragrances is a luxury perfume brand based in Surat, Gujarat, India — dedicated to bringing the finest Arabian Oud, Attar, and international fragrances to discerning customers across India.</p><p>Founded by <strong>Manthan Gadara</strong>, Cavero was born from a passion for the timeless art of perfumery. Every fragrance in our collection is handpicked for its quality, authenticity, and character.</p><p>From the smoky depths of Hindi Oud to the bright freshness of citrus colognes, we believe the right scent has the power to tell your story before you say a word.</p><h3>Our Promise</h3><ul><li>100% genuine fragrances</li><li>Carefully curated collection</li><li>Fast delivery across India</li><li>Dedicated customer support</li></ul><p>For enquiries, reach us at <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> or call <a href="tel:9274521140">9274521140</a>.</p>`
  },
  {
    title: 'Contact Us', slug: 'contact',
    meta_title: 'Contact Cavero Fragrances',
    meta_description: 'Get in touch with Cavero Fragrances — email, phone, and location details.',
    content: `<h2>Contact Us</h2><p>We are here to help. Reach out to us for product enquiries, order support, or any questions.</p><ul><li><strong>Business:</strong> Cavero Fragrance</li><li><strong>Owner:</strong> Manthan Gadara</li><li><strong>Email:</strong> <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a></li><li><strong>Phone:</strong> <a href="tel:9274521140">9274521140</a></li><li><strong>Location:</strong> Surat, Gujarat, India</li></ul>`
  },
];

const CONTACT_SETTINGS = {
  email1: 'caverofragrance@gmail.com',
  email2: 'caverofragrance@gmail.com',
  phone: '9274521140',
  address: 'Surat, Gujarat, India',
  seo_title: 'Cavero Fragrances | Luxury Oud & Attar Perfumes',
  seo_keywords: 'cavero, fragrances, perfumes, oud, attar, arabian perfumes, luxury scents, eau de parfum, cologne, india, surat',
  seo_description: 'Discover luxury Oud, Attar and Arabian fragrances at Cavero Fragrances. Premium perfumes for men and women. Shop online with fast delivery across India.',
};

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to cavero_db\n');

    // ── PRODUCTS ──────────────────────────────────────────────────────────────
    console.log('Seeding products...');
    const existingProducts = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM products',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (existingProducts[0].cnt > 0) {
      console.log('  Products already exist — deleting and re-seeding...');
      await sequelize.query('DELETE FROM products');
    }

    for (const p of PRODUCTS) {
      const images = p.images.map(filename => ({
        filename,
        originalname: filename,
        path: `uploads/products/${filename}`,
        url: `/uploads/products/${filename}`,
        mimetype: 'image/jpeg',
        size: 0,
      }));

      await sequelize.query(`
        INSERT INTO products
          (name, slug, sku, short_description, description, price, compare_price,
           stock, category_id, brand_id, weight, weight_unit,
           is_featured, status, is_published, track_quantity,
           ingredients, calories, images, specifications,
           seo_title, seo_description, rating, review_count,
           "createdAt", "updatedAt")
        VALUES
          (:name, :slug, :sku, :short_description, :description, :price, :compare_price,
           :stock, :category_id, :brand_id, :weight, :weight_unit,
           :is_featured, :status, :is_published, true,
           :ingredients, :calories, :images, :specifications,
           :seo_title, :seo_description, 0, 0,
           NOW(), NOW())
      `, {
        replacements: {
          ...p,
          images: JSON.stringify(images),
          specifications: JSON.stringify(p.specifications),
        }
      });
      console.log(`  ✓ ${p.name}`);
    }

    // ── CMS PAGES ─────────────────────────────────────────────────────────────
    console.log('\nSeeding CMS pages...');
    for (const page of CMS_PAGES) {
      const existing = await sequelize.query(
        'SELECT id FROM cms_pages WHERE slug = :slug',
        { replacements: { slug: page.slug }, type: sequelize.QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        await sequelize.query(
          'UPDATE cms_pages SET title=:title, content=:content, meta_title=:meta_title, meta_description=:meta_description, status=true, "updatedAt"=NOW() WHERE slug=:slug',
          { replacements: page }
        );
        console.log(`  ✓ Updated: ${page.title}`);
      } else {
        await sequelize.query(
          'INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, "createdAt", "updatedAt") VALUES (:title, :slug, :content, :meta_title, :meta_description, true, NOW(), NOW())',
          { replacements: page }
        );
        console.log(`  ✓ Created: ${page.title}`);
      }
    }

    // ── CONTACT SETTINGS ──────────────────────────────────────────────────────
    console.log('\nSeeding contact settings...');
    const csContent = JSON.stringify(CONTACT_SETTINGS);
    const csExisting = await sequelize.query(
      "SELECT id FROM cms_pages WHERE slug = 'contact-settings'",
      { type: sequelize.QueryTypes.SELECT }
    );
    if (csExisting.length > 0) {
      await sequelize.query(
        "UPDATE cms_pages SET content=:content, \"updatedAt\"=NOW() WHERE slug='contact-settings'",
        { replacements: { content: csContent } }
      );
    } else {
      await sequelize.query(
        "INSERT INTO cms_pages (title, slug, content, status, \"createdAt\", \"updatedAt\") VALUES ('Settings', 'contact-settings', :content, true, NOW(), NOW())",
        { replacements: { content: csContent } }
      );
    }
    console.log('  ✓ Contact settings saved');

    console.log('\n─────────────────────────────────────────────');
    console.log('✅  Products + CMS pages seeded successfully!');
    console.log('─────────────────────────────────────────────');
    console.log(`  ${PRODUCTS.length} products added`);
    console.log(`  ${CMS_PAGES.length} CMS pages added`);
    console.log('  Contact settings updated');
    console.log('─────────────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
