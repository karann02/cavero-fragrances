const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CmsPage = require('../models/cms_page');
const { verifyToken, verifySuperuser } = require('../middleware/auth');
const { makeUpload } = require('../config/cloudinary');

const SLUG = 'logo-settings';

// Logo image → Cloudinary (req.file.path = secure URL)
const upload = makeUpload('logo');

const DEFAULT = { logo_url: '' };

function readSettings(page) {
  if (page && page.content) {
    try {
      const parsed = JSON.parse(page.content);
      return { logo_url: typeof parsed.logo_url === 'string' ? parsed.logo_url : '' };
    } catch {
      return { ...DEFAULT };
    }
  }
  return { ...DEFAULT };
}

const resolveLogoFilePath = (imageUrl) => {
  if (!imageUrl) return null;
  // only manage files we uploaded under /uploads/logo
  if (!String(imageUrl).startsWith('/uploads/logo/')) return null;
  const normalized = String(imageUrl).replace(/^\/+/, '').split('/').join(path.sep);
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', normalized);
};

const deleteLogoFile = (imageUrl) => {
  const filePath = resolveLogoFilePath(imageUrl);
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  }
};

// GET current logo settings (used by admin + storefront navbar)
router.get('/', async (req, res) => {
  try {
    const page = await CmsPage.findOne({ where: { slug: SLUG } });
    return res.json({ success: true, data: readSettings(page) });
  } catch (err) {
    console.error('logo-settings GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST upload / replace the logo
router.post('/', verifyToken, verifySuperuser, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo image is required' });
    }

    const existing = await CmsPage.findOne({ where: { slug: SLUG } });
    const previous = readSettings(existing);

    const logo_url = req.file.path;
    const content = JSON.stringify({ logo_url });

    if (existing) {
      await existing.update({ content });
    } else {
      await CmsPage.create({ slug: SLUG, title: 'Logo', content, status: true });
    }

    // clean up the previously uploaded logo file (keeps the folder tidy)
    if (previous.logo_url && previous.logo_url !== logo_url) {
      deleteLogoFile(previous.logo_url);
    }

    return res.json({ success: true, data: { logo_url } });
  } catch (err) {
    console.error('logo-settings POST error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// DELETE — reset to the default bundled logo
router.delete('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const existing = await CmsPage.findOne({ where: { slug: SLUG } });
    if (existing) {
      const previous = readSettings(existing);
      deleteLogoFile(previous.logo_url);
      await existing.update({ content: JSON.stringify(DEFAULT) });
    }
    return res.json({ success: true, data: { ...DEFAULT } });
  } catch (err) {
    console.error('logo-settings DELETE error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
