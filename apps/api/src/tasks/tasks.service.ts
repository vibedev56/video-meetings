import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toTaskResult, type TaskResult } from './task.result.js';
import { TaskStatus } from './task-status.js';
import {
  MAX_ASSIGNEE_LENGTH,
  MAX_FIND_TASK_RESULTS,
  MAX_TASK_TITLE_LENGTH,
} from './tasks.constants.js';

export interface UpsertTaskInput {
  title: string;
  assignee?: string | null;
  status?: TaskStatus;
}

export function normalizeTaskTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Every method takes the meetingId and scopes the query by sourceMeetingId, so
 * a task of another meeting can be neither found nor changed.
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listByMeeting(meetingId: string): Promise<TaskResult[]> {
    const tasks = await this.prisma.task.findMany({
      where: { sourceMeetingId: meetingId },
      orderBy: { createdAt: 'asc' },
    });
    return tasks.map(toTaskResult);
  }

  /** Case-insensitive substring search over titles and assignees. */
  async findByText(meetingId: string, query: string): Promise<TaskResult[]> {
    const text = query.trim();
    const tasks = await this.prisma.task.findMany({
      where: {
        sourceMeetingId: meetingId,
        ...(text && {
          OR: [
            { title: { contains: text, mode: 'insensitive' } },
            { assignee: { contains: text, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_FIND_TASK_RESULTS,
    });
    return tasks.map(toTaskResult);
  }

  /**
   * Creates the task or, when the meeting already has one with the same
   * normalized title, updates it. An omitted assignee/status keeps the stored
   * value.
   */
  async upsert(meetingId: string, input: UpsertTaskInput): Promise<TaskResult> {
    const title = input.title.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    const titleKey = normalizeTaskTitle(title);
    const assignee = input.assignee?.trim().slice(0, MAX_ASSIGNEE_LENGTH);
    const task = await this.prisma.task.upsert({
      where: {
        sourceMeetingId_titleKey: { sourceMeetingId: meetingId, titleKey },
      },
      create: {
        title,
        titleKey,
        assignee: assignee || null,
        status: input.status ?? TaskStatus.OPEN,
        sourceMeetingId: meetingId,
      },
      update: {
        title,
        ...(assignee && { assignee }),
        ...(input.status && { status: input.status }),
      },
    });
    return toTaskResult(task);
  }
}
