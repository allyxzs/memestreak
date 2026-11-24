export type Status = "done" | "skipped";
export type Habit = {
  id: string;
  name: string;
  emoji: string;
  days: number[];
  goal: number;
  created: string;
  archived: boolean;
  pauses?: { start: string; end: string | null }[];
  logs: Record<string, Status>;
};
// Dates represent local calendar days, never UTC timestamps. Noon avoids DST boundaries.
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function shift(key: string, amount: number): string {
  const d = parseDate(key);
  d.setDate(d.getDate() + amount);
  return dateKey(d);
}
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = shift(d, 1)) out.push(d);
  return out;
}
export function scheduled(h: Habit, day: string): boolean {
  return (
    day >= h.created &&
    h.days.includes(parseDate(day).getDay()) &&
    !(h.pauses || []).some((p) => day >= p.start && (!p.end || day <= p.end))
  );
}
export function stats(h: Habit, today: string) {
  const days = datesBetween(h.created, today).filter((d) => scheduled(h, d));
  let run = 0,
    best = 0,
    total = 0,
    opportunities = 0,
    skipped = 0;
  for (const day of days) {
    const status = h.logs[day];
    if (day === today && !status) continue; // Today remains open until midnight.
    opportunities++;
    if (status === "done") {
      run++;
      total++;
      best = Math.max(best, run);
    } else {
      run = 0;
      skipped++;
    }
  }
  return {
    current: run,
    best,
    total,
    opportunities,
    skipped,
    consistency: opportunities ? Math.round((total / opportunities) * 100) : 0,
  };
}
export function breaks(h: Habit, today: string): string[] {
  let run = 0;
  const result: string[] = [];
  for (const day of datesBetween(h.created, today)) {
    if (!scheduled(h, day)) continue;
    if (day === today && !h.logs[day]) continue;
    if (h.logs[day] === "done") run++;
    else {
      if (run > 0) result.push(`${h.id}:${day}`);
      run = 0;
    }
  }
  return result;
}
export function setLog(
  h: Habit,
  day: string,
  status: Status | undefined,
  today: string,
): Habit {
  if (day > today || !scheduled(h, day))
    throw new Error("Escolha um dia válido da rotina.");
  const logs = { ...h.logs };
  if (status) logs[day] = status;
  else delete logs[day];
  return { ...h, logs };
}

export function archiveHabit(h: Habit, today: string): Habit {
  if (!h.archived)
    return {
      ...h,
      archived: true,
      pauses: [
        ...(h.pauses || []),
        { start: h.logs[today] ? shift(today, 1) : today, end: null },
      ],
    };
  return {
    ...h,
    archived: false,
    pauses: (h.pauses || [])
      .map((p) => (p.end ? p : { ...p, end: shift(today, -1) }))
      .filter((p) => !p.end || p.end >= p.start),
  };
}
