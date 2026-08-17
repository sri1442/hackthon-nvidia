/**
 * Time Formatting Utilities
 */

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatTimeDifference(minutesAgo: number): string {
  if (minutesAgo === 0) return 'just now';
  if (minutesAgo === 1) return '1m ago';
  return `${minutesAgo}m ago`;
}

export function getCurrentTime(): string {
  return new Date().toLocaleTimeString();
}
