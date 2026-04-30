import Booking from '../models/Booking.js';
import Restaurant from '../models/Restaurants.js';
import { holidayPricing } from './holidayPricing.js';
import { dataAnalyzer } from './dataAnalyzer.js';

/**
 * Dynamic Pricing Algorithm Implementation
 * Formula: Final Price = Base × Demand × Time × History × Capacity × Holiday
 */

class DynamicPricingEngine {
    constructor() {
        this.basePrice = 100;
        this.minPrice = 70;
        this.maxPrice = 200;
        this.cache = new Map();
        this.cacheExpiry = 15 * 60 * 1000;
    }

    /**
     * Main pricing calculation function
     * @param {Object} bookingRequest - Booking details
     * @returns {Object} Pricing calculation result
     */
    async calculatePrice(bookingRequest) {
        try {
            
            const {
                restaurantId,
                tableId,
                date,
                time,
                guestCount,
                tableCapacity = 4
            } = bookingRequest;

            // Validate inputs
            if (!restaurantId || !tableId || !date || !time || !guestCount) {
                console.error('DynamicPricing: Missing required parameters:', { restaurantId, tableId, date, time, guestCount });
                throw new Error('Missing required booking parameters');
            }

            const bookingDate = new Date(date);
            const cacheKey = this.generateCacheKey(bookingRequest);

            // Check cache first
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // Gather all context data
            const context = await this.gatherPricingContext({
                restaurantId,
                tableId,
                bookingDate,
                time,
                guestCount,
                tableCapacity
            });

            // Calculate individual factors
            const demandFactor = await this.calculateDemandFactor(context);
            const temporalFactor = this.calculateTemporalFactor(context);
            const historicalFactor = await this.calculateHistoricalFactor(context);
            const capacityFactor = this.calculateCapacityFactor(context);
            const holidayFactor = await this.calculateHolidayFactor(context);

            // Combine all factors
            const rawPrice = this.basePrice * 
                demandFactor.value * 
                temporalFactor.value * 
                historicalFactor.value * 
                capacityFactor.value * 
                holidayFactor.value;

            // Apply constraints
            const finalPrice = Math.round(Math.max(this.minPrice, Math.min(this.maxPrice, rawPrice)));

            const result = {
                success: true,
                basePrice: this.basePrice,
                finalPrice,
                currency: 'THB',
                breakdown: {
                    demandFactor: {
                        value: demandFactor.value,
                        reason: demandFactor.reason,
                        occupancyRate: demandFactor.occupancyRate
                    },
                    temporalFactor: {
                        value: temporalFactor.value,
                        reason: temporalFactor.reason,
                        timeSlot: temporalFactor.timeSlot
                    },
                    historicalFactor: {
                        value: historicalFactor.value,
                        reason: historicalFactor.reason,
                        dataPoints: historicalFactor.dataPoints
                    },
                    capacityFactor: {
                        value: capacityFactor.value,
                        reason: capacityFactor.reason,
                        efficiency: capacityFactor.efficiency
                    },
                    holidayFactor: {
                        value: holidayFactor.value,
                        reason: holidayFactor.reason,
                        holiday: holidayFactor.holiday
                    }
                },
                context: {
                    restaurantCapacity: context.restaurantCapacity,
                    currentBookings: context.currentBookings,
                    tableInfo: {
                        id: tableId,
                        capacity: tableCapacity,
                        efficiency: Math.round((guestCount / tableCapacity) * 100)
                    },
                    demandLevel: this.getDemandLevel(context.occupancyRate),
                    recommendations: this.generateRecommendations(context, finalPrice)
                },
                confidence: this.calculateConfidence(context),
                calculatedAt: new Date().toISOString()
            };

            // Cache result
            this.setCache(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Dynamic pricing calculation error:', error);
            
            return {
                success: false,
                error: error.message,
                fallbackPrice: this.basePrice,
                finalPrice: this.basePrice,
                currency: 'THB',
                breakdown: {
                    demandFactor: { value: 1.0, reason: 'Error - using fallback' },
                    temporalFactor: { value: 1.0, reason: 'Error - using fallback' },
                    historicalFactor: { value: 1.0, reason: 'Error - using fallback' },
                    capacityFactor: { value: 1.0, reason: 'Error - using fallback' },
                    holidayFactor: { value: 1.0, reason: 'Error - using fallback' }
                },
                context: {
                    error: true,
                    message: 'Pricing calculation failed - using base price'
                },
                confidence: 0.1
            };
        }
    }

    /**
     * Gather all context data needed for pricing
     */
    async gatherPricingContext(params) {
        const {
            restaurantId,
            tableId,
            bookingDate,
            time,
            guestCount,
            tableCapacity
        } = params;

        // Get restaurant info
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }

        // Get current bookings for the date
        const dayStart = new Date(bookingDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(bookingDate);
        dayEnd.setHours(23, 59, 59, 999);

        const currentBookings = await Booking.find({
            restaurantId,
            status: { $in: ['confirmed', 'pending'] },
            $or: [
                { date: { $gte: dayStart, $lte: dayEnd } },
                { bookingDate: { $gte: dayStart, $lte: dayEnd } }
            ]
        });

        // Calculate total restaurant capacity using enhanced data analysis
        let restaurantCapacity;
        try {
            restaurantCapacity = await dataAnalyzer.calculateRealRestaurantCapacity(restaurantId);
        } catch (capacityError) {
            console.error('DynamicPricing: Error calculating capacity, using fallback:', capacityError);
            restaurantCapacity = 60; // Fallback capacity
        }

        // Get current occupancy for time slot
        const timeSlotBookings = this.getTimeSlotBookings(currentBookings, time);
        const currentOccupancy = timeSlotBookings.reduce((sum, booking) => sum + booking.guestCount, 0);
        const safeCapacity = Math.max(restaurantCapacity || 0, 1);
        const occupancyRate = Math.min(1, currentOccupancy / safeCapacity);

        // Get enhanced historical data
        let historicalData;
        try {
            historicalData = await dataAnalyzer.getEnhancedHistoricalData(restaurantId, bookingDate, time);
        } catch (historyError) {
            console.error('DynamicPricing: Error getting historical data, using fallback:', historyError);
            historicalData = {
                totalBookings: 0,
                sameTimeBookings: 0,
                sameDayBookings: 0,
                avgOccupancyRate: 0.5,
                timeSlotPopularity: 'medium',
                dayOfWeekPopularity: 'medium',
                recentTrend: 'stable'
            };
        }

        return {
            restaurant,
            restaurantId,
            restaurantCapacity,
            currentBookings: timeSlotBookings,
            currentOccupancy,
            occupancyRate,
            bookingDate,
            time,
            timeSlot: this.getTimeSlot(time),
            dayOfWeek: bookingDate.getDay(),
            isWeekend: bookingDate.getDay() === 0 || bookingDate.getDay() === 6,
            guestCount,
            tableCapacity,
            historicalData,
            bookingLeadTime: this.calculateLeadTime(bookingDate, time)
        };
    }

    /**
     * Calculate demand factor based on current occupancy
     */
    async calculateDemandFactor(context) {
        const { occupancyRate, currentOccupancy, restaurantCapacity } = context;

        let factor = 1.0;
        let reason = 'Normal demand';

        if (occupancyRate >= 0.8) {
            factor = 1.5;
            reason = 'Very high demand (80%+ capacity)';
        } else if (occupancyRate >= 0.6) {
            factor = 1.25;
            reason = 'High demand (60-80% capacity)';
        } else if (occupancyRate >= 0.4) {
            factor = 1.1;
            reason = 'Medium demand (40-60% capacity)';
        } else if (occupancyRate >= 0.2) {
            factor = 1.0;
            reason = 'Normal demand (20-40% capacity)';
        } else {
            factor = 0.8;
            reason = 'Low demand (under 20% capacity)';
        }

        return {
            value: factor,
            reason,
            occupancyRate: Math.round(occupancyRate * 100) / 100,
            currentOccupancy,
            restaurantCapacity
        };
    }

    /**
     * Calculate temporal factor based on time and day
     */
    calculateTemporalFactor(context) {
        const { time, dayOfWeek, isWeekend, bookingLeadTime } = context;
        const hour = parseInt(time.split(':')[0]);
        
        let factor = 1.0;
        let timeSlot = 'off-peak';
        let reasons = [];

        // Peak time multipliers
        if (isWeekend) {
            if (hour >= 18 && hour <= 21) {
                factor = 1.4;
                timeSlot = 'weekend-dinner';
                reasons.push('Weekend dinner peak');
            } else if (hour >= 11 && hour <= 15) {
                factor = 1.2;
                timeSlot = 'weekend-lunch';
                reasons.push('Weekend lunch');
            }
        } else {
            if (hour >= 18 && hour <= 21) {
                factor = 1.2;
                timeSlot = 'weekday-dinner';
                reasons.push('Weekday dinner');
            } else if (hour >= 11 && hour <= 14) {
                factor = 1.1;
                timeSlot = 'weekday-lunch';
                reasons.push('Weekday lunch');
            }
        }

        // Last-minute booking premium
        if (bookingLeadTime < 4) {
            const urgencyMultiplier = 1 + (4 - bookingLeadTime) * 0.05;
            factor *= Math.min(urgencyMultiplier, 1.2);
            reasons.push(`Last-minute booking (${bookingLeadTime}h ahead)`);
        }

        return {
            value: Math.round(factor * 100) / 100,
            reason: reasons.join(', ') || 'Regular timing',
            timeSlot,
            isWeekend,
            hour,
            bookingLeadTime
        };
    }

    /**
     * Calculate historical factor based on enhanced past patterns
     */
    async calculateHistoricalFactor(context) {
        const { historicalData, timeSlot, dayOfWeek } = context;

        if (!historicalData || historicalData.totalBookings < 1) {
            return {
                value: 1.0,
                reason: 'No historical data available',
                dataPoints: 0
            };
        }


        let factor = 1.0;
        let reason = 'Normal historical pattern';

        // Base factor on time slot popularity
        if (historicalData.timeSlotPopularity === 'high') {
            factor = 1.2;
            reason = 'Historically very popular time slot';
        } else if (historicalData.timeSlotPopularity === 'medium') {
            factor = 1.1;
            reason = 'Historically moderately popular time slot';
        } else if (historicalData.timeSlotPopularity === 'low') {
            factor = 0.9;
            reason = 'Historically quiet time slot';
        }

        // Adjust based on recent trend
        if (historicalData.recentTrend === 'increasing') {
            factor *= 1.05;
            reason += ' (trending up)';
        } else if (historicalData.recentTrend === 'decreasing') {
            factor *= 0.95;
            reason += ' (trending down)';
        }

        // Adjust based on day popularity
        if (historicalData.dayOfWeekPopularity === 'high') {
            factor *= 1.05;
            reason += ' (popular day)';
        } else if (historicalData.dayOfWeekPopularity === 'low') {
            factor *= 0.95;
            reason += ' (quiet day)';
        }

        return {
            value: Math.round(factor * 100) / 100,
            reason,
            dataPoints: historicalData.totalBookings,
            timeSlotBookings: historicalData.sameTimeBookings,
            dayBookings: historicalData.sameDayBookings,
            avgOccupancy: Math.round(historicalData.avgOccupancyRate * 100) / 100
        };
    }

    /**
     * Calculate capacity factor based on table efficiency
     */
    calculateCapacityFactor(context) {
        const { guestCount, tableCapacity } = context;
        
        const efficiency = guestCount / tableCapacity;
        let factor = 1.0;
        let reasons = [];

        // Table size premiums
        if (tableCapacity <= 2) {
            factor = 1.3;
            reasons.push('Couple table premium');
        } else if (tableCapacity >= 8) {
            factor = 0.9;
            reasons.push('Large table discount');
        }

        // Efficiency adjustments
        if (efficiency < 0.7) {
            factor *= 1.15;
            reasons.push('Table under-utilization premium');
        }

        factor = Math.max(0.8, Math.min(1.4, factor));

        return {
            value: Math.round(factor * 100) / 100,
            reason: reasons.join(', ') || 'Standard table pricing',
            efficiency: Math.round(efficiency * 100) / 100,
            tableCapacity,
            guestCount
        };
    }

    /**
     * Calculate holiday factor using holiday system
     */
    async calculateHolidayFactor(context) {
        const { bookingDate, guestCount, tableCapacity } = context;

        try {
            const holidayResult = await holidayPricing.calculateHolidayFactor(bookingDate, {
                guestCount,
                tableCapacity
            });

            return {
                value: holidayResult.factor,
                reason: holidayResult.reason,
                holiday: holidayResult.holiday ? {
                    name: holidayResult.holiday.name,
                    type: holidayResult.holiday.type,
                    impact: holidayResult.holiday.impact
                } : null
            };
        } catch (error) {
            console.error('Holiday factor calculation error:', error);
            return {
                value: 1.0,
                reason: 'Holiday calculation unavailable',
                holiday: null
            };
        }
    }

    /**
     * Helper functions
     */
    
    async estimateRestaurantCapacity(restaurantId, currentBookings) {
        const recentBookings = await Booking.find({
            restaurantId,
            status: { $in: ['confirmed', 'completed'] }
        }).sort({ date: -1 }).limit(50);

        if (recentBookings.length > 0) {
            const maxConcurrent = Math.max(...recentBookings.map(b => b.guestCount));
            return Math.max(maxConcurrent * 8, 40);
        }

        return 60;
    }

    getTimeSlotBookings(bookings, targetTime) {
        const targetHour = parseInt(String(targetTime).split(':')[0], 10);
        return bookings.filter(booking => {
            const bookingTime = booking.startTime || booking.bookingTime;
            if (!bookingTime) return false;

            const bookingHour = parseInt(String(bookingTime).split(':')[0], 10);
            if (Number.isNaN(bookingHour) || Number.isNaN(targetHour)) return false;

            return Math.abs(bookingHour - targetHour) <= 1;
        });
    }

    async getHistoricalBookings(restaurantId, date, time) {
        const fourWeeksAgo = new Date(date);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const historicalBookings = await Booking.find({
            restaurantId,
            $and: [
                {
                    $or: [
                        { date: { $gte: fourWeeksAgo, $lt: date } },
                        { bookingDate: { $gte: fourWeeksAgo, $lt: date } }
                    ]
                },
                {
                    $or: [
                        { startTime: { $regex: new RegExp(`^${time.split(':')[0]}:`) } },
                        { bookingTime: { $regex: new RegExp(`^${time.split(':')[0]}:`) } }
                    ]
                }
            ]
        }).limit(20);

        return historicalBookings;
    }

    getTimeSlot(time) {
        const hour = parseInt(time.split(':')[0]);
        if (hour >= 6 && hour < 11) return 'breakfast';
        if (hour >= 11 && hour < 15) return 'lunch';
        if (hour >= 15 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'dinner';
        return 'late';
    }

    calculateLeadTime(bookingDate, time = '00:00') {
        const [hoursRaw, minutesRaw] = String(time).split(':');
        const hours = Number.parseInt(hoursRaw, 10);
        const minutes = Number.parseInt(minutesRaw, 10);

        const bookingDateTime = new Date(bookingDate);
        if (!Number.isNaN(hours)) {
            bookingDateTime.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
        }

        const now = new Date();
        const diffMs = bookingDateTime.getTime() - now.getTime();
        return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    }

    getDemandLevel(occupancyRate) {
        if (occupancyRate >= 0.8) return 'very_high';
        if (occupancyRate >= 0.6) return 'high';
        if (occupancyRate >= 0.4) return 'medium';
        if (occupancyRate >= 0.2) return 'low';
        return 'very_low';
    }

    generateRecommendations(context, finalPrice) {
        const recommendations = [];
        const { occupancyRate, isWeekend, timeSlot } = context;

        if (occupancyRate < 0.3) {
            recommendations.push('Consider promotional pricing for this time slot');
        }

        if (finalPrice > 150) {
            recommendations.push('Premium pricing - ensure exceptional service');
        }

        if (isWeekend && timeSlot === 'dinner') {
            recommendations.push('Peak weekend time - extend staff hours');
        }

        return recommendations;
    }

    calculateConfidence(context) {
        let confidence = 0.8;

        if (context.historicalData && context.historicalData.totalBookings >= 5) confidence += 0.1;
        if (context.currentBookings.length >= 3) confidence += 0.05;
        if (context.occupancyRate > 0.1 && context.occupancyRate < 0.9) confidence += 0.05;

        return Math.min(0.95, confidence);
    }

    generateCacheKey(request) {
        const { restaurantId, tableId, date, time, guestCount } = request;
        return `${restaurantId}_${tableId}_${date}_${time}_${guestCount}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

// Create singleton instance
export const dynamicPricing = new DynamicPricingEngine();

export async function calculateBookingPrice(bookingRequest) {
    return await dynamicPricing.calculatePrice(bookingRequest);
}

export async function getQuickPrice(restaurantId, date, time, guestCount) {
    return await dynamicPricing.calculatePrice({
        restaurantId,
        tableId: 'estimate',
        date,
        time,
        guestCount,
        tableCapacity: guestCount <= 2 ? 2 : guestCount <= 4 ? 4 : 6
    });
}

export default dynamicPricing;
