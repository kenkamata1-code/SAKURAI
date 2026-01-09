import { useState } from 'react';
import { Instagram, Youtube, ShoppingCart, LogOut, User, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-sm tracking-[0.3em] font-light hover:opacity-60 transition">
          THE LONG GAME
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <Link
            to="/"
            className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
          >
            HOME
          </Link>
          <Link
            to="/shop"
            className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
          >
            SHOP
          </Link>
          <Link
            to="/about"
            className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
          >
            ABOUT
          </Link>
          <Link
            to="/contact"
            className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
          >
            CONTACT
          </Link>
          {user ? (
            <>
              <Link
                to="/my-account"
                className="flex items-center gap-1 text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
              >
                <User className="w-3 h-3" strokeWidth={1.5} />
                My Account
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
              >
                <LogOut className="w-3 h-3" strokeWidth={1.5} />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase"
            >
              Log In
            </Link>
          )}
          <div className="flex items-center gap-4">
            <a href="#" className="hover:opacity-60 transition-opacity">
              <Instagram className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              <Youtube className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
            </a>
            <Link to="/cart" className="hover:opacity-60 transition-opacity ml-2">
              <ShoppingCart className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden items-center gap-4">
          <Link to="/cart" className="hover:opacity-60 transition-opacity">
            <ShoppingCart className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 hover:opacity-60 transition-opacity"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
            ) : (
              <Menu className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100">
          <div className="px-6 py-4 space-y-4">
            <Link
              to="/"
              onClick={closeMenu}
              className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
            >
              HOME
            </Link>
            <Link
              to="/shop"
              onClick={closeMenu}
              className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
            >
              SHOP
            </Link>
            <Link
              to="/about"
              onClick={closeMenu}
              className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
            >
              ABOUT
            </Link>
            <Link
              to="/contact"
              onClick={closeMenu}
              className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
            >
              CONTACT
            </Link>
            {user ? (
              <>
                <Link
                  to="/my-account"
                  onClick={closeMenu}
                  className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
                >
                  MY ACCOUNT
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
                  >
                    ADMIN
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="block text-sm tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase py-2"
              >
                LOG IN
              </Link>
            )}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Instagram className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Youtube className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
