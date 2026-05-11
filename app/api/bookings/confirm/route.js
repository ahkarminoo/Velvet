import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
    staffConfirmOrReject,
    listPendingBookingsForStaff,
} from '@/lib/bookings/staffDecision';
import { BookingError, ERROR_HTTP_STATUS } from '@/lib/bookings/errors';

function errorResponse(error, defaultMessage) {
    if (!(error instanceof BookingError)) {
        console.error(defaultMessage, error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const status = ERROR_HTTP_STATUS[error.code] ?? 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
}

// POST /api/bookings/confirm — staff confirms or rejects a pending booking
export async function POST(request) {
    try {
        await dbConnect();
        const { bookingId, action, staffId, reason } = await request.json();

        const { booking, staff } = await staffConfirmOrReject({
            bookingId,
            staffId,
            action,
            reason,
        });

        const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });

        return NextResponse.json({
            success: true,
            message: `Booking ${action}ed successfully`,
            booking: {
                id: booking._id,
                bookingRef: booking.bookingRef,
                customerName: booking.customerName,
                date: bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                guestCount: booking.guestCount,
                tableId: booking.tableId,
                status: booking.status,
                restaurantName: booking.restaurantId?.restaurantName,
            },
            staff: {
                id: staff._id,
                displayName: staff.displayName,
                role: staff.role,
            },
            action,
        });
    } catch (error) {
        return errorResponse(error, 'Error processing booking decision:');
    }
}

// GET /api/bookings/confirm — pending bookings for a staff-authorised restaurant
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');
        const staffId = searchParams.get('staffId');

        const { bookings, staff } = await listPendingBookingsForStaff({
            restaurantId,
            staffId,
        });

        const formatted = bookings.map((booking) => ({
            id: booking._id,
            bookingRef: booking.bookingRef,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            guestCount: booking.guestCount,
            tableId: booking.tableId,
            status: booking.status,
            createdAt: booking.createdAt,
            pricing: booking.pricing,
            isLineCustomer: !!booking.userId?.lineUserId,
            restaurantName: booking.restaurantId?.restaurantName,
        }));

        return NextResponse.json({
            success: true,
            bookings: formatted,
            total: formatted.length,
            restaurant: {
                id: restaurantId,
                name: formatted[0]?.restaurantName || 'Unknown',
            },
            staff: {
                id: staff._id,
                displayName: staff.displayName,
                role: staff.role,
                permissions: staff.permissions,
            },
        });
    } catch (error) {
        return errorResponse(error, 'Error fetching pending bookings:');
    }
}
