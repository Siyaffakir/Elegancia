import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import AdminDashboard from './pages/AdminDashboard';

// Secret admin route — not linked anywhere in the public UI.
// Can be customized via VITE_ADMIN_PATH in frontend/.env
const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || 'dz-admin-secure-portal-2026';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path={`/${ADMIN_PATH}`} element={<AdminDashboard />} />
              {ADMIN_PATH !== 'dz-admin-secure-portal-2026' && (
                <Route path="/dz-admin-secure-portal-2026" element={<AdminDashboard />} />
              )}
            </Routes>
          </main>
          <Footer />
          <CartDrawer />
        </div>
      </CartProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}
