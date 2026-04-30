import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
import Booking from '@/models/Booking';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';
import User from '@/models/user';

export async function POST(request) {
    try {
        await dbConnect();
        
        const {
            conflictType, // 'booking' or 'lock'
            conflictId, // booking ID or lock ID
            resolution, // 'cancel', 'reschedule', 'override'
            newTimeSlot = null, // for reschedule
            reason = ''
        } = await request.json();

        // Validate required fields
        if (!conflictType || !conflictId || !resolution) {
            return NextResponse.json(
                { error: 'Missing required fields: conflictType, conflictId, resolution' },
                { status: 400 }
            );
        }

        // Verify authentication (admin/owner only)
        const authResult = await verifyFirebaseAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: 401 });
        }

        const { firebaseUid } = authResult;

        // Find user by Firebase UID
        const user = await User.findOne({ firebaseUid });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // TODO: Add admin/owner permission check here
        // For now, allowing any authenticated user to resolve conflicts
        // In production, you'd want to check if user is admin or restaurant owner

        let resolvedConflict = null;
        let resolutionDetails = {};

        if (conflictType === 'booking') {
            resolvedConflict = await resolveBookingConflict(conflictId, resolution, newTimeSlot, reason, user);
        } else if (conflictType === 'lock') {
            resolvedConflict = await resolveLockConflict(conflictId, resolution, reason, user);
        } else {
            return NextResponse.json(
                { error: 'Invalid conflict type. Must be "booking" or "lock"' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Conflict resolved successfully using ${resolution} strategy`,
            conflict: resolvedConflict,
            resolution: {
                type: conflictType,
                strategy: resolution,
                resolvedBy: user._id,
                resolvedAt: new Date(),
                reason
            }
        });

    } catch (error) {
        console.error('Error resolving conflict:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to resolve conflict' },
            { status: 500 }
        );
    }
}

// Helper function to resolve booking conflicts
async function resolveBookingConflict(bookingId, resolution, newTimeSlot, reason, user) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    switch (resolution) {
        case 'cancel':
            booking.status = 'cancelled';
            booking.addToHistory('cancelled', {
                reason: 'Conflict resolution - ' + reason,
                resolvedBy: user._id,
                resolvedAt: new Date()
            });
            await booking.save();
            return {
                type: 'booking',
                id: booking._id,
                status: 'cancelled',
                originalStatus: booking.status,
                resolution: 'cancel'
            };

        case 'reschedule':
            if (!newTimeSlot || !newTimeSlot.date || !newTimeSlot.startTime || !newTimeSlot.endTime) {
                throw new Error('New time slot details required for reschedule');
            }

            // Check if new time slot is available
            const isAvailable = await Booking.isTableAvailable(
                booking.tableId,
                newTimeSlot.date,
                newTimeSlot.startTime,
                newTimeSlot.endTime,
                booking.restaurantId,
                booking._id
            );

            if (!isAvailable) {
                throw new Error('New time slot is not available');
            }

            // Update booking with new time
            const originalTime = {
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime
            };

            booking.date = new Date(newTimeSlot.date);
            booking.startTime = newTimeSlot.startTime;
            booking.endTime = newTimeSlot.endTime;

            booking.addToHistory('modified', {
                reason: 'Conflict resolution - reschedule',
                originalTime,
                newTime: newTimeSlot,
                resolvedBy: user._id,
                resolvedAt: new Date()
            });

            await booking.save();
            return {
                type: 'booking',
                id: booking._id,
                status: booking.status,
                originalTime,
                newTime: newTimeSlot,
                resolution: 'reschedule'
            };

        case 'override':
            // Mark as overridden but keep the booking
            booking.addToHistory('modified', {
                reason: 'Conflict resolution - override',
                overridden: true,
                resolvedBy: user._id,
                resolvedAt: new Date()
            });
            await booking.save();
            return {
                type: 'booking',
                id: booking._id,
                status: booking.status,
                resolution: 'override'
            };

        default:
            throw new Error(`Invalid resolution strategy: ${resolution}`);
    }
}

// Helper function to resolve lock conflicts
async function resolveLockConflict(lockId, resolution, reason, user) {
    const lock = await TableLock.findOne({ lockId });
    if (!lock) {
        throw new Error('Lock not found');
    }

    switch (resolution) {
        case 'cancel':
            lock.status = 'released';
            await lock.save();
            return {
                type: 'lock',
                id: lock.lockId,
                status: 'released',
                originalStatus: lock.status,
                resolution: 'cancel'
            };

        case 'override':
            // Extend the lock expiration to give priority
            lock.expiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes
            await lock.save();
            return {
                type: 'lock',
                id: lock.lockId,
                status: lock.status,
                newExpiration: lock.expiresAt,
                resolution: 'override'
            };

        case 'expire':
            // Force expire the lock
            lock.status = 'expired';
            lock.expiresAt = new Date();
            await lock.save();
            return {
                type: 'lock',
                id: lock.lockId,
                status: 'expired',
                originalStatus: lock.status,
                resolution: 'expire'
            };

        default:
            throw new Error(`Invalid resolution strategy for lock: ${resolution}`);
    }
}

// GET endpoint to list active conflicts
export async function GET(request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');
        const date = searchParams.get('date');

        // Verify authentication
        const authResult = await verifyFirebaseAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: 401 });
        }

        let conflicts = [];

        if (restaurantId) {
            const queryDate = date ? new Date(date) : new Date();
            queryDate.setHours(0, 0, 0, 0);

            // Find overlapping bookings
            const overlappingBookings = await Booking.aggregate([
                {
                    $match: {
                        restaurantId: new dbConnect().Types.ObjectId(restaurantId),
                        date: queryDate,
                        status: { $in: ['pending', 'confirmed'] }
                    }
                },
                {
                    $group: {
                        _id: '$tableId',
                        bookings: { $push: '$$ROOT' }
                    }
                },
                {
                    $match: {
                        'bookings.1': { $exists: true } // Only groups with multiple bookings
                    }
                }
            ]);

            // Find active locks
            const activeLocks = await TableLock.find({
                restaurantId,
                status: 'active',
                expiresAt: { $gt: new Date() }
            });

            conflicts = [
                ...overlappingBookings.map(group => ({
                    type: 'booking_overlap',
                    tableId: group._id,
                    bookings: group.bookings,
                    count: group.bookings.length
                })),
                ...activeLocks.map(lock => ({
                    type: 'active_lock',
                    lockId: lock.lockId,
                    tableId: lock.tableId,
                    expiresAt: lock.expiresAt,
                    userId: lock.userId
                }))
            ];
        }

        return NextResponse.json({
            conflicts,
            totalConflicts: conflicts.length,
            checkedAt: new Date()
        });

    } catch (error) {
        console.error('Error listing conflicts:', error);
        return NextResponse.json(
            { error: 'Failed to list conflicts' },
            { status: 500 }
        );
    }
}
