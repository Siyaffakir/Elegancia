// middleware/apiKey.js — shared-secret gate between the storefront frontend and this API
const crypto = require('crypto');

const API_KEY = process.env.API_KEY;
let API_KEY_BUFFER = null;
if (API_KEY && API_KEY.length >= 16) {
  API_KEY_BUFFER = Buffer.from(API_KEY);
} else {
  console.warn(
    '[Security Warning] API_KEY is missing or shorter than 16 characters in environment variables. Protected endpoints will reject requests until configured.'
  );
}

function requireApiKey(req, res, next) {
  if (!API_KEY_BUFFER) {
    return res.status(500).json({
      error: 'Server configuration error: API_KEY is missing or too short (min 16 chars) in environment variables.',
    });
  }

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
