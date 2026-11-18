export class GetMeetingQuery {
  constructor(
    public readonly ownerId: string,
    public readonly meetingId: string,
  ) {}
}
