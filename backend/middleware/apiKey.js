// middleware/apiKey.js — shared-secret gate between the storefront frontend and this API
const crypto = require('crypto');

const API_KEY = process.env.API_KEY;
if (!API_KEY || API_KEY.length < 16) {
  throw new Error(
    'API_KEY is missing or too short (must be set in .env with at least 16 characters). Refusing to start with an insecure or hardcoded key.'
  );
}
const API_KEY_BUFFER = Buffer.from(API_KEY);

function requireApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];
  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized: API key required' });
  }

  const providedBuffer = Buffer.from(String(provided));
  const isValid =
    providedBuffer.length === API_KEY_BUFFER.length &&
    crypto.timingSafeEqual(providedBuffer, API_KEY_BUFFER);

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

module.exports = { requireApiKey };
