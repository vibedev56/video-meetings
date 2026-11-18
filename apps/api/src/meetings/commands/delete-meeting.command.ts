export class DeleteMeetingCommand {
  constructor(
    public readonly ownerId: string,
    public readonly meetingId: string,
  ) {}
}
