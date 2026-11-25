import { Link, NavLink } from 'react-router-dom';
import { Flame, ShoppingBag, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  cartCount: number;
  onOpenCart: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  cartCount,
  onOpenCart,
  onLogout,
}: NavbarProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Flame size={22} />
          </span>
          <span className="brand-title">Forno Vivo</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            Menu
          </NavLink>
          {user && (
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              My Orders
            </NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              Shop Owner Console
            </NavLink>
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenCart}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Cart ({cartCount})</span>
          </button>

          {user ? (
            <>
              <span className="user-pill">
                <UserIcon size={15} aria-hidden="true" />
                <span>{user.name}</span>
                <span className="role-badge">{user.role}</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onLogout}
              >
                <LogOut size={17} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
