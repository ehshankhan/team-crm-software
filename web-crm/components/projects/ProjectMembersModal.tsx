'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Project, User, ProjectMember } from '@/types';
import { X, UserPlus, Trash2, Users as UsersIcon } from 'lucide-react';

interface ProjectMembersModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProjectMembersModal({ project, onClose, onUpdate }: ProjectMembersModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>(project.members || []);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await api.get<User[]>('/users/');
      setAllUsers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    // Check if user is already a member
    if (members.some(m => m.user_id === selectedUserId)) {
      setError('User is already a project member');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post(`/projects/${project.id}/members`, {
        user_id: selectedUserId,
        role: selectedRole
      });

      // Refresh members
      const response = await api.get<Project>(`/projects/${project.id}`);
      setMembers(response.data.members || []);
      setSelectedUserId('');
      setSelectedRole('member');
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.delete(`/projects/${project.id}/members/${userId}`);

      // Refresh members
      const response = await api.get<Project>(`/projects/${project.id}`);
      setMembers(response.data.members || []);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const getUserById = (userId: string): User | undefined => {
    return allUsers.find(u => u.id === userId);
  };

  const availableUsers = allUsers.filter(
    user => !members.some(m => m.user_id === user.id)
  );

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <UsersIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Project Members</h3>
              <p className="text-sm text-gray-500 mt-1">{project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Add Member Section */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Member
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                disabled={loading}
              >
                <option value="">Select user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'owner' | 'member')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                disabled={loading}
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>

              <button
                onClick={handleAddMember}
                disabled={loading || !selectedUserId}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            </div>
          </div>

          {/* Current Members List */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Current Members ({members.length})
            </h4>
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No members yet. Add members to collaborate on this project.
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const user = getUserById(member.user_id);
                  if (!user) return null;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="ml-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              member.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={loading}
                        className="ml-4 text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
