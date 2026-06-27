import { describe, it, expect } from 'vitest';
import { parseIcs } from '../modules/planner/ics.js';

const SAMPLE = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:abc123
SUMMARY:Team meeting
DESCRIPTION:Weekly sync about the\\n project
DTSTART:20260115T090000Z
DTEND:20260115T100000Z
LOCATION:Room 5
END:VEVENT
BEGIN:VEVENT
UID:def456
SUMMARY:Holiday
DTSTART;VALUE=DATE:20260120
END:VEVENT
END:VCALENDAR`;

describe('parseIcs', () => {
  it('parses multiple VEVENTs', () => {
    const events = parseIcs(SAMPLE);
    expect(events).toHaveLength(2);
  });

  it('parses a timed UTC event', () => {
    const [meeting] = parseIcs(SAMPLE);
    expect(meeting!.title).toBe('Team meeting');
    expect(meeting!.allDay).toBe(false);
    expect(meeting!.location).toBe('Room 5');
    expect(meeting!.startAt.toISOString()).toBe('2026-01-15T09:00:00.000Z');
    expect(meeting!.uid).toBe('abc123');
  });

  it('treats VALUE=DATE as an all-day event', () => {
    const holiday = parseIcs(SAMPLE)[1]!;
    expect(holiday.title).toBe('Holiday');
    expect(holiday.allDay).toBe(true);
  });

  it('unfolds folded lines', () => {
    const folded = `BEGIN:VEVENT
SUMMARY:Long
 Title
DTSTART:20260101T120000Z
END:VEVENT`;
    expect(parseIcs(folded)[0]!.title).toBe('LongTitle');
  });

  it('returns nothing for empty input', () => {
    expect(parseIcs('')).toEqual([]);
  });
});
