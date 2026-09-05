// routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { logAudit } = require('../middleware/auditLog');

// buying_price is cost/margin data — never expose it to unauthenticated (customer-facing)
// requests. Only included when the caller is a verified admin (see optionalAuth).
function stripCostFields(product, isAdmin) {
  if (isAdmin || !product) return product;
  const { buying_price, ...rest } = product;
  return rest;
}

// GET /api/products?search=&category=
// All products, with optional name search + category filter (combinable) [PUBLIC, cost hidden unless admin]
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let sql = 'SELECT * FROM `products` WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND `name` LIKE ?';
      params.push(`%${search}%`);
    }
    if (category) {
      // category can be repeated in query string (?category=Skincare&category=Makeup)
      const cats = Array.isArray(category) ? category : [category];
      sql += ` AND \`category\` IN (${cats.map(() => '?').join(',')})`;
      params.push(...cats);
    }
    sql += ' ORDER BY `created_at` DESC';

    const rows = await db.all(sql, params);
    res.json(rows.map((r) => stripCostFields(r, Boolean(req.user))));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/random?count=6
// Random products for the homepage hero/promo section [PUBLIC]
router.get('/random', async (req, res, next) => {
  try {
    const count = Math.min(parseInt(req.query.count, 10) || 6, 20);
    const rows = await db.all('SELECT * FROM `products` ORDER BY RAND() LIMIT ?', [count]);
    res.json(rows.map((r) => stripCostFields(r, false)));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
// Distinct category list for the sidebar filter [PUBLIC]
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await db.all('SELECT DISTINCT `category` FROM `products` ORDER BY `category`');
    res.json(rows.map((r) => r.category));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — single product [PUBLIC, cost hidden unless admin]
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const product = await db.get('SELECT * FROM `products` WHERE `id` = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(stripCostFields(product, Boolean(req.user)));
  } catch (err) {
    next(err);
  }
});

// POST /api/products — add new product [PROTECTED ADMIN ONLY]
router.post('/', requireAuth, uploadLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, price, category, stock, buying_price } = req.body;
    if (!name || !price || !category) {
      if (req.file) upload.deleteUploadedFile(req.file.filename);
      return res.status(400).json({ error: 'name, price and category are required' });
    }
    const image = req.file ? req.file.filename : null;

    const result = await db.run(
      `INSERT INTO \`products\` (\`name\`, \`description\`, \`price\`, \`category\`, \`stock\`, \`image\`, \`buying_price\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        parseFloat(price),
        category,
        parseInt(stock, 10) || 0,
        image,
        buying_price !== undefined && buying_price !== '' ? parseFloat(buying_price) : 0,
      ]
    );

    const product = await db.get('SELECT * FROM `products` WHERE `id` = ?', [result.lastInsertRowid]);
    logAudit(req, { event: 'product.create', actor: req.user.username, detail: `id=${product.id} name="${product.name}"` });
    res.status(201).json(product);
  } catch (err) {
    if (req.file) upload.deleteUploadedFile(req.file.filename);
    next(err);
  }
});

// PUT /api/products/:id — edit product [PROTECTED ADMIN ONLY]
router.put('/:id', requireAuth, uploadLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM `products` WHERE `id` = ?', [req.params.id]);
    if (!existing) {
      if (req.file) upload.deleteUploadedFile(req.file.filename);
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, description, price, category, stock, buying_price } = req.body;
    const image = req.file ? req.file.filename : existing.image;

    await db.run(
      `UPDATE \`products\` SET \`name\`=?, \`description\`=?, \`price\`=?, \`category\`=?, \`stock\`=?, \`image\`=?, \`buying_price\`=? WHERE \`id\`=?`,
      [
        name ?? existing.name,
        description ?? existing.description,
        price ? parseFloat(price) : existing.price,
        category ?? existing.category,
        stock !== undefined ? parseInt(stock, 10) : existing.stock,
        image,
        buying_price !== undefined && buying_price !== '' ? parseFloat(buying_price) : existing.buying_price,
        req.params.id,
      ]
    );

    // A new image replaced the old one — remove the now-orphaned old file from disk.
    if (req.file && existing.image && existing.image !== image) {
      upload.deleteUploadedFile(existing.image);
    }

    const updated = await db.get('SELECT * FROM `products` WHERE `id` = ?', [req.params.id]);
    logAudit(req, { event: 'product.update', actor: req.user.username, detail: `id=${updated.id} name="${updated.name}"` });
    res.json(updated);
  } catch (err) {
    if (req.file) upload.deleteUploadedFile(req.file.filename);
    next(err);
  }
});

// DELETE /api/products/:id — delete product [PROTECTED ADMIN ONLY]
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM `products` WHERE `id` = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const result = await db.run('DELETE FROM `products` WHERE `id` = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });

    if (existing.image) upload.deleteUploadedFile(existing.image);

    logAudit(req, { event: 'product.delete', actor: req.user.username, detail: `id=${existing.id} name="${existing.name}"` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
