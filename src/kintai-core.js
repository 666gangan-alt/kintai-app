export function timeToMinutes(value) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function durationMinutes(start, end) {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from == null || to == null) return 0;
  return to >= from ? to - from : 24 * 60 - from + to;
}

export function workHours(day) {
  if (!day || day.off) return 0;
  const worked = durationMinutes(day.in1, day.out1) + durationMinutes(day.in2, day.out2);
  const breakMinutes = Math.max(0, Number.parseFloat(day.breakH) || 0) * 60;
  return Math.max(0, worked - breakMinutes) / 60;
}

export function formatHours(value) {
  if (!value) return '0';
  return (Math.round(value * 100) / 100).toString().replace(/\.0+$/, '');
}
