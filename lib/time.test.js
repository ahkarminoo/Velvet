import {
    timeToMinutes,
    hasOverlap,
    inferDurationMinutes,
    DEFAULT_BOOKING_DURATION_MINUTES,
} from './time';

describe('timeToMinutes', () => {
    test('parses 12-hour AM time', () => {
        expect(timeToMinutes('9:30 AM')).toBe(9 * 60 + 30);
    });

    test('parses 12-hour PM time', () => {
        expect(timeToMinutes('7:30 PM')).toBe(19 * 60 + 30);
    });

    test('treats 12:00 AM as midnight (0)', () => {
        expect(timeToMinutes('12:00 AM')).toBe(0);
    });

    test('treats 12:00 PM as noon (720)', () => {
        expect(timeToMinutes('12:00 PM')).toBe(720);
    });

    test('parses 24-hour time', () => {
        expect(timeToMinutes('19:30')).toBe(19 * 60 + 30);
    });

    test('is case-insensitive on AM/PM', () => {
        expect(timeToMinutes('7:30 pm')).toBe(19 * 60 + 30);
    });

    test('tolerates extra whitespace', () => {
        expect(timeToMinutes('  7:30 PM  ')).toBe(19 * 60 + 30);
    });

    test('returns NaN for empty string', () => {
        expect(timeToMinutes('')).toBeNaN();
    });

    test('returns NaN for non-string input', () => {
        expect(timeToMinutes(null)).toBeNaN();
        expect(timeToMinutes(undefined)).toBeNaN();
        expect(timeToMinutes(1230)).toBeNaN();
    });

    test('returns NaN for unrecognised format', () => {
        expect(timeToMinutes('half past seven')).toBeNaN();
        expect(timeToMinutes('7.30 PM')).toBeNaN();
    });
});

describe('hasOverlap', () => {
    test('overlapping intervals return true', () => {
        expect(hasOverlap('7:00 PM', '9:00 PM', '8:00 PM', '10:00 PM')).toBe(true);
    });

    test('intervals that touch at the boundary do NOT overlap', () => {
        // 7-9 PM and 9-11 PM are back-to-back, not overlapping
        expect(hasOverlap('7:00 PM', '9:00 PM', '9:00 PM', '11:00 PM')).toBe(false);
    });

    test('one interval fully inside another returns true', () => {
        expect(hasOverlap('6:00 PM', '11:00 PM', '7:00 PM', '8:00 PM')).toBe(true);
    });

    test('completely separate intervals return false', () => {
        expect(hasOverlap('6:00 PM', '7:00 PM', '9:00 PM', '10:00 PM')).toBe(false);
    });

    test('invalid time strings return false (safe default)', () => {
        expect(hasOverlap('not a time', '9:00 PM', '8:00 PM', '10:00 PM')).toBe(false);
    });

    test('mixed 12h and 24h formats still work', () => {
        expect(hasOverlap('19:00', '21:00', '8:00 PM', '10:00 PM')).toBe(true);
    });
});

describe('inferDurationMinutes', () => {
    test('computes a normal 2-hour booking', () => {
        expect(inferDurationMinutes('7:00 PM', '9:00 PM')).toBe(120);
    });

    test('handles overnight wrap (10 PM → 2 AM = 4 hours)', () => {
        expect(inferDurationMinutes('10:00 PM', '2:00 AM')).toBe(240);
    });

    test('returns default when start time is invalid', () => {
        expect(inferDurationMinutes('garbage', '9:00 PM')).toBe(DEFAULT_BOOKING_DURATION_MINUTES);
    });

    test('returns default when duration is below minimum (< 30 min)', () => {
        // 7:00 → 7:15 = 15 min, below 30-min floor → clamps to default
        expect(inferDurationMinutes('7:00 PM', '7:15 PM')).toBe(DEFAULT_BOOKING_DURATION_MINUTES);
    });

    test('returns default when duration is above maximum (> 360 min)', () => {
        // 7:00 AM → 8:00 PM = 13 hours, above 6-hour ceiling → clamps to default
        expect(inferDurationMinutes('7:00 AM', '8:00 PM')).toBe(DEFAULT_BOOKING_DURATION_MINUTES);
    });
});
