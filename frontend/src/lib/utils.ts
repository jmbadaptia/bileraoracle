import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

/**
 * Summarizes course sessions into a human-readable schedule.
 * e.g. "Martes, 18:00–19:00, del 1 oct al 31 dic" or "Lunes y Miércoles, 18:00–19:00, del 1 oct al 31 dic"
 * Falls back to "X sesiones" if pattern is irregular.
 */
export function formatScheduleSummary(sessions: Array<{ sessionDate?: string | null; timeStart?: string | null; timeEnd?: string | null }>): string | null {
  if (!sessions?.length) return null;

  const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  // Normalize date strings — handle both "2026-03-29" and "2026-03-29T00:00:00.000Z"
  const parseDate = (d: string) => {
    const dateStr = d.includes("T") ? d.split("T")[0] : d;
    return new Date(dateStr + "T12:00:00");
  };

  const validSessions = sessions.filter(s => s.sessionDate);
  if (!validSessions.length) return null;

  if (validSessions.length === 1) {
    const s = validSessions[0];
    const d = parseDate(s.sessionDate!);
    const dateStr = d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    const time = s.timeStart && s.timeEnd ? `, ${s.timeStart}–${s.timeEnd}` : s.timeStart ? `, ${s.timeStart}` : "";
    return `${dateStr}${time}`;
  }

  // Find which weekdays are used
  const weekdayCounts = new Map<number, number>();
  for (const s of validSessions) {
    const day = parseDate(s.sessionDate!).getDay();
    weekdayCounts.set(day, (weekdayCounts.get(day) || 0) + 1);
  }

  // Check if time is consistent
  const times = validSessions.map(s => `${s.timeStart || ""}-${s.timeEnd || ""}`);
  const uniqueTimes = [...new Set(times)];
  const consistentTime = uniqueTimes.length === 1 && validSessions[0].timeStart;

  // Sort dates
  const sorted = [...validSessions].sort((a, b) => a.sessionDate!.localeCompare(b.sessionDate!));
  const firstDate = parseDate(sorted[0].sessionDate!);
  const lastDate = parseDate(sorted[sorted.length - 1].sessionDate!);

  const fmtDate = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  // Build day names
  const dayKeys = [...weekdayCounts.keys()].sort();
  const dayNames = dayKeys.map(d => WEEKDAY_NAMES[d]);
  const dayStr = dayNames.length <= 3
    ? dayNames.length === 1 ? dayNames[0] : dayNames.slice(0, -1).join(", ") + " y " + dayNames[dayNames.length - 1]
    : `${validSessions.length} sesiones`;

  // If irregular days (more unique days than sessions would suggest for weekly), just show count
  const isRegular = dayKeys.length <= 3;

  if (!isRegular) {
    const timeStr = consistentTime ? `, ${validSessions[0].timeStart}–${validSessions[0].timeEnd}` : "";
    return `${validSessions.length} sesiones${timeStr}, del ${fmtDate(firstDate)} al ${fmtDate(lastDate)}`;
  }

  const timeStr = consistentTime ? `, ${validSessions[0].timeStart}–${validSessions[0].timeEnd}` : "";
  return `${dayStr}${timeStr}, del ${fmtDate(firstDate)} al ${fmtDate(lastDate)}`;
}
