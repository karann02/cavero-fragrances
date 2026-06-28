/**
 * One-off: upload local /uploads images referenced in the DB to Cloudinary and
 * rewrite the stored URLs. Idempotent — values already on https are skipped.
 * Run (pointed at the target DB):
 *   DATABASE_URL='postgres://...neon...' node scripts/migrate-images-to-cloudinary.js
 */
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../config/cloudinary');
const sequelize = require('../config/db');

const UPLOADS = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'uploads');
let uploaded = 0, skipped = 0, missing = 0;

// Only already-migrated Cloudinary URLs should be skipped. localhost/uploads/C:\
// values are LOCAL and must be (re)uploaded — resolve their file via the basename.
const isCloud = (v) => typeof v === 'string' && /res\.cloudinary\.com/i.test(v);
const baseName = (v) => String(v || '').replace(/\\/g, '/').split('/').pop();

async function up(folder, stored, resourceType = 'image') {
  if (!stored) return stored;
  if (isCloud(stored)) { skipped++; return stored; }
  const file = path.join(UPLOADS, folder, baseName(stored));
  if (!fs.existsSync(file)) { missing++; console.warn('  ⚠ missing local file:', path.relative(UPLOADS, file)); return stored; }
  const res = await cloudinary.uploader.upload(file, { folder: `cavero/${folder}`, resource_type: resourceType });
  uploaded++;
  return res.secure_url;
}

async function run() {
  await sequelize.authenticate();
  console.log('Connected. Migrating images → Cloudinary...\n');

  // PRODUCTS — images JSONB array of { path, filename, size, url? }
  const [products] = await sequelize.query('SELECT id, name, images FROM products ORDER BY id');
  for (const p of products) {
    let imgs = p.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    if (!Array.isArray(imgs) || !imgs.length) continue;
    console.log('• product:', p.name, `(${imgs.length} img)`);
    for (const entry of imgs) {
      const src = entry.url || entry.path || entry.filename;
      const url = await up('products', src);
      if (url && url !== src) { entry.path = url; entry.url = url; entry.secure_url = url; }
    }
    await sequelize.query('UPDATE products SET images = :imgs WHERE id = :id', {
      replacements: { imgs: JSON.stringify(imgs), id: p.id },
    });
  }

  // Simple single-URL string columns
  const cols = [
    { table: 'categories', col: 'image_url', folder: 'categories' },
    { table: 'sliders', col: 'image', folder: 'sliders' },
    { table: 'combos', col: 'image', folder: 'combos' },
    { table: 'influencer_reels', col: 'product_image', folder: 'reels' },
  ];
  for (const { table, col, folder } of cols) {
    const [rows] = await sequelize.query(`SELECT id, ${col} AS v FROM ${table} WHERE ${col} IS NOT NULL AND ${col} <> ''`);
    for (const r of rows) {
      const url = await up(folder, r.v);
      if (url && url !== r.v) {
        await sequelize.query(`UPDATE ${table} SET ${col} = :v WHERE id = :id`, { replacements: { v: url, id: r.id } });
        console.log(`• ${table}#${r.id}.${col} → cloudinary`);
      }
    }
  }

  // Reel videos (reel_url) — resource_type video
  const [reels] = await sequelize.query("SELECT id, reel_url AS v FROM influencer_reels WHERE reel_url IS NOT NULL AND reel_url <> ''");
  for (const r of reels) {
    const url = await up('reels', r.v, 'video');
    if (url && url !== r.v) {
      await sequelize.query('UPDATE influencer_reels SET reel_url = :v WHERE id = :id', { replacements: { v: url, id: r.id } });
      console.log(`• reel#${r.id}.reel_url → cloudinary (video)`);
    }
  }

  console.log(`\n✅ Done. uploaded=${uploaded}  skipped(already http)=${skipped}  missing-local=${missing}`);
  await sequelize.close();
}

run().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
