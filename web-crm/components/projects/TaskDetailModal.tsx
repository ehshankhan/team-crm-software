'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Task, TaskComment } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { X, Calendar, Clock, User, MessageSquare, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TaskDetailModal({ task: initialTask, onClose, onUpdate }: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    fetchTaskDetails();
    fetchComments();
  }, []);

  const fetchTaskDetails = async () => {
    try {
      const response = await api.get<Task>(`/tasks/${task.id}`);
      setTask(response.data);
    } catch (err) {
      console.error('Failed to fetch task details:', err);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await api.get<TaskComment[]>(`/tasks/${task.id}/comments`);
      setComments(response.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await api.post(`/tasks/${task.id}/comments`, {
        content: newComment,
      });
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/tasks/${task.id}`);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteTask}
              className="text-red-600 hover:text-red-700 p-2"
              title="Delete task"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{task.description}</p>
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4">
            {task.due_date && (
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <span className="text-gray-500">Due: </span>
                  <span className="text-gray-900">{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            )}

            {task.estimated_hours && (
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <span className="text-gray-500">Estimated: </span>
                  <span className="text-gray-900">{task.estimated_hours}h</span>
                </div>
              </div>
            )}

            {task.assignee_id && (
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <span className="text-gray-500">Assigned to: </span>
                  <span className="text-gray-900">Team Member</span>
                </div>
              </div>
            )}

            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-gray-500">Created: </span>
                <span className="text-gray-900">{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-sm font-medium text-gray-900">
                Comments ({comments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {commentsLoading ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.user_id === user?.id ? 'You' : 'Team Member'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_at), 'MMM dd, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
              />
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
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
