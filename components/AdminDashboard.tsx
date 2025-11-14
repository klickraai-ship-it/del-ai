import React, { useState } from 'react';
import { Users, CreditCard, Settings, FileText } from 'lucide-react';
import UserManagement from './admin/UserManagement';
import PaymentProviders from './admin/PaymentProviders';
import PaymentTransactions from './admin/PaymentTransactions';
import TermsManagement from './admin/TermsManagement';

type AdminTab = 'users' | 'payments' | 'providers' | 'terms';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const tabs = [
    { id: 'users' as AdminTab, label: 'User Management', icon: Users },
    { id: 'payments' as AdminTab, label: 'Payment Tracking', icon: CreditCard },
    { id: 'providers' as AdminTab, label: 'Payment Providers', icon: Settings },
    { id: 'terms' as AdminTab, label: 'Terms & Conditions', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'payments':
        return <PaymentTransactions />;
      case 'providers':
        return <PaymentProviders />;
      case 'terms':
        return <TermsManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Superadmin Dashboard</h1>
        <p className="text-gray-400">Manage users, payments, and system settings</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white border-b-2 border-blue-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
