'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Project, Task } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import KanbanBoard from '@/components/projects/KanbanBoard';
import TaskCard from '@/components/projects/TaskCard';
import CreateTaskModal from '@/components/projects/CreateTaskModal';
import TaskDetailModal from '@/components/projects/TaskDetailModal';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await api.get<Project>(`/projects/${projectId}`);
      setProject(response.data);
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTask(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !project) return;

    const taskId = active.id as string;
    const targetBoardId = over.id as string;

    const task = findTask(taskId);
    if (!task) return;

    // If dropped on same board, do nothing
    if (task.board_id === targetBoardId) return;

    try {
      // Move task to new board
      await api.put(`/tasks/${taskId}/move`, {
        board_id: targetBoardId,
        position: 0,
      });

      // Refresh project data
      fetchProject();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const findTask = (taskId: string): Task | null => {
    if (!project) return null;

    for (const board of project.boards) {
      const tasks = getBoardTasks(board.id);
      const task = tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return null;
  };

  const getBoardTasks = (boardId: string): Task[] => {
    // In a real app, tasks would be fetched separately
    // For now, return empty array as tasks are loaded separately
    return [];
  };

  const handleTaskCreated = () => {
    setShowCreateTask(null);
    fetchProject();
  };

  const handleTaskUpdated = () => {
    setSelectedTask(null);
    fetchProject();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center">
        <p className="text-gray-600">Project not found</p>
        <Link href="/dashboard/projects" className="text-blue-600 hover:text-blue-500">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="mt-2 text-sm text-gray-600">{project.description}</p>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <KanbanBoard
          project={project}
          onCreateTask={(boardId) => setShowCreateTask(boardId)}
          onTaskClick={(task) => setSelectedTask(task)}
          onRefresh={fetchProject}
        />

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {showCreateTask && (
        <CreateTaskModal
          boardId={showCreateTask}
          projectId={projectId}
          onClose={() => setShowCreateTask(null)}
          onSuccess={handleTaskCreated}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
        />
      )}
    </div>
  );
}
