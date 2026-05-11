import {
    setupBookingTestDb,
    makeUser,
    makeRestaurant,
    makeBooking,
    makeTableLock,
} from '../__tests__/_helpers';
import TableLock from '@/models/TableLock';
import { createSoftLock } from './softLock';
import { BookingError, ERROR_CODES } from './errors';

setupBookingTestDb();

async function makeContext() {
    const user = await makeUser();
    const restaurant = await makeRestaurant();
    return {
        user,
        restaurant,
        params: {
            user,
            restaurantId: restaurant._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
            guestCount: 4,
        },
    };
}

describe('createSoftLock', () => {
    test('creates a lock and persists it to the database', async () => {
        const { params } = await makeContext();
        const { lock } = await createSoftLock(params);

        expect(lock.lockId).toMatch(/^lock_/);
        expect(lock.status).toBe('active');
        expect(lock.holdDurationMinutes).toBe(5);

        const persisted = await TableLock.findOne({ lockId: lock.lockId });
        expect(persisted).not.toBeNull();
        expect(persisted.tableId).toBe('t1');
    });

    test('throws MISSING_FIELDS when required input is omitted', async () => {
        const { user } = await makeContext();
        await expect(createSoftLock({ user, restaurantId: null })).rejects.toMatchObject({
            code: ERROR_CODES.MISSING_FIELDS,
        });
    });

    test('throws UNAUTHORIZED when user is missing', async () => {
        await expect(createSoftLock({})).rejects.toMatchObject({
            code: ERROR_CODES.UNAUTHORIZED,
        });
    });

    test('throws LIMIT_REACHED when the restaurant is at its monthly limit', async () => {
        const user = await makeUser();
        const restaurant = await makeRestaurant({ limits: { bookingsLimit: 1 } });
        await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 'other',
            date: new Date('2026-07-15'),
            startTime: '6:00 PM',
            endTime: '8:00 PM',
        });

        await expect(
            createSoftLock({
                user,
                restaurantId: restaurant._id,
                tableId: 't1',
                date: new Date('2026-07-15'),
                startTime: '7:00 PM',
                endTime: '9:00 PM',
                guestCount: 4,
            }),
        ).rejects.toMatchObject({
            code: ERROR_CODES.LIMIT_REACHED,
            details: { limit: 1, currentUsage: 1 },
        });
    });

    test('throws BOOKING_CONFLICT when an overlapping booking exists', async () => {
        const { user, restaurant, params } = await makeContext();
        await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '8:00 PM',
            endTime: '10:00 PM',
        });

        await expect(createSoftLock(params)).rejects.toMatchObject({
            code: ERROR_CODES.BOOKING_CONFLICT,
        });
    });

    test('throws LOCK_CONFLICT when another active lock overlaps', async () => {
        const { user, restaurant, params } = await makeContext();
        const otherUser = await makeUser();
        await makeTableLock({
            restaurantId: restaurant._id,
            userId: otherUser._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '8:00 PM',
            endTime: '10:00 PM',
        });

        await expect(createSoftLock(params)).rejects.toMatchObject({
            code: ERROR_CODES.LOCK_CONFLICT,
            details: { conflict: { lockedBy: 'other' } },
        });
    });

    test('marks lockedBy=self when the conflicting lock belongs to the same user', async () => {
        const { user, restaurant, params } = await makeContext();
        await makeTableLock({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '8:00 PM',
            endTime: '10:00 PM',
        });

        await expect(createSoftLock(params)).rejects.toMatchObject({
            code: ERROR_CODES.LOCK_CONFLICT,
            details: { conflict: { lockedBy: 'self' } },
        });
    });

    test('allows back-to-back bookings (no overlap at the boundary)', async () => {
        const { user, restaurant, params } = await makeContext();
        await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '5:00 PM',
            endTime: '7:00 PM', // ends exactly when the new lock starts
        });

        const { lock } = await createSoftLock(params);
        expect(lock.status).toBe('active');
    });
});
