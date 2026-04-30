import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TableLock from '@/models/TableLock';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';
import User from '@/models/user';

export async function POST(request) {
    try {
        await dbConnect();
        
        const { lockId } = await request.json();

        // Validate required fields
        if (!lockId) {
            return NextResponse.json(
                { error: 'Lock ID is required' },
                { status: 400 }
            );
        }

        // Verify authentication
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

        // Find the lock
        const tableLock = await TableLock.findOne({ 
            lockId,
            userId: user._id
        });

        if (!tableLock) {
            return NextResponse.json(
                { error: 'Lock not found' },
                { status: 404 }
            );
        }

        // Check if lock is already released or confirmed
        if (tableLock.status === 'released') {
            return NextResponse.json({
                success: true,
                message: 'Lock was already released',
                lock: {
                    lockId: tableLock.lockId,
                    status: tableLock.status,
                    releasedAt: tableLock.updatedAt
                }
            });
        }

        if (tableLock.status === 'confirmed') {
            return NextResponse.json(
                { error: 'Cannot release a confirmed lock' },
                { status: 400 }
            );
        }

        // Release the lock
        await tableLock.release();

        return NextResponse.json({
            success: true,
            message: 'Lock released successfully',
            lock: {
                lockId: tableLock.lockId,
                status: tableLock.status,
                releasedAt: tableLock.updatedAt,
                tableId: tableLock.tableId,
                date: tableLock.date,
                startTime: tableLock.startTime,
                endTime: tableLock.endTime
            }
        });

    } catch (error) {
        console.error('Error releasing soft lock:', error);
        return NextResponse.json(
            { error: 'Failed to release lock' },
            { status: 500 }
        );
    }
}

// GET endpoint to check lock status
export async function GET(request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const lockId = searchParams.get('lockId');

        if (!lockId) {
            return NextResponse.json(
                { error: 'Lock ID is required' },
                { status: 400 }
            );
        }

        // Verify authentication
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

        // Find the lock
        const tableLock = await TableLock.findOne({ 
            lockId,
            userId: user._id
        });

        if (!tableLock) {
            return NextResponse.json(
                { error: 'Lock not found' },
                { status: 404 }
            );
        }

        const isExpired = tableLock.isExpired();
        const timeRemaining = isExpired ? 0 : Math.max(0, tableLock.expiresAt - Date.now());

        return NextResponse.json({
            lock: {
                lockId: tableLock.lockId,
                status: isExpired ? 'expired' : tableLock.status,
                expiresAt: tableLock.expiresAt,
                timeRemainingMs: timeRemaining,
                timeRemainingMinutes: Math.ceil(timeRemaining / (1000 * 60)),
                tableId: tableLock.tableId,
                date: tableLock.date,
                startTime: tableLock.startTime,
                endTime: tableLock.endTime,
                guestCount: tableLock.guestCount,
                isExpired
            }
        });

    } catch (error) {
        console.error('Error checking lock status:', error);
        return NextResponse.json(
            { error: 'Failed to check lock status' },
            { status: 500 }
        );
    }
}
