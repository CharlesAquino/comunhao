const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(value: string | Date, now = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'data indisponível';
  }

  const difference = Math.max(0, now.getTime() - date.getTime());

  if (difference < MINUTE_MS) {
    return 'agora mesmo';
  }

  const minutes = Math.floor(difference / MINUTE_MS);
  if (minutes < 60) {
    return `há ${minutes} min`;
  }

  const hours = Math.floor(difference / HOUR_MS);
  if (hours < 24) {
    return `há ${hours} h`;
  }

  const days = Math.floor(difference / DAY_MS);
  if (days < 7) {
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}
