import type { Task } from '../generated/prisma/client.js';
import type { TaskStatus } from './task-status.js';

export interface TaskResult {
  id: string;
  title: string;
  assignee: string | null;
  status: TaskStatus;
  sourceMeetingId: string;
  createdAt: Date;
}

export function toTaskResult(task: Task): TaskResult {
  return {
    id: task.id,
    title: task.title,
    assignee: task.assignee,
    status: task.status,
    sourceMeetingId: task.sourceMeetingId,
    createdAt: task.createdAt,
  };
}
