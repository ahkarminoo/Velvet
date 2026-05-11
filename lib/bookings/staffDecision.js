import Booking from '@/models/Booking';
import Staff from '@/models/Staff';
import {
    notifyCustomerOfBookingConfirmation,
    notifyCustomerOfBookingRejection,
} from '@/lib/notifications';
import { BookingError, ERROR_CODES } from './errors';

const VALID_ACTIONS = new Set(['confirm', 'reject']);

/**
 * Staff confirms or rejects a pending booking.
 *
 * Permissions:
 *   - 'confirm' requires staff.permissions.canUpdateBookings
 *   - 'reject'  requires staff.permissions.canCancelBookings
 *
 * Side effect: notifies the customer (via lib/notifications, currently stubbed).
 * Notification failures are caught and logged but do not fail the decision.
 *
 * Returns { booking, staff }.
 */
export async function staffConfirmOrReject({ bookingId, staffId, action, reason }) {
    if (!bookingId || !staffId || !action) {
        throw new BookingError(
            ERROR_CODES.MISSING_FIELDS,
            'Missing required fields: bookingId, action, staffId',
        );
    }
    if (!VALID_ACTIONS.has(action)) {
        throw new BookingError(
            ERROR_CODES.INVALID_ACTION,
            'Invalid action. Must be "confirm" or "reject"',
        );
    }

    const booking = await Booking.findById(bookingId).populate('restaurantId', 'restaurantName');
    if (!booking) {
        throw new BookingError(ERROR_CODES.BOOKING_NOT_FOUND, 'Booking not found');
    }
    if (booking.status !== 'pending') {
        throw new BookingError(
            ERROR_CODES.BOOKING_ALREADY_DECIDED,
            `Booking is already ${booking.status}`,
        );
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
        throw new BookingError(ERROR_CODES.STAFF_NOT_FOUND, 'Staff member not found');
    }

    if (action === 'confirm' && !staff.permissions.canUpdateBookings) {
        throw new BookingError(
            ERROR_CODES.STAFF_FORBIDDEN,
            'Staff member does not have permission to confirm bookings',
        );
    }
    if (action === 'reject' && !staff.permissions.canCancelBookings) {
        throw new BookingError(
            ERROR_CODES.STAFF_FORBIDDEN,
            'Staff member does not have permission to reject bookings',
        );
    }

    if (action === 'confirm') {
        booking.status = 'confirmed';
        booking.addToHistory('confirmed', {
            staffId: staff._id,
            staffName: staff.displayName,
            confirmedAt: new Date(),
        });
    } else {
        booking.status = 'cancelled';
        booking.addToHistory('rejected', {
            staffId: staff._id,
            staffName: staff.displayName,
            rejectedAt: new Date(),
            reason: reason || 'Rejected by staff',
        });
    }

    await booking.save();

    try {
        if (action === 'confirm') {
            await notifyCustomerOfBookingConfirmation(booking, staff);
        } else {
            await notifyCustomerOfBookingRejection(booking, staff, reason);
        }
    } catch (notificationError) {
        console.error(`Failed to send customer ${action} notification:`, notificationError);
    }

    return { booking, staff };
}

/**
 * List pending bookings visible to a staff member at their restaurant.
 * Returns the most recent 50 pending bookings.
 */
export async function listPendingBookingsForStaff({ restaurantId, staffId }) {
    if (!restaurantId || !staffId) {
        throw new BookingError(
            ERROR_CODES.MISSING_FIELDS,
            'Missing restaurantId or staffId parameter',
        );
    }

    const staff = await Staff.findById(staffId);
    if (!staff || staff.restaurantId.toString() !== restaurantId.toString()) {
        throw new BookingError(ERROR_CODES.STAFF_FORBIDDEN, 'Unauthorized');
    }
    if (!staff.permissions.canViewBookings) {
        throw new BookingError(
            ERROR_CODES.STAFF_FORBIDDEN,
            'Staff member does not have permission to view bookings',
        );
    }

    const pendingBookings = await Booking.find({
        restaurantId,
        status: 'pending',
    })
        .populate('restaurantId', 'restaurantName')
        .populate('userId', 'firstName lastName lineUserId')
        .sort({ createdAt: -1 })
        .limit(50);

    return { bookings: pendingBookings, staff };
}
