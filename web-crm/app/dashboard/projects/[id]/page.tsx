'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Project, Task } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ArrowLeft, Plus, Users, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import KanbanBoard from '@/components/projects/KanbanBoard';
import TaskCard from '@/components/projects/TaskCard';
import CreateTaskModal from '@/components/projects/CreateTaskModal';
import TaskDetailModal from '@/components/projects/TaskDetailModal';
import ProjectMembersModal from '@/components/projects/ProjectMembersModal';
import EditProjectModal from '@/components/projects/EditProjectModal';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuthStore();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [boardTasks, setBoardTasks] = useState<Map<string, Task[]>>(new Map());

  // Check if user is a project member or admin/manager
  const canManage = user?.role?.name === 'super_admin' || user?.role?.name === 'manager';
  const isAdmin = user?.role?.name === 'super_admin';
  const isMember = canManage || project?.members?.some(m => m.user_id === user?.id) || false;

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

    const sourceBoardId = task.board_id;

    // If dropped on same board, do nothing
    if (sourceBoardId === targetBoardId) return;

    // Optimistic update: Move task immediately in UI
    setBoardTasks(prev => {
      const newMap = new Map(prev);

      // Remove from source board
      const sourceTasks = newMap.get(sourceBoardId) || [];
      const updatedSourceTasks = sourceTasks.filter(t => t.id !== taskId);
      newMap.set(sourceBoardId, updatedSourceTasks);

      // Add to target board
      const targetTasks = newMap.get(targetBoardId) || [];
      const movedTask = { ...task, board_id: targetBoardId, position: 0 };
      newMap.set(targetBoardId, [movedTask, ...targetTasks]);

      return newMap;
    });

    // Sync with server in background
    try {
      await api.put(`/tasks/${taskId}/move`, {
        board_id: targetBoardId,
        position: 0,
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert on error
      setBoardTasks(prev => {
        const newMap = new Map(prev);

        // Remove from target board
        const targetTasks = newMap.get(targetBoardId) || [];
        const revertedTargetTasks = targetTasks.filter(t => t.id !== taskId);
        newMap.set(targetBoardId, revertedTargetTasks);

        // Add back to source board
        const sourceTasks = newMap.get(sourceBoardId) || [];
        newMap.set(sourceBoardId, [...sourceTasks, task]);

        return newMap;
      });
      alert('Failed to move task. Please try again.');
    }
  };

  const findTask = (taskId: string): Task | null => {
    if (!project) return null;

    for (const board of project.boards) {
      const tasks = boardTasks.get(board.id) || [];
      const task = tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return null;
  };

  const handleTasksLoaded = (boardId: string, tasks: Task[]) => {
    setBoardTasks(prev => {
      const newMap = new Map(prev);
      newMap.set(boardId, tasks);
      return newMap;
    });
  };

  const handleTaskCreated = () => {
    setShowCreateTask(null);
    fetchProject();
  };

  const handleTaskUpdated = () => {
    setSelectedTask(null);
    fetchProject();
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmMessage = `Are you sure you want to PERMANENTLY delete "${project.name}"?\n\nThis will delete:\n- The project\n- All boards\n- All tasks\n- All comments\n\nThis action CANNOT be undone!`;
    if (!confirm(confirmMessage)) return;

    try {
      await api.delete(`/projects/${project.id}`);
      // Redirect to projects page
      window.location.href = '/dashboard/projects';
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-sm text-gray-600">{project.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {canManage && (
              <>
                <button
                  onClick={() => setShowEditProject(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </button>
                <button
                  onClick={() => setShowMembers(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members ({project.members?.length || 0})
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={handleDeleteProject}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </button>
            )}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <KanbanBoard
          project={project}
          isMember={isMember}
          boardTasks={boardTasks}
          onCreateTask={(boardId) => setShowCreateTask(boardId)}
          onTaskClick={(task) => setSelectedTask(task)}
          onRefresh={fetchProject}
          onTasksLoaded={handleTasksLoaded}
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

      {showMembers && project && (
        <ProjectMembersModal
          project={project}
          onClose={() => setShowMembers(false)}
          onUpdate={fetchProject}
        />
      )}

      {showEditProject && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSuccess={() => {
            setShowEditProject(false);
            fetchProject();
          }}
        />
      )}
    </div>
  );
}
