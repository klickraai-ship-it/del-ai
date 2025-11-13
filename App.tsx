import React, { useState, useEffect } from 'react';
import { DashboardData } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SubscribersList from './components/SubscribersList';
import TemplatesList from './components/TemplatesList';
import CampaignsList from './components/CampaignsList';
import SettingsPage from './components/SettingsPage';

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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  useEffect(() => {
    if (currentPage === 'dashboard') {
      fetchDashboardData();
    }
  }, [currentPage]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        console.warn('Dashboard API returned error:', response.status);
        setData(generateMockData());
        return;
      }
      const dashboardData = await response.json();
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
        return <CampaignsList />;
      case 'templates':
        return <TemplatesList />;
      case 'subscribers':
        return <SubscribersList />;
      case 'settings':
        return <SettingsPage />;
      default:
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

  return (
    <div className="flex h-screen bg-gray-900 font-sans">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;