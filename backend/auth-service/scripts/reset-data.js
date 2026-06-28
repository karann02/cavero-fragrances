/**
 * reset-data.js
 * Clears ALL store data but keeps:
 *   - roles table (superuser / admin / customer)
 *   - the admin@cavero.com superuser account
 * Run: node backend/auth-service/scripts/reset-data.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, dialect: 'postgres', logging: false }
);

async function run() {
  console.log('\n====== CAVERO FRAGRANCES — DATA RESET ======\n');

  // Delete in foreign-key-safe order
  const steps = [
    { label: 'Reviews',           sql: 'DELETE FROM reviews' },
    { label: 'Wishlist',          sql: 'DELETE FROM wishlist' },
    { label: 'Returns',           sql: 'DELETE FROM returns' },
    { label: 'Order Items',       sql: 'DELETE FROM order_items' },
    { label: 'Orders',            sql: 'DELETE FROM orders' },
    { label: 'Support Tickets',   sql: 'DELETE FROM support_tickets' },
    { label: 'Referrals',         sql: 'DELETE FROM referrals' },
    { label: 'Cart',              sql: 'DELETE FROM cart' },
    { label: 'Coupon Usages',     sql: 'DELETE FROM coupon_usages' },
    { label: 'Coupons',           sql: 'DELETE FROM coupons' },
    { label: 'Free Gifts',        sql: 'DELETE FROM free_gifts' },
    { label: 'Product Images',    sql: 'DELETE FROM product_images' },
    { label: 'Products',          sql: 'DELETE FROM products' },
    { label: 'Brands',            sql: 'DELETE FROM brands' },
    { label: 'Categories',        sql: 'DELETE FROM categories' },
    { label: 'Sliders',           sql: 'DELETE FROM sliders' },
    { label: 'Combos',            sql: 'DELETE FROM combos' },
    { label: 'Influencer Reels',  sql: 'DELETE FROM influencer_reels' },
    { label: 'CMS Pages',         sql: 'DELETE FROM cms_pages' },
    { label: 'Product Types',     sql: 'DELETE FROM product_types' },
    // Delete all customers (not admins/superusers)
    {
      label: 'Customer Users',
      sql: `DELETE FROM users WHERE id IN (
              SELECT u.id FROM users u
              JOIN user_role ur ON ur.user_id = u.id
              JOIN roles r ON r.id = ur.role_id
              WHERE r.name = 'customer'
            )`
    },
  ];

  for (const step of steps) {
    try {
      const [, meta] = await sequelize.query(step.sql);
      const count = meta?.rowCount ?? '?';
      console.log(`  ✓  ${step.label.padEnd(20)} — ${count} row(s) deleted`);
    } catch (e) {
      // product_images may not exist as a standalone table (could be inline)
      if (e.message.includes('does not exist')) {
        console.log(`  –  ${step.label.padEnd(20)} — table not found, skipping`);
      } else {
        console.log(`  ✗  ${step.label.padEnd(20)} — ${e.message}`);
      }
    }
  }

  // Verify admin is still there
  const [[admin]] = await sequelize.query(
    "SELECT email FROM users WHERE email = 'admin@cavero.com' LIMIT 1"
  );
  if (admin) {
    console.log('\n  ✓  Admin account admin@cavero.com — PRESERVED');
  } else {
    console.log('\n  ⚠  Admin account NOT found — run seed.js to recreate it');
  }

  console.log('\n====== RESET COMPLETE — Database is clean ======\n');
  await sequelize.close();
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
