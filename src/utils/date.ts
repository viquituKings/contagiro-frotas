export function formatDateToBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

export function parseDateToTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  if (!trimmed) return 0;

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function compareDatesDesc<T extends { date: string; odometer?: number }>(a: T, b: T): number {
  const timeA = parseDateToTimestamp(a.date);
  const timeB = parseDateToTimestamp(b.date);
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return (b.odometer || 0) - (a.odometer || 0);
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
