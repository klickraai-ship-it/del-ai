import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import DemoTimer from './DemoTimer';

interface LayoutProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperAdmin: boolean;
    paymentStatus: string;
    demoStartedAt?: string;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

type PageType = 'dashboard' | 'campaigns' | 'templates' | 'subscribers' | 'settings' | 'admin';

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current page from URL
  const getCurrentPage = (): PageType => {
    const path = location.pathname.slice(1); // Remove leading slash
    return (path || 'campaigns') as PageType;
  };

  const handleNavigate = (page: PageType) => {
    navigate(`/${page}`);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        user={user} 
        onLogout={onLogout}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      
      <div className="flex">
        <Sidebar 
          currentPage={getCurrentPage()}
          onNavigate={handleNavigate}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
          isSuperAdmin={user.isSuperAdmin}
        />
        
        <main className="flex-1 p-6 lg:ml-64">
          {user.paymentStatus === 'demo' && user.demoStartedAt && (
            <DemoTimer user={user} onLogout={onLogout} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
