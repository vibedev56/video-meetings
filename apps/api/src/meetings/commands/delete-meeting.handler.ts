import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingFileStorage } from '../../meeting-files/meeting-file.storage.js';
import { DeleteMeetingCommand } from './delete-meeting.command.js';

@CommandHandler(DeleteMeetingCommand)
export class DeleteMeetingHandler implements ICommandHandler<
  DeleteMeetingCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MeetingFileStorage,
  ) {}

  async execute(command: DeleteMeetingCommand): Promise<void> {
    // Locking the meeting row (as the upload handler does) means an upload
    // either lands before this read, so its file is listed, or waits and
    // then fails with 404. No file can be left behind on disk.
    const storedNames = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM meetings
        WHERE id = ${command.meetingId} AND "ownerId" = ${command.ownerId}
        FOR UPDATE`;

      if (locked.length === 0) {
        throw new NotFoundException('Meeting not found');
      }

      const files = await tx.meetingFile.findMany({
        where: { meetingId: command.meetingId },
        select: { storedName: true },
      });

      // The meeting's files are removed by the database cascade.
      await tx.meeting.delete({ where: { id: command.meetingId } });

      return files.map((file) => file.storedName);
    });

    // The rows are gone, so remove the bytes after the commit.
    await this.storage.remove(storedNames);
  }
}
