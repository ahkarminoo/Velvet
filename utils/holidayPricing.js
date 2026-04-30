import ThaiHoliday from '../models/ThaiHoliday.js';

/**
 * Holiday Pricing Utility Functions
 * Handles all holiday-related pricing calculations without web requests
 */

class HolidayPricingManager {
    constructor() {
        this.holidayCache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.lastCacheUpdate = null;
    }

    /**
     * Get holiday information for a specific date
     * @param {Date} date - The target date
     * @returns {Object|null} Holiday information or null
     */
    async getHolidayForDate(date) {
        try {
            const dateKey = this.formatDateKey(date);
            
            // Check cache first
            if (this.holidayCache.has(dateKey)) {
                return this.holidayCache.get(dateKey);
            }

            // Query database
            const holiday = await ThaiHoliday.getHolidayByDate(date);
            
            // Cache result (even if null)
            this.holidayCache.set(dateKey, holiday);
            
            return holiday;
        } catch (error) {
            console.error('Error getting holiday for date:', error);
            return null;
        }
    }

    /**
     * Calculate holiday pricing factor
     * @param {Date} date - The booking date
     * @param {Object} bookingContext - Additional context (table type, etc.)
     * @returns {Object} Holiday pricing information
     */
    async calculateHolidayFactor(date, bookingContext = {}) {
        const holiday = await this.getHolidayForDate(date);
        
        if (!holiday) {
            // Check if near a holiday (within 2 days)
            const nearbyHoliday = await this.getNearbyHoliday(date);
            if (nearbyHoliday) {
                return this.calculateNearHolidayFactor(date, nearbyHoliday);
            }
            
            return {
                factor: 1.0,
                holiday: null,
                reason: 'No holiday'
            };
        }

        // Calculate factor based on table type and holiday strategy
        const tableFactor = this.getTableSpecificFactor(holiday, bookingContext);
        
        return {
            factor: tableFactor,
            holiday: holiday,
            reason: `${holiday.name} (${holiday.type})`,
            recommendations: holiday.recommendedActions,
            businessImpact: holiday.businessImpact
        };
    }

    /**
     * Get table-specific pricing factor based on holiday strategy
     * @param {Object} holiday - Holiday information
     * @param {Object} context - Booking context (guest count, table capacity)
     * @returns {Number} Pricing factor
     */
    getTableSpecificFactor(holiday, context) {
        const { guestCount = 2, tableCapacity = 4 } = context;
        const strategy = holiday.pricingStrategy;
        
        // Determine table type based on guest count and capacity
        let tableType = 'family'; // default
        
        if (guestCount <= 2 && tableCapacity <= 2) {
            tableType = 'couple';
        } else if (guestCount >= 6 || tableCapacity >= 8) {
            tableType = 'group';
        }

        // Get multiplier based on table type
        const multipliers = {
            couple: strategy.coupleTableMultiplier,
            family: strategy.familyTableMultiplier,
            group: strategy.groupTableMultiplier
        };

        const baseFactor = multipliers[tableType] || holiday.impact;
        
        // Apply safety constraints
        return Math.min(Math.max(baseFactor, 1.0), 2.0);
    }

    /**
     * Check for holidays within 3 days of target date
     * @param {Date} date - Target date
     * @returns {Object|null} Nearby holiday information
     */
    async getNearbyHoliday(date) {
        try {
            const holidays = await ThaiHoliday.isNearHoliday(date);
            
            if (!holidays || holidays.length === 0) {
                return null;
            }

            // Find the closest holiday
            const targetTime = date.getTime();
            let closestHoliday = holidays[0];
            let minDistance = Math.abs(holidays[0].date.getTime() - targetTime);

            holidays.forEach(holiday => {
                const distance = Math.abs(holiday.date.getTime() - targetTime);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestHoliday = holiday;
                }
            });

            return {
                holiday: closestHoliday,
                daysDifference: Math.round(minDistance / (1000 * 60 * 60 * 24))
            };
        } catch (error) {
            console.error('Error checking nearby holidays:', error);
            return null;
        }
    }

    /**
     * Calculate pricing factor for dates near holidays
     * @param {Date} date - Target date
     * @param {Object} nearbyInfo - Nearby holiday information
     * @returns {Object} Pricing factor information
     */
    calculateNearHolidayFactor(date, nearbyInfo) {
        const { holiday, daysDifference } = nearbyInfo;
        const holidayDate = holiday.date;
        const targetDate = date;

        // Determine if before or after holiday
        const isBeforeHoliday = targetDate < holidayDate;
        
        let factor = 1.0;
        let reason = '';

        if (daysDifference <= 1) {
            if (isBeforeHoliday) {
                // Day before major holidays get premium
                factor = Math.min(holiday.impact * 0.8, 1.5);
                reason = `Day before ${holiday.name}`;
            } else {
                // Day after holidays often quieter
                factor = 0.95;
                reason = `Day after ${holiday.name}`;
            }
        } else if (daysDifference <= 2) {
            if (isBeforeHoliday && holiday.businessImpact === 'very_high') {
                factor = 1.1;
                reason = `2 days before ${holiday.name}`;
            }
        }

        return {
            factor,
            holiday: holiday,
            reason,
            isNearHoliday: true,
            daysDifference
        };
    }

    /**
     * Get upcoming holidays for dashboard
     * @param {Number} daysAhead - How many days to look ahead (default 30)
     * @returns {Array} Upcoming holidays
     */
    async getUpcomingHolidays(daysAhead = 30) {
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + daysAhead);

            const holidays = await ThaiHoliday.getHolidaysInRange(today, futureDate);
            
            return holidays.map(holiday => ({
                ...holiday.toObject(),
                daysAway: Math.ceil((holiday.date - today) / (1000 * 60 * 60 * 24))
            }));
        } catch (error) {
            console.error('Error getting upcoming holidays:', error);
            return [];
        }
    }

    /**
     * Get holiday statistics for analytics
     * @param {Date} startDate - Start of period
     * @param {Date} endDate - End of period  
     * @returns {Object} Holiday statistics
     */
    async getHolidayStats(startDate, endDate) {
        try {
            const holidays = await ThaiHoliday.getHolidaysInRange(startDate, endDate);
            
            const stats = {
                totalHolidays: holidays.length,
                majorFestivals: holidays.filter(h => h.type === 'major_festival').length,
                celebrations: holidays.filter(h => h.type === 'celebration').length,
                religiousHolidays: holidays.filter(h => h.type === 'religious').length,
                royalHolidays: holidays.filter(h => h.type === 'royal').length,
                internationalHolidays: holidays.filter(h => h.type === 'international').length,
                averageImpact: holidays.reduce((sum, h) => sum + h.impact, 0) / holidays.length,
                highImpactDays: holidays.filter(h => h.impact >= 1.5).length,
                peakRevenueDays: holidays.filter(h => h.businessImpact === 'very_high').length
            };

            return stats;
        } catch (error) {
            console.error('Error calculating holiday stats:', error);
            return null;
        }
    }

    /**
     * Format date as cache key
     * @param {Date} date - Date to format
     * @returns {String} Formatted date key
     */
    formatDateKey(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    /**
     * Clear holiday cache (useful for testing or manual refresh)
     */
    clearCache() {
        this.holidayCache.clear();
        this.lastCacheUpdate = null;
        console.log('Holiday cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache information
     */
    getCacheStats() {
        return {
            cacheSize: this.holidayCache.size,
            lastUpdate: this.lastCacheUpdate,
            cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }
}

// Utility functions for direct use
export const holidayPricing = new HolidayPricingManager();

/**
 * Quick function to check if date is a holiday
 * @param {Date} date - Date to check
 * @returns {Boolean} True if holiday
 */
export async function isHoliday(date) {
    const holiday = await holidayPricing.getHolidayForDate(date);
    return holiday !== null;
}

/**
 * Quick function to get holiday impact factor
 * @param {Date} date - Date to check
 * @param {Object} context - Booking context
 * @returns {Number} Impact factor (1.0 = no impact)
 */
export async function getHolidayImpact(date, context = {}) {
    const result = await holidayPricing.calculateHolidayFactor(date, context);
    return result.factor;
}

/**
 * Get holiday name for date (if any)
 * @param {Date} date - Date to check
 * @returns {String|null} Holiday name or null
 */
export async function getHolidayName(date) {
    const holiday = await holidayPricing.getHolidayForDate(date);
    return holiday ? holiday.name : null;
}

/**
 * Check if early booking is recommended for date
 * @param {Date} date - Date to check
 * @returns {Boolean} True if early booking recommended
 */
export async function isEarlyBookingRecommended(date) {
    const holiday = await holidayPricing.getHolidayForDate(date);
    return holiday ? holiday.pricingStrategy.earlyBookingRecommended : false;
}

export default holidayPricing;
