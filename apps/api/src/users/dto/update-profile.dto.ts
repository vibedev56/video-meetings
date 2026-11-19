import { IsString, MaxLength } from 'class-validator';

export const MAX_NAME_LENGTH = 100;

export class UpdateProfileDto {
  /** The display name. An empty or whitespace-only value resets it. */
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name: string;
}
