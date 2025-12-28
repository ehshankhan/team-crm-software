'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Users, Clock, FolderKanban, Package, AlertCircle, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface DashboardStats {
  total_users: number;
  todays_attendance: number;
  active_projects: number;
  low_stock_items: number;
}

interface DeadlineTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  assignee?: {
    id: string;
    full_name: string;
  };
  board: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    todays_attendance: 0,
    active_projects: 0,
    low_stock_items: 0,
  });
  const [deadlines, setDeadlines] = useState<DeadlineTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const statsResponse = await api.get<DashboardStats>('/dashboard/stats');
      setStats(statsResponse.data);

      // Fetch upcoming deadlines
      const deadlineResponse = await api.get<DeadlineTask[]>('/tasks/upcoming-deadlines/all');
      setDeadlines(deadlineResponse.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statCards = [
    { name: 'Total Users', value: stats.total_users, icon: Users, color: 'bg-blue-500' },
    { name: "Today's Attendance", value: stats.todays_attendance, icon: Clock, color: 'bg-green-500' },
    { name: 'Active Projects', value: stats.active_projects, icon: FolderKanban, color: 'bg-purple-500' },
    { name: 'Low Stock Items', value: stats.low_stock_items, icon: Package, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome back, {user?.full_name}!
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Here's what's happening with your team today.
      </p>

      {loading ? (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="bg-white overflow-hidden shadow rounded-lg"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </dt>
                          <dd className="text-2xl font-semibold text-gray-900">
                            {stat.value}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upcoming Deadlines */}
          {deadlines.length > 0 && (
            <div className="mt-8 bg-white shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deadlines.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {task.board.project.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {task.assignee?.full_name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              {format(new Date(task.due_date), 'MMM dd, yyyy')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
