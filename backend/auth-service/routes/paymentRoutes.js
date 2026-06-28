const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');
const router = express.Router();
const Order = require('../models/order');
const { verifyToken } = require('../middleware/auth');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveRazorpayConfig = () => {
    const requestedMode = clean(process.env.RAZORPAY_MODE || '').toLowerCase();
    // Default to test mode so an unset or mistyped env var never accidentally uses live keys.
    const mode = requestedMode === 'live' ? 'live' : 'test';

    const testKeyId = clean(process.env.RAZORPAY_TEST_KEY_ID || '');
    const testKeySecret = clean(process.env.RAZORPAY_TEST_KEY_SECRET || '');
    const liveKeyId = clean(process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID || '');
    const liveKeySecret = clean(process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '');

    const keyId = mode === 'test' ? testKeyId : liveKeyId;
    const keySecret = mode === 'test' ? testKeySecret : liveKeySecret;
    return { mode, keyId, keySecret };
};

const getRazorpayClient = () => {
    const config = resolveRazorpayConfig();
    if (!config.keyId || !config.keySecret) {
        return { config, client: null };
    }
    return {
        config,
        client: new Razorpay({ key_id: config.keyId, key_secret: config.keySecret })
    };
};

{
    const startupConfig = resolveRazorpayConfig();
    if (!startupConfig.keyId || !startupConfig.keySecret) {
        console.warn('[paymentRoutes] Razorpay is not configured. Set keys in backend/auth-service/.env');
    } else {
        console.info(`[paymentRoutes] Razorpay mode=${startupConfig.mode}, key=${startupConfig.keyId.slice(0, 12)}...`);
    }
}

router.get('/config', (req, res) => {
    const { config } = getRazorpayClient();
    if (!config.keyId) {
        return res.status(500).json({ message: 'Razorpay key is not configured' });
    }

    return res.json({
        key: config.keyId,
        mode: config.mode
    });
});

// Create Order API
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        const { client, config } = getRazorpayClient();
        if (!client) {
            return res.status(500).json({ message: 'Razorpay is not configured on server' });
        }

        const { amount, currency = 'INR', receipt } = req.body;
        const normalizedAmount = Number(amount);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const options = {
            amount: Math.round(normalizedAmount * 100), // Amount in paise
            currency,
            receipt,
        };

        const order = await client.orders.create(options);

        if (!order) {
            return res.status(500).send('Error creating order');
        }

        res.json(order);
    } catch (error) {
        const config = resolveRazorpayConfig();
        console.error('Razorpay Create Order Error:', {
            mode: config.mode,
            keyPrefix: config.keyId ? `${config.keyId.slice(0, 12)}...` : 'missing',
            statusCode: error?.statusCode,
            description: error?.error?.description || error?.message
        });
        res.status(error?.statusCode || 500).json({
            message: error?.error?.description || 'Error creating order'
        });
    }
});

// Verify Payment Signature API
router.post('/verify-payment', async (req, res) => {
    try {
        const { config } = getRazorpayClient();
        if (!config.keySecret) {
            return res.status(500).json({ message: 'Razorpay secret is not configured on server' });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", config.keySecret)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            await Order.update(
                { payment_status: 'paid', razorpay_payment_id },
                { where: { razorpay_order_id } }
            );
            console.log(`[paymentRoutes] Payment verified & order updated — razorpay_order_id=${razorpay_order_id}`);
            return res.status(200).json({ message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error('Razorpay Verify Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Razorpay Webhook — server-to-server payment reconciliation.
// Set the SAME secret in the Razorpay Dashboard (Settings → Webhooks) and in
// backend/.env as RAZORPAY_WEBHOOK_SECRET. Subscribe to payment.captured + order.paid.
// Auth is the signature (no JWT). Always returns 200 so Razorpay doesn't retry forever.
router.post('/webhook', async (req, res) => {
    try {
        const secret = clean(process.env.RAZORPAY_WEBHOOK_SECRET || '');
        if (!secret) {
            console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET is not set — cannot verify webhook.');
            return res.status(500).json({ message: 'Webhook secret not configured' });
        }

        const signature = req.headers['x-razorpay-signature'];
        const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        if (!signature || signature !== expected) {
            console.warn('[webhook] invalid signature — ignoring.');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const event = req.body || {};
        const type = event.event;
        const paymentEntity = event?.payload?.payment?.entity;
        const orderEntity = event?.payload?.order?.entity;
        const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
        const rzpPaymentId = paymentEntity?.id || null;

        if ((type === 'payment.captured' || type === 'order.paid') && rzpOrderId) {
            const order = await Order.findOne({ where: { razorpay_order_id: rzpOrderId } });
            if (!order) {
                // Payment succeeded at Razorpay but no order exists in our DB (e.g. the
                // customer closed the tab before the order was saved). Flag for manual
                // reconciliation / refund — we can't rebuild items/address here.
                console.warn(`[webhook] PAID with NO matching order — razorpay_order_id=${rzpOrderId} payment_id=${rzpPaymentId}. Manual reconciliation needed.`);
            } else if (order.payment_status !== 'paid') {
                await order.update({
                    payment_status: 'paid',
                    razorpay_payment_id: rzpPaymentId || order.razorpay_payment_id
                });
                console.log(`[webhook] order ${order.id} (${order.order_number}) marked PAID via ${type}.`);
            } else {
                console.log(`[webhook] order ${order.id} already paid — no-op (idempotent).`);
            }
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        // Log but still 200 so Razorpay stops retrying; we have the event logged.
        console.error('[webhook] processing error:', err?.message || err);
        return res.status(200).json({ received: true });
    }
});

module.exports = router;
