// utils/deliveryPricing.js — shared wilaya/commune lookup + delivery fee resolution
const fs = require('fs');
const path = require('path');
const db = require('../db');

const wilayas = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'Wilaya_Of_Algeria.json'), 'utf8')
).map((w) => ({ code: parseInt(w.code, 10), name: w.name, ar_name: w.ar_name }));

const communesByWilaya = new Map();
JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'Commune_Of_Algeria.json'), 'utf8')).forEach((c) => {
  const wilayaCode = parseInt(c.wilaya_id, 10);
  if (!communesByWilaya.has(wilayaCode)) communesByWilaya.set(wilayaCode, []);
  communesByWilaya.get(wilayaCode).push({ id: parseInt(c.id, 10), name: c.name, ar_name: c.ar_name });
});

const FREE_DELIVERY_THRESHOLD = 10000;

/**
 * Extracts the leading wilaya code from strings like "16 - Alger" (the format the
 * frontend has always submitted). Returns null if no numeric code can be parsed.
 */
function parseWilayaCode(wilayaText) {
  const match = String(wilayaText || '').trim().match(/^(\d{1,2})/);
  return match ? parseInt(match[1], 10) : null;
}

function getWilayas() {
  return [...wilayas].sort((a, b) => a.code - b.code);
}

function getCommunes(wilayaCode) {
  return communesByWilaya.get(parseInt(wilayaCode, 10)) || [];
}

async function getAllPricing() {
  return db.all('SELECT * FROM `delivery_pricing` ORDER BY `wilaya_code`');
}

/**
 * Resolves the authoritative delivery fee for a wilaya + delivery type (home or stopdesk).
 * Always computed server-side — never trust a client-supplied delivery fee (see
 * SECURITY_REVIEW.md §6).
 */
async function resolveDeliveryFee(wilayaText, subtotal, deliveryType = 'home') {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;

  const code = parseWilayaCode(wilayaText);
  if (code) {
    const row = await db.get('SELECT home_fee, stopdesk_fee FROM `delivery_pricing` WHERE `wilaya_code` = ?', [code]);
    if (row) return deliveryType === 'stopdesk' ? parseFloat(row.stopdesk_fee) : parseFloat(row.home_fee);
  }
  // Fallback for unrecognized/malformed wilaya input — a conservative default, not the
  // cheapest tier, so it never under-charges shipping.
  return 700;
}

module.exports = {
  FREE_DELIVERY_THRESHOLD,
  parseWilayaCode,
  getWilayas,
  getCommunes,
  getAllPricing,
  resolveDeliveryFee,
};
