const express = require('express');
const router = express.Router();
const CmsPage = require('../models/cms_page');
const { verifyToken, verifySuperuser } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const SLUG = 'combo-box-settings';

const DEFAULT = {
  box_price: 1200,
  image: null
};

const normalizeImagePath = (value) => {
  if (!value) return null;
  const rawValue = String(value).trim();
  if (!rawValue) return null;
  if (rawValue.startsWith('/uploads/combo-box-settings/')) return rawValue;
  if (rawValue.startsWith('uploads/combo-box-settings/')) return `/${rawValue}`;
  if (rawValue.startsWith('http')) {
    const marker = '/uploads/combo-box-settings/';
    const markerIndex = rawValue.indexOf(marker);
    return markerIndex !== -1 ? rawValue.substring(markerIndex) : rawValue;
  }
  return `/uploads/combo-box-settings/${path.basename(rawValue.replace(/\\/g, '/'))}`;
};

const resolveImageFilePath = (value) => {
  const normalized = normalizeImagePath(value);
  if (!normalized || !normalized.startsWith('/uploads/combo-box-settings/')) return null;
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', normalized.replace(/^\/+/, ''));
};

const deleteImageFile = (value) => {
  try {
    const filePath = resolveImageFilePath(value);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('combo-box-settings image delete error:', error);
  }
};

// Combo-box image → Cloudinary (req.file.path = secure URL)
const { makeUpload } = require('../config/cloudinary');
const upload = makeUpload('combo-box-settings');

router.get('/', async (req, res) => {
  try {
    const page = await CmsPage.findOne({ where: { slug: SLUG } });
    if (page && page.content) {
      try {
        const data = JSON.parse(page.content);
        return res.json({
          success: true,
          data: {
            ...DEFAULT,
            ...data,
            box_price: Number(data?.box_price ?? DEFAULT.box_price) || DEFAULT.box_price,
            image: normalizeImagePath(data?.image),
            updated_at: page.updatedAt || page.updated_at || null
          }
        });
      } catch {
        return res.json({ success: true, data: { ...DEFAULT, updated_at: page.updatedAt || page.updated_at || null } });
      }
    }

    return res.json({ success: true, data: { ...DEFAULT, updated_at: null } });
  } catch (err) {
    console.error('combo-box-settings GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', verifyToken, verifySuperuser, upload.single('image'), async (req, res) => {
  try {
    const parsedPrice = Number(req.body?.box_price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ success: false, message: 'A valid box price is required' });
    }

    const existing = await CmsPage.findOne({ where: { slug: SLUG } });
    let existingData = {};
    if (existing?.content) {
      try {
        existingData = JSON.parse(existing.content);
      } catch {
        existingData = {};
      }
    }

    let nextImage = normalizeImagePath(existingData?.image);
    const incomingImage = normalizeImagePath(req.body?.image);
    const wantsImageRemoval =
      String(req.body?.remove_image || '').toLowerCase() === 'true' ||
      (req.body?.image !== undefined && String(req.body.image).trim() === '');

    if (req.file) {
      deleteImageFile(nextImage);
      nextImage = req.file.path;
    } else if (wantsImageRemoval) {
      deleteImageFile(nextImage);
      nextImage = null;
    } else if (incomingImage) {
      nextImage = incomingImage;
    }

    const content = JSON.stringify({
      box_price: parsedPrice,
      image: nextImage
    });

    if (existing) {
      await existing.update({ content });
    } else {
      const created = await CmsPage.create({
        slug: SLUG,
        title: 'Combo Box Settings',
        content,
        status: true
      });

      return res.json({
        success: true,
        data: {
          box_price: parsedPrice,
          image: nextImage,
          updated_at: created.updatedAt || created.updated_at || null
        }
      });
    }

    const refreshed = await CmsPage.findOne({ where: { slug: SLUG } });

    return res.json({
      success: true,
      data: {
        box_price: parsedPrice,
        image: nextImage,
        updated_at: refreshed?.updatedAt || refreshed?.updated_at || null
      }
    });
  } catch (err) {
    console.error('combo-box-settings POST error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
