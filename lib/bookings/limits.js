import Restaurant from '@/models/Restaurants';
import Booking from '@/models/Booking';

const DEFAULT_FREE_LIMIT = 1000;
const UNLIMITED = -1;

/**
 * Resolve the monthly booking limit for a restaurant.
 * Precedence: restaurant.limits.bookingsLimit → subscription.usage.bookingsLimit → 1000.
 * Returns null if the restaurant does not exist.
 */
export async function getBookingLimit(restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId).populate('subscriptionId');
    if (!restaurant) return null;

    let limit = restaurant.limits?.bookingsLimit;
    let currentPlan = 'free';

    if ((limit === undefined || limit === null) && restaurant.subscriptionId) {
        limit = restaurant.subscriptionId.usage?.bookingsLimit;
        currentPlan = restaurant.subscriptionId.planType ?? currentPlan;
    }

    if (limit === undefined || limit === null) {
        limit = DEFAULT_FREE_LIMIT;
    }

    return { restaurant, limit, currentPlan };
}

/**
 * Check whether the restaurant is allowed to accept another booking this month.
 * Returns { allowed, restaurant, limit, currentPlan, currentUsage }.
 * Missing restaurant → allowed: true (preserves original route behavior).
 */
export async function checkBookingLimit(restaurantId) {
    const config = await getBookingLimit(restaurantId);
    if (!config) return { allowed: true, restaurant: null };

    const { restaurant, limit, currentPlan } = config;

    if (limit === UNLIMITED) {
        return { allowed: true, restaurant, limit, currentPlan, currentUsage: null };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentUsage = await Booking.countDocuments({
        restaurantId,
        createdAt: { $gte: monthStart, $lt: monthEnd },
    });

    return {
        allowed: currentUsage < limit,
        restaurant,
        limit,
        currentPlan,
        currentUsage,
    };
}
