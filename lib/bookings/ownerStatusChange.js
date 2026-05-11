import Booking from '@/models/Booking';
import Restaurant from '@/models/Restaurants';
import User from '@/models/user';
import Staff from '@/models/Staff';
import {
    notifyCustomerOfBookingConfirmation,
    notifyCustomerOfBookingRejection,
    sendBookingStatusNotification,
} from '@/lib/notifications';
import { BookingError, ERROR_CODES } from './errors';

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

/**
 * Restaurant owner changes a booking's status.
 *
 * Auth model: the caller (route) extracts `ownerId` from the JWT (typically
 * `decoded.userId` for a RestaurantOwner). This function then verifies the
 * owner actually owns the restaurant that owns the booking — defence in
 * depth in case the JWT was for a different owner.
 *
 * Idempotent on no-change: if newStatus === current status, no history entry
 * is written and notifications are skipped.
 *
 * Notifications:
 *   - LINE notification fired (awaited) when customer has lineUserId AND new
 *     status is confirmed or cancelled.
 *   - Email status notification fired-and-forgotten for all transitions.
 *
 * Returns { booking, restaurant, previousStatus, statusChanged }.
 */
export async function changeBookingStatusAsOwner({ ownerId, bookingId, newStatus }) {
    if (!ownerId) {
        throw new BookingError(ERROR_CODES.UNAUTHORIZED, 'Owner ID required');
    }
    if (!bookingId || !newStatus) {
        throw new BookingError(
            ERROR_CODES.MISSING_FIELDS,
            'bookingId and newStatus are required',
        );
    }
    if (!VALID_STATUSES.includes(newStatus)) {
        throw new BookingError(
            ERROR_CODES.INVALID_STATUS,
            `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new BookingError(ERROR_CODES.BOOKING_NOT_FOUND, 'Booking not found');
    }

    const restaurant = await Restaurant.findOne({
        _id: booking.restaurantId,
        ownerId,
    });
    if (!restaurant) {
        throw new BookingError(
            ERROR_CODES.UNAUTHORIZED,
            'Unauthorized - Not the owner of this restaurant',
        );
    }

    const previousStatus = booking.status;
    if (previousStatus === newStatus) {
        return { booking, restaurant, previousStatus, statusChanged: false };
    }

    booking.addToHistory('modified', {
        previousStatus,
        newStatus,
        updatedBy: 'restaurant_owner',
        updatedAt: new Date(),
    });
    booking.status = newStatus;
    await booking.save();

    // Notifications — failures are logged but never fail the status change.
    try {
        const customer = await User.findById(booking.userId);
        const ownerStaff = await Staff.findOne({
            restaurantId: booking.restaurantId,
            role: 'owner',
        });
        const staffForNotification = ownerStaff || {
            _id: ownerId,
            displayName: 'Restaurant Staff',
            role: 'owner',
        };

        if (customer?.lineUserId && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
            try {
                if (newStatus === 'confirmed') {
                    await notifyCustomerOfBookingConfirmation(booking, staffForNotification);
                } else {
                    await notifyCustomerOfBookingRejection(
                        booking,
                        staffForNotification,
                        'Booking cancelled by restaurant',
                    );
                }
            } catch (lineError) {
                console.error('Failed to send LINE notification:', lineError);
            }
        }

        const emailData = {
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            restaurantName: restaurant.restaurantName,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            guestCount: booking.guestCount,
            tableId: booking.tableId,
            bookingRef: booking.bookingRef,
            createdAt: booking.createdAt,
        };
        // Fire-and-forget — don't block the response on SMTP latency.
        sendBookingStatusNotification(emailData, newStatus, previousStatus).catch((error) => {
            console.error('Email notification error:', error);
        });
    } catch (notificationError) {
        console.error('Notification preparation failed:', notificationError);
    }

    return { booking, restaurant, previousStatus, statusChanged: true };
}
