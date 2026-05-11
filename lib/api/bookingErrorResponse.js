import { NextResponse } from 'next/server';
import { BookingError, ERROR_CODES, ERROR_HTTP_STATUS } from '@/lib/bookings/errors';

/**
 * Centralized error → HTTP response mapper for booking-related routes.
 *
 * Behavior:
 *   - `BookingError` instances become structured JSON keyed by `code`, with
 *     HTTP status taken from `ERROR_HTTP_STATUS`. Two codes get enriched
 *     payloads:
 *       • LIMIT_REACHED — adds `message`, `upgradeRequired`, and the
 *         per-restaurant {limit, currentUsage, currentPlan}.
 *       • BOOKING_CONFLICT / LOCK_CONFLICT — surfaces `error.details.conflict`
 *         so the UI can render "table booked from X to Y".
 *   - Anything else is logged and returned as 500 with `fallbackMessage`.
 *     If `includeDevStack` is true and NODE_ENV is 'development', the stack
 *     trace is included to help local debugging — never in production.
 *
 * Route handlers shrink to one line:
 *     } catch (error) { return errorResponseFor(error, { fallbackMessage: '...' }); }
 */
export function errorResponseFor(error, { fallbackMessage = 'Internal server error', includeDevStack = false } = {}) {
    if (!(error instanceof BookingError)) {
        console.error(fallbackMessage, error);
        const body = { error: error?.message || fallbackMessage };
        if (includeDevStack && process.env.NODE_ENV === 'development' && error?.stack) {
            body.stack = error.stack;
        }
        return NextResponse.json(body, { status: 500 });
    }

    const status = ERROR_HTTP_STATUS[error.code] ?? 500;

    if (error.code === ERROR_CODES.LIMIT_REACHED) {
        const { limit, currentUsage, currentPlan } = error.details ?? {};
        return NextResponse.json({
            error: 'Monthly booking limit reached',
            message: `You have reached your monthly limit of ${limit} bookings. Please upgrade your plan to accept more bookings.`,
            upgradeRequired: true,
            code: error.code,
            currentPlan,
            currentUsage,
            limit,
        }, { status });
    }

    if (error.code === ERROR_CODES.BOOKING_CONFLICT || error.code === ERROR_CODES.LOCK_CONFLICT) {
        return NextResponse.json({
            error: error.message,
            code: error.code,
            conflict: error.details?.conflict,
        }, { status });
    }

    return NextResponse.json({
        error: error.message,
        code: error.code,
        ...(error.details ?? {}),
    }, { status });
}
