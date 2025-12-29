'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cache } from '@/lib/cache';
import { Timesheet } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Edit } from 'lucide-react';
import EditTimesheetModal from '@/components/timesheets/EditTimesheetModal';
import ApproveRejectModal from '@/components/timesheets/ApproveRejectModal';

const CACHE_KEY_TIMESHEETS = 'timesheets_list';

export default function TimesheetsPage() {
  const { user } = useAuthStore();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [reviewingTimesheet, setReviewingTimesheet] = useState<Timesheet | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  const isManager = user?.role?.name === 'super_admin' || user?.role?.name === 'manager';

  useEffect(() => {
    // Generate cache key based on filters
    const cacheKey = `${CACHE_KEY_TIMESHEETS}_${viewMode}_${startDate}_${endDate}_${statusFilter}`;

    // Load from cache immediately
    const cached = cache.get<Timesheet[]>(cacheKey);
    if (cached) {
      setTimesheets(cached);
      setLoading(false);
    }

    // Fetch fresh data (show loading only if no cache)
    fetchTimesheets(!cached);
  }, [startDate, endDate, statusFilter, viewMode]);

  const fetchTimesheets = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const endpoint = viewMode === 'my' ? '/timesheets/me' : '/timesheets/';

      const params: any = {
        start_date: startDate,
        end_date: endDate,
      };

      if (statusFilter !== 'all') {
        params.status_filter = statusFilter;
      }

      const response = await api.get<Timesheet[]>(endpoint, { params });
      setTimesheets(response.data);

      // Cache with filter-specific key
      const cacheKey = `${CACHE_KEY_TIMESHEETS}_${viewMode}_${startDate}_${endDate}_${statusFilter}`;
      cache.set(cacheKey, response.data);
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleTimesheetUpdated = () => {
    setEditingTimesheet(null);
    fetchTimesheets();
  };

  const handleReviewComplete = () => {
    setReviewingTimesheet(null);
    fetchTimesheets();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  const canEdit = (timesheet: Timesheet) => {
    return timesheet.status === 'pending' && timesheet.user_id === user?.id;
  };

  const canReview = (timesheet: Timesheet) => {
    return isManager && timesheet.status === 'pending' && timesheet.user_id !== user?.id;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Timesheets</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track work hours with auto-generated and manual entries.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isManager && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'my' | 'all')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
              >
                <option value="my">My Timesheets</option>
                <option value="all">All Timesheets</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
            />
          </div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading timesheets...</div>
        ) : timesheets.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No timesheets found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auto Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manual Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(timesheet.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-blue-500" />
                        {Number(timesheet.auto_hours).toFixed(2)}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-purple-500" />
                        {Number(timesheet.manual_hours).toFixed(2)}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {Number(timesheet.total_hours).toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(timesheet.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {timesheet.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {canEdit(timesheet) && (
                          <button
                            onClick={() => setEditingTimesheet(timesheet)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit manual hours"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {canReview(timesheet) && (
                          <button
                            onClick={() => setReviewingTimesheet(timesheet)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {timesheets.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total Records: <span className="font-semibold">{timesheets.length}</span>
              </p>
              <p className="text-sm text-gray-600">
                Total Hours: <span className="font-semibold">
                  {timesheets.reduce((sum, t) => sum + Number(t.total_hours), 0).toFixed(2)}h
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {editingTimesheet && (
        <EditTimesheetModal
          timesheet={editingTimesheet}
          onClose={() => setEditingTimesheet(null)}
          onSuccess={handleTimesheetUpdated}
        />
      )}

      {reviewingTimesheet && (
        <ApproveRejectModal
          timesheet={reviewingTimesheet}
          onClose={() => setReviewingTimesheet(null)}
          onSuccess={handleReviewComplete}
        />
      )}
    </div>
  );
}
