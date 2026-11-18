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

/** Formats a byte count for display, for example `1,5 МБ`. */
export function formatFileSize(sizeBytes: number): string {
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${sizeFormatter.format(value)} ${SIZE_UNITS[unitIndex]}`;
}

/** Formats an ISO 8601 date-time string for display in Russian. */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}
