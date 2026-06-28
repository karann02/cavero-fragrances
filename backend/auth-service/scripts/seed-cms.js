/**
 * Cavero Fragrances — CMS Pages + Contact Settings + Free Gifts Seed
 *
 * Seeds all remaining data that is NOT seeded by seed-new-setup.js:
 *   • 9 CMS policy/info pages
 *   • Contact settings (slug: contact-settings)
 *   • 2 free gifts (Attar Sample ₹999, Oud Incense Stick ₹1999)
 *
 * Safe to run multiple times — uses upsert (update if exists, insert if not).
 * Run from project root:
 *   node backend/auth-service/scripts/seed-cms.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = require('../config/db');

// ── CMS PAGES ─────────────────────────────────────────────────────────────────

const CMS_PAGES = [
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    meta_title: 'Privacy Policy | Cavero Fragrances',
    meta_description: 'Learn how Cavero Fragrances collects, uses, and protects your personal information.',
    content: `<h2>Privacy Policy</h2>
<p>Last updated: June 2025</p>
<p>Cavero Fragrances ("we", "us", or "our") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.</p>

<h3>1. Information We Collect</h3>
<p>We collect information you provide directly: name, email address, phone number, shipping address, and payment details when you place an order or create an account.</p>

<h3>2. How We Use Your Information</h3>
<ul>
  <li>To process and fulfil your orders</li>
  <li>To send order confirmation and shipping updates via email</li>
  <li>To respond to customer support queries</li>
  <li>To improve our products and services</li>
</ul>

<h3>3. Payment Security</h3>
<p>All payments are processed securely through Razorpay. We do not store your card details on our servers.</p>

<h3>4. Data Sharing</h3>
<p>We do not sell or share your personal data with third parties except as required for order fulfilment (e.g., courier partners) or as required by law. Information may be shared with Razorpay, courier partners, hosting providers, analytics providers, and governmental authorities when legally required.</p>

<h3>5. Cookies</h3>
<p>Our website uses cookies to improve your browsing experience. You may disable cookies in your browser settings, though some features may not function correctly.</p>

<h3>6. Your Rights</h3>
<p>You have the right to access, correct, or request deletion of your personal data. Email us at <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> to make a request.</p>

<h3>7. Contact Us</h3>
<p>For privacy-related concerns, email us at <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> or call +91 9274521140.</p>`
  },

  {
    title: 'Terms and Conditions',
    slug: 'terms-and-conditions',
    meta_title: 'Terms & Conditions | Cavero Fragrances',
    meta_description: 'Read the Terms and Conditions for using the Cavero Fragrances website and making purchases.',
    content: `<h2>Terms and Conditions</h2>
<p>Last updated: June 2025</p>
<p>By accessing or purchasing from Cavero Fragrances, you agree to the following terms. Please read them carefully.</p>

<h3>1. Eligibility</h3>
<p>You must be at least 18 years of age to place an order on our website.</p>

<h3>2. Products</h3>
<p>All product images are for representation purposes. Actual fragrance notes, bottle designs, and packaging may vary slightly. Product descriptions, pricing, offers, and availability may be modified without prior notice.</p>

<h3>3. Pricing</h3>
<p>All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes. We reserve the right to change prices without prior notice.</p>

<h3>4. Order Acceptance</h3>
<p>Placing an order does not guarantee acceptance. We reserve the right to cancel any order due to stock unavailability, pricing errors, suspected fraud, abuse, reselling, chargeback risk, or policy violations.</p>

<h3>5. Intellectual Property</h3>
<p>All content on this website — including images, text, logos, and product descriptions — is the property of Cavero Fragrances and may not be copied or used without written permission.</p>

<h3>6. Limitation of Liability</h3>
<p>Cavero Fragrances is not liable for any indirect, incidental, or consequential damages arising from the use of our products or website.</p>

<h3>7. Governing Law</h3>
<p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Surat, Gujarat.</p>

<h3>8. Contact</h3>
<p>Email: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> | Phone: +91 9274521140</p>`
  },

  {
    title: 'Shipping Policy',
    slug: 'shipping-policy',
    meta_title: 'Shipping Policy | Cavero Fragrances',
    meta_description: 'Cavero Fragrances shipping timelines, delivery charges, and courier information across India.',
    content: `<h2>Shipping Policy</h2>
<p>We ship across India. Please read our shipping policy before placing your order.</p>

<h3>Processing Time</h3>
<p>Orders are processed within 1–2 business days after payment confirmation. Orders placed on Sundays or public holidays are processed the next business day.</p>

<h3>Delivery Time</h3>
<p>Standard delivery takes <strong>3–7 business days</strong> depending on your location. Remote or rural areas may take up to 10 business days. Delivery estimates are not guaranteed — delays caused by courier companies, weather, strikes, or force majeure events shall not create liability for Cavero Fragrances.</p>

<h3>Shipping Charges</h3>
<ul>
  <li>Free shipping on orders above ₹999</li>
  <li>Flat ₹60 shipping on orders below ₹999</li>
</ul>

<h3>Order Tracking</h3>
<p>A tracking number will be shared via email once your order is dispatched. Use it on the courier partner's website to track your shipment.</p>

<h3>Packaging</h3>
<p>All fragrances are carefully packed with foam padding and tamper-proof packaging to prevent breakage during transit.</p>

<h3>Undelivered Orders</h3>
<p>If your order is returned to us due to an incorrect address or failed delivery attempts, re-shipping charges will apply. Please ensure your delivery address is accurate at checkout.</p>

<h3>Contact</h3>
<p>For shipping queries: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> | +91 9274521140</p>`
  },

  {
    title: 'Return & Refund Policy',
    slug: 'return-refund-policy',
    meta_title: 'Return & Refund Policy | Cavero Fragrances',
    meta_description: 'Cavero Fragrances return, refund and replacement policy for damaged or incorrect orders.',
    content: `<h2>Return, Refund &amp; Replacement Policy</h2>
<p>Your satisfaction is our priority. Please read our return policy carefully before requesting a return.</p>

<h3>Return Eligibility</h3>
<p>Due to hygiene and contamination concerns, fragrance products are generally non-returnable once opened or used. Returns are accepted only when the customer receives a <strong>damaged, leaking, defective, tampered, or incorrect product</strong>.</p>
<p>Claims must be reported within <strong>48 hours of delivery</strong> and accompanied by a continuous unedited unboxing video recorded from opening the sealed package through product inspection.</p>

<h3>Non-Returnable Items</h3>
<ul>
  <li>Opened or used fragrances</li>
  <li>Products with broken seals (unless damaged during transit)</li>
  <li>Free gift items or promotional products</li>
</ul>

<h3>How to Request a Return</h3>
<p>Log in to your account, go to Order History, and click the "Return" button on your delivered order. Our team will review and respond within 2 business days.</p>

<h3>Refund Process</h3>
<p>Once your return is approved and the product is received and inspected, a refund will be initiated within <strong>5–7 business days</strong> to your original payment method.</p>
<ul>
  <li>Razorpay payments: refunded to original card/UPI/wallet</li>
  <li>Cash on Delivery orders: refunded via bank transfer (NEFT)</li>
</ul>

<h3>Contact</h3>
<p>Email: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> | Phone: +91 9274521140</p>`
  },

  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    meta_title: 'Cancellation Policy | Cavero Fragrances',
    meta_description: 'Learn about order cancellation terms and conditions at Cavero Fragrances.',
    content: `<h2>Cancellation Policy</h2>

<h3>Customer Cancellations</h3>
<p>You may request cancellation before dispatch by emailing <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> with your order number. Once dispatched, orders cannot normally be cancelled.</p>

<h3>COD Orders</h3>
<p>For Cash on Delivery orders, cancellation before dispatch is free. Please do not refuse delivery without contacting us first. Repeated refusals may result in future order restrictions.</p>

<h3>Cancellation by Cavero Fragrances</h3>
<p>We reserve the right to cancel orders in the following cases:</p>
<ul>
  <li>Item is out of stock</li>
  <li>Payment could not be verified</li>
  <li>Suspected fraudulent activity</li>
  <li>Incorrect pricing due to a technical error</li>
  <li>Operational or regulatory requirements</li>
</ul>
<p>In such cases, a full refund will be processed within 5–7 business days.</p>

<h3>Contact</h3>
<p>Email: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> | Phone: +91 9274521140</p>`
  },

  {
    title: 'COD Policy',
    slug: 'cod-policy',
    meta_title: 'Cash on Delivery Policy | Cavero Fragrances',
    meta_description: 'Terms for Cash on Delivery orders at Cavero Fragrances — eligibility, charges, and guidelines.',
    content: `<h2>Cash on Delivery (COD) Policy</h2>
<p>Cavero Fragrances offers Cash on Delivery (COD) as a convenient payment option across select pin codes in India.</p>

<h3>COD Eligibility</h3>
<ul>
  <li>Available on orders up to ₹5,000</li>
  <li>Available at select pin codes as determined by our courier partners</li>
  <li>COD orders may be verified by our team before dispatch</li>
  <li>Orders may be cancelled if verification fails</li>
</ul>

<h3>COD Handling Fee</h3>
<p>A COD handling fee of <strong>₹40</strong> is added to your order total at checkout.</p>

<h3>Payment at Delivery</h3>
<p>Please keep the exact order amount ready in cash when accepting delivery. Our delivery partners may not carry change.</p>

<h3>Failed Delivery Attempts</h3>
<p>Our courier partner will attempt delivery up to 3 times. If all attempts fail, the order will be returned to us and re-shipping charges will apply for re-dispatch.</p>

<h3>Misuse of COD</h3>
<p>Placing COD orders with no intention to accept delivery is considered misuse. Repeated COD cancellations or refusals may result in COD being restricted for your account.</p>

<h3>Contact</h3>
<p>Email: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> | Phone: +91 9274521140</p>`
  },

  {
    title: 'Fragrance Disclaimer',
    slug: 'fragrance-disclaimer',
    meta_title: 'Fragrance Disclaimer | Cavero Fragrances',
    meta_description: 'Important disclaimer about fragrance performance, longevity, allergens, and individual variation.',
    content: `<h2>Fragrance Disclaimer</h2>

<h3>Scent Perception</h3>
<p>Fragrance perception is highly personal and varies from person to person. The way a perfume smells on your skin may differ from descriptions due to individual body chemistry, skin type, pH levels, diet, and climate. We recommend testing on your wrist before full application.</p>

<h3>Longevity &amp; Projection</h3>
<p>Fragrance longevity, projection, and performance vary based on skin chemistry, humidity, storage conditions, and application method. Any longevity or projection figures published are estimates only and are not guarantees.</p>

<h3>Allergy &amp; Skin Sensitivity</h3>
<p>Our fragrances contain a blend of natural and synthetic aroma compounds, fixatives, and carrier oils. Customers are responsible for reviewing ingredient information and conducting a patch test before use. Cavero Fragrances shall not be liable for allergic reactions or skin sensitivities except where required by applicable law.</p>

<h3>Patch Test Recommended</h3>
<p>Apply a small amount on your inner wrist, wait 24 hours, and check for any adverse reaction before regular use. Discontinue immediately if irritation occurs.</p>

<h3>Attars &amp; Concentrated Oils</h3>
<p>Our Attar and Itr products are highly concentrated natural perfume oils. Apply sparingly — a small drop on pulse points (wrists, neck) is sufficient. Avoid contact with eyes and mucous membranes.</p>

<h3>For External Use Only</h3>
<p>All Cavero Fragrances products are for external use only. Keep out of reach of children. Store in a cool, dry place away from direct sunlight.</p>

<h3>Colour Variation</h3>
<p>Natural fragrances may vary slightly in colour between batches. This does not affect the quality or performance of the product.</p>

<h3>Contact</h3>
<p>For ingredient queries: <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a></p>`
  },

  {
    title: 'About Us',
    slug: 'about-us',
    meta_title: 'About Cavero Fragrances | Luxury Arabian Perfumes from Surat',
    meta_description: 'Cavero Fragrances brings the finest Arabian Oud, Attar, and luxury perfumes to India. Discover our story, our craft, and our passion for fragrance.',
    content: `<h2>About Cavero Fragrances</h2>
<p>Welcome to Cavero Fragrances — a celebration of the ancient art of Arabian perfumery, brought to the heart of India.</p>

<h3>Our Story</h3>
<p>Born in Surat, Gujarat, Cavero Fragrances was founded by <strong>Manthan Gadara</strong> with one purpose: to make the world's finest Oud, Attar, and luxury Arabian fragrances accessible to every Indian who appreciates the beauty of a truly exceptional scent.</p>
<p>We source our ingredients with care — pure Oud, warm Amber, exotic Saffron, and blends inspired by the perfume traditions of the Arabian Gulf — and bring them to your doorstep.</p>

<h3>Our Philosophy</h3>
<p>Every fragrance we offer is chosen for its depth, longevity, and story. We believe a great perfume is not just a scent — it is an identity, an emotion, a memory.</p>

<h3>Our Promise</h3>
<ul>
  <li>100% genuine fragrances — no imitations, no duplicates</li>
  <li>Carefully curated collection from trusted sources</li>
  <li>Secure, padded packaging for every order</li>
  <li>Fast delivery across India</li>
  <li>Dedicated customer support</li>
</ul>

<h3>Get in Touch</h3>
<p>We love hearing from our customers. Reach us at <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a>, call <a href="tel:+919274521140">+91 9274521140</a>, or follow us on Instagram <a href="https://www.instagram.com/caverofragrance" target="_blank">@caverofragrance</a>.</p>`
  },

  {
    title: 'FAQ',
    slug: 'faq',
    meta_title: 'FAQ | Cavero Fragrances Help Center',
    meta_description: 'Frequently asked questions about orders, delivery, payments, returns, and fragrances at Cavero Fragrances.',
    content: `<h2>Frequently Asked Questions</h2>
<p>Quick answers to the questions our customers ask most. Still need help? <a href="/cms/contact">Contact us</a> and we will respond within 24 hours on business days.</p>

<h3>How long does delivery take?</h3>
<p>Standard delivery takes <strong>3–7 business days</strong> depending on your location. Orders are processed within 1–2 business days after payment confirmation. Remote areas may take a little longer.</p>

<h3>What payment methods do you accept?</h3>
<p>We accept all major credit/debit cards, UPI, net banking, and popular wallets securely via Razorpay, as well as Cash on Delivery (COD) at select pin codes.</p>

<h3>Do you offer international shipping?</h3>
<p>Currently we ship within India only. We are working on expanding to more regions soon.</p>

<h3>How can I track my order?</h3>
<p>Once your order is dispatched, you will receive a tracking number via email. You can also track it anytime from your account under <strong>Order History</strong>.</p>

<h3>Do I need an account to place an order?</h3>
<p>An account is required to complete checkout. Creating one is quick and gives you order tracking, order history, and faster future checkout.</p>

<h3>Are your fragrances genuine?</h3>
<p>Yes. Every fragrance we sell is 100% genuine — no imitations or duplicates — carefully curated from trusted sources and shipped in secure, padded packaging.</p>

<h3>What is your return policy?</h3>
<p>Due to hygiene and contamination concerns, fragrances are non-returnable once opened, except for products that arrive <strong>damaged, defective, leaking, or incorrect</strong> — reported within 48 hours of delivery with an unboxing video. See our <a href="/cms/return-refund-policy">Return &amp; Refund Policy</a> for full details.</p>

<h3>Still have questions?</h3>
<p>Email us at <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> or message us on WhatsApp at <a href="tel:+919274521140">+91 9274521140</a>. Our support hours are Monday–Saturday, 10:00 AM – 7:00 PM IST.</p>`
  },

  {
    title: 'Contact Us',
    slug: 'contact',
    meta_title: 'Contact Cavero Fragrances | Get in Touch',
    meta_description: 'Contact Cavero Fragrances for order support, product queries, or wholesale enquiries. Email, phone, and WhatsApp available.',
    content: `<h2>Contact Us</h2>
<p>We are here to help. Reach out to us through any of the channels below and we will get back to you within 24 hours on business days.</p>

<h3>Customer Support</h3>
<ul>
  <li><strong>Business:</strong> Cavero Fragrances</li>
  <li><strong>Owner:</strong> Manthan Gadara</li>
  <li><strong>Email:</strong> <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a></li>
  <li><strong>Phone / WhatsApp:</strong> <a href="tel:+919274521140">+91 9274521140</a></li>
  <li><strong>Support Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST</li>
  <li><strong>Location:</strong> Surat, Gujarat, India</li>
</ul>

<h3>Social Media</h3>
<p>Follow us and DM us on Instagram: <a href="https://www.instagram.com/caverofragrance" target="_blank">@caverofragrance</a></p>

<h3>Order Support</h3>
<p>For order tracking, returns, or cancellations — log in to your account and visit <strong>Order History</strong>, or email us with your order number and we will assist you promptly.</p>`
  },
];

// ── CONTACT SETTINGS ──────────────────────────────────────────────────────────

const CONTACT_SETTINGS = {
  email1: 'caverofragrance@gmail.com',
  email2: 'caverofragrance@gmail.com',
  phone: '9274521140',
  address: 'Surat, Gujarat, India',
  seo_title: 'Cavero Fragrances | Luxury Oud & Attar Perfumes',
  seo_keywords: 'cavero, fragrances, perfumes, oud, attar, arabian perfumes, luxury scents, eau de parfum, cologne, india, surat',
  seo_description: 'Discover luxury Oud, Attar and Arabian fragrances at Cavero Fragrances. Premium perfumes for men and women. Shop online with fast delivery across India.',
};

// ── FREE GIFTS ─────────────────────────────────────────────────────────────────

const FREE_GIFTS = [
  { name: 'Attar Sample (3ml)', min_order_value: 999,  is_active: true },
  { name: 'Oud Incense Stick',  min_order_value: 1999, is_active: true },
];

// ── SEED FUNCTION ─────────────────────────────────────────────────────────────

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to cavero_db\n');

    // ── CMS PAGES ───────────────────────────────────────────────────────────
    console.log('Seeding CMS pages...');
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

    // ── CONTACT SETTINGS ────────────────────────────────────────────────────
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
      console.log('  ✓ Updated: contact-settings');
    } else {
      await sequelize.query(
        "INSERT INTO cms_pages (title, slug, content, status, \"createdAt\", \"updatedAt\") VALUES ('Settings', 'contact-settings', :content, true, NOW(), NOW())",
        { replacements: { content: csContent } }
      );
      console.log('  ✓ Created: contact-settings');
    }

    // ── FREE GIFTS ──────────────────────────────────────────────────────────
    console.log('\nSeeding free gifts...');
    for (const gift of FREE_GIFTS) {
      const existing = await sequelize.query(
        'SELECT id FROM free_gifts WHERE name = :name',
        { replacements: { name: gift.name }, type: sequelize.QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        await sequelize.query(
          'UPDATE free_gifts SET min_order_value=:min_order_value, is_active=:is_active, "updatedAt"=NOW() WHERE name=:name',
          { replacements: gift }
        );
        console.log(`  ✓ Updated: ${gift.name} (unlocks at ₹${gift.min_order_value})`);
      } else {
        await sequelize.query(
          'INSERT INTO free_gifts (name, min_order_value, is_active, "createdAt", "updatedAt") VALUES (:name, :min_order_value, :is_active, NOW(), NOW())',
          { replacements: gift }
        );
        console.log(`  ✓ Created: ${gift.name} (unlocks at ₹${gift.min_order_value})`);
      }
    }

    // ── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n✅  All remaining data seeded successfully!');
    console.log('─────────────────────────────────────────────');
    console.log(`  ${CMS_PAGES.length} CMS pages`);
    console.log('  Contact settings');
    console.log(`  ${FREE_GIFTS.length} free gifts`);
    console.log('─────────────────────────────────────────────');
    console.log('\nVerify CMS pages at:');
    CMS_PAGES.forEach(p => console.log(`  http://localhost:4200/cms/${p.slug}`));
    console.log('\nVerify free gifts at:');
    console.log('  http://localhost:5000/api/free-gifts/active\n');

    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
