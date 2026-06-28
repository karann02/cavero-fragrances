const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const OrderItem = require('../models/order_item');
const Product = require('../models/product');
const Coupon = require('../models/coupon');
const CouponUsage = require('../models/coupon_usage');
const sequelize = require('../config/db');
const nodemailer = require('nodemailer');
const { UniqueConstraintError } = require('sequelize');
const { verifyToken } = require('../middleware/auth');
const Razorpay = require('razorpay');
const {
    createInventoryError,
    reserveInventoryForOrderItems,
    normalizeOrderItems,
    priceOrderItemsFromDb
} = require('../utils/orderInventory');
const { cancelPendingOrderById } = require('../utils/pendingOrders');

// Razorpay client (same mode/keys as paymentRoutes) — used to verify the amount a
// customer actually paid matches the server-computed order total.
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

function buildOrderEmailHtml({ order_number, items, subtotal, discount, shipping, total, address, paymentMethod }) {
    const itemRows = items.map(i =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;text-align:center;">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;text-align:right;">&#8377;${Number(i.price).toFixed(2)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;text-align:right;">&#8377;${Number(i.total).toFixed(2)}</td>
        </tr>`
    ).join('');

    const discountRow = discount > 0
        ? `<tr><td style="padding:4px 12px;" colspan="3">Discount</td><td style="padding:4px 12px;text-align:right;color:#2e7d32;">-&#8377;${Number(discount).toFixed(2)}</td></tr>`
        : '';

    return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8d9a0;">
        <div style="background:#C9A84C;padding:24px 32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">CAVERO FRAGRANCES</h1>
            <p style="color:#FFF8E7;margin:6px 0 0;font-size:13px;">Luxury Arabian Perfumes & Oud</p>
        </div>
        <div style="padding:32px;">
            <h2 style="color:#8B6914;margin-top:0;">Order Confirmed!</h2>
            <p style="color:#555;">Thank you for your order. We'll start processing it right away.</p>
            <p style="font-size:15px;">Order Number: <strong style="color:#C9A84C;">${order_number}</strong></p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <thead>
                    <tr style="background:#FFF8E7;">
                        <th style="padding:10px 12px;text-align:left;color:#8B6914;font-weight:600;">Product</th>
                        <th style="padding:10px 12px;text-align:center;color:#8B6914;">Qty</th>
                        <th style="padding:10px 12px;text-align:right;color:#8B6914;">Price</th>
                        <th style="padding:10px 12px;text-align:right;color:#8B6914;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                    <tr><td colspan="4" style="padding:4px 0;"></td></tr>
                    ${discountRow}
                    <tr>
                        <td style="padding:4px 12px;" colspan="3">Delivery</td>
                        <td style="padding:4px 12px;text-align:right;">${Number(shipping) > 0 ? '&#8377;' + Number(shipping).toFixed(2) : 'Free'}</td>
                    </tr>
                    <tr style="background:#FFF8E7;">
                        <td style="padding:10px 12px;font-weight:bold;" colspan="3">Total Paid</td>
                        <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#C9A84C;font-size:16px;">&#8377;${Number(total).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="display:flex;gap:24px;margin-top:24px;">
                <div style="flex:1;">
                    <h4 style="color:#8B6914;margin-bottom:8px;">Shipping To</h4>
                    <p style="margin:0;color:#555;line-height:1.7;">
                        ${address.firstName} ${address.lastName}<br>
                        ${address.address}<br>
                        ${address.city}, ${address.zip_code}<br>
                        ${address.phone}
                    </p>
                </div>
                <div style="flex:1;">
                    <h4 style="color:#8B6914;margin-bottom:8px;">Payment</h4>
                    <p style="margin:0;color:#555;">${paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}</p>
                    <h4 style="color:#8B6914;margin-top:16px;margin-bottom:4px;">Estimated Delivery</h4>
                    <p style="margin:0;color:#555;">3–5 Business Days</p>
                </div>
            </div>
        </div>
        <div style="background:#FFF8E7;padding:16px 32px;text-align:center;border-top:2px solid #C9A84C;">
            <p style="margin:0;color:#8B6914;font-size:13px;">
                Questions? Email us at <a href="mailto:caverofragrance@gmail.com" style="color:#C9A84C;">caverofragrance@gmail.com</a>
                &nbsp;|&nbsp; WhatsApp: +91 9274521140
            </p>
        </div>
    </div>`;
}

async function sendOrderConfirmationEmail(order, items) {
    const toEmail = order.shipping_address?.email;
    if (!toEmail) return;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
        from: `"Cavero Fragrances" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Order Confirmed — ${order.order_number} | Cavero Fragrances`,
        html: buildOrderEmailHtml({
            order_number: order.order_number,
            items,
            subtotal: order.total_amount,
            discount: order.discount_amount || 0,
            shipping: order.shipping_amount || 0,
            total: order.final_amount,
            address: order.shipping_address,
            paymentMethod: order.payment_method
        })
    });
    console.log(`[orderRoutes] Confirmation email sent to ${toEmail} for order ${order.order_number}`);
}

// Create Order (POST /)
router.post('/', verifyToken, async (req, res) => {
    const transaction = await sequelize.transaction();
    let normalizedTransactionId = '';
    let normalizedRazorpayOrderId = '';

    try {
        const {
            items,
            shipping_address,
            billing_address, // Optional, can default to shipping
            payment_method,
            transaction_id, // For Online Payment (razorpay_payment_id)
            razorpay_order_id, // For Online Payment
            subtotal,
            delivery_fee,
            total_amount,
            coupon_id,
            coupon_code
        } = req.body;

        normalizedTransactionId = String(transaction_id || '').trim();
        normalizedRazorpayOrderId = String(razorpay_order_id || '').trim();

        const user_id = Number(req.user.id);
        const order_number = 'ORD-' + Date.now() + Math.floor(Math.random() * 1000);

        if (payment_method === 'online' && normalizedTransactionId) {
            const existingOrder = await Order.findOne({
                where: { razorpay_payment_id: normalizedTransactionId },
                transaction
            });

            if (existingOrder) {
                await transaction.rollback();
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    message: 'Order already exists for this payment.',
                    data: existingOrder
                });
            }
        }

        // Pending-order created before payment: don't create/reserve twice for the same
        // Razorpay order if the client retries.
        if (payment_method === 'online' && normalizedRazorpayOrderId) {
            const existingByRzpOrder = await Order.findOne({
                where: { razorpay_order_id: normalizedRazorpayOrderId },
                transaction
            });
            if (existingByRzpOrder) {
                await transaction.rollback();
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    message: 'Order already exists for this payment session.',
                    data: existingByRzpOrder
                });
            }
        }

        let payment_status = 'pending';
        // Admin-controlled lifecycle:
        // pending -> confirmed -> processing -> shipped -> delivered
        let order_status = 'pending';

        if (payment_method === 'online' && transaction_id) {
            payment_status = 'paid';
            // Keep order pending until admin approves payment.
            order_status = 'pending';
        } else if (payment_method === 'cash_on_delivery') {
            payment_status = 'pending';
            order_status = 'pending';
        }

        const normalizedShipping = Number(delivery_fee || 0);
        const normalizedItems = Array.isArray(items) ? items : [];

        // SERVER-AUTHORITATIVE PRICING: recompute item prices + subtotal from the DB
        // (client-sent prices/subtotal are ignored to prevent tampering). Combos keep
        // their allocated price. The client `subtotal` field is no longer trusted.
        const priced = await priceOrderItemsFromDb(normalizedItems, { transaction });
        const normalizedOrderItems = priced.items;
        const normalizedSubtotal = priced.subtotal;

        let appliedCoupon = null;
        let discountAmount = 0;
        const couponLookupId = Number(coupon_id || 0);
        const couponLookupCode = String(coupon_code || '').trim().toUpperCase();

        if (couponLookupId || couponLookupCode) {
            appliedCoupon = couponLookupId
                ? await Coupon.findByPk(couponLookupId, { transaction })
                : await Coupon.findOne({ where: { code: couponLookupCode }, transaction });

            if (!appliedCoupon) {
                throw createInventoryError('The selected coupon could not be found.');
            }

            const now = new Date();
            const minOrderAmount = Number(appliedCoupon.min_order_amount || 0);
            const usageLimit = appliedCoupon.usage_limit !== null && appliedCoupon.usage_limit !== undefined
                ? Number(appliedCoupon.usage_limit)
                : null;

            if (!appliedCoupon.status) {
                throw createInventoryError('This coupon is inactive.');
            }
            if (usageLimit === null) {
                if (!appliedCoupon.valid_from || !appliedCoupon.valid_until) {
                    throw createInventoryError('This coupon is no longer valid.');
                }
                if (new Date(appliedCoupon.valid_from) > now || new Date(appliedCoupon.valid_until) < now) {
                    throw createInventoryError('This coupon is no longer valid.');
                }
            }
            if (usageLimit !== null && Number(appliedCoupon.used_count || 0) >= usageLimit) {
                throw createInventoryError('This coupon has reached its usage limit.');
            }
            if (normalizedSubtotal < minOrderAmount) {
                throw createInventoryError(
                    `Your cart value is less. Add more items and shop till \u20B9${minOrderAmount.toFixed(2)} to unlock this coupon.`
                );
            }

            if (appliedCoupon.type === 'percentage') {
                discountAmount = normalizedSubtotal * (Number(appliedCoupon.value || 0) / 100);
                if (appliedCoupon.max_discount !== null && appliedCoupon.max_discount !== undefined) {
                    discountAmount = Math.min(discountAmount, Number(appliedCoupon.max_discount));
                }
            } else {
                discountAmount = Number(appliedCoupon.value || 0);
            }

            if (!Number.isFinite(discountAmount) || discountAmount < 0) {
                discountAmount = 0;
            }
            discountAmount = Math.min(discountAmount, normalizedSubtotal);
        }

        const normalizedTotal = Math.max(normalizedSubtotal - discountAmount, 0) + normalizedShipping;

        // For online payments, verify the Razorpay order amount matches the server-computed
        // total — blocks a tampered client from paying less than owed. Runs at pending-order
        // creation (before payment), so no transaction_id is required here.
        if (payment_method === 'online' && normalizedRazorpayOrderId) {
            const rzp = getRazorpayClient();
            if (rzp) {
                const rzpOrder = await rzp.orders.fetch(normalizedRazorpayOrderId);
                const paidPaise = Number(rzpOrder?.amount || 0);
                const expectedPaise = Math.round(normalizedTotal * 100);
                if (paidPaise !== expectedPaise) {
                    throw createInventoryError('Payment amount does not match the order total. Please refresh your cart and try again.');
                }
            }
        }

        await reserveInventoryForOrderItems(normalizedOrderItems, { transaction });

        const newOrder = await Order.create({
            order_number,
            user_id,
            total_amount: normalizedSubtotal,
            discount_amount: discountAmount,
            shipping_amount: normalizedShipping,
            final_amount: normalizedTotal,
            payment_status,
            order_status,
            payment_method,
            razorpay_order_id: normalizedRazorpayOrderId || null,
            razorpay_payment_id: normalizedTransactionId || null,
            shipping_address: shipping_address,
            billing_address: billing_address || shipping_address,
            coupon_id: appliedCoupon ? appliedCoupon.id : null
        }, { transaction });

        const orderItemsData = normalizedOrderItems.map((item) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            total_price: item.total_price,
            selected_size: item.selected_size || null,
            variant_id: item.variant_id || null
        }));

        await OrderItem.bulkCreate(orderItemsData, { transaction });

        if (appliedCoupon) {
            await appliedCoupon.increment('used_count', { by: 1, transaction });
            const [usage, created] = await CouponUsage.findOrCreate({
                where: {
                    coupon_id: appliedCoupon.id,
                    user_id
                },
                defaults: {
                    applied_at: new Date(),
                    order_id: newOrder.id,
                    redeemed_at: new Date()
                },
                transaction
            });

            if (!created) {
                await usage.update({
                    applied_at: usage.applied_at || new Date(),
                    order_id: newOrder.id,
                    redeemed_at: new Date()
                }, { transaction });
            }
        }

        await transaction.commit();

        // Send confirmation email (non-blocking — failure does not affect the response)
        (async () => {
            try {
                const productIds = normalizedOrderItems.map(i => i.product_id);
                const products = await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name'] });
                const nameMap = Object.fromEntries(products.map(p => [p.id, p.name]));
                const emailItems = normalizedOrderItems.map(i => ({
                    name: nameMap[i.product_id] || 'Fragrance',
                    quantity: i.quantity,
                    price: i.price,
                    total: i.total_price
                }));
                await sendOrderConfirmationEmail(newOrder, emailItems);
            } catch (emailErr) {
                console.error('[orderRoutes] Confirmation email failed (non-fatal):', emailErr.message);
            }
        })();

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: newOrder
        });

    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        if (error instanceof UniqueConstraintError && normalizedTransactionId) {
            const existingOrder = await Order.findOne({
                where: { razorpay_payment_id: normalizedTransactionId }
            });

            if (existingOrder) {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    message: 'Order already exists for this payment.',
                    data: existingOrder
                });
            }
        }
        console.error('❌ [ORDER ERROR] Error creating order:', error);
        console.error('   Error Stack:', error?.stack);
        console.error('   Error Message:', error?.message);
        console.error('   Error Status:', error?.statusCode);
        res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server Error' });
    }
});

// Cancel a still-pending online order (payment abandoned) — restores stock + reverses coupon.
router.post('/:id/cancel', verifyToken, async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase();
        const isAdmin = role === 'admin' || role === 'superuser';
        const result = await cancelPendingOrderById(req.params.id, { userId: req.user.id, isAdmin });
        if (!result.ok) {
            return res.status(result.code || 400).json({ success: false, message: result.message });
        }
        return res.json({ success: true, message: result.message });
    } catch (err) {
        console.error('[orderRoutes] cancel pending error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
});

// Get Order Count by User (GET /user/:userId/count)
router.get('/user/:userId/count', verifyToken, async (req, res) => {
    try {
        const requestedUserId = Number(req.params.userId);
        const tokenUserId = Number(req.user.id);
        if (!Number.isFinite(requestedUserId) || requestedUserId !== tokenUserId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const count = await Order.count({ where: { user_id: requestedUserId } });
        return res.json({ success: true, data: { count } });
    } catch (error) {
        console.error('Error fetching user order count:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Get Orders by User (GET /user/:userId)
router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const requestedUserId = Number(req.params.userId);
        const tokenUserId = Number(req.user.id);
        if (!Number.isFinite(requestedUserId) || requestedUserId !== tokenUserId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const orders = await Order.findAll({
            where: { user_id: requestedUserId },
            include: [{
                model: OrderItem,
                include: [{
                    model: Product,
                    attributes: ['id', 'name', 'images', 'price']
                }]
            }],
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Get Single Order (GET /:id)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{
                model: OrderItem, // Ensure association exists
                include: [Product] // Include Product details if association exists
            }]
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
