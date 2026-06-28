const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const User = require('../models/User');
const Product = require('../models/product');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// Add Review
router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, rating, comment } = req.body;
        const user_id = req.user.id;

        const existing = await Review.findOne({ where: { user_id, product_id } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this product.' });
        }

        const review = await Review.create({
            user_id,
            product_id,
            rating,
            comment,
            is_active: true
        });

        res.status(201).json({ success: true, message: 'Review added successfully', data: review });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Get Reviews by Product ID
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.findAll({
            where: { product_id: productId, is_active: true },
            include: [{
                model: User,
                attributes: ['name', 'profile_image'] // Fetch user details
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin: List all reviews
router.get('/admin', verifyToken, verifySuperuser, async (_req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email', 'profile_image']
                },
                {
                    model: Product,
                    attributes: ['id', 'name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching admin reviews:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin: Toggle review visibility
router.patch('/:id/status', verifyToken, verifySuperuser, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const review = await Review.findByPk(id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        await review.update({ is_active: Boolean(is_active) });
        res.json({
            success: true,
            message: `Review ${review.is_active ? 'enabled' : 'disabled'} successfully`,
            data: { id: review.id, is_active: review.is_active }
        });
    } catch (error) {
        console.error('Error updating review status:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
