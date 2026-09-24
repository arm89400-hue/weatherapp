const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// Forecast rows are midnight-anchored in Bangkok time, so `gte: new Date()` would drop today's
// row from mid-morning on — always compare against start of the Bangkok day instead.
export function startOfTodayBangkok(): Date {
  const bangkokNow = new Date(Date.now() + BANGKOK_UTC_OFFSET_MS);
  const y = bangkokNow.getUTCFullYear();
  const m = bangkokNow.getUTCMonth();
  const d = bangkokNow.getUTCDate();
  return new Date(Date.UTC(y, m, d) - BANGKOK_UTC_OFFSET_MS);
}

export function startOfTomorrowBangkok(): Date {
  const today = startOfTodayBangkok();
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
}
