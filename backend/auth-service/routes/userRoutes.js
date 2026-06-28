const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/order');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

// Delete user account (customer self-delete)
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// Get user order count
router.get('/orders/user/:userId/count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Order.count({ where: { user_id: userId } });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error fetching order count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order count' });
  }
});

// Change password (self — customer or admin)
router.put('/user/change-password', verifyToken, async (req, res) => {
  try {
    const id = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedNewPassword });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// Get all users (admin)
router.get('/users', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'basePass64', 'otp', 'otp_expiry'] },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user (admin)
router.put('/users/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { name, email, role } = req.body;
    await user.update({ name: name || user.name, email: email || user.email, role: role || user.role });
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle user active status (admin)
router.patch('/users/:id/status', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({ is_active: req.body.is_active });
    res.json({ success: true, message: 'User status updated', data: { is_active: user.is_active } });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user (admin)
router.delete('/users/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
