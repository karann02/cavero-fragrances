const express = require('express');
const router = express.Router();
const CmsPage = require('../models/cms_page');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

const SLUG = 'about-settings';

router.get('/', async (req, res) => {
  try {
    const page = await CmsPage.findOne({ where: { slug: SLUG } });
    if (page?.content) {
      try { return res.json({ success: true, data: JSON.parse(page.content) }); }
      catch { return res.json({ success: true, data: null }); }
    }
    res.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const content = JSON.stringify(req.body);
    const existing = await CmsPage.findOne({ where: { slug: SLUG } });
    if (existing) {
      await existing.update({ content });
    } else {
      await CmsPage.create({ slug: SLUG, title: 'About Settings', content, status: true });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
