const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];

const sizeFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Rounds to one decimal place, the precision the size is shown with. */
function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Formats a byte count for display, for example `1,5 МБ`. The unit is chosen
 * after rounding, so a value that rounds up to 1024 moves to the next unit
 * (1 048 575 bytes shows as `1 МБ`, not `1 024 КБ`).
 */
export function formatFileSize(sizeBytes: number): string {
  let value = sizeBytes;
  let unitIndex = 0;

  while (unitIndex < SIZE_UNITS.length - 1 && roundToTenth(value) >= 1024) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${sizeFormatter.format(roundToTenth(value))} ${SIZE_UNITS[unitIndex]}`;
}

/**
 * Formats an ISO 8601 date-time string for display in Russian. An invalid date
 * gives a placeholder instead of throwing during render.
 */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Дата неизвестна';
  }
  return dateTimeFormatter.format(date);
}

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const INVALID_DATE_LABEL = 'Дата неизвестна';

/** `13 ноября 2026 г.` for an ISO 8601 date-time string. */
export function formatMeetingDay(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? INVALID_DATE_LABEL
    : dayFormatter.format(date);
}

/** `15:12` for an ISO 8601 date-time string, or an empty string if invalid. */
export function formatMeetingTime(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date);
}

/** `13 ноября 2026 в 15:12`: the compact date line of a meeting card. */
export function formatMeetingDateLine(isoDate: string): string {
  const time = formatMeetingTime(isoDate);
  if (!time) {
    return INVALID_DATE_LABEL;
  }
  return `${formatMeetingDay(isoDate).replace(/\s*г\.$/, '')} в ${time}`;
}

const MEETINGS_PLURAL_RULES = new Intl.PluralRules('ru-RU');

/** `1 встреча`, `2 встречи`, `5 встреч`. */
export function formatMeetingsCount(count: number): string {
  const category = MEETINGS_PLURAL_RULES.select(count);
  const noun =
    category === 'one' ? 'встреча' : category === 'few' ? 'встречи' : 'встреч';
  return `${count} ${noun}`;
}

/** Day of the month and a three-letter month (`13`, `НОЯ`) for the date badge. */
export function formatDateBadge(isoDate: string): {
  day: string;
  month: string;
} {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { day: '—', month: '' };
  }
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(
    date,
  );
  return {
    day: String(date.getDate()),
    month: month.slice(0, 3).toUpperCase(),
  };
}
