'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Leave, LeaveCreate } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Plus, Calendar, CheckCircle, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function LeavePage() {
  const { user } = useAuthStore();
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-leaves' | 'all-leaves'>('my-leaves');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<LeaveCreate>({
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.role?.name === 'super_admin' || user?.role?.name === 'manager';

  useEffect(() => {
    fetchMyLeaves();
    if (isManager) {
      fetchAllLeaves();
    }
  }, []);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get<Leave[]>('/leave/me');
      setMyLeaves(response.data);
    } catch (err) {
      console.error('Failed to fetch my leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const response = await api.get<Leave[]>('/leave/');
      setAllLeaves(response.data);
    } catch (err) {
      console.error('Failed to fetch all leaves:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await api.post('/leave/', formData);
      setShowCreateForm(false);
      setFormData({ start_date: '', end_date: '', reason: '' });
      fetchMyLeaves();
      if (isManager) fetchAllLeaves();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create leave request');
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await api.put(`/leave/${leaveId}/approve`, { status: 'approved' });
      fetchAllLeaves();
      fetchMyLeaves();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve leave');
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      await api.put(`/leave/${leaveId}/approve`, {
        status: 'rejected',
        rejection_reason: reason || undefined,
      });
      fetchAllLeaves();
      fetchMyLeaves();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject leave');
    }
  };

  const handleDelete = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;

    try {
      await api.delete(`/leave/${leaveId}`);
      fetchMyLeaves();
      if (isManager) fetchAllLeaves();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete leave request');
    }
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
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  const displayLeaves = activeTab === 'my-leaves' ? myLeaves : allLeaves;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Request and manage leave applications
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Request Leave'}
          </button>
        </div>
      </div>

      {/* Create Leave Form */}
      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                placeholder="Why are you requesting leave?"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      {isManager && (
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-leaves')}
              className={`${
                activeTab === 'my-leaves'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Leaves
            </button>
            <button
              onClick={() => setActiveTab('all-leaves')}
              className={`${
                activeTab === 'all-leaves'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Leaves ({allLeaves.length})
            </button>
          </nav>
        </div>
      )}

      {/* Leaves List */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading leaves...</div>
        ) : displayLeaves.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No leave requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === 'all-leaves' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayLeaves.map((leave) => {
                  const startDate = new Date(leave.start_date);
                  const endDate = new Date(leave.end_date);
                  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      {activeTab === 'all-leaves' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {leave.user?.full_name}
                          </div>
                          <div className="text-xs text-gray-500">{leave.user?.email}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(startDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(endDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {days} {days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {leave.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(leave.status)}
                        {leave.status === 'rejected' && leave.rejection_reason && (
                          <div className="text-xs text-red-600 mt-1">
                            {leave.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {activeTab === 'all-leaves' && leave.status === 'pending' && isManager && (
                            <>
                              <button
                                onClick={() => handleApprove(leave.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Approve"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReject(leave.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {activeTab === 'my-leaves' && leave.status === 'pending' && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
    </div>
  );
}
