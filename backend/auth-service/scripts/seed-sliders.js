const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sequelize = require('../config/db');
const Slider = require('../models/slider');

const sliders = [
  {
    title: 'White Oudh — Your Next Signature Scent',
    subtitle: 'Timeless · Elegant · Unforgettable',
    description: 'Experience the finest Oud crafted for the modern connoisseur.',
    image: '/uploads/sliders/slider-cavero-1.png',
    button_text: 'Shop White Oudh',
    button_url: '/shop-category/oud-collection',
    sort_order: 1,
    is_active: true,
    background_color: '#ffffff',
    text_color: '#C9A84C',
    display_on: 'all',
  },
  {
    title: 'Experience Luxury. Define Your Signature.',
    subtitle: 'Premium Attar · Timeless Impression',
    description: 'Discover our collection of handcrafted Arabian fragrances.',
    image: '/uploads/sliders/slider-cavero-2.png',
    button_text: 'Explore Collection',
    button_url: '/shop',
    sort_order: 2,
    is_active: true,
    background_color: '#C9A84C',
    text_color: '#ffffff',
    display_on: 'all',
  },
  {
    title: 'Get 3 Attar at ₹899',
    subtitle: 'No Code Needed · Limited Time Only',
    description: 'Premium Attar collection at an unbeatable price.',
    image: '/uploads/sliders/slider-cavero-3.png',
    button_text: 'Shop Now',
    button_url: '/shop-category/oud-collection',
    sort_order: 3,
    is_active: true,
    background_color: '#8B6914',
    text_color: '#ffffff',
    display_on: 'all',
  },
];

async function seedSliders() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    await Slider.destroy({ where: {}, truncate: true });
    console.log('Old sliders cleared.');

    const created = await Slider.bulkCreate(sliders);
    console.log(`\n✓ ${created.length} sliders seeded:`);
    created.forEach(s => console.log(`  [${s.sort_order}] ${s.title}`));

    console.log('\nDone — banners are now live on the homepage.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedSliders();
