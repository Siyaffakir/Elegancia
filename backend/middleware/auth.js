// middleware/auth.js — JWT authentication & authorization middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn(
    '[Security Warning] JWT_SECRET is missing or shorter than 32 characters in environment variables. Admin authentication will reject requests until configured.'
  );
}

function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({
      error: 'Server configuration error: JWT_SECRET is not configured in environment variables.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token missing from request' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Verifies a Bearer token if one is present, but never rejects the request — used on
 * public endpoints that expose extra (admin-only) fields when the caller happens to be
 * an authenticated admin, e.g. product cost/margin data on the product listing endpoint.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = token ? jwt.verify(token, JWT_SECRET) : null;
  } catch (err) {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  JWT_SECRET,
};
