'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Attendance } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Clock, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import AllUsersAttendance from '@/components/attendance/AllUsersAttendance';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const isAdmin = user?.role?.name === 'super_admin' || user?.role?.name === 'manager';

  useEffect(() => {
    fetchTodayAttendance();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get<Attendance>('/attendance/today');
      setTodayAttendance(response.data);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch today attendance:', err);
      }
    }
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      setError('Location not available. Please enable location services.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<Attendance>('/attendance/check-in', {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });
      setTodayAttendance(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      setError('Location not available. Please enable location services.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<Attendance>('/attendance/check-out', {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });
      setTodayAttendance(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const canCheckIn = !todayAttendance;
  const canCheckOut = todayAttendance && !todayAttendance.check_out;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
      <p className="mt-2 text-sm text-gray-700">
        Track your daily attendance with check-in and check-out.
      </p>

      {/* Check-in/out Card */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">Today's Attendance</h2>
              <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Location Status */}
        {locationError ? (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{locationError}</p>
                <button
                  onClick={getCurrentLocation}
                  className="mt-2 text-sm font-medium text-yellow-700 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : currentLocation ? (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-sm text-green-700">
                Location detected: {Number(currentLocation.lat).toFixed(4)}, {Number(currentLocation.lng).toFixed(4)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-sm text-gray-600">Getting your location...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Attendance Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Check-In</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {todayAttendance?.check_in
                    ? format(new Date(todayAttendance.check_in), 'h:mm a')
                    : '--:--'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Check-Out</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {todayAttendance?.check_out
                    ? format(new Date(todayAttendance.check_out), 'h:mm a')
                    : '--:--'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn || loading || !currentLocation}
            className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && canCheckIn ? 'Checking In...' : 'Check In'}
          </button>

          <button
            onClick={handleCheckOut}
            disabled={!canCheckOut || loading || !currentLocation}
            className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && canCheckOut ? 'Checking Out...' : 'Check Out'}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: You must be within 50 meters of the lab location to check in/out.
        </p>
      </div>

      {/* Attendance History */}
      <div className="mt-8">
        <AttendanceHistory onRefresh={fetchTodayAttendance} />
      </div>

      {/* Admin View - All Users Attendance */}
      {isAdmin && (
        <div className="mt-8">
          <AllUsersAttendance />
        </div>
      )}
    </div>
  );
}
