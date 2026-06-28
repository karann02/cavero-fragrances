const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { QueryTypes } = require('sequelize');
const { verifyToken } = require('../middleware/auth');

// True when the logged-in user owns the resource or is an admin/superuser.
const isOwnerOrAdmin = (req, ownerId) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'superuser') return true;
    return Number(req.user?.id) === Number(ownerId);
};

// Get all addresses for a user (own only, unless admin)
router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isOwnerOrAdmin(req, userId)) {
            return res.status(403).json({ success: false, message: 'Not allowed' });
        }
        const result = await db.query(
            `SELECT id, user_id, label, street, city, state, zip_code, country,
                    is_default, type, created_at, updated_at
             FROM addresses WHERE user_id = :userId
             ORDER BY is_default DESC, created_at DESC`,
            { replacements: { userId }, type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
    }
});

// Create new address (always for the logged-in user — body user_id is ignored)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { label, street, city, state, zip_code, country, is_default, type } = req.body;
        const user_id = req.user.id;

        if (is_default) {
            await db.query(
                'UPDATE addresses SET is_default = FALSE WHERE user_id = :user_id',
                { replacements: { user_id }, type: QueryTypes.UPDATE }
            );
        }

        const result = await db.query(
            `INSERT INTO addresses (user_id, label, street, city, state, zip_code, country, is_default, type)
             VALUES (:user_id, :label, :street, :city, :state, :zip_code, :country, :is_default, :type)
             RETURNING *`,
            {
                replacements: {
                    user_id, label, street, city, state, zip_code, country,
                    is_default: is_default || false,
                    type: type || 'shipping'
                },
                type: QueryTypes.INSERT
            }
        );

        res.json({ success: true, data: result[0][0], message: 'Address created successfully' });
    } catch (error) {
        console.error('Error creating address:', error);
        res.status(500).json({ success: false, message: 'Failed to create address' });
    }
});

// Update address (owner only)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { label, street, city, state, zip_code, country, is_default, type } = req.body;

        const addrRows = await db.query(
            'SELECT user_id FROM addresses WHERE id = :id',
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        if (addrRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        const user_id = addrRows[0].user_id;
        if (!isOwnerOrAdmin(req, user_id)) {
            return res.status(403).json({ success: false, message: 'Not allowed' });
        }

        if (is_default) {
            await db.query(
                'UPDATE addresses SET is_default = FALSE WHERE user_id = :user_id AND id != :id',
                { replacements: { user_id, id }, type: QueryTypes.UPDATE }
            );
        }

        const result = await db.query(
            `UPDATE addresses
             SET label = :label, street = :street, city = :city, state = :state,
                 zip_code = :zip_code, country = :country, is_default = :is_default,
                 type = :type, updated_at = CURRENT_TIMESTAMP
             WHERE id = :id RETURNING *`,
            {
                replacements: { label, street, city, state, zip_code, country, is_default, type, id },
                type: QueryTypes.UPDATE
            }
        );

        res.json({ success: true, data: result[0][0], message: 'Address updated successfully' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ success: false, message: 'Failed to update address' });
    }
});

// Delete address (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const addrRows = await db.query(
            'SELECT user_id, is_default FROM addresses WHERE id = :id',
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        if (addrRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        const { user_id, is_default } = addrRows[0];
        if (!isOwnerOrAdmin(req, user_id)) {
            return res.status(403).json({ success: false, message: 'Not allowed' });
        }

        await db.query(
            'DELETE FROM addresses WHERE id = :id',
            { replacements: { id }, type: QueryTypes.DELETE }
        );

        if (is_default) {
            await db.query(
                `UPDATE addresses SET is_default = TRUE
                 WHERE user_id = :user_id AND id = (SELECT id FROM addresses WHERE user_id = :user_id LIMIT 1)`,
                { replacements: { user_id }, type: QueryTypes.UPDATE }
            );
        }

        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
});

// Set address as default (owner only)
router.put('/:id/default', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const addrRows = await db.query(
            'SELECT user_id FROM addresses WHERE id = :id',
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        if (addrRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        const user_id = addrRows[0].user_id;
        if (!isOwnerOrAdmin(req, user_id)) {
            return res.status(403).json({ success: false, message: 'Not allowed' });
        }

        await db.query(
            'UPDATE addresses SET is_default = FALSE WHERE user_id = :user_id',
            { replacements: { user_id }, type: QueryTypes.UPDATE }
        );
        await db.query(
            'UPDATE addresses SET is_default = TRUE WHERE id = :id',
            { replacements: { id }, type: QueryTypes.UPDATE }
        );

        res.json({ success: true, message: 'Default address updated successfully' });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ success: false, message: 'Failed to set default address' });
    }
});

module.exports = router;