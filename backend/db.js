// db.js — MySQL Connection, Schema Initialization & Auto-Seeding (XAMPP / Laragon / WAMP ready)
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let pool = null;
let initPromise = null;

function getDatabaseConfig() {
  let host = process.env.DB_HOST || process.env.MYSQL_HOST;
  let port = process.env.DB_PORT || process.env.MYSQL_PORT;
  let user = process.env.DB_USER || process.env.MYSQL_USER;
  let password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : process.env.MYSQL_PASSWORD;
  let database = process.env.DB_NAME || process.env.MYSQL_DATABASE;
  let ssl = process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true';

  const rawUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname) host = parsed.hostname;
      if (parsed.port) port = parsed.port;
      if (parsed.username) user = decodeURIComponent(parsed.username);
      if (parsed.password) password = decodeURIComponent(parsed.password);
      if (parsed.pathname && parsed.pathname.length > 1) {
        database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
      }
      if (rawUrl.includes('ssl') || parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('ssl')) {
        ssl = true;
      }
    } catch (e) {
      console.warn('[Database] Could not parse DATABASE_URL, using individual variables:', e.message);
    }
  }

  // Trim string values if present
  host = typeof host === 'string' ? host.trim() : (host || 'localhost');
  user = typeof user === 'string' ? user.trim() : (user || 'root');
  password = typeof password === 'string' ? password.trim() : (password !== undefined ? password : '');
  database = typeof database === 'string' ? database.trim() : (database || 'elegancia');
  port = parseInt(port, 10) || 3306;

  // Auto-enable SSL for remote cloud databases (Aiven, Railway, AWS RDS, PlanetScale, etc.) unless explicitly set to false
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal && process.env.DB_SSL !== 'false' && process.env.MYSQL_SSL !== 'false') {
    ssl = true;
  }

  const sslConfig = ssl ? { rejectUnauthorized: false } : undefined;

  return { host, port, user, password, database, sslConfig, isLocal };
}

/**
 * Initializes the MySQL database connection, creates tables IF NOT EXISTS,
 * and automatically seeds default admin, catalog, and delivery pricing if empty.
 */
async function initDatabase() {
  if (pool) return pool;

  const config = getDatabaseConfig();

  try {
    // 1. Attempt to ensure DB exists on local environments (XAMPP/Laragon)
    if (config.isLocal && config.user === 'root') {
      try {
        const rootConnection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          ssl: config.sslConfig,
        });

        await rootConnection.query(
          `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await rootConnection.end();
      } catch (createDbErr) {
        console.log(`[Database] Skipping CREATE DATABASE check: ${createDbErr.message}`);
      }
    }

    // 2. Create the main connection pool connected to our database
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.sslConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      decimalNumbers: true,
    });

    console.log(`[Database] Connected to MySQL database "${config.database}" at ${config.host}:${config.port}`);

    // 3. Create all necessary tables
    await createTables();

    // 4. Run column migrations if necessary
    await ensureColumns();

    // 5. Auto-seed catalog, admin, wilayas, communes, and delivery pricing
    await autoSeed();

    console.log('[Database] Database tables and seed check completed successfully.');
    return pool;
  } catch (err) {
    console.error('[Database ERROR] Failed to connect/initialize MySQL database:', err.message);
    console.error('Make sure your MySQL server is running and DB credentials (or DATABASE_URL) are correct.');
    throw err;
  }
}

async function ensureDatabaseReady() {
  if (pool) return pool;
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`admins\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`username\` VARCHAR(100) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_admin_username\` (\`username\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` TEXT,
      \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`buying_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`category\` VARCHAR(100) NOT NULL,
      \`stock\` INT NOT NULL DEFAULT 0,
      \`image\` VARCHAR(500) DEFAULT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_products_category\` (\`category\`),
      KEY \`idx_products_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`delivery_agencies\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(150) NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_agency_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`full_name\` VARCHAR(255) NOT NULL,
      \`wilaya\` VARCHAR(100) NOT NULL,
      \`commune\` VARCHAR(100) NOT NULL DEFAULT '',
      \`address\` TEXT,
      \`phone\` VARCHAR(30) NOT NULL,
      \`product_id\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`product_name\` VARCHAR(255) NOT NULL DEFAULT '',
      \`items\` LONGTEXT,
      \`delivery_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`total_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
      \`delivery_type\` VARCHAR(20) NOT NULL DEFAULT 'home',
      \`delivery_agency_id\` INT UNSIGNED DEFAULT NULL,
      \`tracking_tag\` VARCHAR(100) NOT NULL DEFAULT '',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_orders_status\` (\`status\`),
      KEY \`idx_orders_phone\` (\`phone\`),
      KEY \`idx_orders_created_at\` (\`created_at\`),
      KEY \`idx_orders_agency\` (\`delivery_agency_id\`),
      CONSTRAINT \`fk_orders_agency\` FOREIGN KEY (\`delivery_agency_id\`) REFERENCES \`delivery_agencies\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`agency_remittances\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`agency_id\` INT UNSIGNED NOT NULL,
      \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`note\` TEXT,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_remittances_agency\` (\`agency_id\`),
      CONSTRAINT \`fk_remittance_agency\` FOREIGN KEY (\`agency_id\`) REFERENCES \`delivery_agencies\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`agency_remittance_orders\` (
      \`remittance_id\` INT UNSIGNED NOT NULL,
      \`order_id\` INT UNSIGNED NOT NULL,
      PRIMARY KEY (\`remittance_id\`, \`order_id\`),
      KEY \`idx_remittance_orders_order\` (\`order_id\`),
      CONSTRAINT \`fk_ro_remittance\` FOREIGN KEY (\`remittance_id\`) REFERENCES \`agency_remittances\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_ro_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`delivery_pricing\` (
      \`wilaya_code\` INT UNSIGNED NOT NULL,
      \`wilaya_name\` VARCHAR(100) NOT NULL,
      \`home_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`stopdesk_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`wilaya_code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`ad_spend\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`start_date\` DATE NOT NULL,
      \`end_date\` DATE NOT NULL,
      \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`note\` TEXT,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_adspend_dates\` (\`start_date\`, \`end_date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`audit_logs\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`event_type\` VARCHAR(100) NOT NULL,
      \`actor\` VARCHAR(100) DEFAULT NULL,
      \`ip\` VARCHAR(50) DEFAULT NULL,
      \`success\` TINYINT(1) NOT NULL DEFAULT 1,
      \`detail\` TEXT,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_audit_event_type\` (\`event_type\`),
      KEY \`idx_audit_actor\` (\`actor\`),
      KEY \`idx_audit_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`wilayas\` (
      \`code\` INT UNSIGNED NOT NULL,
      \`name\` VARCHAR(100) NOT NULL,
      \`ar_name\` VARCHAR(100) NOT NULL,
      PRIMARY KEY (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`communes\` (
      \`id\` INT UNSIGNED NOT NULL,
      \`wilaya_id\` INT UNSIGNED NOT NULL,
      \`name\` VARCHAR(100) NOT NULL,
      \`ar_name\` VARCHAR(100) NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_communes_wilaya\` (\`wilaya_id\`),
      CONSTRAINT \`fk_commune_wilaya\` FOREIGN KEY (\`wilaya_id\`) REFERENCES \`wilayas\` (\`code\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureColumns() {
  // Check products columns
  const [productCols] = await pool.query(`SHOW COLUMNS FROM \`products\``);
  const pColNames = new Set(productCols.map((c) => c.Field));
  if (!pColNames.has('buying_price')) {
    await pool.query(`ALTER TABLE \`products\` ADD COLUMN \`buying_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER \`price\``);
  }

  // Check orders columns
  const [orderCols] = await pool.query(`SHOW COLUMNS FROM \`orders\``);
  const oColNames = new Set(orderCols.map((c) => c.Field));
  if (!oColNames.has('delivery_type')) {
    await pool.query(`ALTER TABLE \`orders\` ADD COLUMN \`delivery_type\` VARCHAR(20) NOT NULL DEFAULT 'home' AFTER \`status\``);
  }
}

async function autoSeed() {
  // 1. Seed Wilayas & Communes
  const [[{ count: wilayaCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `wilayas`');
  if (wilayaCount === 0) {
    const wilayaJsonPath = path.join(__dirname, 'data', 'Wilaya_Of_Algeria.json');
    if (fs.existsSync(wilayaJsonPath)) {
      const wilayas = JSON.parse(fs.readFileSync(wilayaJsonPath, 'utf8'));
      const values = wilayas.map((w) => [parseInt(w.code, 10), w.name, w.ar_name]);
      await pool.query('INSERT INTO `wilayas` (`code`, `name`, `ar_name`) VALUES ?', [values]);
      console.log(`[Seed] Seeded ${wilayas.length} Algerian wilayas.`);
    }
  }

  const [[{ count: communeCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `communes`');
  if (communeCount === 0) {
    const communeJsonPath = path.join(__dirname, 'data', 'Commune_Of_Algeria.json');
    if (fs.existsSync(communeJsonPath)) {
      const communes = JSON.parse(fs.readFileSync(communeJsonPath, 'utf8'));
      const values = communes.map((c) => [parseInt(c.id, 10), parseInt(c.wilaya_id, 10), c.name, c.ar_name]);
      // Batch insert in chunks of 500
      for (let i = 0; i < values.length; i += 500) {
        const chunk = values.slice(i, i + 500);
        await pool.query('INSERT INTO `communes` (`id`, `wilaya_id`, `name`, `ar_name`) VALUES ?', [chunk]);
      }
      console.log(`[Seed] Seeded ${communes.length} Algerian communes.`);
    }
  }

  // 2. Seed Delivery Pricing (all 58 wilayas)
  const [[{ count: pricingCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `delivery_pricing`');
  if (pricingCount === 0) {
    const NORTH_HUB = { home: 500, stopdesk: 300 };
    const NORTH_NEAR = { home: 700, stopdesk: 400 };
    const MAJOR_CITY = { home: 750, stopdesk: 450 };
    const HIGH_PLAINS = { home: 900, stopdesk: 550 };
    const SOUTH = { home: 1100, stopdesk: 700 };
    const FAR_SOUTH = { home: 1600, stopdesk: 1100 };

    const TIER_BY_WILAYA_CODE = {
      16: NORTH_HUB,
      9: NORTH_NEAR, 35: NORTH_NEAR, 42: NORTH_NEAR, 10: NORTH_NEAR, 26: NORTH_NEAR, 44: NORTH_NEAR, 2: NORTH_NEAR, 15: NORTH_NEAR, 6: NORTH_NEAR, 34: NORTH_NEAR,
      31: MAJOR_CITY, 25: MAJOR_CITY, 23: MAJOR_CITY, 19: MAJOR_CITY, 5: MAJOR_CITY, 13: MAJOR_CITY, 27: MAJOR_CITY, 29: MAJOR_CITY, 22: MAJOR_CITY, 21: MAJOR_CITY, 18: MAJOR_CITY, 24: MAJOR_CITY, 41: MAJOR_CITY, 4: MAJOR_CITY, 12: MAJOR_CITY, 48: MAJOR_CITY, 46: MAJOR_CITY, 36: MAJOR_CITY, 43: MAJOR_CITY, 40: MAJOR_CITY,
      3: HIGH_PLAINS, 28: HIGH_PLAINS, 14: HIGH_PLAINS, 20: HIGH_PLAINS, 32: HIGH_PLAINS, 45: HIGH_PLAINS, 38: HIGH_PLAINS, 17: HIGH_PLAINS,
      7: SOUTH, 39: SOUTH, 30: SOUTH, 47: SOUTH, 8: SOUTH, 55: SOUTH, 57: SOUTH, 51: SOUTH,
      1: FAR_SOUTH, 11: FAR_SOUTH, 33: FAR_SOUTH, 37: FAR_SOUTH, 49: FAR_SOUTH, 50: FAR_SOUTH, 52: FAR_SOUTH, 53: FAR_SOUTH, 54: FAR_SOUTH, 56: FAR_SOUTH, 58: FAR_SOUTH,
    };

    const wilayaJsonPath = path.join(__dirname, 'data', 'Wilaya_Of_Algeria.json');
    if (fs.existsSync(wilayaJsonPath)) {
      const wilayaData = JSON.parse(fs.readFileSync(wilayaJsonPath, 'utf8'));
      const pricingValues = wilayaData.map((w) => {
        const code = parseInt(w.code, 10);
        const tier = TIER_BY_WILAYA_CODE[code] || MAJOR_CITY;
        return [code, w.name, tier.home, tier.stopdesk];
      });
      await pool.query('INSERT INTO `delivery_pricing` (`wilaya_code`, `wilaya_name`, `home_fee`, `stopdesk_fee`) VALUES ?', [pricingValues]);
      console.log(`[Seed] Seeded default delivery pricing for ${wilayaData.length} wilayas.`);
    }
  }

  // 3. Seed Default Admin Account
  const [[{ count: adminCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `admins`');
  if (adminCount === 0) {
    const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123456';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPass, salt);
    await pool.query('INSERT INTO `admins` (`username`, `password_hash`) VALUES (?, ?)', [defaultUser, hash]);
    console.log(`[Seed] Seeded default administrator account: "${defaultUser}"`);
  }

  // 4. Seed Curated Beauty Catalog
  const [[{ count: productCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `products`');
  if (productCount === 0) {
    const demo = [
      [
        'Hydra Glow Hyaluronic Acid Face Serum',
        'Intensely hydrating daily serum packed with multi-molecular hyaluronic acid and vitamin B5 for plump, glowing skin.',
        4200.00,
        3200.00,
        'Skincare',
        30,
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Luxe Rose Eau de Parfum (50ml)',
        'Sensual floral fragrance blending Damascena Rose, sparkling Italian bergamot, and warm amber crystals.',
        7800.00,
        5800.00,
        'Fragrance',
        18,
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Vitamin C 20% Radiance Glow Cream',
        'Brightening antioxidant moisturizer that evens skin tone, fades dark spots, and restores youthful radiance.',
        3900.00,
        2900.00,
        'Skincare',
        22,
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Pure Argan & Keratin Repair Hair Serum',
        'Intense smoothing hair elixir for silky, frizz-free shine and heat protection up to 230°C.',
        2900.00,
        2100.00,
        'Haircare',
        35,
        'https://images.unsplash.com/photo-1608248597359-0098f98ecbe1?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Botanical Body Polish & Shea Scrub',
        'Exfoliating crushed sugar and sweet almond body scrub for baby-soft, luminous and refreshed skin.',
        2400.00,
        1700.00,
        'Bath & Body',
        28,
        'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Niacinamide 10% + Zinc Pore Minimizing Toner',
        'Purifying botanical essence that refines pores, balances excess sebum, and strengthens the skin barrier.',
        3200.00,
        2400.00,
        'Skincare',
        40,
        'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Oud Royal & Amber Crystal Extrait (100ml)',
        'Majestic oriental fragrance featuring smoky Cambodian oud, sweet vanilla orchid, and golden amber.',
        9500.00,
        7200.00,
        'Fragrance',
        14,
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80',
      ],
      [
        'Deep Moisture Collagen Restoring Night Mask',
        'Overnight leave-on beauty treatment infused with marine collagen and peptides for firmer, deeply nourished skin.',
        4600.00,
        3500.00,
        'Skincare',
        25,
        'https://images.unsplash.com/photo-1567928815104-b7980ee5032e?auto=format&fit=crop&w=800&q=80',
      ],
    ];

    await pool.query(
      'INSERT INTO `products` (`name`, `description`, `price`, `buying_price`, `category`, `stock`, `image`) VALUES ?',
      [demo]
    );
    console.log(`[Seed] Seeded ${demo.length} luxury beauty products.`);
  }

  // 5. Seed Delivery Agencies
  const [[{ count: agencyCount }]] = await pool.query('SELECT COUNT(*) AS count FROM `delivery_agencies`');
  if (agencyCount === 0) {
    const agencies = [['Yalidine Express'], ['ZR Express'], ['Maystro Delivery']];
    await pool.query('INSERT INTO `delivery_agencies` (`name`) VALUES ?', [agencies]);
    console.log(`[Seed] Seeded default delivery agencies.`);
  }
}

/**
 * Async query helpers
 */

// Return array of rows
async function all(sql, params = []) {
  if (!pool) await ensureDatabaseReady();
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Return single row or null
async function get(sql, params = []) {
  if (!pool) await ensureDatabaseReady();
  const [rows] = await pool.query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

// Execute INSERT/UPDATE/DELETE and return result with normalized fields
async function run(sql, params = []) {
  if (!pool) await ensureDatabaseReady();
  const [result] = await pool.query(sql, params);
  return {
    lastInsertRowid: result.insertId,
    changes: result.affectedRows,
    insertId: result.insertId,
    affectedRows: result.affectedRows,
  };
}

// Raw query
async function query(sql, params = []) {
  if (!pool) await ensureDatabaseReady();
  return pool.query(sql, params);
}

// Get connection for transactions
async function getConnection() {
  if (!pool) await ensureDatabaseReady();
  return pool.getConnection();
}

// Transaction wrapper
async function transaction(callback) {
  if (!pool) await ensureDatabaseReady();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  initDatabase,
  ensureDatabaseReady,
  all,
  get,
  run,
  query,
  getConnection,
  transaction,
};
