'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Attendance, User } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Users, Calendar, Clock } from 'lucide-react';

export default function AllUsersAttendance() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [selectedUserId, startDate, endDate]);

  const fetchUsers = async () => {
    try {
      const response = await api.get<User[]>('/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      let url = '/attendance/';

      if (selectedUserId !== 'all') {
        url = `/attendance/user/${selectedUserId}`;
      }

      const response = await api.get<Attendance[]>(url, {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });
      setAttendances(response.data);
    } catch (err) {
      console.error('Failed to fetch attendances:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'In Progress';

    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">All Users Attendance</h2>
          </div>

          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <label htmlFor="userFilter" className="text-sm text-gray-700">User:</label>
              <select
                id="userFilter"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1 border"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="adminStartDate" className="text-sm text-gray-700">From:</label>
              <input
                type="date"
                id="adminStartDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1 border"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="adminEndDate" className="text-sm text-gray-700">To:</label>
              <input
                type="date"
                id="adminEndDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1 border"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading...</div>
        ) : attendances.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No attendance records found for the selected criteria.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getUserName(attendance.user_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {format(new Date(attendance.date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-green-500" />
                      {format(new Date(attendance.check_in), 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.check_out ? (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-red-500" />
                        {format(new Date(attendance.check_out), 'h:mm a')}
                      </div>
                    ) : (
                      <span className="text-yellow-600">--:--</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calculateDuration(attendance.check_in, attendance.check_out)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Total Records: <span className="font-semibold">{attendances.length}</span>
        </p>
      </div>
    </div>
  );
}
