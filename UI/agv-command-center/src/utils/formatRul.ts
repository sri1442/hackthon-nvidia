export function formatRulHours(hours: number | null | undefined): string {
  const numericHours = Number(hours ?? 0);

  if (!Number.isFinite(numericHours) || numericHours < 0) {
    return '0min';
  }

  const totalMinutes = Math.max(0, Math.round(numericHours * 60));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hrs === 0 && mins === 0) {
    return '0min';
  }

  if (hrs === 0) {
    return `${mins}min${mins === 1 ? '' : 's'}`;
  }

  if (mins === 0) {
    return `${hrs}hr${hrs === 1 ? '' : 's'}`;
  }

  return `${hrs}hr${hrs === 1 ? '' : 's'} ${mins}min${mins === 1 ? '' : 's'}`;
}
