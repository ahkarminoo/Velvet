import Booking from '../models/Booking.js';
import Restaurant from '../models/Restaurants.js';

/**
 * Data Analyzer for Dynamic Pricing
 * Analyzes existing booking data to help the algorithm make better decisions
 */

class BookingDataAnalyzer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Analyze all booking data for insights
     */
    async analyzeAllBookingData() {
        try {
            console.log('🔍 Analyzing all booking data...');

            // Get all restaurants
            const restaurants = await Restaurant.find({});
            console.log(`Found ${restaurants.length} restaurants`);

            // Get all bookings
            const allBookings = await Booking.find({}).populate('restaurantId');
            console.log(`Found ${allBookings.length} total bookings`);

            const analysis = {
                totalRestaurants: restaurants.length,
                totalBookings: allBookings.length,
                restaurants: [],
                dateRange: this.getDateRange(allBookings),
                timeSlotPatterns: this.analyzeTimePatterns(allBookings),
                capacityPatterns: this.analyzeCapacityPatterns(allBookings),
                demandPatterns: this.analyzeDemandPatterns(allBookings)
            };

            // Analyze each restaurant
            for (const restaurant of restaurants) {
                const restaurantBookings = allBookings.filter(b => 
                    b.restaurantId && b.restaurantId._id.toString() === restaurant._id.toString()
                );

                const restaurantAnalysis = {
                    id: restaurant._id.toString(),
                    name: restaurant.restaurantName,
                    bookingCount: restaurantBookings.length,
                    avgGuestCount: restaurantBookings.length > 0 ? 
                        Math.round(restaurantBookings.reduce((sum, b) => sum + b.guestCount, 0) / restaurantBookings.length) : 0,
                    dateRange: this.getDateRange(restaurantBookings),
                    popularTimes: this.getPopularTimes(restaurantBookings),
                    capacityUtilization: this.calculateCapacityUtilization(restaurantBookings),
                    recentActivity: this.getRecentActivity(restaurantBookings)
                };

                analysis.restaurants.push(restaurantAnalysis);
            }

            return analysis;

        } catch (error) {
            console.error('Error analyzing booking data:', error);
            return {
                error: error.message,
                totalRestaurants: 0,
                totalBookings: 0,
                restaurants: []
            };
        }
    }

    /**
     * Get enhanced historical data for specific restaurant and time
     */
    async getEnhancedHistoricalData(restaurantId, targetDate, time) {
        try {
            const cacheKey = `hist_${restaurantId}_${targetDate}_${time}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
                return cached.data;
            }

            console.log(`📊 Getting historical data for restaurant ${restaurantId}, time ${time}`);

            // Get all bookings for this restaurant (not just last 4 weeks)
            const allBookings = await Booking.find({
                restaurantId,
                status: { $in: ['confirmed', 'completed', 'pending'] }
            }).sort({ date: -1 });

            console.log(`Found ${allBookings.length} historical bookings for restaurant ${restaurantId}`);

            // Get same hour bookings
            const targetHour = parseInt(time.split(':')[0]);
            const sameTimeBookings = allBookings.filter(booking => {
                const bookingHour = parseInt(booking.startTime.split(':')[0]);
                return Math.abs(bookingHour - targetHour) <= 1;
            });

            // Get same day of week bookings  
            const targetDayOfWeek = new Date(targetDate).getDay();
            const sameDayBookings = allBookings.filter(booking => {
                return new Date(booking.date).getDay() === targetDayOfWeek;
            });

            // Calculate patterns
            const historicalData = {
                totalBookings: allBookings.length,
                sameTimeBookings: sameTimeBookings.length,
                sameDayBookings: sameDayBookings.length,
                avgOccupancyRate: this.calculateAverageOccupancy(allBookings),
                timeSlotPopularity: this.calculateTimeSlotPopularity(sameTimeBookings),
                dayOfWeekPopularity: this.calculateDayPopularity(sameDayBookings),
                recentTrend: this.calculateRecentTrend(allBookings),
                peakHours: this.identifyPeakHours(allBookings),
                seasonalPattern: this.identifySeasonalPattern(allBookings)
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: historicalData,
                timestamp: Date.now()
            });

            return historicalData;

        } catch (error) {
            console.error('Error getting enhanced historical data:', error);
            return {
                totalBookings: 0,
                sameTimeBookings: 0,
                sameDayBookings: 0,
                avgOccupancyRate: 0.5,
                timeSlotPopularity: 'medium',
                dayOfWeekPopularity: 'medium',
                recentTrend: 'stable'
            };
        }
    }

    /**
     * Calculate real-time restaurant capacity based on actual bookings
     */
    async calculateRealRestaurantCapacity(restaurantId) {
        try {
            // Get recent bookings to estimate capacity
            const recentBookings = await Booking.find({
                restaurantId,
                date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
                status: { $in: ['confirmed', 'completed'] }
            });

            if (recentBookings.length === 0) {
                console.log(`No recent bookings found for restaurant ${restaurantId}, using default capacity`);
                return 60; // Default capacity
            }

            // Group by date to find maximum concurrent bookings
            const dailyBookings = {};
            recentBookings.forEach(booking => {
                const dateKey = booking.date.toISOString().split('T')[0];
                if (!dailyBookings[dateKey]) {
                    dailyBookings[dateKey] = [];
                }
                dailyBookings[dateKey].push(booking);
            });

            // Find maximum guests on any single day
            let maxDailyGuests = 0;
            Object.values(dailyBookings).forEach(dayBookings => {
                const dailyGuests = dayBookings.reduce((sum, booking) => sum + booking.guestCount, 0);
                maxDailyGuests = Math.max(maxDailyGuests, dailyGuests);
            });

            // Estimate total capacity (assume 80% utilization on peak days)
            const estimatedCapacity = Math.round(maxDailyGuests / 0.8);
            const finalCapacity = Math.max(estimatedCapacity, 40); // Minimum 40 capacity

            console.log(`📊 Estimated capacity for restaurant ${restaurantId}: ${finalCapacity} (based on max daily guests: ${maxDailyGuests})`);

            return finalCapacity;

        } catch (error) {
            console.error('Error calculating restaurant capacity:', error);
            return 60; // Default fallback
        }
    }

    /**
     * Helper functions
     */
    getDateRange(bookings) {
        if (bookings.length === 0) return null;
        
        const dates = bookings.map(b => new Date(b.date)).sort();
        return {
            earliest: dates[0].toISOString().split('T')[0],
            latest: dates[dates.length - 1].toISOString().split('T')[0],
            span: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
        };
    }

    analyzeTimePatterns(bookings) {
        const timeSlots = { breakfast: 0, lunch: 0, afternoon: 0, dinner: 0, late: 0 };
        
        bookings.forEach(booking => {
            const hour = parseInt(booking.startTime.split(':')[0]);
            if (hour >= 6 && hour < 11) timeSlots.breakfast++;
            else if (hour >= 11 && hour < 15) timeSlots.lunch++;
            else if (hour >= 15 && hour < 18) timeSlots.afternoon++;
            else if (hour >= 18 && hour < 22) timeSlots.dinner++;
            else timeSlots.late++;
        });

        const total = bookings.length;
        return Object.keys(timeSlots).reduce((acc, slot) => {
            acc[slot] = {
                count: timeSlots[slot],
                percentage: total > 0 ? Math.round((timeSlots[slot] / total) * 100) : 0
            };
            return acc;
        }, {});
    }

    analyzeCapacityPatterns(bookings) {
        const guestCounts = bookings.map(b => b.guestCount);
        if (guestCounts.length === 0) return {};

        return {
            average: Math.round(guestCounts.reduce((a, b) => a + b, 0) / guestCounts.length),
            min: Math.min(...guestCounts),
            max: Math.max(...guestCounts),
            most_common: this.getMostCommon(guestCounts)
        };
    }

    analyzeDemandPatterns(bookings) {
        const dayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
        
        bookings.forEach(booking => {
            const day = new Date(booking.date).getDay();
            dayOfWeek[day]++;
        });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.map((day, index) => ({
            day,
            bookings: dayOfWeek[index],
            percentage: bookings.length > 0 ? Math.round((dayOfWeek[index] / bookings.length) * 100) : 0
        }));
    }

    getPopularTimes(bookings) {
        const hours = {};
        bookings.forEach(booking => {
            const hour = parseInt(booking.startTime.split(':')[0]);
            hours[hour] = (hours[hour] || 0) + 1;
        });

        const sortedHours = Object.entries(hours)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

        return sortedHours;
    }

    calculateCapacityUtilization(bookings) {
        if (bookings.length === 0) return 0;
        const avgGuests = bookings.reduce((sum, b) => sum + b.guestCount, 0) / bookings.length;
        return Math.round((avgGuests / 6) * 100); // Assume 6-person average table capacity
    }

    getRecentActivity(bookings) {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentBookings = bookings.filter(b => new Date(b.date) >= oneWeekAgo);
        
        return {
            lastWeek: recentBookings.length,
            trend: recentBookings.length > (bookings.length / 4) ? 'increasing' : 'stable'
        };
    }

    calculateAverageOccupancy(bookings) {
        if (bookings.length === 0) return 0.5;
        
        // Estimate occupancy based on booking frequency
        const avgBookingsPerDay = bookings.length / Math.max(1, this.getDateRange(bookings)?.span || 1);
        return Math.min(0.9, Math.max(0.1, avgBookingsPerDay / 10)); // Normalize to 0.1-0.9
    }

    calculateTimeSlotPopularity(timeBookings) {
        if (timeBookings.length === 0) return 'low';
        if (timeBookings.length >= 5) return 'high';
        if (timeBookings.length >= 2) return 'medium';
        return 'low';
    }

    calculateDayPopularity(dayBookings) {
        if (dayBookings.length === 0) return 'low';
        if (dayBookings.length >= 10) return 'high';
        if (dayBookings.length >= 4) return 'medium';
        return 'low';
    }

    calculateRecentTrend(bookings) {
        if (bookings.length < 4) return 'stable';
        
        const recent = bookings.slice(0, Math.floor(bookings.length / 2));
        const older = bookings.slice(Math.floor(bookings.length / 2));
        
        if (recent.length > older.length * 1.2) return 'increasing';
        if (recent.length < older.length * 0.8) return 'decreasing';
        return 'stable';
    }

    identifyPeakHours(bookings) {
        const hourCounts = {};
        bookings.forEach(booking => {
            const hour = parseInt(booking.startTime.split(':')[0]);
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const sortedHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));

        return sortedHours;
    }

    identifySeasonalPattern(bookings) {
        const monthCounts = {};
        bookings.forEach(booking => {
            const month = new Date(booking.date).getMonth();
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        });

        const peakMonth = Object.entries(monthCounts)
            .sort(([,a], [,b]) => b - a)[0];

        return peakMonth ? {
            peak_month: parseInt(peakMonth[0]) + 1,
            peak_bookings: peakMonth[1]
        } : null;
    }

    getMostCommon(arr) {
        const counts = {};
        arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
        return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || arr[0];
    }
}

// Create singleton instance
export const dataAnalyzer = new BookingDataAnalyzer();

export default dataAnalyzer;
