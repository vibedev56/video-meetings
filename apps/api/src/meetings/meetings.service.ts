import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProcessingStatus } from './meeting-ai-status.js';

export interface MeetingAiSource {
  id: string;
  summary: string | null;
  decisions: string[];
}

export interface MeetingAiUpdate {
  summary?: string;
  decisions?: string[];
}

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the meeting only when it belongs to ownerId, otherwise null. */
  findOwnedForAi(
    meetingId: string,
    ownerId: string,
  ): Promise<MeetingAiSource | null> {
    return this.prisma.meeting.findFirst({
      where: { id: meetingId, ownerId },
      select: { id: true, summary: true, decisions: true },
    });
  }

  async getOwnerId(meetingId: string): Promise<string | null> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { ownerId: true },
    });
    return meeting?.ownerId ?? null;
  }

  /** Returns false when the meeting is missing or not owned by ownerId. */
  async updateAiResult(
    meetingId: string,
    ownerId: string,
    update: MeetingAiUpdate,
  ): Promise<boolean> {
    const { count } = await this.prisma.meeting.updateMany({
      where: { id: meetingId, ownerId },
      data: update,
    });
    return count > 0;
  }

  /** Returns false when the meeting no longer exists. */
  async markAiStatus(
    meetingId: string,
    status: AiProcessingStatus,
    error: string | null = null,
  ): Promise<boolean> {
    const finished =
      status === AiProcessingStatus.DONE ||
      status === AiProcessingStatus.FAILED;
    const { count } = await this.prisma.meeting.updateMany({
      where: { id: meetingId },
      data: {
        aiStatus: status,
        aiError: status === AiProcessingStatus.FAILED ? error : null,
        aiProcessedAt: finished ? new Date() : null,
      },
    });
    return count > 0;
  }

  /**
   * AI is not configured: not an error. The meeting stays PENDING and the
   * reason is kept in aiError so the UI can show a neutral hint.
   */
  async markAiSkipped(meetingId: string, reason: string): Promise<boolean> {
    const { count } = await this.prisma.meeting.updateMany({
      where: { id: meetingId },
      data: {
        aiStatus: AiProcessingStatus.PENDING,
        aiError: reason,
        aiProcessedAt: null,
      },
    });
    return count > 0;
  }

  /** Boot recovery: runs interrupted by a crash go back to PENDING. */
  async resetInterruptedAi(): Promise<string[]> {
    const stuck = await this.prisma.meeting.findMany({
      where: { aiStatus: AiProcessingStatus.IN_PROGRESS },
      select: { id: true },
    });
    await this.prisma.meeting.updateMany({
      where: { aiStatus: AiProcessingStatus.IN_PROGRESS },
      data: { aiStatus: AiProcessingStatus.PENDING },
    });
    return stuck.map((meeting) => meeting.id);
  }
}
