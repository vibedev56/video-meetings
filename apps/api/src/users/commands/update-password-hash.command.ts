export class UpdatePasswordHashCommand {
  constructor(
    public readonly userId: string,
    public readonly passwordHash: string,
  ) {}
}
