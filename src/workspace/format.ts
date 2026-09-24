export const aed = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `AED ${Math.round(v).toLocaleString("en-US")}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  // date-only strings are parsed as local dates to avoid timezone shifts
  const dt = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

/** Today as YYYY-MM-DD in local time. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isDue = (d: string | null | undefined) => !!d && d <= todayISO();

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
