'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { InventoryCategory } from '@/types';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

interface CategoryModalProps {
  categories: InventoryCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryModal({ categories, onClose, onSuccess }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
      };

      if (editingCategory) {
        await api.put(`/inventory/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/inventory/categories/', payload);
      }

      setFormData({ name: '', description: '' });
      setEditingCategory(null);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${editingCategory ? 'update' : 'create'} category`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: InventoryCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setError(null);
  };

  const handleDelete = async (category: InventoryCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    try {
      await api.delete(`/inventory/categories/${category.id}`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Manage Categories</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create/Edit Form */}
          <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h4>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., Electronics, Tools, Chemicals"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex justify-end space-x-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>

          {/* Categories List */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Existing Categories ({categories.length})
            </h4>

            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No categories yet. Create one above.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{category.name}</h5>
                      {category.description && (
                        <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
