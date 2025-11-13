import React from 'react';
import { Bell, Search, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleMobileMenu }) => {

  return (
    <header className="flex items-center justify-between h-16 sm:h-20 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 px-4 sm:px-6 lg:px-8 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Deliverability Dashboard</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 hidden sm:block">7-day rolling performance overview</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="bg-gray-700/50 border border-gray-600/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-gray-700/70 w-64"
          />
        </div>
        <button className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-700/50 hover:text-white focus:outline-none transition-all duration-200 hover:scale-110 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-gray-800"></span>
        </button>
        {user && (
          <div className="flex items-center gap-3 bg-gray-700/30 rounded-xl px-3 py-2 hover:bg-gray-700/50 transition-all duration-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">{user.name}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-2 ring-gray-700">
              <span className="text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 focus:outline-none transition-all duration-200 hover:scale-110"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;