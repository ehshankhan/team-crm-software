'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Plus, Trash2, Edit2, Calendar, Clock, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';

interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  activity: string;
  hours_spent: number | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function DailyLogPage() {
  const { user } = useAuthStore();
  const [myLogs, setMyLogs] = useState<DailyLog[]>([]);
  const [teamLogs, setTeamLogs] = useState<DailyLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-logs' | 'team-logs'>('my-logs');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Form state
  const [formData, setFormData] = useState({
    activity: '',
    hours_spent: '',
    project_id: '',
  });
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchProjects();
    fetchMyLogs();
    fetchTeamLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'my-logs') {
      fetchMyLogs();
    } else {
      fetchTeamLogs();
    }
  }, [selectedDate, activeTab]);

  const fetchProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects/');
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchMyLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get<DailyLog[]>('/daily-logs/my-logs', {
        params: {
          start_date: selectedDate,
          end_date: selectedDate,
        },
      });
      setMyLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch my logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get<DailyLog[]>('/daily-logs/team', {
        params: {
          log_date: selectedDate,
        },
      });
      setTeamLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch team logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.activity.trim()) {
      setError('Activity description is required');
      return;
    }

    try {
      const payload = {
        date: editingLog ? editingLog.date : today,
        activity: formData.activity,
        hours_spent: formData.hours_spent ? parseFloat(formData.hours_spent) : null,
        project_id: formData.project_id || null,
      };

      if (editingLog) {
        await api.put(`/daily-logs/${editingLog.id}`, {
          activity: formData.activity,
          hours_spent: formData.hours_spent ? parseFloat(formData.hours_spent) : null,
          project_id: formData.project_id || null,
        });
      } else {
        await api.post('/daily-logs/', payload);
      }

      // Reset form
      setFormData({ activity: '', hours_spent: '', project_id: '' });
      setEditingLog(null);

      // Refresh logs
      fetchMyLogs();
      if (activeTab === 'team-logs') {
        fetchTeamLogs();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save log');
    }
  };

  const handleEdit = (log: DailyLog) => {
    setEditingLog(log);
    setFormData({
      activity: log.activity,
      hours_spent: log.hours_spent?.toString() || '',
      project_id: log.project_id || '',
    });
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log entry?')) return;

    try {
      await api.delete(`/daily-logs/${logId}`);
      fetchMyLogs();
      if (activeTab === 'team-logs') {
        fetchTeamLogs();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete log');
    }
  };

  const cancelEdit = () => {
    setEditingLog(null);
    setFormData({ activity: '', hours_spent: '', project_id: '' });
    setError(null);
  };

  const canEditLog = (log: DailyLog) => {
    return log.user_id === user?.id && log.date === today;
  };

  const displayLogs = activeTab === 'my-logs' ? myLogs : teamLogs;

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Daily Tracker</h1>
          <p className="mt-2 text-sm text-gray-700">
            Log your daily activities and view team progress
          </p>
        </div>
      </div>

      {/* Add New Log Form (only show on My Logs tab and for today) */}
      {activeTab === 'my-logs' && selectedDate === today && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingLog ? 'Edit Log Entry' : 'Add Today\'s Activity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Description *
              </label>
              <textarea
                required
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                placeholder="What did you work on?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours Spent (optional)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.hours_spent}
                  onChange={(e) => setFormData({ ...formData, hours_spent: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Project (optional)
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="">None</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {editingLog && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingLog ? (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Update Entry
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs and Date Picker */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('my-logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'my-logs'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Logs
          </button>
          <button
            onClick={() => setActiveTab('team-logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'team-logs'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Team Logs
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-gray-600">Loading logs...</p>
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'my-logs'
                ? 'Start by adding your first activity for today.'
                : 'No team activities logged for this date.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === 'team-logs' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Member
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logged At
                  </th>
                  {activeTab === 'my-logs' && selectedDate === today && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    {activeTab === 'team-logs' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.user?.full_name}
                        </div>
                        <div className="text-xs text-gray-500">{log.user?.email}</div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {log.activity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        {log.hours_spent ? (
                          <>
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {log.hours_spent}h
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.project ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <FolderKanban className="h-4 w-4 mr-1 text-gray-400" />
                          {log.project.name}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.created_at), 'h:mm a')}
                    </td>
                    {activeTab === 'my-logs' && selectedDate === today && canEditLog(log) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(log)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {displayLogs.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Total Entries: {displayLogs.length}
            </span>
            <span className="text-sm font-medium text-blue-900">
              Total Hours: {displayLogs.reduce((sum, log) => sum + (log.hours_spent || 0), 0).toFixed(1)}h
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
