// Indian Standard Time (IST, UTC+5:30) Timezone Engine
export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330; // +5 hours 30 minutes

/**
 * Returns year, month (1-12), date (1-31) of today in Asia/Kolkata
 */
export function getISTDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = istFormatter.format(now).split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
}

/**
 * Formats any date into consistent human-friendly 12-hour IST format (e.g. "04:15 PM IST").
 */
export function formatTimeIST(
  dateInput: string | number | Date | null | undefined,
  includeDate: boolean = false
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  if (includeDate) {
    options.weekday = 'short';
    options.month = 'short';
    options.day = 'numeric';
  }

  const formatted = new Intl.DateTimeFormat('en-IN', options).format(date);
  return `${formatted} IST`;
}

/**
 * Creates an exact ISO string corresponding to specified hours:minutes in IST.
 * If offsetDays is 0, it ALWAYS creates the timestamp on today's calendar date in IST.
 */
export function createISTDateTime(hours: number, minutes: number = 0, offsetDays: number = 0): string {
  const { year, month, day } = getISTDateParts();
  
  const targetDayUTC = Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0);
  const istOffsetMs = IST_OFFSET_MINUTES * 60 * 1000;
  const targetMs = targetDayUTC + (hours * 3600 + minutes * 60) * 1000 - istOffsetMs;

  return new Date(targetMs).toISOString();
}

/**
 * Normalizes any ISO string from Gemini to TODAY's date in IST (or tomorrow if explicitly indicated).
 */
export function normalizeToISTDate(rawDateStr?: string | null, offsetDays: number = 0): string {
  if (!rawDateStr) {
    return createISTDateTime(16, 0, offsetDays);
  }

  const parsed = new Date(rawDateStr);
  if (isNaN(parsed.getTime())) {
    return createISTDateTime(16, 0, offsetDays);
  }

  // If the parsed date is within the next 2 hours or in the future today, keep exact millisecond timestamp
  const now = Date.now();
  if (Math.abs(parsed.getTime() - now) < 24 * 3600 * 1000 && offsetDays === 0) {
    return parsed.toISOString();
  }

  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const parts = istFormatter.formatToParts(parsed);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '16', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  return createISTDateTime(hours, minutes, offsetDays);
}

/**
 * Returns whether a date matches today's calendar date in Asia/Kolkata.
 */
export function isTodayIST(dateInput: string | number | Date | null | undefined): boolean {
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return false;

  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return istFormatter.format(date) === istFormatter.format(new Date());
}

/**
 * Parses natural spoken time expressions (including seconds, minutes, specific clock times)
 * and guarantees a valid future or specified IST timestamp on today's (or tomorrow's) date.
 */
export function parseSpokenTimeToIST(spokenInput: string): { iso: string; formattedIST: string } {
  const text = spokenInput.toLowerCase();
  let hours = 17; // default 5 PM
  let minutes = 0;
  let offsetDays = 0;

  // 1. Handle seconds offset e.g. "in 10 seconds", "in 30 sec"
  const relSecMatch = text.match(/in\s*(\d{1,3})\s*(?:second|sec)/i);
  if (relSecMatch) {
    const addSec = parseInt(relSecMatch[1], 10);
    const target = new Date(Date.now() + addSec * 1000);
    return { iso: target.toISOString(), formattedIST: formatTimeIST(target) };
  }

  // 2. Handle explicit minute offsets e.g. "in 1 minute", "in 5 minutes"
  const relMinutesMatch = text.match(/in\s*(\d{1,3})\s*(?:minute|min)/i);
  if (relMinutesMatch) {
    const addMins = parseInt(relMinutesMatch[1], 10);
    const target = new Date(Date.now() + addMins * 60000);
    return { iso: target.toISOString(), formattedIST: formatTimeIST(target) };
  }

  if (text.includes('now') || text.includes('right away') || text.includes('immediately')) {
    const target = new Date(Date.now() + 5000); // 5 seconds from now
    return { iso: target.toISOString(), formattedIST: formatTimeIST(target) };
  }

  if (text.includes('tomorrow')) {
    offsetDays = 1;
    hours = 10;
  }

  // Handle standard hour matching e.g. "6:30 pm", "4 pm", "18:00"
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
  if (timeMatch) {
    let rawHour = parseInt(timeMatch[1], 10);
    const rawMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (modifier && modifier.startsWith('p') && rawHour < 12) {
      rawHour += 12;
    } else if (modifier && modifier.startsWith('a') && rawHour === 12) {
      rawHour = 0;
    } else if (!modifier && rawHour >= 1 && rawHour <= 7) {
      rawHour += 12;
    }

    hours = rawHour;
    minutes = rawMin;
  } else if (text.includes('after lunch') || text.includes('lunch')) {
    hours = 13;
    minutes = 30;
  } else if (text.includes('after my tea') || text.includes('tea')) {
    hours = 16;
    minutes = 15;
  } else if (text.includes('evening')) {
    hours = 18;
    minutes = 0;
  } else if (text.includes('morning')) {
    hours = 9;
    minutes = 0;
  } else if (text.includes('night')) {
    hours = 21;
    minutes = 0;
  }

  const iso = createISTDateTime(hours, minutes, offsetDays);
  return { iso, formattedIST: formatTimeIST(iso) };
}

/**
 * Current time formatted in IST
 */
export function getNowFormattedIST(): string {
  return formatTimeIST(new Date());
}
