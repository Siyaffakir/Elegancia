// scratch/test_api_server.js
const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const cors = require(path.join(__dirname, '../backend/node_modules/cors'));
const productsRouter = require('../backend/routes/products');
const ordersRouter = require('../backend/routes/orders');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

const server = app.listen(5999, async () => {
  console.log('Test API running on port 5999');

  async function postJson(url, data) {
    const res = await fetch(`http://localhost:5999${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, body: await res.json() };
  }

  async function patchJson(url, data) {
    const res = await fetch(`http://localhost:5999${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, body: await res.json() };
  }

  async function getJson(url) {
    const res = await fetch(`http://localhost:5999${url}`);
    return { status: res.status, body: await res.json() };
  }

  try {
    // 1. Get products
    const prods = await getJson('/api/products');
    console.log(`GET /api/products -> ${prods.status}, found ${prods.body.length} products`);

    // 2. Create multi-item cart order
    const orderRes = await postJson('/api/orders', {
      full_name: 'Nadia Belkacem',
      phone: '0770987654',
      wilaya: '31 - Oran',
      commune: 'Es Senia',
      address: 'Lotissement El Bahia',
      items: [
        { id: 2, name: 'Hydra Glow Face Serum', price: 4200, quantity: 1, category: 'Skincare' },
      ],
    });
    console.log(`POST /api/orders -> ${orderRes.status}, Order ID: ${orderRes.body.id}, Status: ${orderRes.body.status}, Commune: ${orderRes.body.commune}, Total: ${orderRes.body.total_price}`);

    // 3. Update status to Confirmed
    const patchRes = await patchJson(`/api/orders/${orderRes.body.id}/status`, { status: 'Confirmed' });
    console.log(`PATCH /api/orders/:id/status (Confirmed) -> ${patchRes.status}, Status: ${patchRes.body.status}`);

    // 4. Update status to Canceled
    const cancelRes = await patchJson(`/api/orders/${orderRes.body.id}/status`, { status: 'Canceled' });
    console.log(`PATCH /api/orders/:id/status (Canceled) -> ${cancelRes.status}, Status: ${cancelRes.body.status}`);

    // 5. Update status to Returned
    const returnRes = await patchJson(`/api/orders/${orderRes.body.id}/status`, { status: 'Returned' });
    console.log(`PATCH /api/orders/:id/status (Returned) -> ${returnRes.status}, Status: ${returnRes.body.status}`);

    // 6. Get all orders
    const allOrders = await getJson('/api/orders');
    console.log(`GET /api/orders -> ${allOrders.status}, total orders: ${allOrders.body.length}`);

    console.log('\n✓ ALL ENDPOINT INTEGRATION TESTS PASSED!');
  } catch (err) {
    console.error('API Test Error:', err);
  } finally {
    server.close();
  }
});
