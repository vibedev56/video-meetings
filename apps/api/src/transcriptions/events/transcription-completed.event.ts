/** Published after a file's transcript is saved with status COMPLETED. */
export class TranscriptionCompletedEvent {
  constructor(
    public readonly meetingFileId: string,
    public readonly meetingId: string,
  ) {}
}
