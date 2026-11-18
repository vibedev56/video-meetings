import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingFileStorage } from '../meeting-file.storage.js';
import { DeleteMeetingFileCommand } from './delete-meeting-file.command.js';

@CommandHandler(DeleteMeetingFileCommand)
export class DeleteMeetingFileHandler implements ICommandHandler<
  DeleteMeetingFileCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MeetingFileStorage,
  ) {}

  async execute(command: DeleteMeetingFileCommand): Promise<void> {
    const where = {
      id: command.fileId,
      meetingId: command.meetingId,
      meeting: { ownerId: command.ownerId },
    };

    const file = await this.prisma.meetingFile.findFirst({
      where,
      select: { storedName: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // deleteMany keeps the owner condition in the write itself. If another
    // request removed the row in between, count is 0 and we report 404.
    const { count } = await this.prisma.meetingFile.deleteMany({ where });

    if (count === 0) {
      throw new NotFoundException('File not found');
    }

    await this.storage.remove([file.storedName]);
  }
}
