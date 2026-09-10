type Bucket = { count: number; startedAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function bucket(key: string, now: number): Bucket | undefined {
  const found = buckets.get(key);
  if (!found || now - found.startedAt >= WINDOW_MS) { buckets.delete(key); return undefined; }
  return found;
}

export function loginAllowed(key: string): boolean {
  const now = Date.now();
  for (const [entry, value] of buckets) if (now - value.startedAt >= WINDOW_MS) buckets.delete(entry);
  return (bucket(key, now)?.count ?? 0) < MAX_FAILURES;
}

export function loginFailed(key: string): void {
  const now = Date.now(); const found = bucket(key, now);
  if (found) found.count += 1; else buckets.set(key, { count: 1, startedAt: now });
}

export function loginSucceeded(key: string): void { buckets.delete(key); }
