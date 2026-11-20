/** Published after an upload transaction commits; the file row exists by then. */
export class MeetingFileUploadedEvent {
  constructor(
    public readonly meetingFileId: string,
    public readonly meetingId: string,
    public readonly originalName: string,
  ) {}
}
