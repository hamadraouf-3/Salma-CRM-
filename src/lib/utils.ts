import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_CURRENCY } from "@/lib/validations";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    // Unknown/invalid currency code — fall back to a plain number + code.
    return `${new Intl.NumberFormat("en-US").format(value)} ${currency}`;
  }
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Shows the time too, but only when one was actually set (not exactly midnight). */
export function formatDateMaybeTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? formatDateTime(d) : formatDate(d);
}

/** Converts a Date to the `YYYY-MM-DDTHH:mm` value a `datetime-local` input expects, in local time. */
export function toDatetimeLocalValue(date: Date | string) {
  const d = new Date(date);
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}
