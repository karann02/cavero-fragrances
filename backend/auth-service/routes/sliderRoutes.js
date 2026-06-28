const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Slider = require('../models/slider');
const { verifyToken, verifySuperuser } = require('../middleware/auth');
const { makeUpload } = require('../config/cloudinary');

// Slider images → Cloudinary (req.file.path = secure URL)
const upload = makeUpload('sliders');

const normalizeDisplayOn = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['all', 'desktop', 'mobile'].includes(normalized)) {
    return normalized;
  }
  return 'all';
};

const mapSliderOutput = (slider) => {
  const sliderJson = slider?.toJSON ? slider.toJSON() : slider;
  const displayOn = normalizeDisplayOn(sliderJson.display_on || sliderJson.screen_type || 'all');
  return {
    ...sliderJson,
    display_on: displayOn,
  };
};

const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const resolveSliderImageFilePath = (imageUrl) => {
  if (!imageUrl) return null;
  const normalizedImagePath = String(imageUrl).replace(/^\/+/, '').split('/').join(path.sep);
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', normalizedImagePath);
};

const deleteSliderImageFile = (imageUrl) => {
  const imageFilePath = resolveSliderImageFilePath(imageUrl);
  if (imageFilePath && fs.existsSync(imageFilePath)) {
    fs.unlinkSync(imageFilePath);
  }
};

// GET all sliders (admin) - ordered by sort_order
router.get('/', async (req, res) => {
  try {
    const sliders = await Slider.findAll({ order: [['sort_order', 'ASC'], ['created_at', 'ASC']] });
    console.log('Fetched sliders with display_on:', sliders.map(s => ({ id: s.id, title: s.title, display_on: s.display_on })));
    res.json({ success: true, data: sliders.map(mapSliderOutput) });
  } catch (err) {
    console.error('Error fetching sliders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET active sliders (frontend)
router.get('/active', async (req, res) => {
  try {
    const sliders = await Slider.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    res.json({ success: true, data: sliders.map(mapSliderOutput) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single slider
router.get('/:id', async (req, res) => {
  try {
    const slider = await Slider.findByPk(req.params.id);
    if (!slider) return res.status(404).json({ success: false, message: 'Slider not found' });
    console.log('Fetched slider:', mapSliderOutput(slider));
    res.json({ success: true, data: mapSliderOutput(slider) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create slider
router.post('/', verifyToken, verifySuperuser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image is required' });

    const imageUrl = req.file.path;
    const parsedSortOrder = parseInt(req.body.sort_order) || 0;

    // Check for duplicate sort_order
    if (parsedSortOrder > 0) {
      const duplicateSortOrder = await Slider.findOne({ where: { sort_order: parsedSortOrder } });
      if (duplicateSortOrder) {
        return res.status(400).json({
          success: false,
          message: `Sort order ${parsedSortOrder} already exists. Please choose a different sort order.`,
        });
      }
    }

    const displayOn = normalizeDisplayOn(req.body.display_on || req.body.screen_type || 'all');

    const slider = await Slider.create({
      title: req.body.title || null,
      subtitle: req.body.subtitle || null,
      description: req.body.description || null,
      image: imageUrl,
      button_text: req.body.button_text || 'Shop now',
      button_url: req.body.button_url || '/shop',
      sort_order: parsedSortOrder,
      is_active: parseBoolean(req.body.is_active, true),
      background_color: req.body.background_color || '#6dafca',
      text_color: req.body.text_color || '#ffffff',
      display_on: displayOn,
    });

    res.status(201).json({ success: true, data: mapSliderOutput(slider) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update slider - SIMPLIFIED VERSION
router.put('/:id', verifyToken, verifySuperuser, upload.single('image'), async (req, res) => {
  console.log('\n=== SLIDER UPDATE START ===');
  console.log('Slider ID:', req.params.id);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Has file:', !!req.file);
  
  try {
    // Find slider
    const slider = await Slider.findByPk(req.params.id);
    
    if (!slider) {
      console.log('ERROR: Slider not found');
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }
    
    console.log('Found slider:', {
      id: slider.id,
      title: slider.title,
      display_on: slider.display_on,
      is_active: slider.is_active
    });
    
    // Prepare updates
    const updates = {};
    
    // Always update these fields if provided
    if (req.body.button_url !== undefined) updates.button_url = req.body.button_url;
    if (req.body.sort_order !== undefined) updates.sort_order = parseInt(req.body.sort_order);
    if (req.body.is_active !== undefined) updates.is_active = parseBoolean(req.body.is_active, slider.is_active);
    if (req.body.display_on !== undefined || req.body.screen_type !== undefined) {
      updates.display_on = normalizeDisplayOn(req.body.display_on || req.body.screen_type);
    }
    
    // Check for duplicate sort_order (excluding current slider)
    if (updates.sort_order !== undefined && updates.sort_order > 0 && updates.sort_order !== slider.sort_order) {
      const duplicateSortOrder = await Slider.findOne({ where: { sort_order: updates.sort_order } });
      if (duplicateSortOrder) {
        return res.status(400).json({
          success: false,
          message: `Sort order ${updates.sort_order} already exists. Please choose a different sort order.`,
        });
      }
    }
    
    // Optional fields
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.subtitle !== undefined) updates.subtitle = req.body.subtitle;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.button_text !== undefined) updates.button_text = req.body.button_text;
    if (req.body.background_color !== undefined) updates.background_color = req.body.background_color;
    if (req.body.text_color !== undefined) updates.text_color = req.body.text_color;
    
    console.log('Updates to apply:', JSON.stringify(updates, null, 2));
    
    // Handle image
    if (req.file) {
      deleteSliderImageFile(slider.image);
      updates.image = req.file.path;
      console.log('New image:', updates.image);
    } else if (req.body.remove_image === 'true') {
      deleteSliderImageFile(slider.image);
      updates.image = '';
      console.log('Image removed');
    }
    
    // Perform update
    console.log('Executing update...');
    await slider.update(updates);
    
    // Reload to get fresh data
    await slider.reload();
    
    console.log('Update successful! New values:', {
      id: slider.id,
      title: slider.title,
      display_on: slider.display_on,
      is_active: slider.is_active,
      sort_order: slider.sort_order
    });
    console.log('=== SLIDER UPDATE END ===\n');
    
    return res.json({ success: true, data: mapSliderOutput(slider) });
    
  } catch (err) {
    console.error('=== SLIDER UPDATE ERROR ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST bulk delete (enforces minimum 3 active sliders)
router.post('/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ success: false, message: 'No IDs provided' });

    const totalActive = await Slider.count({ where: { is_active: true } });
    const deletingActive = await Slider.count({ where: { id: ids, is_active: true } });
    const remainingActive = totalActive - deletingActive;

    if (remainingActive < 3) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: at least 3 active sliders are required. You have ${totalActive} active slider(s) and are trying to delete ${deletingActive} active one(s).`
      });
    }

    const slidersToDelete = await Slider.findAll({ where: { id: ids } });
    slidersToDelete.forEach((slider) => deleteSliderImageFile(slider.image));

    await Slider.destroy({ where: { id: ids } });
    res.json({ success: true, message: `${ids.length} slider(s) deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
