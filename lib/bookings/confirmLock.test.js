import {
    setupBookingTestDb,
    makeUser,
    makeRestaurant,
} from '../__tests__/_helpers';
import Booking from '@/models/Booking';
import TableLock from '@/models/TableLock';
import { createSoftLock } from './softLock';
import { confirmSoftLock } from './confirmLock';
import { ERROR_CODES } from './errors';

setupBookingTestDb();

async function makeLockedContext(overrides = {}) {
    const user = await makeUser();
    const restaurant = await makeRestaurant();
    const { lock } = await createSoftLock({
        user,
        restaurantId: restaurant._id,
        tableId: 't1',
        date: new Date('2026-07-15'),
        startTime: '7:00 PM',
        endTime: '9:00 PM',
        guestCount: 4,
        ...overrides,
    });
    return { user, restaurant, lock };
}

describe('confirmSoftLock', () => {
    test('promotes an active lock into a confirmed booking', async () => {
        const { user, lock } = await makeLockedContext();

        const { booking } = await confirmSoftLock({
            user,
            lockId: lock.lockId,
            pricing: { finalPrice: 250 },
        });

        expect(booking.status).toBe('confirmed');
        expect(booking.tableId).toBe('t1');
        expect(booking.bookingRef).toMatch(/^BK/);

        const persistedLock = await TableLock.findOne({ lockId: lock.lockId });
        expect(persistedLock.status).toBe('confirmed');
        expect(persistedLock.confirmedAt).toBeInstanceOf(Date);

        const persistedBooking = await Booking.findOne({ 'lockInfo.lockId': lock.lockId });
        expect(persistedBooking).not.toBeNull();
    });

    test('throws MISSING_FIELDS when lockId is omitted', async () => {
        const user = await makeUser();
        await expect(confirmSoftLock({ user })).rejects.toMatchObject({
            code: ERROR_CODES.MISSING_FIELDS,
        });
    });

    test('throws UNAUTHORIZED when user is omitted', async () => {
        await expect(confirmSoftLock({ lockId: 'lock_x' })).rejects.toMatchObject({
            code: ERROR_CODES.UNAUTHORIZED,
        });
    });

    test('throws LOCK_NOT_FOUND when the lock does not exist for this user', async () => {
        const user = await makeUser();
        await expect(
            confirmSoftLock({ user, lockId: 'lock_does_not_exist' }),
        ).rejects.toMatchObject({ code: ERROR_CODES.LOCK_NOT_FOUND });
    });

    test('throws LOCK_NOT_FOUND when another user tries to confirm', async () => {
        const { lock } = await makeLockedContext();
        const intruder = await makeUser();

        await expect(
            confirmSoftLock({ user: intruder, lockId: lock.lockId, pricing: { finalPrice: 250 } }),
        ).rejects.toMatchObject({ code: ERROR_CODES.LOCK_NOT_FOUND });
    });

    test('throws LOCK_EXPIRED when the lock has expired', async () => {
        const { user, lock } = await makeLockedContext();
        // Force-expire the lock
        await TableLock.updateOne(
            { lockId: lock.lockId },
            { expiresAt: new Date(Date.now() - 60_000) },
        );

        await expect(
            confirmSoftLock({ user, lockId: lock.lockId, pricing: { finalPrice: 250 } }),
        ).rejects.toMatchObject({ code: ERROR_CODES.LOCK_EXPIRED });

        // Lock should be marked expired as a side effect
        const persisted = await TableLock.findOne({ lockId: lock.lockId });
        expect(persisted.status).toBe('expired');
    });
});
