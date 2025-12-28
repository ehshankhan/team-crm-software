'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { InventoryItem, InventoryCategory } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Package, Plus, TrendingDown, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, History, Search } from 'lucide-react';
import CreateItemModal from '@/components/inventory/CreateItemModal';
import EditItemModal from '@/components/inventory/EditItemModal';
import StockModal from '@/components/inventory/StockModal';
import CategoryModal from '@/components/inventory/CategoryModal';
import TransactionHistoryModal from '@/components/inventory/TransactionHistoryModal';

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockItem, setStockItem] = useState<{ item: InventoryItem; type: 'in' | 'out' } | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const canManage = user?.role?.name === 'super_admin' || user?.role?.name === 'manager';
  const isAdmin = user?.role?.name === 'super_admin';

  useEffect(() => {
    fetchCategories();
    fetchItems();
    fetchLowStock();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await api.get<InventoryCategory[]>('/inventory/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'all' ? { category_id: selectedCategory } : {};
      const response = await api.get<InventoryItem[]>('/inventory/', { params });
      setItems(response.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await api.get<InventoryItem[]>('/inventory/low-stock');
      setLowStockItems(response.data);
    } catch (err) {
      console.error('Failed to fetch low stock items:', err);
    }
  };

  const handleRefresh = () => {
    fetchItems();
    fetchLowStock();
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await api.delete(`/inventory/${item.id}`);
      handleRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.supplier?.toLowerCase().includes(query) ||
      getCategoryName(item.category_id).toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track lab components, equipment, and stock levels
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {isAdmin && (
            <button
              onClick={() => setShowCreateCategory(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Categories
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setShowCreateItem(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Low Stock Alert</h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-2">{lowStockItems.length} items below minimum threshold:</p>
                <ul className="list-disc list-inside space-y-1">
                  {lowStockItems.slice(0, 3).map(item => (
                    <li key={item.id}>
                      {item.name}: {item.quantity} {item.unit} (min: {item.min_threshold})
                    </li>
                  ))}
                  {lowStockItems.length > 3 && (
                    <li className="text-red-600 font-medium">
                      +{lowStockItems.length - 3} more items
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, SKU, supplier, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border flex-1"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Results Counter */}
        {searchQuery && (
          <div className="mt-3 text-sm text-gray-600">
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading inventory...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? `No items found matching "${searchQuery}"` : 'No items in inventory'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity < item.min_threshold;
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 truncate max-w-md">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.quantity} {item.unit || 'pcs'}
                          </span>
                          {isLowStock && (
                            <TrendingDown className="h-4 w-4 ml-2 text-red-500" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {item.min_threshold}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getCategoryName(item.category_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Transaction history"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setStockItem({ item, type: 'in' })}
                                className="text-green-600 hover:text-green-900"
                                title="Stock in"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setStockItem({ item, type: 'out' })}
                                className="text-orange-600 hover:text-orange-900"
                                title="Stock out"
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateItem && (
        <CreateItemModal
          categories={categories}
          onClose={() => setShowCreateItem(false)}
          onSuccess={() => {
            setShowCreateItem(false);
            handleRefresh();
          }}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            handleRefresh();
          }}
        />
      )}

      {stockItem && (
        <StockModal
          item={stockItem.item}
          type={stockItem.type}
          onClose={() => setStockItem(null)}
          onSuccess={() => {
            setStockItem(null);
            handleRefresh();
          }}
        />
      )}

      {showCreateCategory && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCreateCategory(false)}
          onSuccess={() => {
            setShowCreateCategory(false);
            fetchCategories();
          }}
        />
      )}

      {historyItem && (
        <TransactionHistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  );
}
