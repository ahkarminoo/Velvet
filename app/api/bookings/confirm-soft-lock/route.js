import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { resolveUser } from '@/lib/auth/resolveUser';
import { confirmSoftLock } from '@/lib/bookings/confirmLock';
import { errorResponseFor } from '@/lib/api/bookingErrorResponse';

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
        return errorResponseFor(error, { fallbackMessage: 'Failed to confirm booking' });
    }
}
