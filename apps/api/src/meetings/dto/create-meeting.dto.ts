import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  /** ISO 8601 date-time, for example `2026-12-01T10:00:00Z`. */
  @IsDateString()
  date: string;

  @IsArray()
  @IsEmail({}, { each: true })
  participants: string[];
}
