import React, { useState, useEffect } from 'react';
import { Clock, CreditCard, X } from 'lucide-react';
import { api } from '../client/src/lib/api';

interface DemoTimerProps {
  user: any;
  onLogout: () => void;
  onUserUpdate?: (user: any) => void;
}

const DemoTimer: React.FC<DemoTimerProps> = ({ user, onLogout, onUserUpdate }) => {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user?.paymentStatus === 'demo') {
      // Initialize timer from server time (only when user.demoRemainingMs changes)
      const serverRemaining = user.demoRemainingMs;
      
      if (serverRemaining !== undefined) {
        // Update from server time as source of truth
        setRemainingMs(serverRemaining);
        
        if (serverRemaining <= 0) {
          setShowUpgradeModal(true);
          checkDemoExpiry();
        } else if (serverRemaining <= 60000) {
          setShowUpgradeModal(true);
        }
      } else if (user.demoStartedAt) {
        // Fallback: calculate from demoStartedAt (only on first load)
        const DEMO_DURATION_MS = 10 * 60 * 1000;
        const demoStartTime = new Date(user.demoStartedAt).getTime();
        const currentTime = Date.now();
        const elapsed = currentTime - demoStartTime;
        const remaining = DEMO_DURATION_MS - elapsed;
        
        setRemainingMs(Math.max(0, remaining));
        
        if (remaining <= 0) {
          setShowUpgradeModal(true);
          checkDemoExpiry();
        } else if (remaining <= 60000) {
          setShowUpgradeModal(true);
        }
      }
    }
    // Note: showUpgradeModal is intentionally NOT in dependencies to prevent timer reset
  }, [user?.paymentStatus, user?.demoRemainingMs, user?.demoStartedAt]);

  useEffect(() => {
    if (user?.paymentStatus === 'demo' && remainingMs > 0) {
      // Countdown timer (decrement every second)
      const interval = setInterval(() => {
        setRemainingMs(prev => {
          const newRemaining = Math.max(0, prev - 1000);
          
          if (newRemaining === 0) {
            setShowUpgradeModal(true);
            checkDemoExpiry();
          } else if (newRemaining <= 60000) {
            setShowUpgradeModal(true);
          }
          
          return newRemaining;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [user?.paymentStatus, remainingMs]);

  useEffect(() => {
    if (user?.paymentStatus === 'demo') {
      // Periodic sync with server every 30 seconds
      const syncInterval = setInterval(async () => {
        try {
          const updatedUser = await api.get('/api/auth/me');
          // Update App state with fresh server time
          if (onUserUpdate && updatedUser) {
            onUserUpdate(updatedUser);
          }
        } catch (error) {
          // If sync fails (e.g., demo expired), trigger logout
          console.error('Demo sync failed - logging out:', error);
          onLogout();
        }
      }, 30000);

      return () => clearInterval(syncInterval);
    }
  }, [user?.paymentStatus, onUserUpdate]);

  const checkDemoExpiry = async () => {
    try {
      // Call /api/auth/me to trigger server-side expiry check
      const updatedUser = await api.get('/api/auth/me');
      // Update App state with fresh server time (in case server hasn't expired yet)
      if (onUserUpdate && updatedUser) {
        onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      // If demo expired, API client will redirect, but we also need to clear React state
      console.error('Demo expired - logging out:', error);
      // Call onLogout to clear React state immediately
      onLogout();
    }
  };

  if (user?.paymentStatus !== 'demo') {
    return null;
  }

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const isWarning = remainingMs <= 120000; // 2 minutes
  const isCritical = remainingMs <= 60000; // 1 minute

  const handleUpgrade = () => {
    // Clear auth and redirect to landing page
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      {/* Demo Timer Banner */}
      <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
        isCritical ? 'bg-red-600 animate-pulse' : 
        isWarning ? 'bg-yellow-600' : 
        'bg-blue-600'
      }`}>
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            Demo Mode: {minutes}:{seconds.toString().padStart(2, '0')} remaining
          </span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="ml-4 px-3 py-1 bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors text-xs font-semibold"
          >
            Upgrade Now
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              disabled={remainingMs === 0}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                remainingMs === 0 ? 'bg-red-600' : 'bg-yellow-600'
              }`}>
                <CreditCard className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {remainingMs === 0 ? 'Demo Period Expired' : 'Upgrade to Continue'}
              </h2>

              <p className="text-gray-400 mb-6">
                {remainingMs === 0 
                  ? 'Your 10-minute demo has ended. Upgrade to access all features and keep your data.'
                  : `Only ${minutes}:${seconds.toString().padStart(2, '0')} remaining in your demo. Upgrade now to continue without interruption.`
                }
              </p>

              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <div className="text-3xl font-bold mb-1">$65 USD</div>
                <div className="text-sm text-gray-400">One-time payment • Lifetime access</div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleUpgrade}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Upgrade Now
                </button>

                {remainingMs > 0 && (
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Continue Demo ({minutes}:{seconds.toString().padStart(2, '0')})
                  </button>
                )}

                {remainingMs === 0 && (
                  <button
                    onClick={onLogout}
                    className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoTimer;
