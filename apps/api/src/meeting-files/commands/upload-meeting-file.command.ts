export class UploadMeetingFileCommand {
  constructor(
    public readonly ownerId: string,
    public readonly meetingId: string,
    public readonly originalName: string,
    public readonly storedName: string,
    public readonly sizeBytes: number,
    public readonly mimeType: string,
    /** Temporary file written by multer; removed if the upload is rejected. */
    public readonly filePath: string,
  ) {}
}
