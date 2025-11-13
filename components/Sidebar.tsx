
import React from 'react';
import { LayoutDashboard, BarChart3, Mail, Users, Settings, LifeBuoy, X } from 'lucide-react';

type PageType = 'dashboard' | 'campaigns' | 'templates' | 'subscribers' | 'settings';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, mobileMenuOpen = false, onCloseMobileMenu }) => {
  const navItems: { icon: any; label: string; page: PageType }[] = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' },
    { icon: BarChart3, label: 'Campaigns', page: 'campaigns' },
    { icon: Mail, label: 'Templates', page: 'templates' },
    { icon: Users, label: 'Subscribers', page: 'subscribers' },
    { icon: Settings, label: 'Settings', page: 'settings' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onCloseMobileMenu}
        />
      )}
      
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700/50 backdrop-blur-xl shadow-2xl z-30">
      <div className="flex items-center justify-center h-20 border-b border-gray-700/50 px-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-md opacity-75"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="relative h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">DeliverAI</h1>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.page)}
              className={`group w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
              }`}
            >
              <Icon className={`h-5 w-5 mr-3 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
        <div className="p-4 border-t border-gray-700/50">
           <a href="#" className="group flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200 hover:scale-[1.02]">
               <LifeBuoy className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
               Support
           </a>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700/50 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 border-b border-gray-700/50 px-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-md opacity-75"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="relative h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">DeliverAI</h1>
          </div>
          <button
            onClick={onCloseMobileMenu}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.page)}
                className={`group w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700/50">
           <a href="#" className="group flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200 hover:scale-[1.02]">
               <LifeBuoy className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
               Support
           </a>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;