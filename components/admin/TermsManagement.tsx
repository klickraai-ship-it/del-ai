import React, { useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle } from 'lucide-react';
import { api } from '../../client/src/lib/api';

interface Terms {
  id: string;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TermsManagement: React.FC = () => {
  const [termsList, setTermsList] = useState<Terms[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTerms, setPreviewTerms] = useState<Terms | null>(null);

  const [formData, setFormData] = useState({
    version: '',
    title: 'Terms and Conditions',
    content: '',
    isActive: false,
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/terms');
      setTermsList(data);
    } catch (error) {
      console.error('Failed to fetch terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/terms', formData);
      setShowCreateModal(false);
      setFormData({ version: '', title: 'Terms and Conditions', content: '', isActive: false });
      fetchTerms();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save terms');
    }
  };

  const handlePreview = (terms: Terms) => {
    setPreviewTerms(terms);
    setShowPreviewModal(true);
  };

  const handleEdit = (terms: Terms) => {
    setFormData({
      version: terms.version,
      title: terms.title,
      content: terms.content,
      isActive: terms.isActive,
    });
    setShowCreateModal(true);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Terms & Conditions Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Create New Version
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {termsList.map((terms) => (
            <div
              key={terms.id}
              className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{terms.title}</h3>
                  {terms.isActive && (
                    <span className="px-2 py-1 bg-green-600 text-xs rounded flex items-center gap-1">
                      <CheckCircle size={14} />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">Version: {terms.version}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Created: {new Date(terms.createdAt).toLocaleDateString()} | 
                  Updated: {new Date(terms.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(terms)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handlePreview(terms)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Eye size={16} />
                  Preview
                </button>
              </div>
            </div>
          ))}

          {termsList.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No terms & conditions versions found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Create Terms Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-4">Create/Update Terms & Conditions</h3>
            <form onSubmit={handleCreateTerms}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Version</label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">If version exists, it will be updated.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Content (HTML or plain text)</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    placeholder="Enter terms & conditions content..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-400">
                    Set as active version (will deactivate all others)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ version: '', title: 'Terms and Conditions', content: '', isActive: false });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full my-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{previewTerms.title}</h3>
                <p className="text-sm text-gray-400">Version: {previewTerms.version}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-6 max-h-96 overflow-y-auto">
              <div 
                className="text-gray-300 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewTerms.content }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsManagement;
