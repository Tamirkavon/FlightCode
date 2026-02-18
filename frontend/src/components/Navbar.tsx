import { Link, useLocation } from 'react-router-dom';
import { Plane, Heart, Bell, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { pathname } = useLocation();

  const link = (to: string, label: string, Icon: React.ElementType) => (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        pathname === to
          ? 'bg-white/20 text-white'
          : 'text-blue-100 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-600 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
          <Plane size={22} className="rotate-45" />
          FlyAI
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {link('/', 'Search', Plane)}
          {isAuthenticated && link('/favorites', 'Favourites', Heart)}
          {isAuthenticated && link('/notifications', 'Alerts', Bell)}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-blue-100 text-sm hidden sm:block">{user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogIn size={16} />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
