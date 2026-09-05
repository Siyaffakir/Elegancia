# Elegancia Cosmetics & Care — React E-commerce (Algeria)

A modern, luxury e-commerce platform with multi-category beauty catalog, cash on delivery across 58 Algerian Wilayas, and a hardened, JWT-authenticated Admin Studio. Prices in DZD.

## Stack
- **Frontend:** React 18 + Vite + React Router + Context API
- **Backend:** Node.js + Express + Helmet + JWT + bcryptjs + express-rate-limit
- **Database:** MySQL (via `mysql2/promise`) with automatic database/table creation and data auto-seeding on startup (`elegancia` database, compatible with XAMPP, Laragon, WAMP, Docker, and Cloud MySQL)
- **Security:** JWT Auth, bcrypt password hashing, shared API key gate, path traversal defenses, brute-force rate limiters, HTTP security headers
- **Images:** Securely validated uploads stored in `backend/uploads/` with traversal-shielded delivery

---

## Local Development (XAMPP / Laragon / WAMP)

### 1. Start MySQL
1. Open **XAMPP** or **Laragon** and start the **MySQL** service.
2. The backend will automatically create the `elegancia` database and seed the tables when started!

### 2. Backend
```bash
cd backend
npm install
npm run dev                # runs on http://localhost:5000
```
> The backend automatically creates the `elegancia` database, all 11 tables, and seeds the default admin account, luxury beauty catalog, and 58-wilaya delivery pricing.

> **Default Admin Account:**
> - Username: `admin`
> - Password: `admin123456`
> - *(Configurable via `ADMIN_DEFAULT_USER` and `ADMIN_DEFAULT_PASS` in `backend/.env`)*

### 3. Frontend
```bash
cd frontend
npm install
npm run dev               # runs on http://localhost:5173
```

Visit:
- `/` — Home (hero banner, departments, curated catalog)
- `/products` — Full catalog with search, category filtering & sorting
- `/product/:id` — Product detail with rapid single-item checkout or shopping bag
- `/dz-admin-secure-portal-2026` — Secret JWT Authenticated Admin Studio (hidden from public UI)

---

## Environment Variables

### `backend/.env`
| Var | Purpose | Default |
|---|---|---|
| `PORT` | API port | `5000` |
| `CLIENT_ORIGIN` | Allowed CORS origin(s) | `http://localhost:5173` |
| `API_KEY` | Shared gate key matching frontend `VITE_API_KEY` | `a821978df0fa07cd...` |
| `DB_HOST` | MySQL Host | `localhost` |
| `DB_PORT` | MySQL Port | `3306` |
| `DB_USER` | MySQL Username | `root` |
| `DB_PASSWORD` | MySQL Password | `""` |
| `DB_NAME` | Database Name | `elegancia` |
| `JWT_SECRET` | Secret key used for signing and verifying JWT tokens | |
| `ADMIN_DEFAULT_USER` | Initial admin username if table is empty | `admin` |
| `ADMIN_DEFAULT_PASS` | Initial admin password | `admin123456` |

---

## Standalone MySQL Dump Files

- `backend/database/elegancia_mysql.sql`: Complete database schema & dataset dump
- `backend/database/schema.sql`: DDL schema only
- `backend/database/seed_curated_catalog.sql`: 8-item luxury catalog & delivery agencies
"# Elegancia" 
