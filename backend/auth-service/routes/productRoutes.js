const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const Product = require('../models/product');
const Category = require('../models/category');
const Brand = require('../models/brand');
const Order = require('../models/order');
const User = require('../models/User');
const { verifyToken, verifySuperuser } = require('../middleware/auth');
const ProductVariant = require('../models/product_variant');

// Sync variants submitted with a product form — creates / updates / deletes as needed
async function syncVariants(productId, variantsData) {
  if (!Array.isArray(variantsData) || variantsData.length === 0) {
    await ProductVariant.destroy({ where: { product_id: productId } });
    return [];
  }
  const existing = await ProductVariant.findAll({ where: { product_id: productId } });
  const existingIds = new Set(existing.map(v => v.id));
  const submittedIds = new Set(variantsData.filter(v => v.id).map(v => Number(v.id)));

  const toDelete = [...existingIds].filter(id => !submittedIds.has(id));
  if (toDelete.length) await ProductVariant.destroy({ where: { id: toDelete } });

  const results = [];
  for (let i = 0; i < variantsData.length; i++) {
    const v = variantsData[i];
    if (!String(v.name || '').trim()) continue;
    const payload = {
      product_id: productId,
      name: String(v.name).trim(),
      sku: v.sku ? String(v.sku).trim() : null,
      price: parseFloat(v.price) || 0,
      compare_price: v.compare_price ? parseFloat(v.compare_price) : null,
      stock: parseInt(v.stock) || 0,
      low_stock_threshold: parseInt(v.low_stock_threshold) || 5,
      is_active: v.is_active !== false && v.is_active !== 'false',
      sort_order: v.sort_order !== undefined ? parseInt(v.sort_order) : i
    };
    if (v.id && existingIds.has(Number(v.id))) {
      await ProductVariant.update(payload, { where: { id: Number(v.id), product_id: productId } });
      results.push({ id: Number(v.id), ...payload });
    } else {
      const created = await ProductVariant.create(payload);
      results.push(created.toJSON());
    }
  }
  return results;
}

function formatVariantRow(v) {
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
    sort_order: v.sort_order
  };
}

const slugify = (value) => String(value || '')
  .toLowerCase().trim()
  .replace(/[^\w\s-]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const optionalSeoText = (value) => {
  if (value === undefined) return undefined;
  const cleaned = String(value || '').trim();
  return cleaned || null;
};

const normalizeProductImage = (firstImage) => {
  if (!firstImage) return null;
  // Cloudinary (or any absolute) URL — use as-is
  const direct = firstImage.url || firstImage.path || firstImage.secure_url;
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  if (firstImage.filename) return '/uploads/products/' + firstImage.filename;
  if (firstImage.url) {
    const url = firstImage.url;
    const cleaned = url.replace(/^\/?(assets\/)?/, '');
    if (cleaned.startsWith('uploads/')) return '/' + cleaned;
    const uploadsIdx = url.indexOf('uploads/');
    if (uploadsIdx !== -1) return '/' + url.substring(uploadsIdx);
    return url.startsWith('/') ? url : '/' + url;
  }
  return null;
};

const normalizeManagedUploadPath = (value, folderName) => {
  if (value === null || value === undefined) return null;
  const rawValue = String(value).trim();
  if (!rawValue) return null;
  if (rawValue.startsWith('/' + folderName + '/')) return '/uploads' + rawValue;
  if (rawValue.startsWith('/uploads/' + folderName + '/')) return rawValue;
  if (rawValue.startsWith('uploads/' + folderName + '/')) return '/' + rawValue;
  if (rawValue.startsWith('http')) {
    const uploadsMarker = '/uploads/' + folderName + '/';
    const uploadsIndex = rawValue.indexOf(uploadsMarker);
    if (uploadsIndex !== -1) return rawValue.substring(uploadsIndex);
    return rawValue;
  }
  const normalizedPath = rawValue.replace(/\\\\/g, '/');
  const uploadsIndex = normalizedPath.indexOf('uploads/' + folderName + '/');
  if (uploadsIndex !== -1) return '/' + normalizedPath.substring(uploadsIndex);
  const fileName = path.basename(normalizedPath);
  if (!fileName || fileName === '.' || fileName === '/') return null;
  return '/uploads/' + folderName + '/' + fileName;
};

const resolveManagedUploadFilePath = (value, folderName) => {
  const normalizedPath = normalizeManagedUploadPath(value, folderName);
  if (!normalizedPath || !normalizedPath.startsWith('/uploads/' + folderName + '/')) return null;
  const relativePath = normalizedPath.replace(/^\/+/, '');
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', relativePath);
};

const deleteManagedUploadFile = (value, folderName) => {
  try {
    const filePath = resolveManagedUploadFilePath(value, folderName);
    if (!filePath) return;
    const allowedRoot = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'uploads', folderName);
    if (!filePath.startsWith(allowedRoot)) return;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('[uploads] Failed to delete ' + folderName + ' asset:', error);
  }
};

router.get('/products', async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit) || 50;
    const limit = Math.min(rawLimit, 200); // hard cap â€” never return more than 200 at once
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      include: [
        { model: Category, attributes: ['id', 'name'], required: false },
        { model: Brand, attributes: ['id', 'name'], required: false },
        { model: ProductVariant, as: 'variants', required: false, separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      short_description: product.short_description || '',
      description: product.description,
      ingredients: product.ingredients,
      calories: product.calories,
      delivery_info: product.delivery_info,
      price: parseFloat(product.price),
      compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
      cost_price: product.cost_price ? parseFloat(product.cost_price) : 0,
      quantity: product.stock,
      stock: product.stock,
      category_id: product.category_id,
      category_name: product.category ? product.category.name : 'Uncategorized',
      brand_id: product.brand_id,
      brand_name: product.brand ? product.brand.name : '',
      images: product.images || [],
      status: product.status ? 1 : 0,
      is_featured: product.is_featured || false,
      is_published: product.is_published || false,
      track_quantity: product.track_quantity !== false,
      weight: product.weight,
      weight_unit: product.weight_unit || 'ml',
      tags: product.tags || [],
      specifications: product.specifications || {},
      dimensions: product.dimensions || {},
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      variants: Array.isArray(product.variants) ? product.variants.map(formatVariantRow) : [],
      created_at: product.createdAt,
      updated_at: product.updatedAt
    }));

    return res.status(200).json({
      message: 'Products fetched successfully',
      data: formattedProducts,
      success: true,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error during fetching products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_featured: true, status: true, is_published: true },
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, attributes: ['id', 'name'], required: false },
        { model: ProductVariant, as: 'variants', required: false, separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedProducts = products.map(product => {
      const images = product.images || [];
      const firstImage = images[0];
      let mainImage = '';
      const normalized = normalizeProductImage(firstImage);
      if (normalized) mainImage = normalized;
      let discount = 0;
      if (product.compare_price && product.compare_price > product.price) {
        discount = Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
      }
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        short_description: product.short_description || '',
        price: parseFloat(product.price),
        originalPrice: product.compare_price ? parseFloat(product.compare_price) : undefined,
        image: mainImage,
        weight: product.weight ? (String(parseFloat(product.weight)) + (product.weight_unit || 'ml')) : '',
        discount: discount > 0 ? discount : undefined,
        isFavorite: false,
        quantity: 0,
        stock: Number(product.stock ?? 0),
        variants: Array.isArray(product.variants) ? product.variants.map(formatVariantRow) : [],
        category_name: product.category ? product.category.name : 'Uncategorized',
        category_slug: product.category ? product.category.slug : ''
      };
    });

    return res.status(200).json({ success: true, message: 'Featured products fetched successfully', data: formattedProducts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Product
router.get('/products/:id', async (req, res) => {
  try {
    const productIdentifier = String(req.params.id || '').trim();
    const productLookup = /^\d+$/.test(productIdentifier)
      ? { [Op.or]: [{ id: Number(productIdentifier) }, { slug: productIdentifier }] }
      : { slug: slugify(productIdentifier) };
    const product = await Product.findOne({
      where: productLookup,
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        {
          model: Brand,
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: ProductVariant,
          as: 'variants',
          required: false,
          separate: true,
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const formattedProduct = {
      variants: Array.isArray(product.variants) ? product.variants.map(formatVariantRow) : [],
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      short_description: product.short_description,
      description: product.description,
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      ingredients: product.ingredients,
      calories: product.calories,
      delivery_info: product.delivery_info,
      price: parseFloat(product.price),
      quantity: product.stock,
      stock: product.stock,
      category_id: product.category_id,
      category: product.category ? product.category.name : 'Uncategorized',
      category_slug: product.category ? product.category.slug : '',
      category_name: product.category ? product.category.name : 'Uncategorized',
      brand_id: product.brand_id,
      images: product.images || [],
      status: product.status ? 1 : 0,
      is_featured: product.is_featured || false,
      is_published: product.is_published || false,
      track_quantity: product.track_quantity !== false,
      weight: product.weight,
      weight_unit: product.weight_unit || 'ml',
      compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
      tags: product.tags || [],
      specifications: product.specifications || {},
      dimensions: product.dimensions || {},
      created_at: product.createdAt,
      updated_at: product.updatedAt
    };

    return res.status(200).json({
      message: 'Product found successfully',
      data: formattedProduct,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching product:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
// Product images → Cloudinary (req.files[].path = secure URL)
const { makeUpload } = require('../config/cloudinary');
const uploadProduct = makeUpload('products');

router.post('/products', verifyToken, verifySuperuser, uploadProduct.array('images'), async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('Uploaded files:', req.files);

    const {
      name,
      sku,
      description,
      short_description,
      price,
      cost_price,
      compare_price,
      quantity,
      category_id,
      product_type_id,
      brand_id,
      status = 1,
      existing_images = '[]',
      slug,
      is_featured = false,
      is_published = true,
      track_quantity = true,
      weight = 0,
      tags = '[]',
      seo_title = '',
      seo_description = '',
      specifications = '{}',
      dimensions = '{}',
      ingredients = '',
      calories = '',
      delivery_info = '',
      variants: variantsRaw = '[]'
    } = req.body;

    // Parse JSON fields
    let existingImages = [];
    let tagsArray = [];
    let specificationsObj = {};
    let dimensionsObj = {};
    let variantsData = [];

    try {
      existingImages = JSON.parse(existing_images);
      tagsArray = JSON.parse(tags);
      specificationsObj = JSON.parse(specifications);
      dimensionsObj = JSON.parse(dimensions);
      variantsData = JSON.parse(variantsRaw);
      if (!Array.isArray(variantsData)) variantsData = [];
    } catch (e) {
      existingImages = [];
      tagsArray = [];
      specificationsObj = {};
      dimensionsObj = {};
      variantsData = [];
    }

    // Check if product with same SKU already exists
    if (sku) {
      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    // Check if slug already exists
    if (slug) {
      const existingProduct = await Product.findOne({ where: { slug } });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this slug already exists'
        });
      }
    }

    // Check if category exists
    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Check if brand exists
    if (brand_id) {
      const brand = await Brand.findByPk(brand_id);
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Brand not found'
        });
      }
    }

    // Check if brand exists
    if (product_type_id) {
      const productType = await ProductType.findByPk(product_type_id);
      if (!productType) {
        return res.status(400).json({
          success: false,
          message: 'Product type not found'
        });
      }
    }

    // Main product stock must be at least the sum of its variant stocks.
    // Auto-raise it to the variant total instead of rejecting.
    let effectiveStock = parseInt(quantity) || 0;
    if (Array.isArray(variantsData) && variantsData.length > 0) {
      const totalVariantStock = variantsData
        .filter(v => String(v.name || '').trim() !== '')
        .reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      if (totalVariantStock > effectiveStock) {
        effectiveStock = totalVariantStock;
      }
    }

    // Process uploaded images
    const uploadedImages = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      url: file.path,        // Cloudinary secure URL (used by the frontend as-is)
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Combine existing and new images
    const allImages = [...existingImages, ...uploadedImages];

    const product = await Product.create({
      name,
      slug: slug || `product-${Date.now()}`,
      sku: sku || `SKU-${Date.now()}`,
      short_description: short_description || '',
      description,
      price: parseFloat(price) || 0,
      compare_price: compare_price ? parseFloat(compare_price) : null,
      cost_price: cost_price !== undefined && cost_price !== null && cost_price !== '' ? parseFloat(cost_price) : 0,
      stock: effectiveStock,
      category_id: category_id || null,
      product_type_id: product_type_id || null,
      brand_id: brand_id || null,
      images: allImages,
      status: Boolean(status),
      is_featured: is_featured === true || is_featured === 'true',
      is_published: is_published === true || is_published === 'true',
      track_quantity: track_quantity === true || track_quantity === 'true',
      weight: weight ? parseFloat(weight) : null,
      tags: tagsArray,
      specifications: specificationsObj,
      dimensions: dimensionsObj,
      seo_title: optionalSeoText(seo_title),
      seo_description: optionalSeoText(seo_description),
      ingredients: ingredients || '',
      calories: calories || '',
      delivery_info: delivery_info || ''
    });

    // Sync variants submitted with the form
    const savedVariants = await syncVariants(product.id, variantsData);

    // Fetch the created product with category info
    const createdProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category, attributes: ['id', 'name'], required: false },
        { model: Brand, attributes: ['id', 'name'], required: false }
      ]
    });

    const formattedProduct = {
      id: createdProduct.id,
      name: createdProduct.name,
      slug: createdProduct.slug,
      sku: createdProduct.sku,
      short_description: createdProduct.short_description,
      description: createdProduct.description,
      price: parseFloat(createdProduct.price),
      compare_price: createdProduct.compare_price ? parseFloat(createdProduct.compare_price) : null,
      cost_price: createdProduct.cost_price ? parseFloat(createdProduct.cost_price) : 0,
      quantity: createdProduct.stock,
      category_id: createdProduct.category_id,
      category_name: createdProduct.category ? createdProduct.category.name : 'Uncategorized',
      product_type_id: createdProduct.product_type_id,
      product_type_name: createdProduct.product_type ? createdProduct.product_type.name : 'No Product Type',
      brand_id: createdProduct.brand_id,

      brand_name: createdProduct.brand ? createdProduct.brand.name : 'No Brand',
      images: createdProduct.images || [],
      status: createdProduct.status ? 1 : 0,
      is_featured: createdProduct.is_featured,
      is_published: createdProduct.is_published,
      track_quantity: createdProduct.track_quantity,
      weight: createdProduct.weight,
      tags: createdProduct.tags || [],
      specifications: createdProduct.specifications || {},
      dimensions: createdProduct.dimensions || {},
      seo_title: createdProduct.seo_title,
      seo_description: createdProduct.seo_description,
      ingredients: createdProduct.ingredients,
      calories: createdProduct.calories,
      delivery_info: createdProduct.delivery_info,
      variants: savedVariants.map(formatVariantRow),
      created_at: createdProduct.createdAt,
      updated_at: createdProduct.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: formattedProduct
    });

  } catch (error) {
    console.error('Error during product creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});


// Update Product with file uploads
router.put('/products/:id', verifyToken, verifySuperuser, uploadProduct.array('images'), async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('Uploaded files:', req.files);

    const productId = req.params.id;
    const {
      name,
      slug,
      sku,
      description,
      short_description,
      price,
      cost_price,
      compare_price,
      quantity,
      category_id,
      product_type_id,
      brand_id,
      status,
      existing_images = '[]',
      deleted_images = '[]',
      is_featured,
      is_published,
      track_quantity,
      weight,
      weight_unit,
      tags = '[]',
      seo_title,
      seo_description,
      specifications = '{}',
      dimensions = '{}',
      ingredients,
      calories,
      delivery_info,
      variants: variantsRawPut = '[]'
    } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if SKU already exists (excluding current product)
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({
        where: { sku }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    // Check if slug already exists (excluding current product)
    if (slug && slug !== product.slug) {
      const existingProduct = await Product.findOne({
        where: { slug }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this slug already exists'
        });
      }
    }

    // Check if category exists
    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Check if brand exists
    if (brand_id) {
      const brand = await Brand.findByPk(brand_id);
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Brand not found'
        });
      }
    }
    // Check if product type exists
    if (product_type_id) {
      const productType = await ProductType.findByPk(product_type_id);
      if (!productType) {
        return res.status(400).json({
          success: false,
          message: 'Product type not found'
        });
      }
    }

    // Parse existing and deleted images and other JSON fields
    let existingImages = [];
    let deletedImages = [];
    let tagsArray = [];
    let specificationsObj = {};
    let dimensionsObj = {};
    let variantsDataPut = [];

    try {
      existingImages = JSON.parse(existing_images);
      deletedImages = JSON.parse(deleted_images);
      tagsArray = JSON.parse(tags);
      specificationsObj = JSON.parse(specifications);
      dimensionsObj = JSON.parse(dimensions);
      variantsDataPut = JSON.parse(variantsRawPut);
      if (!Array.isArray(variantsDataPut)) variantsDataPut = [];
    } catch (e) {
      existingImages = product.images || [];
      deletedImages = [];
      tagsArray = product.tags || [];
      specificationsObj = product.specifications || {};
      dimensionsObj = product.dimensions || {};
      variantsDataPut = [];
    }

    // Main product stock must be at least the sum of its variant stocks.
    // Auto-raise it to the variant total instead of rejecting — otherwise an
    // admin can be permanently locked out of editing a product whose main stock
    // has drifted below the variant total (e.g. sales decremented main stock).
    let effectiveStockPut = quantity !== undefined ? parseInt(quantity) : product.stock;
    if (Array.isArray(variantsDataPut) && variantsDataPut.length > 0) {
      const totalVariantStockPut = variantsDataPut
        .filter(v => String(v.name || '').trim() !== '')
        .reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      if (totalVariantStockPut > effectiveStockPut) {
        effectiveStockPut = totalVariantStockPut;
      }
    }

    // Process uploaded images
    const uploadedImages = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      url: file.path,        // Cloudinary secure URL (used by the frontend as-is)
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Filter out deleted images and add new ones
    const updatedImages = existingImages
      .filter(img => !deletedImages.includes(img.filename))
      .concat(uploadedImages);

    await product.update({
      name: name || product.name,
      slug: slug || product.slug,
      sku: sku || product.sku,
      short_description: short_description !== undefined ? short_description : product.short_description,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? parseFloat(price) : product.price,
      compare_price: compare_price !== undefined ? parseFloat(compare_price) : product.compare_price,
      cost_price: cost_price !== undefined ? parseFloat(cost_price) : product.cost_price,
      stock: effectiveStockPut,
      category_id: category_id !== undefined ? category_id : product.category_id,
      product_type_id: product_type_id !== undefined ? product_type_id : product.product_type_id,
      brand_id: brand_id !== undefined ? brand_id : product.brand_id,
      images: updatedImages,
      status: status !== undefined ? (status === true || status === 'true' || status === 1 || status === '1') : product.status,
      is_featured: is_featured !== undefined ? (is_featured === true || is_featured === 'true') : product.is_featured,
      is_published: is_published !== undefined ? (is_published === true || is_published === 'true') : product.is_published,
      track_quantity: track_quantity !== undefined ? (track_quantity === true || track_quantity === 'true') : product.track_quantity,
      weight: weight !== undefined ? parseFloat(weight) : product.weight,
      weight_unit: weight_unit || product.weight_unit || 'ml',
      tags: tagsArray,
      specifications: specificationsObj,
      dimensions: dimensionsObj,
      seo_title: seo_title !== undefined ? optionalSeoText(seo_title) : product.seo_title,
      seo_description: seo_description !== undefined ? optionalSeoText(seo_description) : product.seo_description,
      ingredients: ingredients !== undefined ? ingredients : product.ingredients,
      calories: calories !== undefined ? calories : product.calories,
      delivery_info: delivery_info !== undefined ? delivery_info : product.delivery_info
    });

    // Sync variants submitted with the update form
    const updatedVariants = await syncVariants(productId, variantsDataPut);

    // Fetch the updated product with category info
    const updatedProduct = await Product.findByPk(productId, {
      include: [
        { model: Category, attributes: ['id', 'name'], required: false },
        { model: Brand, attributes: ['id', 'name'], required: false }
      ]
    });

    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      slug: updatedProduct.slug,
      sku: updatedProduct.sku,
      short_description: updatedProduct.short_description,
      description: updatedProduct.description,
      price: parseFloat(updatedProduct.price),
      compare_price: updatedProduct.compare_price ? parseFloat(updatedProduct.compare_price) : null,
      cost_price: updatedProduct.cost_price ? parseFloat(updatedProduct.cost_price) : 0,
      quantity: updatedProduct.stock,
      category_id: updatedProduct.category_id,
      category_name: updatedProduct.category ? updatedProduct.category.name : 'Uncategorized',
      product_type_id: updatedProduct.product_type_id,
      product_type_name: updatedProduct.product_type ? updatedProduct.product_type.name : 'No Product Type',

      brand_id: updatedProduct.brand_id,
      brand_name: updatedProduct.brand ? updatedProduct.brand.name : 'No Brand',
      images: updatedProduct.images || [],
      status: updatedProduct.status ? 1 : 0,
      is_featured: updatedProduct.is_featured,
      is_published: updatedProduct.is_published,
      track_quantity: updatedProduct.track_quantity,
      weight: updatedProduct.weight,
      tags: updatedProduct.tags || [],
      specifications: updatedProduct.specifications || {},
      dimensions: updatedProduct.dimensions || {},
      seo_title: updatedProduct.seo_title,
      seo_description: updatedProduct.seo_description,
      ingredients: updatedProduct.ingredients,
      calories: updatedProduct.calories,
      delivery_info: updatedProduct.delivery_info,
      variants: updatedVariants.map(formatVariantRow),
      created_at: updatedProduct.createdAt,
      updated_at: updatedProduct.updatedAt
    };

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: formattedProduct
    });

  } catch (error) {
    console.error('Error during product update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Quick partial update for lightweight inline edits (e.g., price)
router.patch('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      price,
      compare_price,
      cost_price,
      quantity,
      stock,
      status,
      is_featured,
      is_published,
      track_quantity
    } = req.body || {};

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updates = {};

    if (price !== undefined) updates.price = parseFloat(price);
    if (compare_price !== undefined) updates.compare_price = parseFloat(compare_price);
    if (cost_price !== undefined) updates.cost_price = parseFloat(cost_price);

    // Support both "quantity" and "stock" from client payloads
    if (quantity !== undefined) updates.stock = parseInt(quantity, 10);
    if (stock !== undefined) updates.stock = parseInt(stock, 10);

    if (status !== undefined) {
      updates.status = (status === true || status === 'true' || status === 1 || status === '1');
    }
    if (is_featured !== undefined) {
      updates.is_featured = (is_featured === true || is_featured === 'true' || is_featured === 1 || is_featured === '1');
    }
    if (is_published !== undefined) {
      updates.is_published = (is_published === true || is_published === 'true' || is_published === 1 || is_published === '1');
    }
    if (track_quantity !== undefined) {
      updates.track_quantity = (track_quantity === true || track_quantity === 'true' || track_quantity === 1 || track_quantity === '1');
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    await product.update(updates);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        id: product.id,
        price: parseFloat(product.price),
        compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
        cost_price: product.cost_price ? parseFloat(product.cost_price) : 0,
        quantity: Number(product.stock ?? 0),
        status: product.status ? 1 : 0,
        is_featured: !!product.is_featured,
        is_published: !!product.is_published,
        track_quantity: !!product.track_quantity
      }
    });
  } catch (error) {
    console.error('Error during quick product update:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error, please try again later.',
      error: error.message
    });
  }
});
// Add Product
// router.post('/products', async (req, res) => {
//   try {
//     console.log('req.body:', req.body);

//     const { 
//       name, 
//       sku, 
//       description, 
//       price, 
//       cost_price, 
//       quantity, 
//       category_id, 
//       status = 1,
//       images = [] 
//     } = req.body;

//     // Check if product with same SKU already exists
//     if (sku) {
//       const existingProduct = await Product.findOne({ where: { sku } });
//       if (existingProduct) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Product with this SKU already exists' 
//         });
//       }
//     }

//     // Check if category exists
//     if (category_id) {
//       const category = await Category.findByPk(category_id);
//       if (!category) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Category not found' 
//         });
//       }
//     }

//     const product = await Product.create({
//       name,
//       sku: sku || `SKU-${Date.now()}`,
//       description,
//       price: parseFloat(price) || 0,
//       cost_price: cost_price ? parseFloat(cost_price) : null,
//       stock: parseInt(quantity) || 0,
//       category_id: category_id || null,
//       images: Array.isArray(images) ? images : [],
//       status: status === 1 || status === true
//     });

//     // Fetch the created product with category info
//     const createdProduct = await Product.findByPk(product.id, {
//       include: [
//         {
//           model: Category,
//           attributes: ['id', 'name'],
//           required: false
//         }
//       ]
//     });

//     const formattedProduct = {
//       id: createdProduct.id,
//       name: createdProduct.name,
//       sku: createdProduct.sku,
//       description: createdProduct.description,
//       price: parseFloat(createdProduct.price),
//       cost_price: createdProduct.cost_price ? parseFloat(createdProduct.cost_price) : 0,
//       quantity: createdProduct.stock,
//       category_id: createdProduct.category_id,
//       category_name: createdProduct.category ? createdProduct.category.name : 'Uncategorized',
//       images: createdProduct.images || [],
//       status: createdProduct.status ? 1 : 0,
//       created_at: createdProduct.createdAt,
//       updated_at: createdProduct.updatedAt
//     };

//     return res.status(201).json({
//       success: true,
//       message: 'Product created successfully',
//       data: formattedProduct
//     });

//   } catch (error) {
//     console.error('Error during product creation:', error);
//     return res.status(500).json({ 
//       message: 'Server error, please try again later.', 
//       success: false, 
//       error: error.message 
//     });
//   }
// });

// // Update Product
// router.put('/products/:id', async (req, res) => {
//   try {
//     console.log('req.body:', req.body);

//     const productId = req.params.id;
//     const { 
//       name, 
//       sku, 
//       description, 
//       price, 
//       cost_price, 
//       quantity, 
//       category_id, 
//       status,
//       images 
//     } = req.body;

//     const product = await Product.findByPk(productId);
//     if (!product) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Product not found' 
//       });
//     }

//     // Check if SKU already exists (excluding current product)
//     if (sku && sku !== product.sku) {
//       const existingProduct = await Product.findOne({ 
//         where: { sku } 
//       });
//       if (existingProduct) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Product with this SKU already exists' 
//         });
//       }
//     }

//     // Check if category exists
//     if (category_id) {
//       const category = await Category.findByPk(category_id);
//       if (!category) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Category not found' 
//         });
//       }
//     }

//     await product.update({
//       name: name || product.name,
//       sku: sku || product.sku,
//       description: description !== undefined ? description : product.description,
//       price: price !== undefined ? parseFloat(price) : product.price,
//       cost_price: cost_price !== undefined ? parseFloat(cost_price) : product.cost_price,
//       stock: quantity !== undefined ? parseInt(quantity) : product.stock,
//       category_id: category_id !== undefined ? category_id : product.category_id,
//       images: images !== undefined ? images : product.images,
//       status: status !== undefined ? (status === 1 || status === true) : product.status
//     });

//     // Fetch the updated product with category info
//     const updatedProduct = await Product.findByPk(productId, {
//       include: [
//         {
//           model: Category,
//           attributes: ['id', 'name'],
//           required: false
//         }
//       ]
//     });

//     const formattedProduct = {
//       id: updatedProduct.id,
//       name: updatedProduct.name,
//       sku: updatedProduct.sku,
//       description: updatedProduct.description,
//       price: parseFloat(updatedProduct.price),
//       cost_price: updatedProduct.cost_price ? parseFloat(updatedProduct.cost_price) : 0,
//       quantity: updatedProduct.stock,
//       category_id: updatedProduct.category_id,
//       category_name: updatedProduct.category ? updatedProduct.category.name : 'Uncategorized',
//       images: updatedProduct.images || [],
//       status: updatedProduct.status ? 1 : 0,
//       created_at: updatedProduct.createdAt,
//       updated_at: updatedProduct.updatedAt
//     };

//     return res.status(200).json({
//       success: true,
//       message: 'Product updated successfully',
//       data: formattedProduct
//     });

//   } catch (error) {
//     console.error('Error during product update:', error);
//     return res.status(500).json({ 
//       message: 'Server error, please try again later.', 
//       success: false, 
//       error: error.message 
//     });
//   }
// });

// Delete Product
router.delete('/products/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.destroy();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error during product deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete Products
router.post('/products/delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    const result = await Product.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} products deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk product deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update Product Stock
router.patch('/products/:id/stock', async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, action = 'set' } = req.body; // action: 'set', 'add', 'subtract'

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let newStock = product.stock;

    switch (action) {
      case 'add':
        newStock += parseInt(quantity);
        break;
      case 'subtract':
        newStock = Math.max(0, newStock - parseInt(quantity));
        break;
      case 'set':
      default:
        newStock = parseInt(quantity);
        break;
    }

    await product.update({ stock: newStock });

    return res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      data: { stock: newStock }
    });

  } catch (error) {
    console.error('Error during stock update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
// Admin Dashboard Statistics
router.get("/dashboard/stats", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Total sales
    const totalSales = await Order.sum('final_amount', {
      where: { payment_status: 'paid' }
    });

    // Today's sales
    const todaySales = await Order.sum('final_amount', {
      where: {
        payment_status: 'paid',
        createdAt: { [Op.gte]: startOfToday }
      }
    });

    // Monthly sales
    const monthlySales = await Order.sum('final_amount', {
      where: {
        payment_status: 'paid',
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    // Total orders
    const totalOrders = await Order.count();

    // Today's orders
    const todayOrders = await Order.count({
      where: { createdAt: { [Op.gte]: startOfToday } }
    });

    // Total customers
    const totalCustomers = await User.count();

    // Total inventory units across all products
    const totalStock = await Product.sum('stock');
    const totalProducts = await Product.count();

    // Low stock products
    const lowStockProducts = await Product.count({
      where: { stock: { [Op.lt]: 10 } }
    });
    console.log("lowStockProducts", lowStockProducts);
    // Recent orders
    const recentOrders = await Order.findAll({
      // include: [{
      //   model: User,
      //   attributes: ['id', 'name', 'email']
      // }],
      order: [['createdAt', 'DESC']],
      limit: 3
    });

    // Sales chart data (last 7 days)
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const daySales = await Order.sum('final_amount', {
        where: {
          payment_status: 'paid',
          createdAt: { [Op.between]: [startOfDay, endOfDay] }
        }
      });

      salesData.push({
        date: startOfDay.toISOString().split('T')[0],
        sales: daySales || 0
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalSales: totalSales || 0,
          todaySales: todaySales || 0,
          monthlySales: monthlySales || 0,
          totalOrders,
          todayOrders,
          totalCustomers,
          totalStock: Number(totalStock || 0),
          totalProducts,
          lowStockProducts
        },
        recentOrders,
        salesChart: salesData
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});











router.get('/for-combo', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { status: true },
      attributes: ['id', 'name', 'price', 'images', 'stock', 'category_id'],
      include: [{ model: Category, attributes: ['id', 'name', 'parent_id'], required: false }],
      order: [['name', 'ASC']]
    });

    const categories = await Category.findAll({
      where: { status: true },
      attributes: ['id', 'name', 'parent_id'],
      order: [['name', 'ASC']]
    });

    const normalizedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images,
      stock: product.stock,
      category_id: product.category_id,
      category_parent_id: product.Category?.parent_id ?? null,
      category_name: product.Category?.name || ''
    }));

    return res.status(200).json({
      message: 'Products fetched successfully',
      data: normalizedProducts,
      categories,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        status: true,
        is_published: true
      },
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        {
          model: Brand,
          attributes: ['id', 'name'],
          required: false
        },
        { model: ProductVariant, as: 'variants', required: false, separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const formattedProducts = products.map(product => {
      // Get first image or default image
      const images = product.images || [];
      const firstImage = images[0];
      let mainImage = '';
      const normalized = normalizeProductImage(firstImage);
      if (normalized) mainImage = normalized;

      // Calculate discount percentage if compare_price exists
      let discount = 0;
      if (product.compare_price && product.compare_price > product.price) {
        discount = Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        short_description: product.short_description || '',
        price: parseFloat(product.price),
        originalPrice: product.compare_price ? parseFloat(product.compare_price) : undefined,
        image: mainImage,
        weight: product.weight ? (String(parseFloat(product.weight)) + (product.weight_unit || 'ml')) : '',
        discount: discount > 0 ? discount : undefined,
        isFavorite: false,
        quantity: 0,
        stock: Number(product.stock ?? 0),
        variants: Array.isArray(product.variants) ? product.variants.map(formatVariantRow) : [],
        category_name: product.category ? product.category.name : 'Uncategorized',
        category_slug: product.category ? product.category.slug : ''
      };
    });

    return res.status(200).json({
      message: 'Popular products fetched successfully',
      data: formattedProducts,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching popular products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get categories with product counts
router.get('/with-counts', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        status: true
      },
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });

    const formattedCategories = await Promise.all(categories.map(async category => {
      let categoryIds = [category.id];

      if (!category.parent_id) {
        const subcategories = await Category.findAll({
          where: {
            parent_id: category.id,
            status: true
          },
          attributes: ['id']
        });
        categoryIds = [category.id, ...subcategories.map(sub => sub.id)];
      }

      const productCount = await Product.count({
        where: {
          category_id: categoryIds,
          status: true,
          is_published: true
        }
      });

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image_url || '',
        count: productCount,
        link: `/shop-category/${category.slug || category.id}`
      };
    }));

    return res.status(200).json({
      message: 'Categories with counts fetched successfully',
      data: formattedCategories,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching categories with counts:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get special products â€” only featured products
router.get('/special', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        status: true,
        is_published: true,
        is_featured: true
      },
      include: [
        {
          model: Category,
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Brand,
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 8 // You can adjust the limit as needed
    });

    const formattedProducts = products.map(product => {
      // Get first image or default image
      const images = product.images || [];
      const firstImage = images[0];
      let mainImage = '';
      const normalized = normalizeProductImage(firstImage);
      if (normalized) mainImage = normalized;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        short_description: product.short_description || '',
        price: parseFloat(product.price),
        image: mainImage,
        weight: product.weight ? (String(parseFloat(product.weight)) + (product.weight_unit || 'ml')) : '',
        isFavorite: false, // You can implement favorite logic separately
        quantity: 0,
        stock: Number(product.stock ?? 0),
        category_name: product.category ? product.category.name : 'Uncategorized',
        category_slug: product.category ? product.category.slug : ''
      };
    });

    return res.status(200).json({
      message: 'Special products fetched successfully',
      data: formattedProducts,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching special products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
router.get('/products/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      page = 1,
      limit = 12,
      sort = 'relevance',
      minPrice,
      maxPrice,
      brands,
      diets,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    let whereCondition = {
      status: true,
      is_published: true
    };

    // Add category filter
    if (categoryId && categoryId !== 'all') {
      whereCondition.category_id = categoryId;
    }

    // Add price filter
    if (minPrice || maxPrice) {
      whereCondition.price = {};
      if (minPrice) whereCondition.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereCondition.price[Op.lte] = parseFloat(maxPrice);
    }

    // Add brand filter
    if (brands) {
      const brandList = Array.isArray(brands) ? brands : [brands];
      whereCondition.brand_id = { [Op.in]: brandList };
    }

    // Sorting
    let order = [];
    switch (sort) {
      case 'price_asc':
        order = [['price', 'ASC']];
        break;
      case 'price_desc':
        order = [['price', 'DESC']];
        break;
      case 'newest':
        order = [['createdAt', 'DESC']];
        break;
      case 'popular':
        order = [['rating', 'DESC']];
        break;
      default:
        order = [['createdAt', 'DESC']];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        {
          model: Brand,
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: ProductVariant,
          as: 'variants',
          required: false,
          separate: true,
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        }
      ],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      message: 'Products fetched successfully',
      data: products,
      total: count,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching category products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
router.get('/categoryproducts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'relevance',
      category_id,
      minPrice,
      maxPrice,
      brands,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    let whereCondition = {};

    // Add category filter — matches primary category_id OR multi-category JSONB array
    if (category_id) {
      const subcategories = await Category.findAll({
        where: { parent_id: category_id },
        attributes: ['id']
      });
      const subcategoryIds = subcategories.map(sub => sub.id);
      const allCategoryIds = [parseInt(category_id), ...subcategoryIds];

      const cat = await Category.findByPk(parseInt(category_id), { attributes: ['id', 'slug'] });
      const catSlug = cat ? cat.slug : null;

      if (catSlug) {
        whereCondition[Op.or] = [
          { category_id: allCategoryIds },
          Product.sequelize.literal(`specifications->'categories' @> '["${catSlug}"]'::jsonb`)
        ];
      } else {
        whereCondition.category_id = allCategoryIds;
      }
    }

    // Add search filter
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { short_description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Add price filter
    if (minPrice || maxPrice) {
      whereCondition.price = {};
      if (minPrice) whereCondition.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereCondition.price[Op.lte] = parseFloat(maxPrice);
    }

    // Sorting
    let order = [];
    switch (sort) {
      case 'price_asc':
        order = [['price', 'ASC']];
        break;
      case 'price_desc':
        order = [['price', 'DESC']];
        break;
      case 'newest':
        order = [['createdAt', 'DESC']];
        break;
      case 'popular':
        order = [['rating', 'DESC']];
        break;
      default:
        order = [['createdAt', 'DESC']];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        {
          model: Brand,
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: ProductVariant,
          as: 'variants',
          required: false,
          separate: true,
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        }
      ],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      message: 'Products fetched successfully',
      data: products,
      total: count,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching products:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
