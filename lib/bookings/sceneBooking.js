import { startSession } from '@/lib/mongodb';
import Floorplan from '@/models/Floorplan';
import Booking from '@/models/Booking';
import { notifyStaffOfNewBooking } from '@/lib/notifications';
import { checkBookingLimit } from './limits';
import { BookingError, ERROR_CODES } from './errors';

/**
 * Convert a 12h time string ("7:30 PM") to "HH:MM" 24h string.
 * Returns null for unparseable input.
 */
function to24hString(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length !== 2) {
        // Already 24h?
        const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        return `${m[1].padStart(2, '0')}:${m[2]}`;
    }
    const [time, period] = parts;
    const [h, mm] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(mm)) return null;
    let hours = h;
    const upper = period.toUpperCase();
    if (upper === 'PM' && h !== 12) hours += 12;
    if (upper === 'AM' && h === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function generateTimeSlots(openingTime, closingTime, intervalMinutes = 30) {
    const slots = [];
    const start = new Date(`2000-01-01T${openingTime}`);
    const end = new Date(`2000-01-01T${closingTime}`);
    if (end <= start) end.setDate(end.getDate() + 1); // overnight venue
    const cursor = new Date(start);
    while (cursor <= end) {
        slots.push(cursor.toTimeString().slice(0, 5));
        cursor.setMinutes(cursor.getMinutes() + intervalMinutes);
    }
    return slots;
}

function buildCustomerName(user) {
    if (user.firstName || user.lastName) {
        return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    if (user.displayName && user.displayName !== 'immediate test') return user.displayName;
    if (user.name && user.name !== 'immediate test') return user.name;
    if (user.email) return user.email.split('@')[0];
    return 'Customer';
}

async function calculatePricing({ restaurantId, tableId, date, startTime, guestCount }) {
    try {
        const { dynamicPricing } = await import('@/utils/dynamicPricing');
        const result = await dynamicPricing.calculatePrice({
            restaurantId,
            tableId,
            date: new Date(date),
            time: startTime,
            guestCount,
            tableCapacity: guestCount <= 2 ? 2 : guestCount <= 4 ? 4 : 6,
            tableLocation: 'center',
        });
        if (!result?.success) throw new Error('Pricing returned no result');
        return {
            basePrice: result.basePrice,
            finalPrice: result.finalPrice,
            currency: result.currency,
            factors: {
                demandFactor: result.breakdown.demandFactor.value,
                temporalFactor: result.breakdown.temporalFactor.value,
                historicalFactor: result.breakdown.historicalFactor.value,
                capacityFactor: result.breakdown.capacityFactor.value,
                holidayFactor: result.breakdown.holidayFactor.value,
            },
            context: {
                occupancyRate: result.context?.occupancyRate || 0,
                tableCapacity: result.context?.tableInfo?.capacity || guestCount,
                tableLocation: result.context?.tableInfo?.location || 'center',
                demandLevel: result.context?.demandLevel || 'medium',
                holidayName: result.breakdown?.holidayFactor?.holiday?.name || null,
            },
            confidence: result.confidence,
            calculatedAt: new Date(),
        };
    } catch (pricingError) {
        console.error('Dynamic pricing failed, using fallback:', pricingError);
        return {
            basePrice: 100,
            finalPrice: 100,
            currency: 'THB',
            factors: {
                demandFactor: 1.0,
                temporalFactor: 1.0,
                historicalFactor: 1.0,
                capacityFactor: 1.0,
                holidayFactor: 1.0,
            },
            context: {
                occupancyRate: 0,
                tableCapacity: guestCount,
                tableLocation: 'center',
                demandLevel: 'medium',
                holidayName: null,
            },
            confidence: 0.5,
            calculatedAt: new Date(),
        };
    }
}

/**
 * Create a pending booking through the scene/floorplan flow.
 *
 * This is the "web" booking path — no soft-lock step; the booking is
 * inserted directly as 'pending' and the floorplan is updated to mark
 * the table as booked. A staff notification is fired-and-forgotten.
 *
 * Returns { booking } (full populated summary for the route response).
 */
export async function createSceneBooking({
    user,
    sceneId,
    restaurantId,
    tableId,
    date,
    startTime,
    endTime,
    durationMinutes,
    guestCount,
}) {
    if (!user) {
        throw new BookingError(ERROR_CODES.UNAUTHORIZED, 'User required');
    }
    if (!sceneId || !restaurantId || !tableId || !date || !startTime || !endTime || !guestCount) {
        throw new BookingError(ERROR_CODES.MISSING_FIELDS, 'Missing required fields');
    }

    const limitCheck = await checkBookingLimit(restaurantId);
    if (!limitCheck.restaurant) {
        throw new BookingError(ERROR_CODES.RESTAURANT_NOT_FOUND, 'Restaurant not found');
    }
    if (!limitCheck.allowed) {
        throw new BookingError(ERROR_CODES.LIMIT_REACHED, 'Monthly booking limit reached', {
            limit: limitCheck.limit,
            currentUsage: limitCheck.currentUsage,
            currentPlan: limitCheck.currentPlan,
        });
    }
    const restaurant = limitCheck.restaurant;

    const scene = await Floorplan.findById(sceneId);
    if (!scene) {
        throw new BookingError(ERROR_CODES.FLOORPLAN_NOT_FOUND, 'Floorplan not found');
    }

    const table = scene.data.objects.find(
        (obj) =>
            (obj.type === 'furniture' || obj.type === 'table') &&
            obj.objectId === tableId,
    );
    if (!table) {
        throw new BookingError(ERROR_CODES.TABLE_NOT_FOUND, 'Table not found', {
            searchedId: tableId,
        });
    }

    // Validate against restaurant opening hours for that day-of-week
    const dayOfWeek = new Date(date)
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();
    const dayHours = restaurant.openingHours?.[dayOfWeek];
    if (!dayHours?.open || !dayHours?.close) {
        throw new BookingError(
            ERROR_CODES.RESTAURANT_CLOSED,
            'Restaurant is closed on this day',
        );
    }

    const openTime = to24hString(dayHours.open);
    const closeTime = to24hString(dayHours.close);
    const bookingTime24h = to24hString(startTime);
    if (!openTime || !closeTime || !bookingTime24h) {
        throw new BookingError(ERROR_CODES.INVALID_TIME_SLOT, 'Invalid time format');
    }

    const validTimeSlots = generateTimeSlots(openTime, closeTime);
    if (!validTimeSlots.includes(bookingTime24h)) {
        throw new BookingError(
            ERROR_CODES.INVALID_TIME_SLOT,
            `Invalid time slot. Restaurant is open from ${dayHours.open} to ${dayHours.close}`,
        );
    }

    const pricing = await calculatePricing({
        restaurantId,
        tableId,
        date,
        startTime,
        guestCount,
    });

    const customerName = buildCustomerName(user);
    const session = await startSession();
    let createdBookingId;

    try {
        await session.withTransaction(async () => {
            const isAvailable = await Booking.isTableAvailable(
                tableId,
                date,
                startTime,
                endTime,
                restaurantId,
            );
            if (!isAvailable) {
                throw new BookingError(
                    ERROR_CODES.TABLE_UNAVAILABLE,
                    'Table is no longer available for the selected time slot',
                );
            }

            const booking = new Booking({
                userId: user._id,
                restaurantId,
                floorplanId: sceneId,
                tableId,
                date: new Date(date),
                startTime,
                endTime,
                durationMinutes,
                guestCount,
                status: 'pending',
                customerName,
                customerEmail: user.email,
                customerPhone: user.contactNumber || user.phoneNumber || 'Not provided',
                pricing,
            });
            booking.addToHistory('created', { tableId, guestCount, startTime, endTime });
            await booking.save({ session });
            createdBookingId = booking._id;

            await Floorplan.updateOne(
                { _id: sceneId, 'data.objects.objectId': tableId },
                {
                    $set: {
                        'data.objects.$.userData.bookingStatus': 'booked',
                        'data.objects.$.userData.currentBooking': booking._id,
                    },
                },
                { session },
            );

            if (restaurant.subscriptionId?.incrementUsage) {
                await restaurant.subscriptionId.incrementUsage('bookingsThisMonth', 1);
                await restaurant.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
            }
        });
    } catch (error) {
        if (error instanceof BookingError) throw error;
        if (error.code === 11000) {
            throw new BookingError(
                ERROR_CODES.DOUBLE_BOOKING_PREVENTED,
                'This table is already booked for the selected time slot',
            );
        }
        throw error;
    } finally {
        await session.endSession();
    }

    // Fire-and-forget staff notification — don't block the response.
    setImmediate(async () => {
        try {
            const booking = await Booking.findById(createdBookingId);
            if (booking && restaurantId) {
                await notifyStaffOfNewBooking(booking, restaurantId);
            }
        } catch (notificationError) {
            console.error('Failed to send staff notification:', notificationError);
        }
    });

    const created = await Booking.findById(createdBookingId).populate(
        'restaurantId',
        'restaurantName',
    );

    return {
        booking: {
            _id: created._id,
            bookingRef: created.bookingRef,
            version: created.version,
            restaurantId: created.restaurantId._id,
            restaurantName: created.restaurantId.restaurantName,
            tableId: created.tableId,
            date: created.date,
            startTime: created.startTime,
            endTime: created.endTime,
            guestCount: created.guestCount,
            status: created.status,
            customerName: created.customerName,
            customerEmail: created.customerEmail,
            pricing: created.pricing,
        },
    };
}
