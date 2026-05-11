export const DEFAULT_BOOKING_DURATION_MINUTES = 120;
export const MIN_BOOKING_MINUTES = 30;
export const MAX_BOOKING_MINUTES = 360;

export function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;

    const trimmed = timeStr.trim();
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
        let hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2]);
        const period = twelveHourMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = Number(twentyFourHourMatch[1]);
        const minutes = Number(twentyFourHourMatch[2]);
        return hours * 60 + minutes;
    }

    return NaN;
}

export function hasOverlap(startA, endA, startB, endB) {
    const aStart = timeToMinutes(startA);
    const aEnd = timeToMinutes(endA);
    const bStart = timeToMinutes(startB);
    const bEnd = timeToMinutes(endB);

    if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
    return aStart < bEnd && aEnd > bStart;
}

export function inferDurationMinutes(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (Number.isNaN(start) || Number.isNaN(end)) return DEFAULT_BOOKING_DURATION_MINUTES;

    let duration = end - start;
    if (duration <= 0) duration += 24 * 60;

    if (duration < MIN_BOOKING_MINUTES || duration > MAX_BOOKING_MINUTES) {
        return DEFAULT_BOOKING_DURATION_MINUTES;
    }

    return duration;
}
