const express = require('express');
const router = express.Router();
const Return = require('../models/return');
const Order = require('../models/order');
const User = require('../models/User');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// Create Return Request
router.post('/', verifyToken, async (req, res) => {
    try {
        const { order_id, reason } = req.body;
        const user_id = req.user.id;

        const order = await Order.findOne({ where: { id: order_id, user_id } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found or does not belong to you' });

        if (order.order_status !== 'delivered') {
            return res.status(400).json({ success: false, message: 'Returns can only be requested for delivered orders' });
        }

        const existing = await Return.findOne({ where: { order_id } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A return request already exists for this order' });
        }

        const returnRequest = await Return.create({ order_id, reason, status: 'requested' });
        await Order.update({ order_status: 'return_requested' }, { where: { id: order_id } });

        res.status(201).json({ success: true, message: 'Return requested successfully', data: returnRequest });
    } catch (error) {
        console.error('Error creating return:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Get all returns for the logged-in user
router.get('/user', verifyToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const orders = await Order.findAll({ where: { user_id }, attributes: ['id', 'order_number'] });
        const orderIds = orders.map(o => o.id);

        if (!orderIds.length) {
            return res.json({ success: true, data: [] });
        }

        const orderMap = Object.fromEntries(orders.map(o => [o.id, o.order_number]));
        const returns = await Return.findAll({ where: { order_id: orderIds } });
        const data = returns.map(r => ({
            ...r.toJSON(),
            order_number: orderMap[r.order_id] || null
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching user returns:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin: Get all return requests with order + customer info
router.get('/', verifyToken, verifySuperuser, async (req, res) => {
    try {
        const returns = await Return.findAll({ order: [['createdAt', 'DESC']] });
        const orderIds = [...new Set(returns.map(r => r.order_id))];
        const orders = await Order.findAll({
            where: { id: orderIds },
            attributes: ['id', 'order_number', 'user_id', 'final_amount', 'payment_method']
        });
        const userIds = [...new Set(orders.map(o => o.user_id))];
        const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email'] });

        const orderMap = Object.fromEntries(orders.map(o => [o.id, o]));
        const userMap  = Object.fromEntries(users.map(u => [u.id, u]));

        const data = returns.map(r => {
            const order = orderMap[r.order_id] || {};
            const user  = userMap[order.user_id] || {};
            return {
                ...r.toJSON(),
                order_number:   order.order_number || null,
                final_amount:   order.final_amount || null,
                payment_method: order.payment_method || null,
                customer_name:  user.name  || null,
                customer_email: user.email || null
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching all returns:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin: Update return status (approve / reject / refund)
router.patch('/:id/status', verifyToken, verifySuperuser, async (req, res) => {
    try {
        const { status, refund_amount } = req.body;
        const allowed = ['approved', 'rejected', 'refunded'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
        }

        const returnRequest = await Return.findByPk(req.params.id);
        if (!returnRequest) return res.status(404).json({ success: false, message: 'Return not found' });

        const updates = { status };
        if (status === 'refunded' && refund_amount != null) {
            updates.refund_amount = refund_amount;
        }
        await returnRequest.update(updates);

        // If refunded, also mark order payment_status as refunded
        if (status === 'refunded') {
            await Order.update({ payment_status: 'refunded' }, { where: { id: returnRequest.order_id } });
        }

        res.json({ success: true, message: `Return ${status}`, data: returnRequest });
    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
