'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { InventoryItem } from '@/types';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface StockModalProps {
  item: InventoryItem;
  type: 'in' | 'out';
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockModal({ item, type, onClose, onSuccess }: StockModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quantity: 0,
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (type === 'out' && formData.quantity > item.quantity) {
      setError(`Insufficient stock. Available: ${item.quantity} ${item.unit}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = type === 'in' ? 'stock-in' : 'stock-out';
      await api.post(`/inventory/${item.id}/${endpoint}`, {
        quantity: formData.quantity,
        reason: formData.reason || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${type === 'in' ? 'add' : 'remove'} stock`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const newQuantity = type === 'in'
    ? item.quantity + formData.quantity
    : item.quantity - formData.quantity;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            {type === 'in' ? (
              <ArrowUpCircle className="h-6 w-6 text-green-600 mr-3" />
            ) : (
              <ArrowDownCircle className="h-6 w-6 text-orange-600 mr-3" />
            )}
            <h3 className="text-lg font-medium text-gray-900">
              Stock {type === 'in' ? 'In' : 'Out'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Item Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {item.description && <p>{item.description}</p>}
              <p>
                <span className="font-medium">Current Stock:</span> {item.quantity} {item.unit}
              </p>
              {item.location && (
                <p>
                  <span className="font-medium">Location:</span> {item.location}
                </p>
              )}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity *
            </label>
            <div className="mt-1 relative">
              <input
                type="number"
                name="quantity"
                id="quantity"
                required
                min="1"
                max={type === 'out' ? item.quantity : undefined}
                value={formData.quantity || ''}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="Enter quantity"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{item.unit}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <textarea
              name="reason"
              id="reason"
              rows={2}
              value={formData.reason}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder={type === 'in' ? 'e.g., New shipment received' : 'e.g., Used for project'}
            />
          </div>

          {/* New Quantity Preview */}
          {formData.quantity > 0 && (
            <div className={`rounded-lg p-4 ${type === 'in' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <p className="text-sm font-medium text-gray-900 mb-1">New Stock Level:</p>
              <p className={`text-2xl font-bold ${type === 'in' ? 'text-green-700' : 'text-orange-700'}`}>
                {newQuantity} {item.unit}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {type === 'in' ? '+' : '-'}{formData.quantity} {item.unit}
              </p>
              {newQuantity < item.min_threshold && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Below minimum threshold ({item.min_threshold} {item.unit})
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.quantity <= 0}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'in'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {loading ? 'Processing...' : `Stock ${type === 'in' ? 'In' : 'Out'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
