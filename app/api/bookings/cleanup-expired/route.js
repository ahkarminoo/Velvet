import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
import Booking from '@/models/Booking';

export async function POST(request) {
    try {
        await dbConnect();
        
        // Verify this is an internal/system request
        const authHeader = request.headers.get('authorization');
        const systemToken = process.env.SYSTEM_CLEANUP_TOKEN;
        
        if (!systemToken || authHeader !== `Bearer ${systemToken}`) {
            return NextResponse.json(
                { error: 'Unauthorized - system token required' },
                { status: 401 }
            );
        }

        const startTime = Date.now();
        let cleanupStats = {
            expiredLocks: 0,
            staleBookings: 0,
            errors: []
        };

        // Cleanup expired locks
        try {
            cleanupStats.expiredLocks = await TableLock.cleanupExpiredLocks();
        } catch (error) {
            console.error('Error cleaning up expired locks:', error);
            cleanupStats.errors.push('Failed to cleanup expired locks: ' + error.message);
        }

        // Cleanup stale pending bookings (older than 24 hours)
        try {
            const staleDate = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
            
            const result = await Booking.updateMany(
                {
                    status: 'pending',
                    createdAt: { $lt: staleDate }
                },
                {
                    status: 'cancelled',
                    $push: {
                        history: {
                            action: 'cancelled',
                            timestamp: new Date(),
                            details: {
                                reason: 'Auto-cancelled: stale pending booking',
                                automated: true
                            }
                        }
                    }
                }
            );
            
            cleanupStats.staleBookings = result.modifiedCount;
        } catch (error) {
            console.error('Error cleaning up stale bookings:', error);
            cleanupStats.errors.push('Failed to cleanup stale bookings: ' + error.message);
        }

        // Cleanup orphaned locks (locks without corresponding users)
        try {
            const orphanedLocks = await TableLock.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $match: {
                        user: { $size: 0 },
                        status: 'active'
                    }
                }
            ]);

            if (orphanedLocks.length > 0) {
                await TableLock.updateMany(
                    { _id: { $in: orphanedLocks.map(lock => lock._id) } },
                    { status: 'released' }
                );
                cleanupStats.orphanedLocks = orphanedLocks.length;
            }
        } catch (error) {
            console.error('Error cleaning up orphaned locks:', error);
            cleanupStats.errors.push('Failed to cleanup orphaned locks: ' + error.message);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        return NextResponse.json({
            success: true,
            message: 'Cleanup completed successfully',
            stats: cleanupStats,
            duration: `${duration}ms`,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in cleanup job:', error);
        return NextResponse.json(
            { error: 'Cleanup job failed' },
            { status: 500 }
        );
    }
}

// GET endpoint to check cleanup status without running cleanup
export async function GET(request) {
    try {
        await dbConnect();
        
        // Count expired locks
        const expiredLocksCount = await TableLock.countDocuments({
            status: 'active',
            expiresAt: { $lt: new Date() }
        });

        // Count stale pending bookings
        const staleDate = new Date(Date.now() - (24 * 60 * 60 * 1000));
        const staleBookingsCount = await Booking.countDocuments({
            status: 'pending',
            createdAt: { $lt: staleDate }
        });

        // Count active locks
        const activeLocksCount = await TableLock.countDocuments({
            status: 'active',
            expiresAt: { $gt: new Date() }
        });

        // Count total bookings by status
        const bookingStats = await Booking.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        return NextResponse.json({
            cleanupStatus: {
                expiredLocks: expiredLocksCount,
                staleBookings: staleBookingsCount,
                activeLocks: activeLocksCount,
                bookingStats: bookingStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                checkedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error checking cleanup status:', error);
        return NextResponse.json(
            { error: 'Failed to check cleanup status' },
            { status: 500 }
        );
    }
}
