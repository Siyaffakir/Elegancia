// server.js — Hardened API entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./db');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const deliveryRouter = require('./routes/delivery');
const financeRouter = require('./routes/finance');
const agenciesRouter = require('./routes/agencies');
const { createSafeStaticServer } = require('./middleware/pathSecurity');
const { requireApiKey } = require('./middleware/apiKey');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. HTTP Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS configuration
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by CORS'), false);
    },
    credentials: true,
  })
);

// 3. Body parsers with size limit defense
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. General API Rate Limiting (Defense against DDoS and aggressive scrapers)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', generalLimiter);

// 4.5 Shared API Key Gate — every /api request must carry the frontend's X-API-Key,
// except the health check (used by uptime monitors that won't have the key).
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return requireApiKey(req, res, next);
});

// 5. Protected & Sanitized Static Upload Delivery (Path Traversal Protection)
const uploadsDirectory = path.resolve(__dirname, 'uploads');
const tmpUploadsDirectory = path.join('/tmp', 'uploads');
app.use('/uploads', createSafeStaticServer(uploadsDirectory, tmpUploadsDirectory));

// Root route (friendly status endpoint for Vercel / health probes)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Elegancia Backend API is online.',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      orders: '/api/orders',
    },
  });
});

// 6. API Route Mounting
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/finance', financeRouter);
app.use('/api/agencies', agenciesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    security: {
      jwt: true,
      apiKey: true,
      rateLimit: true,
      pathTraversalProtection: true,
      helmetHeaders: true,
    },
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  if (err && err.message === 'CORS policy: Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS forbidden' });
  }
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize database and start server
let server = null;
async function startServer() {
  try {
    await initDatabase();
    server = app.listen(PORT, () => {
      console.log(`[DZ Shop] Hardened API running on http://localhost:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('[Server Startup Error] Could not start server because MySQL failed to initialize.');
    console.error('Make sure MySQL is running and credentials in .env are correct:', err.message);
  }
}

// Standalone mode: listen on PORT if executed directly (node server.js)
// Serverless mode (Vercel): exported app is invoked per request
if (process.env.VERCEL !== '1' && require.main === module) {
  startServer();
} else if (process.env.VERCEL === '1') {
  // Pre-warm database pool on Vercel cold starts
  initDatabase().catch((err) => {
    console.warn('[Vercel DB Init Notice]:', err.message);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.startServer = startServer;
