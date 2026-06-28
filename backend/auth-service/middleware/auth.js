const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    // The token is stateless and lives for 7 days, so a signature check alone is
    // not enough: confirm the account still exists and is active on every request.
    // This makes deletion / deactivation take effect immediately instead of after
    // the token expires.
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'is_active', 'role', 'user_type', 'user_role_id']
    });
    if (!user || user.is_active === false) {
      return res.status(401).json({ success: false, message: 'Account no longer active' });
    }

    // Trust the live DB for authorization-relevant fields so a role change /
    // deactivation can't be carried by a stale token.
    req.user = {
      ...decoded,
      role: user.role,
      user_type: user.user_type,
      user_role_id: user.user_role_id
    };
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authentication check failed' });
  }
}

function verifySuperuser(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'superuser' && role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, verifySuperuser };
