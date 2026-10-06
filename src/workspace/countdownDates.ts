const DUBAI = "Asia/Dubai";

/** Calendar dates for site work always use Dubai, not the phone's timezone. */
export const dubaiDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
export const calendarDays = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export const daysBefore = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);

export const taskCountdown = (due: string, done: boolean, now = new Date()) => {
  if (done) return { text: "Done", tone: "muted" } as const;
  const deadline = new Date(due);
  if (Number.isNaN(deadline.getTime())) return { text: "No deadline", tone: "muted" } as const;
  const days = calendarDays(dubaiDay(now), dubaiDay(deadline));
  if (deadline.getTime() < now.getTime()) return {
    text: days < 0 ? `overdue by ${-days} ${days === -1 ? "day" : "days"}` : "overdue by less than a day",
    tone: "overdue",
  } as const;
  return { text: days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`, tone: days <= 1 ? "soon" : "muted" } as const;
};

export const noRectificationDay = (operationsDue: string | null, handover: string | null) => {
  if (!operationsDue || !handover) return false;
  const due = new Date(operationsDue);
  return !Number.isNaN(due.getTime()) && dubaiDay(due) > daysBefore(handover, 2);
};