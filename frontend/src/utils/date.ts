export function parseDate(dateStr: string): Date {
  // SQLite stores "YYYY-MM-DD HH:MM:SS" without timezone — treat as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
}
