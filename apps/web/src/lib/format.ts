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
