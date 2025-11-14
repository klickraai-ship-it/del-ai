import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { api } from '../../client/src/lib/api';

interface PaymentProvider {
  id: string;
  provider: string;
  isActive: boolean;
  config: any;
  createdAt: string;
  updatedAt: string;
}

const PaymentProviders: React.FC = () => {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [razorpayData, setRazorpayData] = useState({
    isActive: false,
    keyId: '',
    keySecret: '',
  });

  const [paypalData, setPaypalData] = useState({
    isActive: false,
    clientId: '',
    clientSecret: '',
    mode: 'sandbox' as 'sandbox' | 'production',
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/payment-providers');
      setProviders(data);

      // Populate form data
      data.forEach((provider: PaymentProvider) => {
        if (provider.provider === 'razorpay') {
          setRazorpayData({
            isActive: provider.isActive,
            keyId: provider.config?.keyId || '',
            keySecret: provider.config?.keySecret || '',
          });
        } else if (provider.provider === 'paypal') {
          setPaypalData({
            isActive: provider.isActive,
            clientId: provider.config?.clientId || '',
            clientSecret: provider.config?.clientSecret || '',
            mode: provider.config?.mode || 'sandbox',
          });
        }
      });
    } catch (error) {
      console.error('Failed to fetch payment providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always send current values (backend will merge with existing)
    try {
      await api.post('/api/admin/payment-providers', {
        provider: 'razorpay',
        isActive: razorpayData.isActive,
        config: {
          keyId: razorpayData.keyId,
          keySecret: razorpayData.keySecret,
        },
      });
      alert('Razorpay configuration saved successfully');
      fetchProviders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save Razorpay configuration');
    }
  };

  const handleSavePayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always send current values (backend will merge with existing)
    try {
      await api.post('/api/admin/payment-providers', {
        provider: 'paypal',
        isActive: paypalData.isActive,
        config: {
          clientId: paypalData.clientId,
          clientSecret: paypalData.clientSecret,
          mode: paypalData.mode,
        },
      });
      alert('PayPal configuration saved successfully');
      fetchProviders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save PayPal configuration');
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Payment Provider Configuration</h2>
        <p className="text-gray-400 mb-6">
          Configure payment gateways for user subscriptions. Enable one provider at a time.
        </p>

        {/* Razorpay Configuration */}
        <form onSubmit={handleSaveRazorpay} className="mb-8 pb-8 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Razorpay</h3>
            <label className="flex items-center cursor-pointer">
              <span className="mr-3 text-sm text-gray-400">Enable</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={razorpayData.isActive}
                  onChange={(e) => setRazorpayData({ ...razorpayData, isActive: e.target.checked })}
                  className="sr-only"
                />
                <div className={`block w-14 h-8 rounded-full ${razorpayData.isActive ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${razorpayData.isActive ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Key ID</label>
              <input
                type="text"
                value={razorpayData.keyId}
                onChange={(e) => setRazorpayData({ ...razorpayData, keyId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="rzp_test_xxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Key Secret</label>
              <div className="relative">
                <input
                  type={showSecrets['razorpay'] ? 'text' : 'password'}
                  value={razorpayData.keySecret}
                  onChange={(e) => setRazorpayData({ ...razorpayData, keySecret: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10"
                  placeholder="Enter key secret"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('razorpay')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showSecrets['razorpay'] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Save size={18} />
            Save Razorpay Config
          </button>
        </form>

        {/* PayPal Configuration */}
        <form onSubmit={handleSavePayPal}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">PayPal</h3>
            <label className="flex items-center cursor-pointer">
              <span className="mr-3 text-sm text-gray-400">Enable</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={paypalData.isActive}
                  onChange={(e) => setPaypalData({ ...paypalData, isActive: e.target.checked })}
                  className="sr-only"
                />
                <div className={`block w-14 h-8 rounded-full ${paypalData.isActive ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${paypalData.isActive ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Client ID</label>
              <input
                type="text"
                value={paypalData.clientId}
                onChange={(e) => setPaypalData({ ...paypalData, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecrets['paypal'] ? 'text' : 'password'}
                  value={paypalData.clientSecret}
                  onChange={(e) => setPaypalData({ ...paypalData, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10"
                  placeholder="Enter client secret"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('paypal')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showSecrets['paypal'] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Mode</label>
              <select
                value={paypalData.mode}
                onChange={(e) => setPaypalData({ ...paypalData, mode: e.target.value as 'sandbox' | 'production' })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Save size={18} />
            Save PayPal Config
          </button>
        </form>
      </div>

      <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          <strong>Note:</strong> Only one payment provider can be active at a time. Credentials are encrypted and stored securely.
        </p>
      </div>
    </div>
  );
};

export default PaymentProviders;
