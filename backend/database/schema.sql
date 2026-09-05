-- ========================================================
-- DZ-SHOP MySQL Database Schema
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Generated on: 2026-08-27T11:47:47.218Z
-- ========================================================

CREATE DATABASE IF NOT EXISTS `elegancia` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `elegancia`;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table structure for table `admins`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `products`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `buying_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(100) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `image` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `delivery_agencies`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `delivery_agencies`;
CREATE TABLE `delivery_agencies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agency_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(255) NOT NULL,
  `wilaya` VARCHAR(100) NOT NULL,
  `commune` VARCHAR(100) NOT NULL DEFAULT '',
  `address` TEXT,
  `phone` VARCHAR(30) NOT NULL,
  `product_id` INT UNSIGNED NOT NULL DEFAULT 0,
  `product_name` VARCHAR(255) NOT NULL DEFAULT '',
  `items` LONGTEXT,
  `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `delivery_type` VARCHAR(20) NOT NULL DEFAULT 'home',
  `delivery_agency_id` INT UNSIGNED DEFAULT NULL,
  `tracking_tag` VARCHAR(100) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_phone` (`phone`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_agency` (`delivery_agency_id`),
  CONSTRAINT `fk_orders_agency` FOREIGN KEY (`delivery_agency_id`) REFERENCES `delivery_agencies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `agency_remittances`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `agency_remittances`;
CREATE TABLE `agency_remittances` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agency_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_remittances_agency` (`agency_id`),
  CONSTRAINT `fk_remittance_agency` FOREIGN KEY (`agency_id`) REFERENCES `delivery_agencies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `agency_remittance_orders`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `agency_remittance_orders`;
CREATE TABLE `agency_remittance_orders` (
  `remittance_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`remittance_id`, `order_id`),
  KEY `idx_remittance_orders_order` (`order_id`),
  CONSTRAINT `fk_ro_remittance` FOREIGN KEY (`remittance_id`) REFERENCES `agency_remittances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ro_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `delivery_pricing`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `delivery_pricing`;
CREATE TABLE `delivery_pricing` (
  `wilaya_code` INT UNSIGNED NOT NULL,
  `wilaya_name` VARCHAR(100) NOT NULL,
  `home_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stopdesk_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`wilaya_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ad_spend`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ad_spend`;
CREATE TABLE `ad_spend` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_adspend_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `audit_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(100) NOT NULL,
  `actor` VARCHAR(100) DEFAULT NULL,
  `ip` VARCHAR(50) DEFAULT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `detail` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_event_type` (`event_type`),
  KEY `idx_audit_actor` (`actor`),
  KEY `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `wilayas` (Algeria 58 Wilayas)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `wilayas`;
CREATE TABLE `wilayas` (
  `code` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `ar_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `communes` (Algeria 1541 Communes)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `communes`;
CREATE TABLE `communes` (
  `id` INT UNSIGNED NOT NULL,
  `wilaya_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `ar_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_communes_wilaya` (`wilaya_id`),
  CONSTRAINT `fk_commune_wilaya` FOREIGN KEY (`wilaya_id`) REFERENCES `wilayas` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
