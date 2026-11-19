export class GetAvatarQuery {
  constructor(
    public readonly userId: string,
    /** True for the small version shown in the header. */
    public readonly thumbnail = false,
  ) {}
}
