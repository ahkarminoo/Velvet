import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import Booking from '@/models/Booking';
import { dataAnalyzer } from '@/utils/dataAnalyzer';
import { dynamicPricing } from '@/utils/dynamicPricing';

/**
 * Restaurant Analytics API
 * GET /api/restaurants/[id]/analytics
 */

export async function GET(request, { params }) {
    try {
        await dbConnect();

        const { id } = await params;

        // Fetch restaurant details
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
        }

        // Fetch all bookings for this restaurant
        const bookings = await Booking.find({ 
            restaurantId: id 
        }).sort({ createdAt: -1 });


        // Basic statistics
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => {
            return sum + (booking.pricing?.finalPrice || 100);
        }, 0);

        const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

        // Guest analysis
        const totalGuests = bookings.reduce((sum, booking) => sum + (booking.guestCount || 0), 0);
        const avgGuestsPerBooking = totalBookings > 0 ? Math.round(totalGuests / totalBookings * 10) / 10 : 0;

        // Time pattern analysis
        const timeSlots = {};
        const dayOfWeek = {};
        const monthlyBookings = {};

        bookings.forEach(booking => {
            if (booking.bookingTime) {
                const hour = parseInt(booking.bookingTime.split(':')[0]);
                const timeSlot = getTimeSlot(hour);
                timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1;
            }

            if (booking.bookingDate) {
                const date = new Date(booking.bookingDate);
                const day = date.toLocaleDateString('en-US', { weekday: 'long' });
                dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;

                const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                monthlyBookings[month] = (monthlyBookings[month] || 0) + 1;
            }
        });

        // Table capacity analysis
        const tableCapacityStats = {};
        bookings.forEach(booking => {
            const capacity = booking.tableCapacity || 
                (booking.guestCount <= 2 ? 2 : booking.guestCount <= 4 ? 4 : 6);
            const key = `${capacity}-person`;
            tableCapacityStats[key] = (tableCapacityStats[key] || 0) + 1;
        });

        // Recent bookings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentBookings = bookings.filter(booking => 
            new Date(booking.createdAt) > thirtyDaysAgo
        );

        // Pricing analysis
        const pricingStats = {
            minPrice: Math.min(...bookings.map(b => b.pricing?.finalPrice || 100)),
            maxPrice: Math.max(...bookings.map(b => b.pricing?.finalPrice || 100)),
            avgPrice: avgBookingValue,
            priceDistribution: {}
        };

        bookings.forEach(booking => {
            const price = booking.pricing?.finalPrice || 100;
            const range = getPriceRange(price);
            pricingStats.priceDistribution[range] = (pricingStats.priceDistribution[range] || 0) + 1;
        });

        // Advanced analytics using dataAnalyzer
        let advancedAnalytics = null;
        try {
            advancedAnalytics = await dataAnalyzer.getEnhancedHistoricalData(id, new Date(), '19:00');
        } catch (error) {
            // Advanced analytics failed, continue without it
        }

        // Peak demand prediction
        const peakTimes = Object.entries(timeSlots)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([time, count]) => ({ time, count, percentage: Math.round(count / totalBookings * 100) }));

        const popularDays = Object.entries(dayOfWeek)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([day, count]) => ({ day, count, percentage: Math.round(count / totalBookings * 100) }));

        // Seasonal trends
        const seasonalTrends = Object.entries(monthlyBookings)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([month, count]) => ({ month, count }));

        // Algorithm performance test
        let algorithmTest = null;
        try {
            algorithmTest = await dynamicPricing.calculatePrice({
                restaurantId: id,
                tableId: 'test-table-1',
                date: new Date(),
                time: '19:30',
                guestCount: 2,
                tableCapacity: 2
            });
        } catch (error) {
            // Algorithm test failed, continue without it
        }

        // Compile final analytics
        const analytics = {
            restaurant: {
                id: restaurant._id,
                name: restaurant.restaurantName,
                cuisine: restaurant.cuisineType,
                location: restaurant.location,
                rating: restaurant.rating,
                description: restaurant.description
            },
            overview: {
                totalBookings,
                totalRevenue,
                avgBookingValue,
                totalGuests,
                avgGuestsPerBooking,
                recentBookings: recentBookings.length,
                dataQuality: totalBookings > 0 ? (totalBookings >= 50 ? 'Excellent' : totalBookings >= 20 ? 'Good' : 'Fair') : 'Insufficient'
            },
            patterns: {
                timeSlots,
                dayOfWeek,
                monthlyBookings: seasonalTrends,
                peakTimes,
                popularDays
            },
            tableAnalysis: tableCapacityStats,
            pricing: pricingStats,
            advanced: advancedAnalytics,
            algorithmTest,
            lastUpdated: new Date().toISOString()
        };

        return NextResponse.json({
            success: true,
            analytics
        });

    } catch (error) {
        console.error('Error fetching restaurant analytics:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message 
            }, 
            { status: 500 }
        );
    }
}

// Helper functions
function getTimeSlot(hour) {
    if (hour >= 6 && hour < 11) return 'Breakfast (6-11 AM)';
    if (hour >= 11 && hour < 15) return 'Lunch (11 AM-3 PM)';
    if (hour >= 15 && hour < 18) return 'Afternoon (3-6 PM)';
    if (hour >= 18 && hour < 22) return 'Dinner (6-10 PM)';
    return 'Late Night (10 PM-6 AM)';
}

function getPriceRange(price) {
    if (price < 80) return '< 80 THB';
    if (price < 100) return '80-99 THB';
    if (price < 120) return '100-119 THB';
    if (price < 150) return '120-149 THB';
    if (price < 200) return '150-199 THB';
    return '200+ THB';
}
