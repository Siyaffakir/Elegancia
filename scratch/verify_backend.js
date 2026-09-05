// scratch/verify_backend.js
const db = require('../backend/db.js');

console.log('--- 1. Testing Products Catalog ---');
const products = db.prepare('SELECT id, name, category, price, stock FROM products').all();
console.log(`Total active products: ${products.length}`);
console.log(products);

const makeupCheck = db.prepare(`
  SELECT COUNT(*) as c FROM products 
  WHERE LOWER(category) = 'makeup' 
     OR LOWER(name) LIKE '%lipstick%' 
     OR LOWER(name) LIKE '%mascara%'
`).get().c;
console.log(`Makeup / Lipstick products count: ${makeupCheck} (Should be 0)`);
if (makeupCheck !== 0) {
  throw new Error('Makeup/lipstick products found!');
}

console.log('\n--- 2. Testing Multi-Item Cart Order Creation ---');
const testOrderItems = [
  { id: 2, name: 'Hydra Glow Face Serum', price: 4200, quantity: 2, category: 'Skincare', total: 8400 },
  { id: 3, name: 'Luxe Rose Eau de Parfum', price: 7800, quantity: 1, category: 'Fragrance', total: 7800 },
];
const subtotal = 8400 + 7800; // 16200 -> Free delivery
const deliveryFee = 0;
const totalPrice = subtotal + deliveryFee;

const insertStmt = db.prepare(`
  INSERT INTO orders (full_name, wilaya, commune, address, phone, product_id, product_name, items, delivery_fee, total_price, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const result = insertStmt.run(
  'Samir Haddad',
  '16 - Alger',
  'Bab Ezzouar',
  'Cité 8 Mai 1945, Bat 12',
  '0550123456',
  2,
  'Hydra Glow Face Serum (x2), Luxe Rose Eau de Parfum (x1)',
  JSON.stringify(testOrderItems),
  deliveryFee,
  totalPrice,
  'Pending'
);

const createdId = result.lastInsertRowid;
console.log(`Created test order ID: ${createdId}`);

const fetchedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(createdId);
console.log('Fetched order:', {
  ...fetchedOrder,
  items: JSON.parse(fetchedOrder.items),
});

if (fetchedOrder.commune !== 'Bab Ezzouar') {
  throw new Error('Commune mismatch!');
}
if (fetchedOrder.status !== 'Pending') {
  throw new Error('Initial status should be Pending!');
}

console.log('\n--- 3. Testing Order Status Transitions (Confirmed, Canceled, Returned) ---');
// Transition to Confirmed
db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Confirmed', createdId);
let check = db.prepare('SELECT status FROM orders WHERE id = ?').get(createdId);
console.log(`Updated status to: ${check.status} (Expected: Confirmed)`);
if (check.status !== 'Confirmed') throw new Error('Failed to update status to Confirmed');

// Transition to Canceled
db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Canceled', createdId);
check = db.prepare('SELECT status FROM orders WHERE id = ?').get(createdId);
console.log(`Updated status to: ${check.status} (Expected: Canceled)`);
if (check.status !== 'Canceled') throw new Error('Failed to update status to Canceled');

// Transition to Returned
db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Returned', createdId);
check = db.prepare('SELECT status FROM orders WHERE id = ?').get(createdId);
console.log(`Updated status to: ${check.status} (Expected: Returned)`);
if (check.status !== 'Returned') throw new Error('Failed to update status to Returned');

// Set back to Confirmed
db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Confirmed', createdId);

console.log('\n--- 4. Checking All Orders in DB ---');
const allOrders = db.prepare('SELECT id, full_name, wilaya, commune, phone, total_price, status FROM orders').all();
console.log('All orders:', allOrders);

console.log('\n✓ ALL BACKEND DATABASE AND SCHEMA CHECKS PASSED SUCCESSFULLY!');
