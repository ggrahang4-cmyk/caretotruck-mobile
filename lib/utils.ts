import type { Timestamp } from "firebase/firestore";

export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function cpmDisplay(centsPerMile: number): string {
  return `$${(centsPerMile / 100).toFixed(3)}/mi`;
}

export function tsToDate(ts: Timestamp | null | undefined): Date | null {
  return ts ? ts.toDate() : null;
}

export function formatDate(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDate(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function slugify(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_");
}

/** Compute CPM from total cost cents and total miles. Returns null when miles = 0. */
export function computeCpm(totalCostCents: number, miles: number): number | null {
  if (miles <= 0) return null;
  return totalCostCents / miles;
}
