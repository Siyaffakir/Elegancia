// middleware/rateLimiters.js — centralized rate limiters for brute-force & abuse protection
const rateLimit = require('express-rate-limit');

// Admin login: brute-force protection on credential guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin password change: prevents brute-forcing currentPassword via a stolen/guessed session
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many password change attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Product image upload (create/update): prevents disk-fill / abuse even from a valid admin session
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many upload requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public checkout: prevents scripted order spam against an unauthenticated endpoint
const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many orders submitted from this device. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  changePasswordLimiter,
  uploadLimiter,
  orderCreateLimiter,
};
