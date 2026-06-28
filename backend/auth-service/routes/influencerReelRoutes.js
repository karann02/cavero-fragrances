const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const InfluencerReel = require('../models/influencer_reel');
const { verifyToken, verifySuperuser } = require('../middleware/auth');
const { makeUpload } = require('../config/cloudinary');

// Reel image + video → Cloudinary ('auto' detects image vs video). req.files.X[0].path = URL.
const upload = makeUpload('reels', { resourceType: 'auto' });
const fields = upload.fields([
  { name: 'product_image', maxCount: 1 },
  { name: 'reel_video', maxCount: 1 }
]);

const resolveReelFilePath = (mediaUrl) => {
  if (!mediaUrl) return null;
  const normalizedPath = String(mediaUrl).replace(/^\/+/, '').split('/').join(path.sep);
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', normalizedPath);
};

const deleteReelFile = (mediaUrl) => {
  const filePath = resolveReelFilePath(mediaUrl);
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }
};

const parseSortOrder = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

// Frontend: active reels only
router.get('/', async (req, res) => {
  try {
    const reels = await InfluencerReel.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']]
    });
    const data = reels.map(r => {
      const plain = r.toJSON ? r.toJSON() : { ...r };
      return {
        ...plain,
        resolved_reel_video_url: plain.reel_url || null,
        resolved_reel_thumbnail_url: null
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: all reels
router.get('/admin', async (req, res) => {
  try {
    const reels = await InfluencerReel.findAll({ order: [['sort_order', 'ASC'], ['createdAt', 'DESC']] });
    res.json({ success: true, data: reels });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create reel
router.post('/', verifyToken, verifySuperuser, fields, async (req, res) => {
  try {
    const {
      title,
      product_name,
      product_price,
      product_original_price,
      product_description,
      instagram_url,
      product_detail_url,
      discount_text,
      sort_order,
      is_active
    } = req.body;
    const product_image = req.files?.product_image?.[0] ? req.files.product_image[0].path : null;
    const reel_url = req.files?.reel_video?.[0] ? req.files.reel_video[0].path : null;
    const parsedSortOrder = parseSortOrder(sort_order);

    if (parsedSortOrder <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sort order must be greater than 0.',
      });
    }

    // Check for duplicate sort_order
    const duplicateSortOrder = await InfluencerReel.findOne({ where: { sort_order: parsedSortOrder } });
    if (duplicateSortOrder) {
      return res.status(400).json({
        success: false,
        message: `Sort order ${parsedSortOrder} already exists. Please choose a different sort order.`,
      });
    }

    const reel = await InfluencerReel.create({
      title,
      reel_url,
      product_name,
      product_price,
      product_original_price,
      product_description: normalizeText(product_description),
      instagram_url: normalizeText(instagram_url),
      product_detail_url: normalizeText(product_detail_url),
      product_image,
      thumbnail_url: null,
      discount_text,
      sort_order: parsedSortOrder,
      is_active: is_active !== 'false'
    });
    res.status(201).json({ success: true, data: reel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update reel
router.put('/:id', verifyToken, verifySuperuser, fields, async (req, res) => {
  try {
    const reel = await InfluencerReel.findByPk(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      title, product_name, product_price, product_original_price,
      product_description, instagram_url, product_detail_url,
      discount_text, sort_order, is_active,
      remove_product_image, remove_reel_video
    } = req.body;

    const shouldRemoveProductImage = String(remove_product_image).toLowerCase() === 'true';
    const shouldRemoveReelVideo = String(remove_reel_video).toLowerCase() === 'true';

    let product_image = reel.product_image;
    let reel_url = reel.reel_url;

    if (req.files?.product_image?.[0]) {
      deleteReelFile(reel.product_image);
      product_image = req.files.product_image[0].path;
    } else if (shouldRemoveProductImage) {
      deleteReelFile(reel.product_image);
      product_image = null;
    }

    if (req.files?.reel_video?.[0]) {
      deleteReelFile(reel.reel_url);
      reel_url = req.files.reel_video[0].path;
    } else if (shouldRemoveReelVideo) {
      deleteReelFile(reel.reel_url);
      reel_url = null;
    }

    const parsedSortOrder = sort_order !== undefined ? parseSortOrder(sort_order) : reel.sort_order;

    if (sort_order !== undefined && parsedSortOrder <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sort order must be greater than 0.',
      });
    }

    // Check for duplicate sort_order (excluding current reel)
    if (parsedSortOrder > 0 && parsedSortOrder !== reel.sort_order) {
      const duplicateSortOrder = await InfluencerReel.findOne({ where: { sort_order: parsedSortOrder } });
      if (duplicateSortOrder) {
        return res.status(400).json({
          success: false,
          message: `Sort order ${parsedSortOrder} already exists. Please choose a different sort order.`,
        });
      }
    }

    await reel.update({
      title: title !== undefined ? title : reel.title,
      reel_url,
      product_name: product_name !== undefined ? product_name : reel.product_name,
      product_price: product_price !== undefined ? product_price : reel.product_price,
      product_original_price: product_original_price !== undefined ? product_original_price : reel.product_original_price,
      product_description: product_description !== undefined ? normalizeText(product_description) : reel.product_description,
      instagram_url: instagram_url !== undefined ? normalizeText(instagram_url) : reel.instagram_url,
      product_detail_url: product_detail_url !== undefined ? normalizeText(product_detail_url) : reel.product_detail_url,
      product_image,
      thumbnail_url: null,
      discount_text: discount_text !== undefined ? discount_text : reel.discount_text,
      sort_order: parsedSortOrder,
      is_active: is_active !== undefined ? is_active !== 'false' && is_active !== false : reel.is_active
    });
    await reel.reload();
    res.json({ success: true, data: reel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete reel
router.delete('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const reel = await InfluencerReel.findByPk(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Not found' });
    deleteReelFile(reel.product_image);
    deleteReelFile(reel.reel_url);
    await reel.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
