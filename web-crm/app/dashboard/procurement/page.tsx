'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { cache } from '@/lib/cache';
import { useAuthStore } from '@/store/authStore';
import { Package, Copy, Trash2, CheckCircle, Send, Filter } from 'lucide-react';

const CACHE_KEY_ITEMS = 'procurement_items';
const CACHE_KEY_NON_GEM = 'procurement_non_gem';
const CACHE_KEY_CATEGORIES = 'procurement_categories';

interface ProcurementItem {
  id: string;
  name: string;
  link: string | null;
  vendor: string;
  quantity: number;
  priority: string;
  status: string;
  is_non_gem: boolean;
  requested_by: string;
  created_at: string;
  requester?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface InventoryCategory {
  id: string;
  name: string;
}

const VENDOR_OPTIONS = [
  'Amazon',
  'Robu',
  'DigiKey',
  'Element14',
  'Mouser',
  'Other'
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function ProcurementPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'procurement' | 'non-gem'>('procurement');
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [nonGemItems, setNonGemItems] = useState<ProcurementItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [customVendor, setCustomVendor] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    quantity: 1,
    priority: 'medium',
    notes: ''
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Filter states
  const [filterVendor, setFilterVendor] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    // Load from cache immediately
    const cachedItems = cache.get<ProcurementItem[]>(CACHE_KEY_ITEMS);
    const cachedNonGem = cache.get<ProcurementItem[]>(CACHE_KEY_NON_GEM);
    const cachedCategories = cache.get<InventoryCategory[]>(CACHE_KEY_CATEGORIES);

    if (cachedItems) setItems(cachedItems);
    if (cachedNonGem) setNonGemItems(cachedNonGem);
    if (cachedCategories) setCategories(cachedCategories);

    // Only show loading if no cache
    if (cachedItems && cachedNonGem && cachedCategories) {
      setLoading(false);
    }

    fetchData(!(cachedItems && cachedNonGem && cachedCategories));
  }, []);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [itemsRes, nonGemRes, categoriesRes] = await Promise.all([
        api.get<ProcurementItem[]>('/procurement/'),
        api.get<ProcurementItem[]>('/procurement/non-gem'),
        api.get<InventoryCategory[]>('/inventory/categories')
      ]);
      setItems(itemsRes.data);
      setNonGemItems(nonGemRes.data);
      setCategories(categoriesRes.data);

      // Update cache
      cache.set(CACHE_KEY_ITEMS, itemsRes.data);
      cache.set(CACHE_KEY_NON_GEM, nonGemRes.data);
      cache.set(CACHE_KEY_CATEGORIES, categoriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Get unique vendors from items
  const uniqueVendors = Array.from(new Set(items.map(item => item.vendor))).sort();

  // Get unique users from items
  const uniqueUsers = Array.from(
    new Set(items.map(item => item.requester?.full_name).filter(Boolean))
  ).sort();

  // Apply filters to items
  const filteredItems = items.filter(item => {
    if (filterVendor && item.vendor !== filterVendor) return false;
    if (filterUser && item.requester?.full_name !== filterUser) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  // Apply filters to non-gem items
  const filteredNonGemItems = nonGemItems.filter(item => {
    if (filterVendor && item.vendor !== filterVendor) return false;
    if (filterUser && item.requester?.full_name !== filterUser) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterVendor('');
    setFilterUser('');
    setFilterPriority('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendor = selectedVendor === 'Other' ? customVendor : selectedVendor;
      if (!vendor) {
        alert('Please select or enter a vendor name');
        return;
      }

      await api.post('/procurement/', {
        ...formData,
        vendor,
        quantity: Number(formData.quantity)
      });

      setShowAddForm(false);
      setFormData({ name: '', link: '', quantity: 1, priority: 'medium', notes: '' });
      setSelectedVendor('');
      setCustomVendor('');
      fetchData();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add procurement item');
    }
  };

  const handleMarkAsReceived = async (itemId: string) => {
    if (!selectedCategoryId) {
      alert('Please select an inventory category first');
      return;
    }

    try {
      await api.post(`/procurement/${itemId}/receive?category_id=${selectedCategoryId}`);
      fetchData();
      setSelectedCategoryId('');
      alert('Item marked as received and added to inventory');
    } catch (error) {
      console.error('Failed to mark as received:', error);
      alert('Failed to mark item as received');
    }
  };

  const handleExportToNonGem = async (itemId: string) => {
    try {
      await api.put(`/procurement/${itemId}/mark-non-gem`);
      fetchData();
    } catch (error) {
      console.error('Failed to export to Non-Gem:', error);
      alert('Failed to export to Non-Gem');
    }
  };

  const handleUnmarkNonGem = async (itemId: string) => {
    try {
      await api.put(`/procurement/${itemId}/unmark-non-gem`);
      fetchData();
    } catch (error) {
      console.error('Failed to unmark Non-Gem:', error);
      alert('Failed to remove from Non-Gem');
    }
  };

  const handleCopyLink = (link: string | null) => {
    if (link) {
      navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.delete(`/procurement/${itemId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupByVendor = (items: ProcurementItem[]) => {
    const grouped: { [key: string]: ProcurementItem[] } = {};
    items.forEach(item => {
      if (!grouped[item.vendor]) {
        grouped[item.vendor] = [];
      }
      grouped[item.vendor].push(item);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading procurement data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {showAddForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Add Procurement Item</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor *
                </label>
                <select
                  required
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Vendor</option>
                  {VENDOR_OPTIONS.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              </div>

              {selectedVendor === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customVendor}
                    onChange={(e) => setCustomVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter vendor name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITY_OPTIONS.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('procurement')}
            className={`${
              activeTab === 'procurement'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Procurement ({filteredItems.length})
          </button>
          <button
            onClick={() => setActiveTab('non-gem')}
            className={`${
              activeTab === 'non-gem'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Non-Gem ({filteredNonGemItems.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          {(filterVendor || filterUser || filterPriority) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-indigo-600 hover:text-indigo-800"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Vendors</option>
              {uniqueVendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Requested By
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Procurement Tab */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>
                {items.length === 0
                  ? 'No procurement items yet. Add your first item above!'
                  : 'No items match the selected filters.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Vendor:</span> {item.vendor}</p>
                      <p><span className="font-medium">Quantity:</span> {item.quantity}</p>
                      <p><span className="font-medium">Requested by:</span> {item.requester?.full_name || 'Unknown'}</p>
                      {item.link && (
                        <p>
                          <span className="font-medium">Link:</span>{' '}
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            View Product
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  {/* Only show Received button to requester, manager, or admin */}
                  {(item.requester?.id === user?.id ||
                    user?.role?.name === 'super_admin' ||
                    user?.role?.name === 'manager') && (
                    <>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleMarkAsReceived(item.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CheckCircle size={16} />
                        Received
                      </button>
                    </>
                  )}
                  {!item.is_non_gem && (
                    <button
                      onClick={() => handleExportToNonGem(item.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Send size={16} />
                      Export to Non-Gem
                    </button>
                  )}
                  {item.is_non_gem && (
                    <button
                      onClick={() => handleUnmarkNonGem(item.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Remove from Non-Gem
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Non-Gem Tab */}
      {activeTab === 'non-gem' && (
        <div className="space-y-6">
          {filteredNonGemItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>
                {nonGemItems.length === 0
                  ? 'No Non-Gem items yet. Export items from the Procurement tab!'
                  : 'No items match the selected filters.'}
              </p>
            </div>
          ) : (
            Object.entries(groupByVendor(filteredNonGemItems)).map(([vendor, vendorItems]) => (
              <div key={vendor} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                  {vendor} ({vendorItems.length} items)
                </h3>
                <div className="space-y-3">
                  {vendorItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="flex gap-2">
                        {item.link && (
                          <button
                            onClick={() => handleCopyLink(item.link)}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                          >
                            <Copy size={16} />
                            Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => handleUnmarkNonGem(item.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
