const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// Define inline model (no separate file needed)
const VariantType = sequelize.define('variant_type', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'variant_types' });

// GET / — public, all active, ordered by sort_order ASC
router.get('/', async (req, res) => {
  try {
    const types = await VariantType.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    return res.json({ success: true, data: types });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /all — admin, all including inactive
router.get('/all', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const types = await VariantType.findAll({
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    return res.json({ success: true, data: types });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST / — admin create
router.post('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { name, is_active, sort_order } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const type = await VariantType.create({
      name: String(name).trim(),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      sort_order: Number(sort_order) || 0
    });
    return res.status(201).json({ success: true, data: type });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id — admin update
router.put('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const type = await VariantType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Variant type not found' });
    }
    const { name, is_active, sort_order } = req.body;
    await type.update({
      name: name !== undefined ? String(name).trim() : type.name,
      is_active: is_active !== undefined ? Boolean(is_active) : type.is_active,
      sort_order: sort_order !== undefined ? Number(sort_order) : type.sort_order
    });
    return res.json({ success: true, data: type });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — admin delete
router.delete('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const type = await VariantType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Variant type not found' });
    }
    await type.destroy();
    return res.json({ success: true, message: 'Variant type deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /bulk-delete — admin bulk delete
router.post('/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }
    const deleted = await VariantType.destroy({ where: { id: ids } });
    return res.json({ success: true, deleted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
