'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Timesheet } from '@/types';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ApproveRejectModalProps {
  timesheet: Timesheet;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveRejectModal({ timesheet, onClose, onSuccess }: ApproveRejectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post(`/timesheets/${timesheet.id}/approve`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post(`/timesheets/${timesheet.id}/reject`, {
        notes: notes || 'Rejected by manager',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === 'approve') {
      await handleApprove();
    } else if (action === 'reject') {
      await handleReject();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Review Timesheet</h3>
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

          {/* Timesheet Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {format(new Date(timesheet.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Auto Hours</p>
                <div className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 text-blue-500 mr-1" />
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(timesheet.auto_hours).toFixed(2)}h
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">Manual Hours</p>
                <div className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 text-purple-500 mr-1" />
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(timesheet.manual_hours).toFixed(2)}h
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">Total Hours</p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  {Number(timesheet.total_hours).toFixed(2)}h
                </p>
              </div>
            </div>

            {timesheet.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500">Employee Notes</p>
                <p className="mt-1 text-sm text-gray-700">{timesheet.notes}</p>
              </div>
            )}
          </div>

          {/* Action Selection */}
          {!action && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">What would you like to do?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  className="flex items-center justify-center px-4 py-3 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-700">Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className="flex items-center justify-center px-4 py-3 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-700">Reject</span>
                </button>
              </div>
            </div>
          )}

          {/* Approval Confirmation */}
          {action === 'approve' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">Approve Timesheet</h4>
                  <p className="mt-1 text-sm text-green-700">
                    This will approve {Number(timesheet.total_hours).toFixed(2)} hours for this employee.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {action === 'reject' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Reject Timesheet</h4>
                    <p className="mt-1 text-sm text-red-700">
                      Please provide a reason for rejection.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Rejection Reason
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why this timesheet is being rejected..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {action ? (
              <>
                <button
                  type="button"
                  onClick={() => setAction(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || (action === 'reject' && !notes.trim())}
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
