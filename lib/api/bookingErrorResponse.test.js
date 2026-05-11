import { BookingError, ERROR_CODES } from '@/lib/bookings/errors';
import { errorResponseFor } from './bookingErrorResponse';

async function bodyOf(response) {
    return response.json();
}

describe('errorResponseFor — BookingError mapping', () => {
    test('LOCK_EXPIRED → 410 with code', async () => {
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.LOCK_EXPIRED, 'Lock has expired'),
        );
        expect(response.status).toBe(410);
        expect(await bodyOf(response)).toMatchObject({
            error: 'Lock has expired',
            code: 'LOCK_EXPIRED',
        });
    });

    test('UNAUTHORIZED → 401', async () => {
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.UNAUTHORIZED, 'User required'),
        );
        expect(response.status).toBe(401);
    });

    test('BOOKING_NOT_FOUND → 404', async () => {
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.BOOKING_NOT_FOUND, 'Booking not found'),
        );
        expect(response.status).toBe(404);
    });

    test('LIMIT_REACHED → 403 with upgrade payload', async () => {
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.LIMIT_REACHED, 'Monthly booking limit reached', {
                limit: 50,
                currentUsage: 50,
                currentPlan: 'basic',
            }),
        );
        expect(response.status).toBe(403);
        const body = await bodyOf(response);
        expect(body).toMatchObject({
            error: 'Monthly booking limit reached',
            upgradeRequired: true,
            limit: 50,
            currentUsage: 50,
            currentPlan: 'basic',
            code: 'LIMIT_REACHED',
        });
        expect(body.message).toContain('limit of 50');
    });

    test('BOOKING_CONFLICT → 409 with conflict detail surfaced', async () => {
        const conflict = {
            type: 'booking',
            bookingId: 'abc',
            status: 'confirmed',
            startTime: '7:00 PM',
            endTime: '9:00 PM',
        };
        const response = errorResponseFor(
            new BookingError(
                ERROR_CODES.BOOKING_CONFLICT,
                'Table is already booked for this time slot',
                { conflict },
            ),
        );
        expect(response.status).toBe(409);
        expect(await bodyOf(response)).toMatchObject({
            error: 'Table is already booked for this time slot',
            code: 'BOOKING_CONFLICT',
            conflict,
        });
    });

    test('LOCK_CONFLICT → 409 with conflict detail surfaced', async () => {
        const conflict = {
            type: 'lock',
            lockId: 'lock_xyz',
            lockedBy: 'other',
        };
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.LOCK_CONFLICT, 'Table is currently locked', {
                conflict,
            }),
        );
        expect(response.status).toBe(409);
        expect((await bodyOf(response)).conflict).toEqual(conflict);
    });

    test('generic BookingError spreads details into response body', async () => {
        const response = errorResponseFor(
            new BookingError(ERROR_CODES.TABLE_NOT_FOUND, 'Table not found', {
                searchedId: 't42',
            }),
        );
        expect(response.status).toBe(404);
        expect(await bodyOf(response)).toMatchObject({
            error: 'Table not found',
            code: 'TABLE_NOT_FOUND',
            searchedId: 't42',
        });
    });

    test('unknown error code falls back to 500', async () => {
        const response = errorResponseFor(new BookingError('NOT_A_REAL_CODE', 'oops'));
        expect(response.status).toBe(500);
    });
});

describe('errorResponseFor — non-BookingError handling', () => {
    test('plain Error → 500 with fallback message', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = errorResponseFor(new Error('Mongo connection died'), {
            fallbackMessage: 'Booking failed',
        });
        expect(response.status).toBe(500);
        expect(await bodyOf(response)).toEqual({ error: 'Mongo connection died' });
        consoleSpy.mockRestore();
    });

    test('default fallback message when error has no .message', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = errorResponseFor({}); // not a BookingError, no message
        expect(response.status).toBe(500);
        expect(await bodyOf(response)).toEqual({ error: 'Internal server error' });
        consoleSpy.mockRestore();
    });

    test('includes stack only when includeDevStack=true AND NODE_ENV=development', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error = new Error('boom');
        const response = errorResponseFor(error, { includeDevStack: true });
        const body = await bodyOf(response);
        expect(body.stack).toBeDefined();

        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
    });

    test('does NOT include stack when NODE_ENV=production', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = errorResponseFor(new Error('boom'), { includeDevStack: true });
        expect((await bodyOf(response)).stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
    });
});
