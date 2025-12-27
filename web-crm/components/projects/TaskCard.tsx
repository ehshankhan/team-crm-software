'use client';

import { Task } from '@/types';
import { useDraggable } from '@dnd-kit/core';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export default function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        bg-white rounded-lg p-3 shadow-sm border border-gray-200
        hover:shadow-md transition-shadow cursor-pointer
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        {isOverdue && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Task Title */}
      <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Meta */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {task.due_date && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{format(new Date(task.due_date), 'MMM dd')}</span>
            </div>
          )}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {task.estimated_hours && (
          <span className="text-xs font-medium">{task.estimated_hours}h</span>
        )}
      </div>
    </div>
  );
}
