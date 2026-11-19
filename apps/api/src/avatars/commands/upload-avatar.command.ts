export class UploadAvatarCommand {
  constructor(
    public readonly userId: string,
    /** Generated name of the file already written to the avatar directory. */
    public readonly storedName: string,
    public readonly filePath: string,
  ) {}
}
