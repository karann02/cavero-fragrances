const express = require('express');
const router = express.Router();
const FreeGift = require('../models/free_gift');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// GET /api/free-gifts/active — public: all active gifts sorted by threshold
router.get('/active', async (req, res) => {
  try {
    const gifts = await FreeGift.findAll({
      where: { is_active: true },
      order: [['min_order_value', 'ASC']]
    });
    res.json({ success: true, data: gifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/free-gifts — admin: list all
router.get('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const gifts = await FreeGift.findAll({ order: [['min_order_value', 'ASC']] });
    res.json({ success: true, data: gifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/free-gifts — admin: create
router.post('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { name, min_order_value, is_active } = req.body;
    if (!name || !min_order_value) {
      return res.status(400).json({ success: false, message: 'name and min_order_value are required' });
    }
    const gift = await FreeGift.create({ name, min_order_value, is_active: is_active !== false });
    res.status(201).json({ success: true, data: gift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/free-gifts/:id — admin: update
router.put('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const gift = await FreeGift.findByPk(req.params.id);
    if (!gift) return res.status(404).json({ success: false, message: 'Free gift not found' });
    const { name, min_order_value, is_active } = req.body;
    await gift.update({ name, min_order_value, is_active });
    res.json({ success: true, data: gift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/free-gifts/:id — admin: delete
router.delete('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const gift = await FreeGift.findByPk(req.params.id);
    if (!gift) return res.status(404).json({ success: false, message: 'Free gift not found' });
    await gift.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
