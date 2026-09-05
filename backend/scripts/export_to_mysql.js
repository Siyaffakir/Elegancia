/**
 * export_to_mysql.js
 * 
 * Exports the SQLite database (data.db) and Algerian Wilaya/Commune datasets
 * into production-ready MySQL SQL dump files.
 * 
 * Generates:
 * 1. backend/database/dz_shop_mysql.sql (Complete schema + data)
 * 2. backend/database/schema.sql (DDL schema only)
 * 3. backend/database/dataset.sql (Seed data only)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(ROOT_DIR, 'data.db');
const OUTPUT_DIR = path.join(ROOT_DIR, 'database');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to escape values for MySQL
function sqlVal(val, isJson = false) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  
  let str = String(val);
  if (isJson && typeof val === 'object') {
    str = JSON.stringify(val);
  }

  // Escape string for MySQL
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'");
  
  return `'${escaped}'`;
}

// Generate DDL Schema
function generateSchemaDDL() {
  return `-- ========================================================
-- DZ-SHOP MySQL Database Schema
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Generated on: ${new Date().toISOString()}
-- ========================================================

CREATE DATABASE IF NOT EXISTS \`elegancia\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE \`elegancia\`;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table structure for table \`admins\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`admins\`;
CREATE TABLE \`admins\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`username\` VARCHAR(100) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_admin_username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`products\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`products\`;
CREATE TABLE \`products\` (
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

-- --------------------------------------------------------
-- Table structure for table \`delivery_agencies\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`delivery_agencies\`;
CREATE TABLE \`delivery_agencies\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(150) NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_agency_name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`orders\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`orders\`;
CREATE TABLE \`orders\` (
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

-- --------------------------------------------------------
-- Table structure for table \`agency_remittances\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`agency_remittances\`;
CREATE TABLE \`agency_remittances\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`agency_id\` INT UNSIGNED NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`note\` TEXT,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_remittances_agency\` (\`agency_id\`),
  CONSTRAINT \`fk_remittance_agency\` FOREIGN KEY (\`agency_id\`) REFERENCES \`delivery_agencies\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`agency_remittance_orders\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`agency_remittance_orders\`;
CREATE TABLE \`agency_remittance_orders\` (
  \`remittance_id\` INT UNSIGNED NOT NULL,
  \`order_id\` INT UNSIGNED NOT NULL,
  PRIMARY KEY (\`remittance_id\`, \`order_id\`),
  KEY \`idx_remittance_orders_order\` (\`order_id\`),
  CONSTRAINT \`fk_ro_remittance\` FOREIGN KEY (\`remittance_id\`) REFERENCES \`agency_remittances\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_ro_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`delivery_pricing\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`delivery_pricing\`;
CREATE TABLE \`delivery_pricing\` (
  \`wilaya_code\` INT UNSIGNED NOT NULL,
  \`wilaya_name\` VARCHAR(100) NOT NULL,
  \`home_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`stopdesk_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`wilaya_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`ad_spend\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`ad_spend\`;
CREATE TABLE \`ad_spend\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`start_date\` DATE NOT NULL,
  \`end_date\` DATE NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`note\` TEXT,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_adspend_dates\` (\`start_date\`, \`end_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`audit_logs\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`audit_logs\`;
CREATE TABLE \`audit_logs\` (
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

-- --------------------------------------------------------
-- Table structure for table \`wilayas\` (Algeria 58 Wilayas)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`wilayas\`;
CREATE TABLE \`wilayas\` (
  \`code\` INT UNSIGNED NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`ar_name\` VARCHAR(100) NOT NULL,
  PRIMARY KEY (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table \`communes\` (Algeria 1541 Communes)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`communes\`;
CREATE TABLE \`communes\` (
  \`id\` INT UNSIGNED NOT NULL,
  \`wilaya_id\` INT UNSIGNED NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`ar_name\` VARCHAR(100) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_communes_wilaya\` (\`wilaya_id\`),
  CONSTRAINT \`fk_commune_wilaya\` FOREIGN KEY (\`wilaya_id\`) REFERENCES \`wilayas\` (\`code\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;
}

// Generate Data Inserts
function generateDataInserts(db) {
  const sqlChunks = [];
  sqlChunks.push('SET FOREIGN_KEY_CHECKS = 0;\n');

  // Helper for batch insert
  function batchInsert(tableName, columns, rows, batchSize = 100) {
    if (!rows || rows.length === 0) return '';
    let out = `-- Data for table \`${tableName}\` (${rows.length} rows)\n`;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const colList = columns.map((c) => `\`${c}\``).join(', ');
      const valuesList = chunk.map((r) => {
        const valStr = columns.map((c) => sqlVal(r[c])).join(', ');
        return `(${valStr})`;
      }).join(',\n  ');
      out += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n  ${valuesList};\n`;
    }
    return out + '\n';
  }

  // 1. Wilayas
  const wilayaJsonPath = path.join(ROOT_DIR, 'data', 'Wilaya_Of_Algeria.json');
  if (fs.existsSync(wilayaJsonPath)) {
    const wilayas = JSON.parse(fs.readFileSync(wilayaJsonPath, 'utf8')).map((w) => ({
      code: parseInt(w.code, 10),
      name: w.name,
      ar_name: w.ar_name,
    }));
    sqlChunks.push(batchInsert('wilayas', ['code', 'name', 'ar_name'], wilayas, 100));
  }

  // 2. Communes
  const communeJsonPath = path.join(ROOT_DIR, 'data', 'Commune_Of_Algeria.json');
  if (fs.existsSync(communeJsonPath)) {
    const communes = JSON.parse(fs.readFileSync(communeJsonPath, 'utf8')).map((c) => ({
      id: parseInt(c.id, 10),
      wilaya_id: parseInt(c.wilaya_id, 10),
      name: c.name,
      ar_name: c.ar_name,
    }));
    sqlChunks.push(batchInsert('communes', ['id', 'wilaya_id', 'name', 'ar_name'], communes, 150));
  }

  // 3. Admins
  const admins = db.prepare('SELECT * FROM admins').all();
  if (admins.length > 0) {
    sqlChunks.push(batchInsert('admins', ['id', 'username', 'password_hash', 'created_at'], admins));
  }

  // 4. Products
  const products = db.prepare('SELECT * FROM products').all();
  if (products.length > 0) {
    const cols = ['id', 'name', 'description', 'price', 'buying_price', 'category', 'stock', 'image', 'created_at'];
    sqlChunks.push(batchInsert('products', cols, products));
  }

  // 5. Delivery Agencies
  const agencies = db.prepare('SELECT * FROM delivery_agencies').all();
  if (agencies.length > 0) {
    sqlChunks.push(batchInsert('delivery_agencies', ['id', 'name', 'created_at'], agencies));
  }

  // 6. Delivery Pricing
  const pricing = db.prepare('SELECT * FROM delivery_pricing').all();
  if (pricing.length > 0) {
    sqlChunks.push(batchInsert('delivery_pricing', ['wilaya_code', 'wilaya_name', 'home_fee', 'stopdesk_fee', 'updated_at'], pricing, 100));
  }

  // 7. Orders
  const orders = db.prepare('SELECT * FROM orders').all();
  if (orders.length > 0) {
    const cols = [
      'id', 'full_name', 'wilaya', 'commune', 'address', 'phone',
      'product_id', 'product_name', 'items', 'delivery_fee',
      'total_price', 'status', 'delivery_type', 'delivery_agency_id',
      'tracking_tag', 'created_at'
    ];
    sqlChunks.push(batchInsert('orders', cols, orders));
  }

  // 8. Agency Remittances
  const remittances = db.prepare('SELECT * FROM agency_remittances').all();
  if (remittances.length > 0) {
    sqlChunks.push(batchInsert('agency_remittances', ['id', 'agency_id', 'amount', 'note', 'created_at'], remittances));
  }

  // 9. Agency Remittance Orders
  const remittanceOrders = db.prepare('SELECT * FROM agency_remittance_orders').all();
  if (remittanceOrders.length > 0) {
    sqlChunks.push(batchInsert('agency_remittance_orders', ['remittance_id', 'order_id'], remittanceOrders));
  }

  // 10. Ad Spend
  const adSpend = db.prepare('SELECT * FROM ad_spend').all();
  if (adSpend.length > 0) {
    sqlChunks.push(batchInsert('ad_spend', ['id', 'start_date', 'end_date', 'amount', 'note', 'created_at'], adSpend));
  }

  // 11. Audit Logs
  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id ASC').all();
  if (auditLogs.length > 0) {
    const cols = ['id', 'event_type', 'actor', 'ip', 'success', 'detail', 'created_at'];
    sqlChunks.push(batchInsert('audit_logs', cols, auditLogs, 100));
  }

  sqlChunks.push('SET FOREIGN_KEY_CHECKS = 1;\n');
  return sqlChunks.join('\n');
}

function main() {
  console.log(`[Export] Opening SQLite database from: ${DB_PATH}`);
  const db = new Database(DB_PATH, { readonly: true });

  const schemaDDL = generateSchemaDDL();
  const dataSQL = generateDataInserts(db);
  const fullSQL = `${schemaDDL}\n-- ========================================================\n-- DATA INSERTS\n-- ========================================================\n\n${dataSQL}`;

  const schemaPath = path.join(OUTPUT_DIR, 'schema.sql');
  const fullPath = path.join(OUTPUT_DIR, 'elegancia_mysql.sql');
  const dzPath = path.join(OUTPUT_DIR, 'dz_shop_mysql.sql');
  const seedPath = path.join(OUTPUT_DIR, 'dataset.sql');

  fs.writeFileSync(schemaPath, schemaDDL, 'utf8');
  console.log(`[Export] Wrote schema DDL to: ${schemaPath}`);

  fs.writeFileSync(fullPath, fullSQL, 'utf8');
  fs.writeFileSync(dzPath, fullSQL, 'utf8');
  console.log(`[Export] Wrote full MySQL database dump to: ${fullPath}`);

  fs.writeFileSync(seedPath, dataSQL, 'utf8');
  console.log(`[Export] Wrote dataset inserts to: ${seedPath}`);

  db.close();
  console.log(`[Export] Successfully completed MySQL database export!`);
}

main();
