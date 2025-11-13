import React, { useState, useEffect } from 'react';
import { DashboardData } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SubscribersList from './components/SubscribersList';
import TemplatesList from './components/TemplatesList';
import CampaignsList from './components/CampaignsList';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import { api } from './client/src/lib/api';

// Mock data generation
const generateMockData = (): DashboardData => ({
  kpis: [
    { title: 'Delivery Rate', value: '99.2%', change: '+0.1%', changeType: 'increase', period: 'vs last 7d' },
    { title: 'Hard Bounce Rate', value: '0.45%', change: '-0.05%', changeType: 'decrease', period: 'vs last 7d' },
    { title: 'Complaint Rate', value: '0.08%', change: '+0.02%', changeType: 'increase', period: 'vs last 7d' },
    { title: 'Unsubscribe Rate', value: '0.15%', change: '0.00%', changeType: 'neutral', period: 'vs last 7d' },
  ],
  gmailSpamRate: 0.12, // In the "warn" threshold
  domainPerformance: [
    { name: 'Gmail', deliveryRate: 99.1, complaintRate: 0.12, spamRate: 0.12 },
    { name: 'Yahoo', deliveryRate: 99.5, complaintRate: 0.09, spamRate: 0.08 },
    { name: 'Outlook', deliveryRate: 98.8, complaintRate: 0.15, spamRate: 0.18 },
    { name: 'Other', deliveryRate: 97.5, complaintRate: 0.20, spamRate: 0.25 },
  ],
  complianceChecklist: [
    { id: 'spf', name: 'SPF Alignment', status: 'pass', details: 'SPF record is valid and aligned.', fixLink: '#' },
    { id: 'dkim', name: 'DKIM Alignment', status: 'pass', details: 'DKIM signatures are valid and aligned.', fixLink: '#' },
    { id: 'dmarc', name: 'DMARC Policy', status: 'warn', details: 'p=none policy detected. Consider tightening to quarantine/reject.', fixLink: '#' },
    { id: 'list_unsub', name: 'One-Click Unsubscribe', status: 'pass', details: 'List-Unsubscribe headers are correctly implemented.', fixLink: '#' },
    { id: 'tls', name: 'TLS Encryption', status: 'pass', details: '100% of mail sent over TLS.', fixLink: '#' },
    { id: 'fbl', name: 'Feedback Loops', status: 'fail', details: 'Yahoo CFL not configured. Complaints may be missed.', fixLink: '#' },
  ],
});

type PageType = 'dashboard' | 'campaigns' | 'templates' | 'subscribers' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get('/api/auth/me');
      setUser(userData);
      setIsAuthenticated(true);
      fetchDashboardData();
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setLoading(false);
    }
  };

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    fetchDashboardData();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setData(null);
    setCurrentPage('dashboard'); // Reset to dashboard after logout
  };

  const fetchDashboardData = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const dashboardData = await api.get('/api/dashboard');
      setData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };



  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (loading) {
          return (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          );
        }
        if (!data) {
          return (
            <div className="text-center text-gray-400 p-8">
              Failed to load dashboard data. Please refresh the page.
            </div>
          );
        }
        return <Dashboard data={data} />;
      case 'campaigns':
        // In a real app, you would fetch campaigns data here and pass it to CampaignsList
        // For now, we'll render the component, assuming it handles its own fetching or uses mock data
        return <CampaignsList />;
      case 'templates':
        return <TemplatesList />;
      case 'subscribers':
        return <SubscribersList />;
      case 'settings':
        return <SettingsPage />;
      default:
        if (loading) {
          return (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          );
        }
        if (!data) {
          return (
            <div className="text-center text-gray-400 p-8">
              Failed to load dashboard data. Please refresh the page.
            </div>
          );
        }
        return <Dashboard data={data} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    setMobileMenuOpen(false); // Close mobile menu on navigation
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user} 
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;