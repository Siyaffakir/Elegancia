// routes/delivery.js — wilaya/commune lookups & admin-configurable delivery pricing
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');
const { getWilayas, getCommunes, getAllPricing, FREE_DELIVERY_THRESHOLD } = require('../utils/deliveryPricing');

// GET /api/delivery/wilayas — the 58 wilayas [PUBLIC]
router.get('/wilayas', (req, res) => {
  res.json(getWilayas());
});

// GET /api/delivery/communes?wilaya_code=16 — communes for a wilaya [PUBLIC]
router.get('/communes', (req, res) => {
  const wilayaCode = parseInt(req.query.wilaya_code, 10);
  if (!wilayaCode) return res.status(400).json({ error: 'wilaya_code query parameter is required' });
  res.json(getCommunes(wilayaCode));
});

// GET /api/delivery/pricing — current per-wilaya delivery fees [PUBLIC — needed by checkout to quote a fee]
router.get('/pricing', async (req, res, next) => {
  try {
    const pricing = await getAllPricing();
    res.json({ freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD, pricing });
  } catch (err) {
    next(err);
  }
});

// PUT /api/delivery/pricing/:wilaya_code — update a wilaya's fees [PROTECTED ADMIN ONLY]
router.put('/pricing/:wilaya_code', requireAuth, async (req, res, next) => {
  try {
    const wilayaCode = parseInt(req.params.wilaya_code, 10);
    const { home_fee, stopdesk_fee } = req.body;

    const homeFee = Number(home_fee);
    const stopdeskFee = Number(stopdesk_fee);

    if (!Number.isFinite(homeFee) || homeFee < 0 || !Number.isFinite(stopdeskFee) || stopdeskFee < 0) {
      return res.status(400).json({ error: 'home_fee and stopdesk_fee must be non-negative numbers' });
    }

    const existing = await db.get('SELECT * FROM `delivery_pricing` WHERE `wilaya_code` = ?', [wilayaCode]);
    if (!existing) return res.status(404).json({ error: 'Unknown wilaya code' });

    await db.run(
      'UPDATE `delivery_pricing` SET `home_fee` = ?, `stopdesk_fee` = ?, `updated_at` = NOW() WHERE `wilaya_code` = ?',
      [homeFee, stopdeskFee, wilayaCode]
    );

    const updated = await db.get('SELECT * FROM `delivery_pricing` WHERE `wilaya_code` = ?', [wilayaCode]);
    logAudit(req, {
      event: 'delivery_pricing.update',
      actor: req.user.username,
      detail: `wilaya=${updated.wilaya_name}(${wilayaCode}) home=${homeFee} stopdesk=${stopdeskFee}`,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
