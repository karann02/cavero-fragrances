const { Op } = require('sequelize');
const Razorpay = require('razorpay');
const sequelize = require('../config/db');
const Order = require('../models/order');
const OrderItem = require('../models/order_item');
const Coupon = require('../models/coupon');
const CouponUsage = require('../models/coupon_usage');
const { restoreInventoryForOrderItems } = require('./orderInventory');

const getRazorpayClient = () => {
  const mode = String(process.env.RAZORPAY_MODE || '').trim().toLowerCase() === 'live' ? 'live' : 'test';
  const keyId = mode === 'test'
    ? (process.env.RAZORPAY_TEST_KEY_ID || '').trim()
    : (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = mode === 'test'
    ? (process.env.RAZORPAY_TEST_KEY_SECRET || '').trim()
    : (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Restore stock + reverse coupon + mark an order cancelled/failed. Idempotent-ish
// (only call on a still-pending order, inside a transaction).
async function releaseOrder(order, { transaction }) {
  const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction });
  const normalized = items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    price: i.price,
    total_price: i.total_price,
    selected_size: i.selected_size,
    variant_id: i.variant_id
  }));
  if (normalized.length) {
    try {
      await restoreInventoryForOrderItems(normalized, { transaction });
    } catch (e) {
      console.error('[pending-cleanup] stock restore failed for order', order.id, e.message);
    }
  }
  if (order.coupon_id) {
    const coupon = await Coupon.findByPk(order.coupon_id, { transaction });
    if (coupon && Number(coupon.used_count || 0) > 0) {
      await coupon.decrement('used_count', { by: 1, transaction });
    }
    await CouponUsage.destroy({ where: { coupon_id: order.coupon_id, order_id: order.id }, transaction });
  }
  await order.update({ order_status: 'cancelled', payment_status: 'failed' }, { transaction });
}

// Customer/admin abandons an online payment → release the pending order immediately.
async function cancelPendingOrderById(orderId, { userId, isAdmin } = {}) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) return { ok: false, code: 404, message: 'Order not found' };
    if (!isAdmin && Number(order.user_id) !== Number(userId)) {
      return { ok: false, code: 403, message: 'Not allowed' };
    }
    // Only release a still-pending online order; never touch paid/COD/confirmed ones.
    if (order.payment_method !== 'online' || order.payment_status !== 'pending' || order.order_status === 'cancelled') {
      return { ok: true, message: 'No action needed', data: order };
    }
    await releaseOrder(order, { transaction });
    return { ok: true, message: 'Pending order cancelled', data: order };
  });
}

// Safety-net job: sweep online orders left 'pending' too long. Before cancelling,
// double-check with Razorpay — if the customer actually paid (e.g. webhook/verify never
// ran), reconcile to paid instead of cancelling. Otherwise release the stock.
async function cleanupStalePendingOrders({ olderThanMinutes = 45 } = {}) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const stale = await Order.findAll({
    where: {
      payment_method: 'online',
      payment_status: 'pending',
      order_status: 'pending',
      createdAt: { [Op.lt]: cutoff }
    }
  });
  if (!stale.length) return 0;

  const rzp = getRazorpayClient();
  let released = 0;
  let reconciled = 0;

  for (const o of stale) {
    try {
      await sequelize.transaction(async (transaction) => {
        const locked = await Order.findByPk(o.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!locked || locked.payment_status !== 'pending' || locked.order_status !== 'pending') return;

        if (rzp && locked.razorpay_order_id) {
          try {
            const ro = await rzp.orders.fetch(locked.razorpay_order_id);
            const paid = ro && (ro.status === 'paid' || Number(ro.amount_paid || 0) >= Number(ro.amount || 0));
            if (paid) {
              let payId = locked.razorpay_payment_id;
              try {
                const pays = await rzp.orders.fetchPayments(locked.razorpay_order_id);
                const cap = (pays.items || []).find((p) => p.status === 'captured');
                if (cap) payId = cap.id;
              } catch { /* ignore */ }
              await locked.update({ payment_status: 'paid', razorpay_payment_id: payId || locked.razorpay_payment_id }, { transaction });
              reconciled++;
              return; // genuinely paid — do NOT release
            }
          } catch { /* fetch failed → fall through and release */ }
        }

        await releaseOrder(locked, { transaction });
        released++;
      });
    } catch (e) {
      console.error('[pending-cleanup] failed for order', o.id, e.message);
    }
  }

  if (released || reconciled) {
    console.log(`[pending-cleanup] released ${released} stale order(s), reconciled ${reconciled} paid order(s).`);
  }
  return released;
}

module.exports = { cancelPendingOrderById, cleanupStalePendingOrders };
