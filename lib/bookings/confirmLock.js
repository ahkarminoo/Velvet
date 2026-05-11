import { startSession } from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
import Booking from '@/models/Booking';
import { hasOverlap, inferDurationMinutes } from '@/lib/time';
import { checkBookingLimit } from './limits';
import { BookingError, ERROR_CODES } from './errors';

/**
 * Confirm a previously-created soft lock by atomically:
 *   1. Re-checking conflicting bookings/locks under a transaction
 *   2. Inserting the Booking document
 *   3. Marking the TableLock as confirmed
 *   4. Incrementing subscription usage if applicable
 *
 * Returns { booking: <full booking summary> }.
 *
 * Note: this function depends on MongoDB replica-set transactions. The in-memory
 * test runner (mongodb-memory-server) starts a single-node replica set, which
 * supports withTransaction. In production this requires Atlas or a real replica
 * set — standalone Mongo will throw.
 */
export async function confirmSoftLock({ user, lockId, specialRequests = '', pricing }) {
    if (!user) {
        throw new BookingError(ERROR_CODES.UNAUTHORIZED, 'User required');
    }
    if (!lockId) {
        throw new BookingError(ERROR_CODES.MISSING_FIELDS, 'Lock ID is required');
    }

    const tableLock = await TableLock.findOne({
        lockId,
        userId: user._id,
        status: 'active',
    });

    if (!tableLock) {
        throw new BookingError(ERROR_CODES.LOCK_NOT_FOUND, 'Lock not found or expired');
    }

    if (tableLock.isExpired()) {
        tableLock.status = 'expired';
        await tableLock.save();
        throw new BookingError(ERROR_CODES.LOCK_EXPIRED, 'Lock has expired');
    }

    const limitCheck = await checkBookingLimit(tableLock.restaurantId);
    if (!limitCheck.allowed) {
        throw new BookingError(
            ERROR_CODES.LIMIT_REACHED,
            'Monthly booking limit reached',
            {
                limit: limitCheck.limit,
                currentUsage: limitCheck.currentUsage,
                currentPlan: limitCheck.currentPlan,
            },
        );
    }

    const restaurant = limitCheck.restaurant;
    const floorplanId = restaurant?.defaultFloorplanId;
    if (!floorplanId) {
        throw new BookingError(
            ERROR_CODES.MISSING_FIELDS,
            'Restaurant has no defaultFloorplanId configured',
        );
    }
    const session = await startSession();

    try {
        await session.withTransaction(async () => {
            const lockDateStart = new Date(tableLock.date);
            lockDateStart.setHours(0, 0, 0, 0);
            const lockDateEnd = new Date(lockDateStart);
            lockDateEnd.setDate(lockDateEnd.getDate() + 1);

            const sameDayBookings = await Booking.find({
                restaurantId: tableLock.restaurantId,
                tableId: tableLock.tableId,
                date: { $gte: lockDateStart, $lt: lockDateEnd },
                status: { $in: ['pending', 'confirmed'] },
            })
                .select('_id startTime endTime')
                .session(session);

            const conflictingBooking = sameDayBookings.find((b) =>
                hasOverlap(b.startTime, b.endTime, tableLock.startTime, tableLock.endTime),
            );

            if (conflictingBooking) {
                throw new BookingError(
                    ERROR_CODES.CONCURRENT_BOOKING,
                    'Table was booked by another user while confirming your reservation',
                );
            }

            const sameDayActiveLocks = await TableLock.find({
                restaurantId: tableLock.restaurantId,
                tableId: tableLock.tableId,
                date: { $gte: lockDateStart, $lt: lockDateEnd },
                status: 'active',
                expiresAt: { $gt: new Date() },
                lockId: { $ne: tableLock.lockId },
            })
                .select('_id lockId startTime endTime')
                .session(session);

            const conflictingLock = sameDayActiveLocks.find((l) =>
                hasOverlap(l.startTime, l.endTime, tableLock.startTime, tableLock.endTime),
            );

            if (conflictingLock) {
                throw new BookingError(
                    ERROR_CODES.CONCURRENT_BOOKING,
                    'Table was booked by another user while confirming your reservation',
                );
            }

            const booking = new Booking({
                restaurantId: tableLock.restaurantId,
                floorplanId,
                tableId: tableLock.tableId,
                userId: tableLock.userId,
                date: tableLock.date,
                startTime: tableLock.startTime,
                endTime: tableLock.endTime,
                durationMinutes: inferDurationMinutes(tableLock.startTime, tableLock.endTime),
                guestCount: tableLock.guestCount,
                status: 'confirmed',
                customerName: tableLock.metadata.customerName,
                customerEmail: tableLock.metadata.customerEmail,
                customerPhone: tableLock.metadata.customerPhone,
                specialRequests,
                pricing: pricing || tableLock.metadata.pricing,
                lockInfo: {
                    lockId: tableLock.lockId,
                    lockedAt: tableLock.lockedAt,
                    lockExpiresAt: tableLock.expiresAt,
                },
            });

            booking.addToHistory('created', {
                tableId: tableLock.tableId,
                guestCount: tableLock.guestCount,
                startTime: tableLock.startTime,
                endTime: tableLock.endTime,
                fromLock: true,
                lockId: tableLock.lockId,
            });

            await booking.save({ session });

            if (restaurant?.subscriptionId?.incrementUsage) {
                await restaurant.subscriptionId.incrementUsage('bookingsThisMonth', 1);
            }

            tableLock.status = 'confirmed';
            tableLock.confirmedAt = new Date();
            await tableLock.save({ session });
        });
    } catch (error) {
        if (error instanceof BookingError) throw error;
        if (error.code === 11000) {
            throw new BookingError(
                ERROR_CODES.DOUBLE_BOOKING_PREVENTED,
                'Table is no longer available',
            );
        }
        throw error;
    } finally {
        await session.endSession();
    }

    const confirmedBooking = await Booking.findOne({ 'lockInfo.lockId': lockId }).populate(
        'restaurantId',
        'restaurantName',
    );

    return {
        booking: {
            _id: confirmedBooking._id,
            bookingRef: confirmedBooking.bookingRef,
            restaurantId: confirmedBooking.restaurantId._id,
            restaurantName: confirmedBooking.restaurantId.restaurantName,
            tableId: confirmedBooking.tableId,
            date: confirmedBooking.date,
            startTime: confirmedBooking.startTime,
            endTime: confirmedBooking.endTime,
            guestCount: confirmedBooking.guestCount,
            status: confirmedBooking.status,
            customerName: confirmedBooking.customerName,
            customerEmail: confirmedBooking.customerEmail,
            pricing: confirmedBooking.pricing,
        },
    };
}
