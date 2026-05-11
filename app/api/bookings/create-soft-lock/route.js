import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { resolveUser } from '@/lib/auth/resolveUser';
import { createSoftLock } from '@/lib/bookings/softLock';
import { errorResponseFor } from '@/lib/api/bookingErrorResponse';

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
        return errorResponseFor(error, { fallbackMessage: 'Failed to create soft lock' });
    }
}
