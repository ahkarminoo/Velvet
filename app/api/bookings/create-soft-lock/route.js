import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { resolveUser } from '@/lib/auth/resolveUser';
import { createSoftLock } from '@/lib/bookings/softLock';
import { BookingError, ERROR_CODES, ERROR_HTTP_STATUS } from '@/lib/bookings/errors';

function errorResponse(error) {
    if (!(error instanceof BookingError)) {
        console.error('Error creating soft lock:', error);
        return NextResponse.json({ error: 'Failed to create soft lock' }, { status: 500 });
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

    if (error.code === ERROR_CODES.BOOKING_CONFLICT || error.code === ERROR_CODES.LOCK_CONFLICT) {
        return NextResponse.json({
            error: error.message,
            conflict: error.details.conflict,
        }, { status });
    }

    if (error.code === ERROR_CODES.CONCURRENT_LOCK) {
        return NextResponse.json({
            error: error.message,
            code: 'CONCURRENT_LOCK',
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

        const body = await request.json();
        const { lock } = await createSoftLock({ user, ...body });

        return NextResponse.json({
            success: true,
            lock,
            message: `Table locked for ${body.holdDurationMinutes ?? 5} minutes`,
        });
    } catch (error) {
        return errorResponse(error);
    }
}
