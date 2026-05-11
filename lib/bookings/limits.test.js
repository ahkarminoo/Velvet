import { setupBookingTestDb, makeRestaurant, makeBooking } from '../__tests__/_helpers';
import { checkBookingLimit } from './limits';

setupBookingTestDb();

describe('checkBookingLimit', () => {
    test('returns allowed=true when restaurant does not exist', async () => {
        const fakeId = '64b9c0000000000000000000';
        const result = await checkBookingLimit(fakeId);
        expect(result.allowed).toBe(true);
        expect(result.restaurant).toBeNull();
    });

    test('defaults to 1000-booking free-plan limit when none configured', async () => {
        const restaurant = await makeRestaurant();
        const result = await checkBookingLimit(restaurant._id);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(1000);
        expect(result.currentPlan).toBe('free');
        expect(result.currentUsage).toBe(0);
    });

    test('reads bookingsLimit from restaurant.limits when set', async () => {
        const restaurant = await makeRestaurant({ limits: { bookingsLimit: 5 } });
        const result = await checkBookingLimit(restaurant._id);
        expect(result.limit).toBe(5);
        expect(result.allowed).toBe(true);
    });

    test('returns allowed=false when current usage hits the limit', async () => {
        const restaurant = await makeRestaurant({ limits: { bookingsLimit: 2 } });

        await makeBooking({
            restaurantId: restaurant._id,
            userId: restaurant._id, // any ObjectId works for this seed
            tableId: 't1',
            date: new Date(),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
        });
        await makeBooking({
            restaurantId: restaurant._id,
            userId: restaurant._id,
            tableId: 't2',
            date: new Date(),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
        });

        const result = await checkBookingLimit(restaurant._id);
        expect(result.allowed).toBe(false);
        expect(result.currentUsage).toBe(2);
        expect(result.limit).toBe(2);
    });

    test('treats limit=-1 as unlimited regardless of usage', async () => {
        const restaurant = await makeRestaurant({ limits: { bookingsLimit: -1 } });
        // Insert one booking just to prove the count is ignored
        await makeBooking({
            restaurantId: restaurant._id,
            userId: restaurant._id,
            tableId: 't1',
            date: new Date(),
            startTime: '7:00 PM',
            endTime: '9:00 PM',
        });
        const result = await checkBookingLimit(restaurant._id);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(-1);
        expect(result.currentUsage).toBeNull();
    });
});
