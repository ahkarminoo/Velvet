import mongoose from 'mongoose';
import {
    setupBookingTestDb,
    makeUser,
    makeRestaurant,
    makeFloorplan,
    makeBooking,
} from '../__tests__/_helpers';
import Booking from '@/models/Booking';
import Floorplan from '@/models/Floorplan';
import { createSceneBooking } from './sceneBooking';
import { ERROR_CODES } from './errors';

setupBookingTestDb();

const FRI_OPENING_HOURS = {
    friday: { open: '5:00 PM', close: '11:00 PM' },
};

async function makeOpenRestaurant(overrides = {}) {
    return makeRestaurant({ openingHours: FRI_OPENING_HOURS, ...overrides });
}

async function bookingContext() {
    const user = await makeUser();
    const restaurant = await makeOpenRestaurant();
    const floorplan = await makeFloorplan({ restaurantId: restaurant._id });
    // 2026-07-17 is a Friday
    return {
        user,
        restaurant,
        floorplan,
        params: {
            user,
            sceneId: floorplan._id,
            restaurantId: restaurant._id,
            tableId: 't1',
            date: new Date('2026-07-17'),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
            durationMinutes: 120,
            guestCount: 4,
        },
    };
}

describe('createSceneBooking', () => {
    test('creates a pending booking and updates the floorplan table state', async () => {
        const { params, floorplan } = await bookingContext();

        const { booking } = await createSceneBooking(params);

        expect(booking.status).toBe('pending');
        expect(booking.tableId).toBe('t1');
        expect(booking.bookingRef).toMatch(/^BK/);

        const updatedFloorplan = await Floorplan.findById(floorplan._id);
        const table = updatedFloorplan.data.objects.find((o) => o.objectId === 't1');
        expect(table.userData.get('bookingStatus')).toBe('booked');
        expect(table.userData.get('currentBooking').toString()).toBe(booking._id.toString());
    });

    test('throws UNAUTHORIZED without a user', async () => {
        const { params } = await bookingContext();
        await expect(createSceneBooking({ ...params, user: null })).rejects.toMatchObject({
            code: ERROR_CODES.UNAUTHORIZED,
        });
    });

    test('throws MISSING_FIELDS when required input missing', async () => {
        const { user, restaurant, floorplan } = await bookingContext();
        await expect(
            createSceneBooking({
                user,
                sceneId: floorplan._id,
                restaurantId: restaurant._id,
                // tableId missing
                date: new Date('2026-07-17'),
                startTime: '7:00 PM',
                endTime: '9:00 PM',
                guestCount: 2,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MISSING_FIELDS });
    });

    test('throws RESTAURANT_NOT_FOUND for an unknown restaurant', async () => {
        const { params } = await bookingContext();
        await expect(
            createSceneBooking({
                ...params,
                restaurantId: new mongoose.Types.ObjectId(),
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.RESTAURANT_NOT_FOUND });
    });

    test('throws FLOORPLAN_NOT_FOUND for an unknown scene', async () => {
        const { params } = await bookingContext();
        await expect(
            createSceneBooking({
                ...params,
                sceneId: new mongoose.Types.ObjectId(),
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.FLOORPLAN_NOT_FOUND });
    });

    test('throws TABLE_NOT_FOUND when the tableId is not in the floorplan', async () => {
        const { params } = await bookingContext();
        await expect(
            createSceneBooking({ ...params, tableId: 't999' }),
        ).rejects.toMatchObject({ code: ERROR_CODES.TABLE_NOT_FOUND });
    });

    test('throws RESTAURANT_CLOSED when there are no hours for that weekday', async () => {
        const user = await makeUser();
        const restaurant = await makeRestaurant({ openingHours: { monday: { open: '9:00 AM', close: '5:00 PM' } } });
        const floorplan = await makeFloorplan({ restaurantId: restaurant._id });

        await expect(
            createSceneBooking({
                user,
                sceneId: floorplan._id,
                restaurantId: restaurant._id,
                tableId: 't1',
                date: new Date('2026-07-17'), // Friday, restaurant only open Monday
                startTime: '7:00 PM',
                endTime: '9:00 PM',
                durationMinutes: 120,
                guestCount: 2,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.RESTAURANT_CLOSED });
    });

    test('throws INVALID_TIME_SLOT when startTime is outside opening hours', async () => {
        const { params } = await bookingContext();
        await expect(
            createSceneBooking({ ...params, startTime: '3:00 AM', endTime: '4:00 AM' }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_TIME_SLOT });
    });

    test('throws LIMIT_REACHED when the restaurant is at its monthly booking limit', async () => {
        const user = await makeUser();
        const restaurant = await makeOpenRestaurant({ limits: { bookingsLimit: 1 } });
        const floorplan = await makeFloorplan({ restaurantId: restaurant._id });

        // One existing booking already at the limit
        await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 'other',
            date: new Date('2026-07-17'),
            startTime: '5:30 PM',
            endTime: '7:00 PM',
        });

        await expect(
            createSceneBooking({
                user,
                sceneId: floorplan._id,
                restaurantId: restaurant._id,
                tableId: 't1',
                date: new Date('2026-07-17'),
                startTime: '7:00 PM',
                endTime: '9:00 PM',
                durationMinutes: 120,
                guestCount: 2,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.LIMIT_REACHED });
    });

    test('throws TABLE_UNAVAILABLE when an overlapping booking already exists', async () => {
        const { params, user, restaurant } = await bookingContext();
        await makeBooking({
            restaurantId: restaurant._id,
            userId: user._id,
            tableId: 't1',
            date: new Date('2026-07-17'),
            startTime: '8:00 PM',
            endTime: '10:00 PM',
        });

        await expect(createSceneBooking(params)).rejects.toMatchObject({
            code: ERROR_CODES.TABLE_UNAVAILABLE,
        });
    });
});

describe('createSceneBooking → customer name resolution', () => {
    test('falls back to email-username when no name fields are set', async () => {
        const user = await makeUser({ firstName: '', lastName: '', email: 'janedoe@test.com' });
        const restaurant = await makeOpenRestaurant();
        const floorplan = await makeFloorplan({ restaurantId: restaurant._id });

        const { booking } = await createSceneBooking({
            user,
            sceneId: floorplan._id,
            restaurantId: restaurant._id,
            tableId: 't1',
            date: new Date('2026-07-17'),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
            durationMinutes: 120,
            guestCount: 2,
        });

        const persisted = await Booking.findById(booking._id);
        expect(persisted.customerName).toBe('janedoe');
    });
});
