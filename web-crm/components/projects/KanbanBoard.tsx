'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Project, Task } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  project: Project;
  onCreateTask: (boardId: string) => void;
  onTaskClick: (task: Task) => void;
  onRefresh: () => void;
}

interface BoardColumn {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

export default function KanbanBoard({ project, onCreateTask, onTaskClick, onRefresh }: KanbanBoardProps) {
  const [boards, setBoards] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoardsWithTasks();
  }, [project]);

  const loadBoardsWithTasks = async () => {
    try {
      setLoading(true);
      const boardsWithTasks: BoardColumn[] = [];

      for (const board of project.boards) {
        const response = await api.get<Task[]>(`/boards/${board.id}/tasks`);
        boardsWithTasks.push({
          id: board.id,
          name: board.name,
          color: board.color,
          tasks: response.data.sort((a, b) => a.position - b.position),
        });
      }

      setBoards(boardsWithTasks);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {boards.map((board) => (
        <BoardColumn
          key={board.id}
          board={board}
          onCreateTask={onCreateTask}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  board: BoardColumn;
  onCreateTask: (boardId: string) => void;
  onTaskClick: (task: Task) => void;
}

function BoardColumn({ board, onCreateTask, onTaskClick }: BoardColumnProps) {
  const { setNodeRef } = useDroppable({
    id: board.id,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-100 rounded-lg p-4">
        {/* Board Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: board.color }}
            />
            <h3 className="font-semibold text-gray-900">{board.name}</h3>
            <span className="ml-2 text-sm text-gray-500">({board.tasks.length})</span>
          </div>
          <button
            onClick={() => onCreateTask(board.id)}
            className="text-gray-500 hover:text-gray-700"
            title="Add task"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Tasks Drop Zone */}
        <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
          {board.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
          {board.tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No tasks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
