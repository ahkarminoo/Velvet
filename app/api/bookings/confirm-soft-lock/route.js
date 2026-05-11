import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { resolveUser } from '@/lib/auth/resolveUser';
import { confirmSoftLock } from '@/lib/bookings/confirmLock';
import { BookingError, ERROR_CODES, ERROR_HTTP_STATUS } from '@/lib/bookings/errors';

function errorResponse(error) {
    if (!(error instanceof BookingError)) {
        console.error('Error confirming soft lock:', error);
        return NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 });
    }

    const status = ERROR_HTTP_STATUS[error.code] ?? 500;

    if (error.code === ERROR_CODES.LIMIT_REACHED) {
        const { limit, currentUsage, currentPlan } = error.details;
        return NextResponse.json({
            error: 'Monthly booking limit reached',
            message: `You have reached your monthly limit of ${limit} bookings. Please upgrade your plan to accept more bookings.`,
            upgradeRequired: true,
            currentPlan,
            currentUsage,
            limit,
        }, { status });
    }

    if (error.code === ERROR_CODES.CONCURRENT_BOOKING) {
        return NextResponse.json({
            error: 'Table was booked by another user while confirming your reservation',
            code: 'CONCURRENT_BOOKING',
        }, { status });
    }

    if (error.code === ERROR_CODES.DOUBLE_BOOKING_PREVENTED) {
        return NextResponse.json({
            error: 'Table is no longer available',
            code: 'DOUBLE_BOOKING_PREVENTED',
        }, { status });
    }

    return NextResponse.json({ error: error.message, code: error.code }, { status });
}

export async function POST(request) {
    try {
        await dbConnect();

        const user = await resolveUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { lockId, specialRequests, pricing } = await request.json();
        const { booking } = await confirmSoftLock({ user, lockId, specialRequests, pricing });

        return NextResponse.json({
            success: true,
            message: 'Booking confirmed successfully',
            booking,
        });
    } catch (error) {
        return errorResponse(error);
    }
}
