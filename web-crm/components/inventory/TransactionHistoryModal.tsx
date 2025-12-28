'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { InventoryItem, InventoryTransaction } from '@/types';
import { X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionHistoryModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export default function TransactionHistoryModal({ item, onClose }: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get<InventoryTransaction[]>(`/inventory/${item.id}/transactions`);
      setTransactions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action === 'stock_in') {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    } else if (action === 'stock_out') {
      return <ArrowDownCircle className="h-4 w-4 text-orange-600" />;
    }
    return <History className="h-4 w-4 text-gray-600" />;
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'stock_in':
        return 'Stock In';
      case 'stock_out':
        return 'Stock Out';
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      default:
        return action;
    }
  };

  const getQuantityChangeDisplay = (transaction: InventoryTransaction) => {
    const change = transaction.quantity_change;
    if (change > 0) {
      return <span className="text-green-600 font-semibold">+{change}</span>;
    } else if (change < 0) {
      return <span className="text-orange-600 font-semibold">{change}</span>;
    }
    return <span className="text-gray-500">0</span>;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500 mt-1">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Item Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Stock:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {item.quantity} {item.unit}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Min Threshold:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {item.min_threshold} {item.unit}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {item.location || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Before
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      After
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          {getActionIcon(transaction.action)}
                          <span className="ml-2 text-gray-900">
                            {getActionLabel(transaction.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {getQuantityChangeDisplay(transaction)}
                        <span className="ml-1 text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {transaction.quantity_before} {item.unit}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {transaction.quantity_after} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {transaction.reason || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {transaction.user ? (
                          <div>
                            <div className="text-gray-900 font-medium">{transaction.user.username}</div>
                            <div className="text-gray-500 text-xs">{transaction.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">System</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {transactions.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium">Total Stock In</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  +{transactions
                    .filter((t) => t.action === 'stock_in')
                    .reduce((sum, t) => sum + t.quantity_change, 0)}
                  <span className="text-sm ml-1">{item.unit}</span>
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-xs text-orange-600 font-medium">Total Stock Out</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">
                  {transactions
                    .filter((t) => t.action === 'stock_out')
                    .reduce((sum, t) => sum + t.quantity_change, 0)}
                  <span className="text-sm ml-1">{item.unit}</span>
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{transactions.length}</p>
              </div>
            </div>
          )}
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
