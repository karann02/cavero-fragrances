const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Referral = require('../models/referral');
const { verifyToken } = require('../middleware/auth');

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += REFERRAL_CHARS.charAt(Math.floor(Math.random() * REFERRAL_CHARS.length));
    }
    const existing = await User.findOne({ where: { referral_code: code } });
    if (!existing) return code;
  }
  return 'C' + Date.now().toString(36).toUpperCase().slice(-5);
}

// GET /api/referrals/my-code — returns logged-in user's referral code + share link
// If user has no code yet (pre-referral-feature account), generate one on demand
router.get('/my-code', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'referral_code'] });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let code = user.referral_code;
    if (!code) {
      code = await generateUniqueReferralCode();
      await user.update({ referral_code: code });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.json({
      success: true,
      data: {
        referral_code: code,
        referral_link: `${baseUrl}/signup?ref=${code}`,
        whatsapp_link: `https://wa.me/?text=${encodeURIComponent(`Join Cavero Fragrances using my referral code ${code} and get exclusive offers! Sign up here: ${baseUrl}/signup?ref=${code}`)}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/referrals/my-stats — referral counts for logged-in user
router.get('/my-stats', verifyToken, async (req, res) => {
  try {
    const referrals = await Referral.findAll({ where: { referrer_id: req.user.id } });
    const total = referrals.length;
    const credited = referrals.filter(r => r.status === 'credited').length;
    const pending = referrals.filter(r => r.status === 'pending').length;

    res.json({ success: true, data: { total, credited, pending } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
