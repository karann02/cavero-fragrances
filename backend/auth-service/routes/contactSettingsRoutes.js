const express = require('express');
const router = express.Router();
const CmsPage = require('../models/cms_page');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

const SLUG = 'contact-settings';

const DEFAULT = {
  email1: 'caverofragrance@gmail.com',
  email2: 'caverofragrance@gmail.com',
  phone: '9274521140',
  address: 'Surat, Gujarat, India',
  seo_title: 'Cavero Fragrances | Luxury Oud & Attar Perfumes',
  seo_keywords: 'cavero, fragrances, perfumes, oud, attar, arabian perfumes, luxury scents, eau de parfum, india',
  seo_description: 'Discover luxury Oud, Attar and Arabian fragrances at Cavero Fragrances. Premium perfumes for men and women. Shop online with fast delivery across India.',
};

function normalizeString(value, fallback = '', { allowEmpty = true } = {}) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  if (!allowEmpty && !normalized) return fallback;
  return normalized;
}

function normalizePayload(body = {}) {
  return {
    email1: normalizeString(body.email1, DEFAULT.email1, { allowEmpty: false }),
    email2: normalizeString(body.email2, DEFAULT.email2, { allowEmpty: false }),
    phone: normalizeString(body.phone, DEFAULT.phone),
    address: normalizeString(body.address, DEFAULT.address),
    seo_title: normalizeString(body.seo_title, DEFAULT.seo_title),
    seo_keywords: normalizeString(body.seo_keywords, DEFAULT.seo_keywords),
    seo_description: normalizeString(body.seo_description, DEFAULT.seo_description)
  };
}

router.get('/', async (req, res) => {
  try {
    const page = await CmsPage.findOne({ where: { slug: SLUG } });
    if (page && page.content) {
      try {
        const parsed = JSON.parse(page.content);
        const data = normalizePayload(parsed);
        return res.json({ success: true, data });
      } catch {
        return res.json({ success: true, data: DEFAULT });
      }
    }
    return res.json({ success: true, data: DEFAULT });
  } catch (err) {
    console.error('contact-settings GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const content = JSON.stringify(payload);
    const existing = await CmsPage.findOne({ where: { slug: SLUG } });
    if (existing) {
      await existing.update({ content });
    } else {
      await CmsPage.create({ slug: SLUG, title: 'Settings', content, status: true });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('contact-settings POST error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
