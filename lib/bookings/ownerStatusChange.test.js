import mongoose from 'mongoose';
import {
    setupBookingTestDb,
    makeUser,
    makeRestaurant,
    makeBooking,
} from '../__tests__/_helpers';
import { changeBookingStatusAsOwner } from './ownerStatusChange';
import { ERROR_CODES } from './errors';

setupBookingTestDb();

async function setupOwnerScenario({ status = 'pending' } = {}) {
    const ownerId = new mongoose.Types.ObjectId();
    const restaurant = await makeRestaurant({ ownerId });
    const user = await makeUser();
    const booking = await makeBooking({
        restaurantId: restaurant._id,
        userId: user._id,
        tableId: 't1',
        date: new Date('2026-08-01'),
        startTime: '7:00 PM',
        endTime: '9:00 PM',
        status,
    });
    return { ownerId, restaurant, booking };
}

describe('changeBookingStatusAsOwner', () => {
    test('transitions pending → confirmed and writes history', async () => {
        const { ownerId, booking } = await setupOwnerScenario();

        const result = await changeBookingStatusAsOwner({
            ownerId,
            bookingId: booking._id,
            newStatus: 'confirmed',
        });

        expect(result.statusChanged).toBe(true);
        expect(result.previousStatus).toBe('pending');
        expect(result.booking.status).toBe('confirmed');
        expect(result.booking.history.some((h) => h.action === 'modified')).toBe(true);
    });

    test('is idempotent when status is unchanged (no history entry, no save)', async () => {
        const { ownerId, booking } = await setupOwnerScenario({ status: 'confirmed' });
        const historyLengthBefore = booking.history.length;

        const result = await changeBookingStatusAsOwner({
            ownerId,
            bookingId: booking._id,
            newStatus: 'confirmed',
        });

        expect(result.statusChanged).toBe(false);
        expect(result.booking.history.length).toBe(historyLengthBefore);
    });

    test('throws MISSING_FIELDS when bookingId is omitted', async () => {
        await expect(
            changeBookingStatusAsOwner({
                ownerId: new mongoose.Types.ObjectId(),
                newStatus: 'confirmed',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MISSING_FIELDS });
    });

    test('throws UNAUTHORIZED when ownerId is omitted', async () => {
        await expect(
            changeBookingStatusAsOwner({
                bookingId: new mongoose.Types.ObjectId(),
                newStatus: 'confirmed',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED });
    });

    test('throws INVALID_STATUS for unknown status value', async () => {
        const { ownerId, booking } = await setupOwnerScenario();
        await expect(
            changeBookingStatusAsOwner({
                ownerId,
                bookingId: booking._id,
                newStatus: 'seated', // not in the enum
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_STATUS });
    });

    test('throws BOOKING_NOT_FOUND when booking does not exist', async () => {
        await expect(
            changeBookingStatusAsOwner({
                ownerId: new mongoose.Types.ObjectId(),
                bookingId: new mongoose.Types.ObjectId(),
                newStatus: 'confirmed',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_NOT_FOUND });
    });

    test('throws UNAUTHORIZED when ownerId does not own the restaurant', async () => {
        const { booking } = await setupOwnerScenario();
        const otherOwnerId = new mongoose.Types.ObjectId();

        await expect(
            changeBookingStatusAsOwner({
                ownerId: otherOwnerId,
                bookingId: booking._id,
                newStatus: 'confirmed',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED });
    });
});
