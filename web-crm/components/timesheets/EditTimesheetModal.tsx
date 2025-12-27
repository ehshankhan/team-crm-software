'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Timesheet } from '@/types';
import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EditTimesheetModalProps {
  timesheet: Timesheet;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTimesheetModal({ timesheet, onClose, onSuccess }: EditTimesheetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    manual_hours: timesheet.manual_hours,
    notes: timesheet.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put(`/timesheets/${timesheet.id}`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const totalHours = Number(timesheet.auto_hours) + Number(formData.manual_hours);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Edit Timesheet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Date Display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Date</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {format(new Date(timesheet.date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Auto Hours (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Auto Hours (from attendance)
            </label>
            <div className="mt-1 flex items-center">
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-lg font-semibold text-gray-900">
                {Number(timesheet.auto_hours).toFixed(2)} hours
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Automatically calculated from check-in to check-out
            </p>
          </div>

          {/* Manual Hours (Editable) */}
          <div>
            <label htmlFor="manual_hours" className="block text-sm font-medium text-gray-700">
              Manual Hours
            </label>
            <div className="mt-1 relative">
              <input
                type="number"
                name="manual_hours"
                id="manual_hours"
                min="0"
                max="24"
                step="0.25"
                value={formData.manual_hours}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">hours</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Add additional hours worked (overtime, remote work, etc.)
            </p>
          </div>

          {/* Total Hours Display */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-700">Total Hours</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {totalHours.toFixed(2)} hours
            </p>
            <p className="mt-1 text-xs text-blue-600">
              Auto ({Number(timesheet.auto_hours).toFixed(2)}h) + Manual ({Number(formData.manual_hours).toFixed(2)}h)
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes about this timesheet..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
