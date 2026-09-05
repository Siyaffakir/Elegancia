# Elegancia MySQL Database & Dataset Guide

This directory contains the production-grade MySQL schema, complete dataset dump, and seed scripts for the **Elegancia** e-commerce platform.

---

## 📁 Files in this Directory

| File | Description |
| :--- | :--- |
| **`elegancia_mysql.sql`** | **Complete All-in-One MySQL Dump**: Database creation (`elegancia`), 11 table structures, and complete data inserts (products, orders, admin accounts, delivery pricing for all 58 wilayas, 1541 Algerian communes, audit logs, agencies, ad spend). |
| **`schema.sql`** | **DDL Schema Only**: Contains only `CREATE TABLE`, `INDEX`, and `FOREIGN KEY` definitions. |
| **`dataset.sql`** | **Data Inserts Only**: Data dump statements without table definitions. |
| **`seed_curated_catalog.sql`** | **Default Seed**: Curated 8-item Sephora luxury beauty catalog, delivery agencies, and default admin account. |

---

## 🚀 How to Import into MySQL (Manual)

### Option 1: Automatic Setup on Startup (Recommended)
Simply start the backend:
```bash
cd backend
npm run dev
```
The server will automatically connect to MySQL, create the `elegancia` database, set up all tables, and seed the entire catalog and 58 wilayas!

---

### Option 2: Using phpMyAdmin (XAMPP / WAMP / cPanel)

1. Open **phpMyAdmin** in your browser (`http://localhost/phpmyadmin`).
2. Click on the **Import** tab in the top navigation bar.
3. Click **Choose File** and select `backend/database/elegancia_mysql.sql`.
4. Click **Import / Go** at the bottom.
5. The database `elegancia` and all 11 tables with data will be created automatically.

---

### Option 3: Using MySQL Command Line (CLI)

```bash
mysql -u root -p < backend/database/elegancia_mysql.sql
```

---

## 🔄 Re-exporting Database Dump

If you ever add new products, orders, or delivery settings and want to generate an updated MySQL SQL dump:

```bash
cd backend
npm run db:export-mysql
```

---

## 📊 Database Schema Summary

1. **`admins`**: Administrator credentials and bcrypt password hashes.
2. **`products`**: Product catalog (price, buying price for profit calculations, stock, category, image URL).
3. **`orders`**: Customer checkout orders (name, phone, wilaya, commune, cart items JSON, delivery fee, total, status, logistics agency & tracking).
4. **`delivery_pricing`**: Per-wilaya configurable delivery fees (home and stopdesk) for all 58 Algerian wilayas.
5. **`delivery_agencies`**: Shipping courier partners (e.g. Yalidine Express, ZR Express, Maystro Delivery).
6. **`agency_remittances`**: Cash-on-delivery (COD) batch payout ledger.
7. **`agency_remittance_orders`**: Many-to-many relationship linking remittance payouts to individual orders.
8. **`ad_spend`**: Marketing expense tracking by date range.
9. **`audit_logs`**: Security & activity trail (logins, orders, price updates).
10. **`wilayas`**: 58 Algerian Wilayas (code, French name, Arabic name).
11. **`communes`**: 1541 Algerian Communes mapped to their respective wilaya.
