/**
 * Checks, before the request body is read, that the owner may upload to this
 * meeting. Returns nothing on success and throws 404 or 409 otherwise.
 */
export class AssertCanUploadMeetingFileQuery {
  constructor(
    public readonly ownerId: string,
    public readonly meetingId: string,
  ) {}
}
