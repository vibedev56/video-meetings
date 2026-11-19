import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export const MAX_NAME_LENGTH = 100;

export class UpdateProfileDto {
  /**
   * The display name. It is trimmed first, so the limit applies to the saved
   * value; an empty or whitespace-only value resets it. The length is counted
   * in UTF-16 code units, as in JavaScript's `string.length` (the web client
   * counts the same way). Control and format characters (NUL, line breaks,
   * zero-width and bidi marks) are rejected: they can break the database
   * write or fake what the header shows.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  @Matches(/^[^\p{Cc}\p{Cf}]*$/u, {
    message: 'name must not contain control or invisible characters',
  })
  name: string;
}
