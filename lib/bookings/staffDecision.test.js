import mongoose from 'mongoose';
import {
    setupBookingTestDb,
    makeUser,
    makeRestaurant,
    makeBooking,
} from '../__tests__/_helpers';
import Staff from '@/models/Staff';
import { staffConfirmOrReject, listPendingBookingsForStaff } from './staffDecision';
import { ERROR_CODES } from './errors';

setupBookingTestDb();

async function makeStaff({ restaurantId, permissions, ...rest } = {}) {
    const n = Date.now() + Math.floor(Math.random() * 1000);
    // Create first so the pre-save hook (which resets permissions from role) runs,
    // then patch permissions with our overrides via findByIdAndUpdate (skips hooks).
    const staff = await Staff.create({
        lineId: `line-${n}`,
        displayName: `Staff ${n}`,
        restaurantId: restaurantId ?? new mongoose.Types.ObjectId(),
        role: 'manager',
        ...rest,
    });
    if (permissions) {
        return Staff.findByIdAndUpdate(
            staff._id,
            { $set: Object.fromEntries(Object.entries(permissions).map(([k, v]) => [`permissions.${k}`, v])) },
            { new: true },
        );
    }
    return staff;
}

let pendingBookingCounter = 0;
async function makePendingBooking({ restaurantId }) {
    const user = await makeUser();
    pendingBookingCounter += 1;
    return makeBooking({
        restaurantId,
        userId: user._id,
        tableId: `t${pendingBookingCounter}`, // unique per booking to avoid index collision
        date: new Date('2026-07-15'),
        startTime: '7:00 PM',
        endTime: '9:00 PM',
        status: 'pending',
    });
}

describe('staffConfirmOrReject', () => {
    test('confirms a pending booking and writes history', async () => {
        const restaurant = await makeRestaurant();
        const booking = await makePendingBooking({ restaurantId: restaurant._id });
        const staff = await makeStaff({ restaurantId: restaurant._id });

        const result = await staffConfirmOrReject({
            bookingId: booking._id,
            staffId: staff._id,
            action: 'confirm',
        });

        expect(result.booking.status).toBe('confirmed');
        expect(result.booking.history.some((h) => h.action === 'confirmed')).toBe(true);
    });

    test('rejects a pending booking and records the reason', async () => {
        const restaurant = await makeRestaurant();
        const booking = await makePendingBooking({ restaurantId: restaurant._id });
        const staff = await makeStaff({ restaurantId: restaurant._id });

        const result = await staffConfirmOrReject({
            bookingId: booking._id,
            staffId: staff._id,
            action: 'reject',
            reason: 'No tables available',
        });

        expect(result.booking.status).toBe('cancelled');
        const rejectionEntry = result.booking.history.find((h) => h.action === 'rejected');
        expect(rejectionEntry).toBeDefined();
        expect(rejectionEntry.details.get('reason')).toBe('No tables available');
    });

    test('throws MISSING_FIELDS when bookingId is omitted', async () => {
        await expect(
            staffConfirmOrReject({ staffId: 'x', action: 'confirm' }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MISSING_FIELDS });
    });

    test('throws INVALID_ACTION for unknown action', async () => {
        await expect(
            staffConfirmOrReject({ bookingId: 'x', staffId: 'y', action: 'maybe' }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ACTION });
    });

    test('throws BOOKING_NOT_FOUND when booking does not exist', async () => {
        const staff = await makeStaff();
        await expect(
            staffConfirmOrReject({
                bookingId: new mongoose.Types.ObjectId(),
                staffId: staff._id,
                action: 'confirm',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_NOT_FOUND });
    });

    test('throws BOOKING_ALREADY_DECIDED when booking is not pending', async () => {
        const restaurant = await makeRestaurant();
        const user = await makeUser();
        const booking = await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 't1',
            date: new Date('2026-07-15'),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
            status: 'confirmed', // already decided
        });
        const staff = await makeStaff({ restaurantId: restaurant._id });

        await expect(
            staffConfirmOrReject({
                bookingId: booking._id,
                staffId: staff._id,
                action: 'confirm',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.BOOKING_ALREADY_DECIDED });
    });

    test('throws STAFF_FORBIDDEN when staff lacks confirm permission', async () => {
        const restaurant = await makeRestaurant();
        const booking = await makePendingBooking({ restaurantId: restaurant._id });
        const staff = await makeStaff({
            restaurantId: restaurant._id,
            permissions: { canUpdateBookings: false },
        });

        await expect(
            staffConfirmOrReject({
                bookingId: booking._id,
                staffId: staff._id,
                action: 'confirm',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.STAFF_FORBIDDEN });
    });

    test('throws STAFF_FORBIDDEN when staff lacks cancel permission for reject', async () => {
        const restaurant = await makeRestaurant();
        const booking = await makePendingBooking({ restaurantId: restaurant._id });
        const staff = await makeStaff({
            restaurantId: restaurant._id,
            permissions: { canCancelBookings: false },
        });

        await expect(
            staffConfirmOrReject({
                bookingId: booking._id,
                staffId: staff._id,
                action: 'reject',
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.STAFF_FORBIDDEN });
    });
});

describe('listPendingBookingsForStaff', () => {
    test('returns pending bookings for a staff-authorised restaurant', async () => {
        const restaurant = await makeRestaurant();
        await makePendingBooking({ restaurantId: restaurant._id });
        await makePendingBooking({ restaurantId: restaurant._id });

        const staff = await makeStaff({ restaurantId: restaurant._id });
        const result = await listPendingBookingsForStaff({
            restaurantId: restaurant._id,
            staffId: staff._id,
        });

        expect(result.bookings).toHaveLength(2);
        expect(result.staff._id.toString()).toBe(staff._id.toString());
    });

    test('throws STAFF_FORBIDDEN when staff belongs to a different restaurant', async () => {
        const restaurantA = await makeRestaurant();
        const restaurantB = await makeRestaurant();
        const staff = await makeStaff({ restaurantId: restaurantA._id });

        await expect(
            listPendingBookingsForStaff({
                restaurantId: restaurantB._id,
                staffId: staff._id,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.STAFF_FORBIDDEN });
    });
});
