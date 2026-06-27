export interface IcsEvent {
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt?: Date;
  allDay: boolean;
  uid?: string;
}

/** Parse an ICS datetime value (with optional params already stripped). */
function parseIcsDate(value: string, isDateOnly: boolean): { date: Date; allDay: boolean } {
  if (isDateOnly || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4);
    const mo = +value.slice(4, 6);
    const d = +value.slice(6, 8);
    return { date: new Date(y, mo - 1, d), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return { date: new Date(value), allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  const nums = [y, mo, d, h, mi, s].map(Number) as [number, number, number, number, number, number];
  const date = z
    ? new Date(Date.UTC(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]))
    : new Date(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]);
  return { date, allDay: false };
}

/** Minimal but robust-enough ICS parser for personal calendar exports. */
export function parseIcs(raw: string): IcsEvent[] {
  // Unfold folded lines (continuation lines start with space or tab).
  const unfolded = raw.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n');

  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> & { _start?: string; _startDateOnly?: boolean; _end?: string; _endDateOnly?: boolean } | null =
    null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur && cur._start) {
        const { date: startAt, allDay } = parseIcsDate(cur._start, !!cur._startDateOnly);
        const end = cur._end ? parseIcsDate(cur._end, !!cur._endDateOnly).date : undefined;
        events.push({
          title: cur.title?.trim() || '(untitled)',
          description: cur.description,
          location: cur.location,
          startAt,
          endAt: end,
          allDay,
          uid: cur.uid,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const name = left.split(';')[0]!.toUpperCase();
    const isDateOnly = /VALUE=DATE(?!-)/i.test(left);

    switch (name) {
      case 'SUMMARY':
        cur.title = value;
        break;
      case 'DESCRIPTION':
        cur.description = value;
        break;
      case 'LOCATION':
        cur.location = value;
        break;
      case 'UID':
        cur.uid = value;
        break;
      case 'DTSTART':
        cur._start = value;
        cur._startDateOnly = isDateOnly;
        break;
      case 'DTEND':
        cur._end = value;
        cur._endDateOnly = isDateOnly;
        break;
    }
  }
  return events;
}
