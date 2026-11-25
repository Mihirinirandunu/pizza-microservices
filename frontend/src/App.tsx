import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  clearAuthSession,
  getStoredUser,
  saveAuthSession,
} from './api/client';
import { Navbar } from './components/Navbar';
import { CartDialog } from './components/CartDialog';
import { AuthPage } from './pages/AuthPage';
import { MenuPage } from './pages/MenuPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import type { CartItem, PizzaSize, User } from './types';

export function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  function handleAuthenticated(token: string, nextUser: User) {
    saveAuthSession(token, nextUser);
    setUser(nextUser);
  }

  function handleLogout() {
    clearAuthSession();
    setUser(null);
  }

  function handleAddToCart(incoming: CartItem) {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.productId === incoming.productId && item.size === incoming.size
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === incoming.productId && item.size === incoming.size
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.maxStock),
              }
            : item
        );
      }
      return [...prev, incoming];
    });
  }

  function handleUpdateQty(productId: string, size: PizzaSize, qty: number) {
    if (qty <= 0) {
      handleRemoveItem(productId, size);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.size === size
          ? { ...item, quantity: Math.min(qty, item.maxStock) }
          : item
      )
    );
  }

  function handleRemoveItem(productId: string, size: PizzaSize) {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.size === size)
      )
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <BrowserRouter>
      <Navbar
        user={user}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onLogout={handleLogout}
      />

      <main className="page-main">
        <Routes>
          <Route path="/" element={<MenuPage onAddToCart={handleAddToCart} />} />
          <Route
            path="/auth"
            element={<AuthPage onAuthenticated={handleAuthenticated} />}
          />
          <Route
            path="/orders"
            element={user ? <MyOrdersPage /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/admin"
            element={
              user?.role === 'ADMIN' ? (
                <AdminDashboardPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>

      <CartDialog
        open={cartOpen}
        items={cart}
        user={user}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onOrderSuccess={() => setCart([])}
      />
    </BrowserRouter>
  );
}

export default App;
