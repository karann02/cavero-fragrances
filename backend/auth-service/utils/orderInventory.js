const Product = require('../models/product');
const ProductVariant = require('../models/product_variant');

function createInventoryError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeOrderItems(items) {
  const normalizedItems = Array.isArray(items) ? items : [];

  if (!normalizedItems.length) {
    throw createInventoryError('Order items are required');
  }

  return normalizedItems.map((item) => {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const totalPriceRaw = item.total_price ?? item.total ?? (price * quantity);
    const totalPrice = Number(totalPriceRaw);

    if (!Number.isFinite(productId) || productId <= 0) {
      console.error('❌ [INVENTORY] Invalid product_id in order items:', item);
      throw createInventoryError('Invalid product_id in order items');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      console.error('❌ [INVENTORY] Invalid quantity in order items:', item);
      throw createInventoryError('Invalid quantity in order items');
    }
    if (!Number.isFinite(price) || price < 0) {
      console.error('❌ [INVENTORY] Invalid price in order items:', item);
      throw createInventoryError('Invalid price in order items');
    }
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      console.error('❌ [INVENTORY] Invalid total in order items:', item);
      throw createInventoryError('Invalid total in order items');
    }

    const selected_size = item.selected_size ? String(item.selected_size).trim() : null;
    const variant_id = item.variant_id ? Number(item.variant_id) : null;
    const combo_id = item.combo_id ? Number(item.combo_id) : null;

    return {
      product_id: productId,
      quantity,
      price,
      total_price: totalPrice,
      selected_size: selected_size || null,
      variant_id: variant_id || null,
      combo_id: combo_id || null
    };
  });
}

// Recompute item prices from the DB so the server never trusts client-sent prices
// (prevents price tampering). Combo items keep their server-allocated price — combo
// pricing logic is left untouched. Returns priced items + the trusted subtotal.
async function priceOrderItemsFromDb(orderItems, { transaction } = {}) {
  const normalized = normalizeOrderItems(orderItems);
  const productMap = await loadProductsForItems(normalized, transaction);

  const variantIds = Array.from(new Set(
    normalized.map((i) => i.variant_id).filter((id) => Number.isFinite(id) && id > 0)
  ));
  const variantMap = new Map();
  if (variantIds.length) {
    const opts = { where: { id: variantIds } };
    if (transaction) opts.transaction = transaction;
    const variants = await ProductVariant.findAll(opts);
    variants.forEach((v) => variantMap.set(Number(v.id), v));
  }

  let subtotal = 0;
  const items = normalized.map((item) => {
    // Combo line — keep its allocated price (combo discount logic unchanged).
    if (item.combo_id) {
      subtotal += Number(item.total_price) || 0;
      return item;
    }
    const product = productMap.get(Number(item.product_id));
    let unit;
    if (item.variant_id && variantMap.has(Number(item.variant_id))) {
      unit = Number(variantMap.get(Number(item.variant_id)).price);
    } else {
      unit = Number(product?.price);
    }
    if (!Number.isFinite(unit) || unit < 0) unit = 0;
    const total_price = Number((unit * item.quantity).toFixed(2));
    subtotal += total_price;
    return { ...item, price: unit, total_price };
  });

  return { items, subtotal: Number(subtotal.toFixed(2)) };
}

async function loadProductsForItems(orderItems, transaction, options = {}) {
  const uniqueProductIds = Array.from(new Set(
    (orderItems || [])
      .map((item) => Number(item.product_id))
      .filter((productId) => Number.isFinite(productId) && productId > 0)
  ));

  if (!uniqueProductIds.length) {
    return new Map();
  }

  const queryOptions = {
    where: { id: uniqueProductIds },
    transaction
  };

  if (transaction) {
    queryOptions.lock = transaction.LOCK.UPDATE;
  }

  const products = await Product.findAll(queryOptions);
  const productMap = new Map(products.map((product) => [Number(product.id), product]));

  if (!options.allowMissing && productMap.size !== uniqueProductIds.length) {
    const missingIds = uniqueProductIds.filter(id => !productMap.has(id));
    console.error(`❌ [INVENTORY] Missing product IDs: ${missingIds}`);
    throw createInventoryError('One or more selected products were not found.');
  }

  return productMap;
}

function aggregateTrackedQuantities(orderItems, productMap, options = {}) {
  const requestedByProductId = new Map();

  for (const item of orderItems || []) {
    const productId = Number(item.product_id);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const product = productMap.get(productId);

    if (!product) {
      if (options.allowMissingProducts) {
        console.warn(`⚠️  [INVENTORY] Product ${productId} not found (allowed in restore mode)`);
        continue;
      }
      throw createInventoryError('One or more selected products were not found.');
    }

    if (product.track_quantity === false) {
      continue;
    }

    requestedByProductId.set(productId, (requestedByProductId.get(productId) || 0) + quantity);
  }

  return requestedByProductId;
}

async function reserveInventoryForOrderItems(orderItems, { transaction } = {}) {
  const normalizedItems = normalizeOrderItems(orderItems);

  const productMap = await loadProductsForItems(normalizedItems, transaction);
  const requestedByProductId = aggregateTrackedQuantities(normalizedItems, productMap);

  for (const [productId, requestedQty] of requestedByProductId.entries()) {
    const product = productMap.get(productId);
    const currentStock = Math.max(0, Number(product?.stock ?? 0));

    if (currentStock <= 0) {
      throw createInventoryError(`${product.name} is currently out of stock.`);
    }

    if (requestedQty > currentStock) {
      throw createInventoryError(`Only ${currentStock} left in stock for ${product.name}.`);
    }
  }

  for (const [productId, requestedQty] of requestedByProductId.entries()) {
    const product = productMap.get(productId);
    const currentStock = Math.max(0, Number(product?.stock ?? 0));
    const newStock = currentStock - requestedQty;
    await product.update({ stock: newStock }, { transaction });
  }

  // Decrement per-variant stock from product_variants table (new approach)
  for (const item of normalizedItems) {
    if (!item.variant_id) continue;
    const queryOptions = { where: { id: item.variant_id } };
    if (transaction) {
      queryOptions.transaction = transaction;
      queryOptions.lock = transaction.LOCK.UPDATE;
    }
    const variant = await ProductVariant.findOne(queryOptions);
    if (!variant) {
      console.warn(`⚠️  [VARIANT] variant_id ${item.variant_id} not found — skipping variant stock decrement`);
      continue;
    }
    const currentVariantStock = Math.max(0, Number(variant.stock ?? 0));
    if (currentVariantStock < item.quantity) {
      throw createInventoryError(`Only ${currentVariantStock} left in stock for the selected size (${variant.name}).`);
    }
    const newVariantStock = currentVariantStock - item.quantity;
    await variant.update({ stock: newVariantStock }, { transaction });
  }

  // Backward compat: decrement JSONB sizes for items using selected_size without variant_id
  for (const item of normalizedItems) {
    if (!item.selected_size || item.variant_id) continue;
    const product = productMap.get(Number(item.product_id));
    if (!product) continue;
    const specs = product.specifications ? { ...product.specifications } : {};
    const sizes = Array.isArray(specs.sizes) ? specs.sizes.map((s) => ({ ...s })) : [];
    const variantIndex = sizes.findIndex(
      (s) => String(s.label).trim().toLowerCase() === String(item.selected_size).trim().toLowerCase()
    );
    if (variantIndex === -1) continue;
    const currentVariantStock = Math.max(0, Number(sizes[variantIndex].stock ?? 0));
    sizes[variantIndex].stock = Math.max(0, currentVariantStock - item.quantity);
    specs.sizes = sizes;
    await product.update({ specifications: specs }, { transaction });
  }

  return normalizedItems;
}

async function restoreInventoryForOrderItems(orderItems, { transaction } = {}) {
  const normalizedItems = normalizeOrderItems(orderItems);
  const productMap = await loadProductsForItems(normalizedItems, transaction, { allowMissing: true });
  const requestedByProductId = aggregateTrackedQuantities(normalizedItems, productMap, { allowMissingProducts: true });

  // restore product-level stock
  for (const [productId, requestedQty] of requestedByProductId.entries()) {
    const product = productMap.get(productId);
    if (!product) continue;
    const currentStock = Math.max(0, Number(product?.stock ?? 0));
    await product.update({ stock: currentStock + requestedQty }, { transaction });
  }

  // restore per-variant stock (mirrors the decrement in reserveInventoryForOrderItems)
  for (const item of normalizedItems) {
    if (!item.variant_id) continue;
    const opts = { where: { id: item.variant_id } };
    if (transaction) { opts.transaction = transaction; opts.lock = transaction.LOCK.UPDATE; }
    const variant = await ProductVariant.findOne(opts);
    if (!variant) continue;
    const currentVariantStock = Math.max(0, Number(variant.stock ?? 0));
    await variant.update({ stock: currentVariantStock + Number(item.quantity || 0) }, { transaction });
  }

  // restore JSONB-size stock for legacy items (selected_size without variant_id)
  for (const item of normalizedItems) {
    if (!item.selected_size || item.variant_id) continue;
    const product = productMap.get(Number(item.product_id));
    if (!product) continue;
    const specs = product.specifications ? { ...product.specifications } : {};
    const sizes = Array.isArray(specs.sizes) ? specs.sizes.map((s) => ({ ...s })) : [];
    const idx = sizes.findIndex(
      (s) => String(s.label).trim().toLowerCase() === String(item.selected_size).trim().toLowerCase()
    );
    if (idx === -1) continue;
    sizes[idx].stock = Math.max(0, Number(sizes[idx].stock ?? 0)) + Number(item.quantity || 0);
    specs.sizes = sizes;
    await product.update({ specifications: specs }, { transaction });
  }

  return normalizedItems;
}

module.exports = {
  createInventoryError,
  normalizeOrderItems,
  priceOrderItemsFromDb,
  reserveInventoryForOrderItems,
  restoreInventoryForOrderItems
};
