export type ScheduleMode = 'periodic' | 'advanced';
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type Meridiem = 'AM' | 'PM';

export interface RefreshSchedule {
  mode: ScheduleMode;
  frequency: ScheduleFrequency;
  hour: number;
  minute: number;
  meridiem: Meridiem;
  from: string;
  to: string;
  cron: string;
}

export const SCHEDULE_FREQUENCIES: { id: ScheduleFrequency; label: string }[] = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
export const MINUTES = [0, 15, 30, 45];

export function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function clampHour(value: number): number {
  if (!Number.isFinite(value)) return 12;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 12) return 12;
  return rounded;
}

export function clampMinute(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 59) return 59;
  return rounded;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function formatDisplayDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRunTime(hour: number, minute: number, meridiem: Meridiem): string {
  return `${clampHour(hour)}:${padTimePart(clampMinute(minute))} ${meridiem}`;
}

const FREQUENCY_PHRASE: Record<ScheduleFrequency, string> = {
  hourly: 'every hour',
  daily: 'every day',
  weekly: 'every week',
  monthly: 'every month',
};

export function formatScheduleSummary(schedule: RefreshSchedule): string {
  if (schedule.mode === 'advanced') {
    return describeCron(parseCronExpression(schedule.cron));
  }
  const time = formatRunTime(schedule.hour, schedule.minute, schedule.meridiem);
  const from = formatDisplayDate(schedule.from);
  const to = formatDisplayDate(schedule.to);
  return `Runs ${FREQUENCY_PHRASE[schedule.frequency]} at ${time}, from ${from} to ${to}.`;
}

export function defaultRefreshSchedule(now: Date = new Date()): RefreshSchedule {
  return {
    mode: 'periodic',
    frequency: 'daily',
    hour: 12,
    minute: 0,
    meridiem: 'PM',
    from: toDateInputValue(now),
    to: toDateInputValue(addMonths(now, 1)),
    cron: '0 12 * * *',
  };
}

export interface CronParts {
  second: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

const EMPTY_CRON_PARTS: CronParts = {
  second: '',
  minute: '*',
  hour: '*',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '*',
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function parseCronExpression(expression: string): CronParts {
  const tokens = expression.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 5) {
    return {
      second: '',
      minute: tokens[0],
      hour: tokens[1],
      dayOfMonth: tokens[2],
      month: tokens[3],
      dayOfWeek: tokens[4],
    };
  }
  if (tokens.length >= 6) {
    return {
      second: tokens[0],
      minute: tokens[1],
      hour: tokens[2],
      dayOfMonth: tokens[3],
      month: tokens[4],
      dayOfWeek: tokens[5],
    };
  }
  return { ...EMPTY_CRON_PARTS };
}

function weekdayLabel(token: string): string {
  const numeric = Number(token);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 7) {
    return WEEKDAY_NAMES[numeric];
  }
  return token;
}

function describeList(token: string, mapItem: (item: string) => string = (item) => item): string {
  return token
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(mapItem)
    .join(' and ');
}

function describeClock(hourToken: string, minuteToken: string): string {
  const minute = minuteToken.includes(',') || minuteToken.includes('-') || minuteToken.includes('/')
    ? minuteToken
    : minuteToken.padStart(2, '0');
  if (hourToken.includes(',')) {
    return describeList(hourToken, (hour) => `${hour.padStart(2, '0')}:${minute}`);
  }
  return `${hourToken.padStart(2, '0')}:${minute}`;
}

/** Short English reading of a 5/6-field expression. Prototype-level, not a full cron parser. */
export function describeCron(parts: CronParts): string {
  const minute = parts.minute.trim() || '*';
  const hour = parts.hour.trim() || '*';
  const day = parts.dayOfMonth.trim() || '*';
  const month = parts.month.trim() || '*';
  const week = parts.dayOfWeek.trim() || '*';
  const clauses: string[] = [];

  if (minute === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
    clauses.push('Every minute');
  } else if (minute.startsWith('*/') && hour === '*') {
    clauses.push(`Every ${minute.slice(2)} minutes`);
  } else if (hour.startsWith('*/')) {
    clauses.push(`Every ${hour.slice(2)} hours`);
    if (minute !== '*') clauses.push(`at minute ${minute}`);
  } else if (hour !== '*' && minute !== '*') {
    clauses.push(`At ${describeClock(hour, minute)}`);
  } else if (minute !== '*') {
    clauses.push(`At minute ${minute}`);
  } else if (hour !== '*') {
    clauses.push(`At hour ${hour}`);
  }

  if (week !== '*') clauses.push(`on ${describeList(week, weekdayLabel)}`);
  if (day !== '*') clauses.push(`on day ${day}`);
  if (month !== '*') clauses.push(`in month ${month}`);

  if (clauses.length === 0) clauses.push('Custom cadence');
  return `${clauses.join(', ')} (UTC)`;
}
