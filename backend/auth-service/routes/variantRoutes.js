const express = require('express');
const router = express.Router();
const ProductVariant = require('../models/product_variant');
const Product = require('../models/product');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// Admin — list ALL variants across every product (for inventory dashboard)
router.get('/all', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      include: [{ model: Product, attributes: ['id', 'name', 'slug', 'stock'] }],
      order: [
        [Product, 'name', 'ASC'],
        ['sort_order', 'ASC'],
        ['id', 'ASC']
      ]
    });
    return res.json({
      success: true,
      data: variants.map(v => ({
        ...formatVariant(v),
        product_name: v.product ? v.product.name : '',
        product_slug: v.product ? v.product.slug : '',
        product_stock: v.product ? Number(v.product.stock) : 0
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Public — list active variants for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      where: { product_id: req.params.productId, is_active: true },
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });
    return res.json({ success: true, data: variants.map(formatVariant) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin — list ALL variants (including inactive) for a product
router.get('/product/:productId/all', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      where: { product_id: req.params.productId },
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });
    return res.json({ success: true, data: variants.map(formatVariant) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin — create a single variant
router.post('/product/:productId', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { name, sku, price, compare_price, stock, low_stock_threshold, is_active, sort_order } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Variant name is required' });
    }
    const variant = await ProductVariant.create({
      product_id: req.params.productId,
      name: String(name).trim(),
      sku: sku ? String(sku).trim() : null,
      price: parseFloat(price) || 0,
      compare_price: compare_price ? parseFloat(compare_price) : null,
      stock: parseInt(stock) || 0,
      low_stock_threshold: parseInt(low_stock_threshold) || 5,
      is_active: is_active !== false && is_active !== 'false',
      sort_order: parseInt(sort_order) || 0
    });
    return res.status(201).json({ success: true, data: formatVariant(variant) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin — update a variant
router.put('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

    const { name, sku, price, compare_price, stock, low_stock_threshold, is_active, sort_order } = req.body;
    await variant.update({
      name: name !== undefined ? String(name).trim() : variant.name,
      sku: sku !== undefined ? (sku ? String(sku).trim() : null) : variant.sku,
      price: price !== undefined ? parseFloat(price) : variant.price,
      compare_price: compare_price !== undefined ? (compare_price ? parseFloat(compare_price) : null) : variant.compare_price,
      stock: stock !== undefined ? parseInt(stock) : variant.stock,
      low_stock_threshold: low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : variant.low_stock_threshold,
      is_active: is_active !== undefined ? (is_active !== false && is_active !== 'false') : variant.is_active,
      sort_order: sort_order !== undefined ? parseInt(sort_order) : variant.sort_order
    });
    return res.json({ success: true, data: formatVariant(variant) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin — delete a variant
router.delete('/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });
    await variant.destroy();
    return res.json({ success: true, message: 'Variant deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin — bulk reorder variants
router.patch('/reorder', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { orderedIds } = req.body; // array of variant IDs in desired order
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array' });
    }
    await Promise.all(orderedIds.map((id, index) =>
      ProductVariant.update({ sort_order: index }, { where: { id } })
    ));
    return res.json({ success: true, message: 'Reordered' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

function formatVariant(v) {
  return {
    id: v.id,
    product_id: v.product_id,
    name: v.name,
    sku: v.sku,
    price: parseFloat(v.price),
    compare_price: v.compare_price ? parseFloat(v.compare_price) : null,
    stock: Number(v.stock),
    low_stock_threshold: Number(v.low_stock_threshold),
    is_active: v.is_active,
    sort_order: v.sort_order,
    created_at: v.createdAt,
    updated_at: v.updatedAt
  };
}

module.exports = router;
