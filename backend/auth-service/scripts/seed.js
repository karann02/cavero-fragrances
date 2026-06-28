/**
 * Cavero Fragrances — Database Seed Script
 * Run: node scripts/seed.js
 * Seeds: roles, admin user, perfume categories, sample brands
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to cavero_db\n');

    const query = (sql, params) => sequelize.query(sql, { replacements: params, type: sequelize.QueryTypes.INSERT });
    const select = (sql, params) => sequelize.query(sql, { replacements: params, type: sequelize.QueryTypes.SELECT });

    // ── 1. ROLES ─────────────────────────────────────────────────────────────
    console.log('Seeding roles...');
    const existingRoles = await select('SELECT COUNT(*) as cnt FROM user_role');
    if (existingRoles[0].cnt == 0) {
      await sequelize.query(`
        INSERT INTO user_role (user_role, user_role_keyword, user_type, status, created_at, updated_at) VALUES
          ('Super Admin', 'superuser', 'admin', 1, NOW(), NOW()),
          ('Admin',       'admin',     'admin', 1, NOW(), NOW()),
          ('Customer',    'customer',  'customer', 1, NOW(), NOW())
      `);
      console.log('  ✓ Roles created');
    } else {
      console.log('  ✓ Roles already exist, skipping');
    }

    // ── 2. ADMIN USER ────────────────────────────────────────────────────────
    console.log('Seeding admin user...');
    const adminExists = await select("SELECT COUNT(*) as cnt FROM users WHERE email = 'admin@cavero.com'");
    if (adminExists[0].cnt == 0) {
      const superuserRole = await select("SELECT id FROM user_role WHERE user_role_keyword = 'superuser' LIMIT 1");
      const roleId = superuserRole[0].id;
      const plainPassword = 'Admin@123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      await sequelize.query(`
        INSERT INTO users (name, email, password, "basePass64", user_role_id, role, user_type, is_active, "createdAt", "updatedAt")
        VALUES (:name, :email, :password, :base, :roleId, 'superuser', 'admin', true, NOW(), NOW())
      `, {
        replacements: {
          name: 'Cavero Admin',
          email: 'admin@cavero.com',
          password: hashedPassword,
          base: '',
          roleId
        }
      });
      console.log('  ✓ Admin user created');
      console.log('    Email   : admin@cavero.com');
      console.log('    Password: Admin@123');
    } else {
      console.log('  ✓ Admin user already exists, skipping');
    }

    // ── 3. PERFUME CATEGORIES ─────────────────────────────────────────────────
    console.log('Seeding perfume categories...');
    const catExists = await select('SELECT COUNT(*) as cnt FROM categories');
    if (catExists[0].cnt == 0) {
      const categories = [
        { name: "Men's Fragrances",   slug: 'mens-fragrances',   description: 'Bold, sophisticated scents crafted for men.',    sort_order: 1, is_featured: true  },
        { name: "Women's Fragrances", slug: 'womens-fragrances', description: 'Elegant and floral perfumes for women.',           sort_order: 2, is_featured: true  },
        { name: 'Unisex & Niche',     slug: 'unisex-niche',      description: 'Gender-neutral and rare artisan fragrances.',     sort_order: 3, is_featured: true  },
        { name: 'Oud & Attar',        slug: 'oud-attar',         description: 'Traditional Arabian Oud and concentrated Attar.', sort_order: 4, is_featured: true  },
        { name: 'Gift Sets',          slug: 'gift-sets',         description: 'Luxury fragrance gift sets for every occasion.',  sort_order: 5, is_featured: true  },
        { name: 'Body Mists',         slug: 'body-mists',        description: 'Light, everyday body sprays and mists.',          sort_order: 6, is_featured: false },
        { name: 'Home Fragrance',     slug: 'home-fragrance',    description: 'Candles, diffusers and room sprays.',             sort_order: 7, is_featured: false },
      ];

      for (const cat of categories) {
        await sequelize.query(`
          INSERT INTO categories (name, slug, description, status, is_featured, sort_order, "createdAt", "updatedAt")
          VALUES (:name, :slug, :description, true, :is_featured, :sort_order, NOW(), NOW())
        `, { replacements: cat });
      }
      console.log(`  ✓ ${categories.length} perfume categories created`);
    } else {
      console.log('  ✓ Categories already exist, skipping');
    }

    // ── 4. BRANDS ──────────────────────────────────────────────────────────────
    console.log('Seeding brands...');
    const brandExists = await select('SELECT COUNT(*) as cnt FROM brands');
    if (brandExists[0].cnt == 0) {
      const brands = [
        { name: 'Lattafa',       slug: 'lattafa',       description: 'Premium Arabian fragrance house.' },
        { name: 'Armaf',         slug: 'armaf',         description: 'Luxury French-inspired fragrances.' },
        { name: 'Rasasi',        slug: 'rasasi',        description: 'Iconic Middle Eastern perfumery.' },
        { name: 'Al Haramain',   slug: 'al-haramain',   description: 'Heritage Arabian Oud and Attar brand.' },
        { name: 'Swiss Arabian', slug: 'swiss-arabian', description: 'Swiss precision meets Arabian heritage.' },
        { name: 'Ajmal',         slug: 'ajmal',         description: 'India\'s leading luxury fragrance brand.' },
        { name: 'Cavero House',  slug: 'cavero-house',  description: 'Cavero Fragrances exclusive in-house line.' },
      ];

      for (const brand of brands) {
        await sequelize.query(`
          INSERT INTO brands (name, slug, description, is_active, is_featured, sort_order, "createdAt", "updatedAt")
          VALUES (:name, :slug, :description, true, false, 0, NOW(), NOW())
        `, { replacements: brand });
      }
      console.log(`  ✓ ${brands.length} brands created`);
    } else {
      console.log('  ✓ Brands already exist, skipping');
    }

    // ── 5. SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log('✅  Database seeded successfully!');
    console.log('─────────────────────────────────────────');
    console.log('Admin login → http://localhost:4200/authentication/signin');
    console.log('Email   : admin@cavero.com');
    console.log('Password: Admin@123');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
