import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { dynamicPricing } from '@/utils/dynamicPricing';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

/**
 * Dynamic Pricing Calculation API
 * POST /api/pricing/calculate
 */

export async function POST(request) {
    try {
        await dbConnect();

        // Parse request body
        const body = await request.json();
        const {
            restaurantId,
            tableId,
            date,
            time,
            guestCount,
            tableCapacity,
            tableLocation,
            requireAuth = false
        } = body;

        // Validate required fields
        if (!restaurantId || !date || !time || !guestCount) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: restaurantId, date, time, guestCount'
            }, { status: 400 });
        }

        // Optional authentication check
        if (requireAuth) {
            const authResult = await verifyFirebaseAuth(request);
            if (!authResult.success) {
                return NextResponse.json({
                    success: false,
                    error: 'Authentication required'
                }, { status: 401 });
            }
        }

        // Validate inputs
        const bookingDate = new Date(date);
        if (isNaN(bookingDate.getTime())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid date format'
            }, { status: 400 });
        }

        if (guestCount < 1 || guestCount > 20) {
            return NextResponse.json({
                success: false,
                error: 'Guest count must be between 1 and 20'
            }, { status: 400 });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid time format. Use HH:MM format'
            }, { status: 400 });
        }

        // Prepare booking request
        const bookingRequest = {
            restaurantId,
            tableId: tableId || 'estimate',
            date: bookingDate,
            time,
            guestCount: parseInt(guestCount),
            tableCapacity: tableCapacity || (guestCount <= 2 ? 2 : guestCount <= 4 ? 4 : 6)
        };

        // Calculate dynamic price
        const pricingResult = await dynamicPricing.calculatePrice(bookingRequest);

        // Add request metadata
        pricingResult.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        pricingResult.requestTimestamp = new Date().toISOString();

        return NextResponse.json(pricingResult);

    } catch (error) {
        console.error('Pricing calculation API error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Internal server error during price calculation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            fallbackPrice: 100,
            currency: 'THB'
        }, { status: 500 });
    }
}

/**
 * GET endpoint for testing
 */
export async function GET(request) {
    const exampleRequest = {
        endpoint: '/api/pricing/calculate',
        method: 'POST',
        description: 'Calculate dynamic booking price',
        requiredFields: {
            restaurantId: 'string - MongoDB ObjectId of restaurant',
            date: 'string - Booking date in YYYY-MM-DD format',
            time: 'string - Booking time in HH:MM format',
            guestCount: 'number - Number of guests (1-20)'
        },
        optionalFields: {
            tableId: 'string - Specific table ID (default: "estimate")',
            tableCapacity: 'number - Table capacity (auto-calculated if not provided)',
            tableLocation: 'string - Table location: window, private, center, corner, outdoor',
            requireAuth: 'boolean - Whether to require authentication (default: false)'
        },
        exampleRequest: {
            restaurantId: '67b716e98d2856f0a1900471',
            tableId: 't1',
            date: '2025-02-14',
            time: '19:30',
            guestCount: 2,
            tableCapacity: 2,
            tableLocation: 'window',
            requireAuth: false
        },
        exampleResponse: {
            success: true,
            basePrice: 100,
            finalPrice: 168,
            currency: 'THB',
            breakdown: {
                demandFactor: { value: 1.25, reason: 'High demand (70% capacity)' },
                temporalFactor: { value: 1.3, reason: 'Weekend dinner peak' },
                historicalFactor: { value: 1.1, reason: 'Historically busy time slot' },
                capacityFactor: { value: 1.4, reason: 'Couple table premium, window location' },
                holidayFactor: { value: 1.6, reason: "Valentine's Day (international)" }
            },
            context: {
                demandLevel: 'high',
                tableInfo: { efficiency: 100, capacity: 2 }
            },
            confidence: 0.92
        }
    };

    return NextResponse.json(exampleRequest);
}
