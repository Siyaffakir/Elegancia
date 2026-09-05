// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { orderCreateLimiter } = require('../middleware/rateLimiters');
const { logAudit } = require('../middleware/auditLog');
const { resolveDeliveryFee } = require('../utils/deliveryPricing');

const VALID_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Returned'];
const VALID_DELIVERY_TYPES = ['home', 'stopdesk'];

function parseOrder(order) {
  if (!order) return null;
  let parsedItems = [];
  try {
    if (order.items) {
      parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    }
  } catch (e) {
    parsedItems = [];
  }

  // Fallback items array if created from older single-product endpoint
  if (!parsedItems || parsedItems.length === 0) {
    if (order.product_name) {
      parsedItems = [
        {
          id: order.product_id || 0,
          name: order.product_name,
          price: (order.total_price && order.delivery_fee) ? (parseFloat(order.total_price) - parseFloat(order.delivery_fee)) : 0,
          quantity: 1,
          total: (order.total_price && order.delivery_fee) ? (parseFloat(order.total_price) - parseFloat(order.delivery_fee)) : 0,
        },
      ];
    }
  }

  return {
    ...order,
    status: order.status || 'Pending',
    commune: order.commune || '',
    address: order.address || '',
    items: parsedItems,
  };
}

// GET /api/orders — all orders, newest first [PROTECTED ADMIN ONLY]
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all('SELECT * FROM `orders` ORDER BY `created_at` DESC');
    res.json(rows.map(parseOrder));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — single order [PROTECTED ADMIN ONLY]
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json(parseOrder(row));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders — create a new order (single product or multi-item cart) [PUBLIC CUSTOMER CHECKOUT]
router.post('/', orderCreateLimiter, async (req, res, next) => {
  try {
    const {
      full_name,
      wilaya,
      commune = '',
      address = '',
      phone,
      product_id,
      product_name,
      items,
      delivery_type,
    } = req.body;

    if (!full_name || !wilaya || !phone) {
      return res.status(400).json({ error: 'Full name, wilaya and phone number are required' });
    }

    const deliveryType = VALID_DELIVERY_TYPES.includes(delivery_type) ? delivery_type : 'home';

    // Basic Algerian phone sanity check (05/06/07 + 8 digits, or 0 + 9 digits generally)
    const phoneClean = String(phone).replace(/\s+/g, '').trim();
    if (!/^0[5-7][0-9]{8}$/.test(phoneClean)) {
      return res.status(400).json({ error: 'Please provide a valid Algerian phone number (e.g. 0555 12 34 56)' });
    }

    let finalItems = [];
    let calculatedSubtotal = 0;
    let finalProductName = '';
    let primaryProductId = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const productId = parseInt(item.id, 10);
        const product = productId ? await db.get('SELECT * FROM `products` WHERE `id` = ?', [productId]) : null;
        if (!product) {
          return res.status(404).json({ error: `Product with id ${item.id} not found` });
        }
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const priceNum = parseFloat(product.price);
        const lineTotal = priceNum * qty;
        calculatedSubtotal += lineTotal;
        finalItems.push({
          id: product.id,
          name: product.name,
          price: priceNum,
          buying_price: parseFloat(product.buying_price) || 0,
          quantity: qty,
          category: product.category,
          image: product.image,
          total: lineTotal,
        });
      }
      primaryProductId = finalItems[0]?.id || 0;
      finalProductName = finalItems.map((i) => `${i.name} (x${i.quantity})`).join(', ');
    } else if (product_id) {
      const product = await db.get('SELECT * FROM `products` WHERE `id` = ?', [product_id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      primaryProductId = product.id;
      const priceNum = parseFloat(product.price);
      calculatedSubtotal = priceNum;
      finalProductName = product_name || product.name;
      finalItems = [
        {
          id: product.id,
          name: product.name,
          price: priceNum,
          buying_price: parseFloat(product.buying_price) || 0,
          quantity: 1,
          category: product.category,
          image: product.image,
          total: priceNum,
        },
      ];
    } else {
      return res.status(400).json({ error: 'Order must include at least one product or item.' });
    }

    const deliveryFee = await resolveDeliveryFee(wilaya, calculatedSubtotal, deliveryType);
    const totalPrice = calculatedSubtotal + deliveryFee;

    const initialStatus = 'Pending';
    const itemsJson = JSON.stringify(finalItems);

    const result = await db.run(
      `INSERT INTO \`orders\` (\`full_name\`, \`wilaya\`, \`commune\`, \`address\`, \`phone\`, \`product_id\`, \`product_name\`, \`items\`, \`delivery_fee\`, \`total_price\`, \`status\`, \`delivery_type\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        wilaya.trim(),
        (commune || '').trim(),
        (address || '').trim(),
        phoneClean,
        primaryProductId,
        finalProductName,
        itemsJson,
        deliveryFee,
        totalPrice,
        initialStatus,
        deliveryType,
      ]
    );

    const createdOrder = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [result.lastInsertRowid]);
    logAudit(req, { event: 'order.create', detail: `id=${createdOrder.id} total=${totalPrice}` });
    res.status(201).json(parseOrder(createdOrder));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status — update order status [PROTECTED ADMIN ONLY]
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const existing = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    await db.run('UPDATE `orders` SET `status` = ? WHERE `id` = ?', [status, req.params.id]);

    const updated = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    logAudit(req, { event: 'order.status_update', actor: req.user.username, detail: `id=${updated.id} status=${status}` });
    res.json(parseOrder(updated));
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status — fallback for PUT requests [PROTECTED ADMIN ONLY]
router.put('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const existing = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    await db.run('UPDATE `orders` SET `status` = ? WHERE `id` = ?', [status, req.params.id]);

    const updated = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    logAudit(req, { event: 'order.status_update', actor: req.user.username, detail: `id=${updated.id} status=${status}` });
    res.json(parseOrder(updated));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/logistics — assign a delivery agency + tracking tag [PROTECTED ADMIN ONLY]
router.patch('/:id/logistics', requireAuth, async (req, res, next) => {
  try {
    const { delivery_agency_id, tracking_tag } = req.body;

    const existing = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    let agencyId = null;
    if (delivery_agency_id !== undefined && delivery_agency_id !== null && delivery_agency_id !== '') {
      const agency = await db.get('SELECT `id` FROM `delivery_agencies` WHERE `id` = ?', [delivery_agency_id]);
      if (!agency) return res.status(400).json({ error: 'Unknown delivery agency.' });
      agencyId = agency.id;
    }

    await db.run(
      'UPDATE `orders` SET `delivery_agency_id` = ?, `tracking_tag` = ? WHERE `id` = ?',
      [agencyId, String(tracking_tag || '').trim(), req.params.id]
    );

    const updated = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    logAudit(req, {
      event: 'order.logistics_update',
      actor: req.user.username,
      detail: `id=${updated.id} agency_id=${agencyId} tag="${updated.tracking_tag}"`,
    });
    res.json(parseOrder(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id — delete order [PROTECTED ADMIN ONLY]
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const result = await db.run('DELETE FROM `orders` WHERE `id` = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });

    logAudit(req, { event: 'order.delete', actor: req.user.username, detail: `id=${existing.id}` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
