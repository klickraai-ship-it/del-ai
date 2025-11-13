import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, Mail, UserX, UserCheck } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  lists: string[];
  createdAt: string;
}

const SubscribersList: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState({ email: '', firstName: '', lastName: '', lists: '' });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers');
      const data = await response.json();
      
      // Handle error responses or non-array data
      if (Array.isArray(data)) {
        setSubscribers(data);
      } else {
        console.error('Invalid response format:', data);
        setSubscribers([]);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async () => {
    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSubscriber,
          lists: newSubscriber.lists.split(',').map(l => l.trim()).filter(Boolean)
        })
      });
      
      if (response.ok) {
        setShowAddModal(false);
        setNewSubscriber({ email: '', firstName: '', lastName: '', lists: '' });
        fetchSubscribers();
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;
    
    try {
      await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      fetchSubscribers();
    } catch (error) {
      console.error('Error deleting subscriber:', error);
    }
  };

  const filteredSubscribers = subscribers.filter(sub =>
    sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscribers</h1>
          <p className="text-gray-400 mt-1">Manage your email subscriber list</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-light transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Subscriber
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lists</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredSubscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{subscriber.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {subscriber.firstName || subscriber.lastName
                      ? `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscriber.status === 'active' ? 'bg-green-900 text-green-200' :
                      subscriber.status === 'unsubscribed' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {subscriber.status === 'active' && <UserCheck className="h-3 w-3 mr-1" />}
                      {subscriber.status === 'unsubscribed' && <UserX className="h-3 w-3 mr-1" />}
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {subscriber.lists.length > 0 ? subscriber.lists.join(', ') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteSubscriber(subscriber.id)}
                      className="text-red-400 hover:text-red-300 ml-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSubscribers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No subscribers found
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Add New Subscriber</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={newSubscriber.email}
                  onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="subscriber@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={newSubscriber.firstName}
                  onChange={(e) => setNewSubscriber({ ...newSubscriber, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newSubscriber.lastName}
                  onChange={(e) => setNewSubscriber({ ...newSubscriber, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lists (comma-separated)</label>
                <input
                  type="text"
                  value={newSubscriber.lists}
                  onChange={(e) => setNewSubscriber({ ...newSubscriber, lists: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="newsletter, marketing"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubscriber}
                className="flex-1 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-light transition-colors"
              >
                Add Subscriber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscribersList;
