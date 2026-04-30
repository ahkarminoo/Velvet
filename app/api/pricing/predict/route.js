import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { dynamicPricing } from '@/utils/dynamicPricing';
import { holidayPricing } from '@/utils/holidayPricing';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

/**
 * Price Prediction API
 * POST /api/pricing/predict
 * 
 * Predicts pricing for future dates and provides business intelligence
 */

export async function POST(request) {
    try {
        await dbConnect();

        const body = await request.json();
        const {
            restaurantId,
            dateRange,
            timeSlots = ['18:00', '19:00', '20:00'],
            guestCounts = [2, 4, 6],
            includeHolidays = true,
            requireAuth = false
        } = body;

        // Validate required fields
        if (!restaurantId || !dateRange) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: restaurantId, dateRange'
            }, { status: 400 });
        }

        // Optional authentication
        if (requireAuth) {
            const authResult = await verifyFirebaseAuth(request);
            if (!authResult.success) {
                return NextResponse.json({
                    success: false,
                    error: 'Authentication required'
                }, { status: 401 });
            }
        }

        // Validate date range
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid date format in dateRange'
            }, { status: 400 });
        }

        if (endDate <= startDate) {
            return NextResponse.json({
                success: false,
                error: 'End date must be after start date'
            }, { status: 400 });
        }

        // Limit prediction range to 90 days
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 90) {
            return NextResponse.json({
                success: false,
                error: 'Date range cannot exceed 90 days'
            }, { status: 400 });
        }

        console.log(`🔮 Generating price predictions for ${restaurantId} from ${dateRange.start} to ${dateRange.end}`);

        // Generate predictions
        const predictions = await generatePricePredictions({
            restaurantId,
            startDate,
            endDate,
            timeSlots,
            guestCounts,
            includeHolidays
        });

        // Generate business insights
        const insights = generateBusinessInsights(predictions);

        // Generate revenue forecast
        const revenueForecast = generateRevenueForecast(predictions);

        return NextResponse.json({
            success: true,
            restaurantId,
            dateRange: {
                start: dateRange.start,
                end: dateRange.end,
                totalDays: daysDiff
            },
            predictions,
            insights,
            revenueForecast,
            metadata: {
                timeSlots,
                guestCounts,
                includeHolidays,
                generatedAt: new Date().toISOString(),
                totalPredictions: predictions.length
            }
        });

    } catch (error) {
        console.error('Price prediction API error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Internal server error during prediction',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

/**
 * Generate price predictions for date range
 */
async function generatePricePredictions({ restaurantId, startDate, endDate, timeSlots, guestCounts, includeHolidays }) {
    const predictions = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Get holiday info for this date
        let holidayInfo = null;
        if (includeHolidays) {
            try {
                holidayInfo = await holidayPricing.getHolidayForDate(currentDate);
            } catch (error) {
                console.error('Error getting holiday info:', error);
            }
        }

        // Generate predictions for each time slot and guest count combination
        for (const timeSlot of timeSlots) {
            const timePredictions = [];

            for (const guestCount of guestCounts) {
                try {
                    const tableCapacity = guestCount <= 2 ? 2 : guestCount <= 4 ? 4 : 6;
                    const tableLocation = guestCount <= 2 ? 'window' : 'center';

                    const pricingResult = await dynamicPricing.calculatePrice({
                        restaurantId,
                        tableId: `prediction_${guestCount}p`,
                        date: currentDate,
                        time: timeSlot,
                        guestCount,
                        tableCapacity,
                        tableLocation
                    });

                    if (pricingResult.success) {
                        timePredictions.push({
                            guestCount,
                            tableType: `${guestCount}-person`,
                            price: pricingResult.finalPrice,
                            confidence: pricingResult.confidence,
                            factors: {
                                demand: pricingResult.breakdown.demandFactor.value,
                                time: pricingResult.breakdown.temporalFactor.value,
                                history: pricingResult.breakdown.historicalFactor.value,
                                capacity: pricingResult.breakdown.capacityFactor.value,
                                holiday: pricingResult.breakdown.holidayFactor.value
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Prediction error for ${dateString} ${timeSlot} ${guestCount}p:`, error);
                }
            }

            if (timePredictions.length > 0) {
                predictions.push({
                    date: dateString,
                    dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    timeSlot,
                    holiday: holidayInfo ? {
                        name: holidayInfo.name,
                        type: holidayInfo.type,
                        impact: holidayInfo.impact
                    } : null,
                    predictions: timePredictions,
                    averagePrice: Math.round(timePredictions.reduce((sum, p) => sum + p.price, 0) / timePredictions.length),
                    priceRange: {
                        min: Math.min(...timePredictions.map(p => p.price)),
                        max: Math.max(...timePredictions.map(p => p.price))
                    }
                });
            }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return predictions;
}

/**
 * Generate business insights from predictions
 */
function generateBusinessInsights(predictions) {
    if (predictions.length === 0) {
        return { message: 'No predictions available for analysis' };
    }

    const insights = {
        peakDays: [],
        lowDemandDays: [],
        holidayImpact: [],
        pricePatterns: {},
        recommendations: []
    };

    // Analyze peak and low demand days
    const avgPrice = predictions.reduce((sum, p) => sum + p.averagePrice, 0) / predictions.length;
    
    predictions.forEach(prediction => {
        if (prediction.averagePrice > avgPrice * 1.3) {
            insights.peakDays.push({
                date: prediction.date,
                dayOfWeek: prediction.dayOfWeek,
                averagePrice: prediction.averagePrice,
                reason: prediction.holiday ? `Holiday: ${prediction.holiday.name}` : 'High demand period'
            });
        }
        
        if (prediction.averagePrice < avgPrice * 0.8) {
            insights.lowDemandDays.push({
                date: prediction.date,
                dayOfWeek: prediction.dayOfWeek,
                averagePrice: prediction.averagePrice,
                opportunity: 'Consider promotional pricing'
            });
        }
    });

    // Analyze holiday impact
    const holidayPredictions = predictions.filter(p => p.holiday);
    holidayPredictions.forEach(prediction => {
        const baselinePrice = 100; // Base price
        const increase = ((prediction.averagePrice - baselinePrice) / baselinePrice * 100).toFixed(1);
        
        insights.holidayImpact.push({
            date: prediction.date,
            holiday: prediction.holiday.name,
            type: prediction.holiday.type,
            averagePrice: prediction.averagePrice,
            priceIncrease: `${increase}%`
        });
    });

    // Analyze price patterns by day of week
    const dayPatterns = {};
    predictions.forEach(prediction => {
        const day = prediction.dayOfWeek;
        if (!dayPatterns[day]) {
            dayPatterns[day] = [];
        }
        dayPatterns[day].push(prediction.averagePrice);
    });

    Object.keys(dayPatterns).forEach(day => {
        const prices = dayPatterns[day];
        insights.pricePatterns[day] = {
            averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices)
        };
    });

    // Generate recommendations
    if (insights.peakDays.length > 0) {
        insights.recommendations.push(`${insights.peakDays.length} high-demand days identified - ensure adequate staffing`);
    }
    
    if (insights.lowDemandDays.length > 0) {
        insights.recommendations.push(`${insights.lowDemandDays.length} low-demand days - consider promotional campaigns`);
    }
    
    if (insights.holidayImpact.length > 0) {
        insights.recommendations.push(`${insights.holidayImpact.length} holidays in period - prepare special menus and decorations`);
    }

    const weekendAvg = (insights.pricePatterns.Saturday?.averagePrice || 0 + insights.pricePatterns.Sunday?.averagePrice || 0) / 2;
    const weekdayAvg = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        .reduce((sum, day) => sum + (insights.pricePatterns[day]?.averagePrice || 0), 0) / 5;
    
    if (weekendAvg > weekdayAvg * 1.2) {
        insights.recommendations.push('Strong weekend premium - consider extending weekend hours');
    }

    return insights;
}

/**
 * Generate revenue forecast
 */
function generateRevenueForecast(predictions) {
    if (predictions.length === 0) {
        return { message: 'No predictions available for revenue forecast' };
    }

    // Estimate tables and utilization (these would be more accurate with real restaurant data)
    const estimatedTables = {
        '2-person': 6,  // 6 couple tables
        '4-person': 8,  // 8 family tables  
        '6-person': 4   // 4 group tables
    };

    const estimatedUtilization = {
        'Monday': 0.6,
        'Tuesday': 0.65,
        'Wednesday': 0.7,
        'Thursday': 0.75,
        'Friday': 0.85,
        'Saturday': 0.9,
        'Sunday': 0.8
    };

    let totalRevenue = 0;
    let totalBookings = 0;
    const dailyForecasts = [];

    predictions.forEach(prediction => {
        let dailyRevenue = 0;
        let dailyBookings = 0;

        prediction.predictions.forEach(pred => {
            const tableCount = estimatedTables[pred.tableType] || 4;
            const utilization = estimatedUtilization[prediction.dayOfWeek] || 0.7;
            
            // Apply holiday boost to utilization
            let adjustedUtilization = utilization;
            if (prediction.holiday && prediction.holiday.impact > 1.3) {
                adjustedUtilization = Math.min(0.95, utilization * 1.2);
            }

            const expectedBookings = Math.round(tableCount * adjustedUtilization);
            const revenue = expectedBookings * pred.price;

            dailyRevenue += revenue;
            dailyBookings += expectedBookings;
        });

        dailyForecasts.push({
            date: prediction.date,
            dayOfWeek: prediction.dayOfWeek,
            expectedRevenue: Math.round(dailyRevenue),
            expectedBookings: dailyBookings,
            averageBookingValue: Math.round(dailyRevenue / Math.max(dailyBookings, 1)),
            holiday: prediction.holiday?.name || null
        });

        totalRevenue += dailyRevenue;
        totalBookings += dailyBookings;
    });

    return {
        totalForecast: {
            expectedRevenue: Math.round(totalRevenue),
            expectedBookings: totalBookings,
            averageBookingValue: Math.round(totalRevenue / Math.max(totalBookings, 1)),
            averageDailyRevenue: Math.round(totalRevenue / predictions.length)
        },
        dailyForecasts,
        topRevenueDays: dailyForecasts
            .sort((a, b) => b.expectedRevenue - a.expectedRevenue)
            .slice(0, 5),
        insights: {
            peakRevenueDay: dailyForecasts.reduce((max, day) => 
                day.expectedRevenue > max.expectedRevenue ? day : max
            ),
            lowestRevenueDay: dailyForecasts.reduce((min, day) => 
                day.expectedRevenue < min.expectedRevenue ? day : min
            )
        }
    };
}

/**
 * GET endpoint for API documentation
 */
export async function GET(request) {
    const documentation = {
        endpoint: '/api/pricing/predict',
        method: 'POST',
        description: 'Generate price predictions and business insights for future dates',
        requiredFields: {
            restaurantId: 'string - MongoDB ObjectId of restaurant',
            dateRange: {
                start: 'string - Start date in YYYY-MM-DD format',
                end: 'string - End date in YYYY-MM-DD format (max 90 days from start)'
            }
        },
        optionalFields: {
            timeSlots: 'array - Time slots to predict (default: ["18:00", "19:00", "20:00"])',
            guestCounts: 'array - Guest counts to predict (default: [2, 4, 6])',
            includeHolidays: 'boolean - Include holiday analysis (default: true)',
            requireAuth: 'boolean - Require authentication (default: false)'
        },
        exampleRequest: {
            restaurantId: '67b716e98d2856f0a1900471',
            dateRange: {
                start: '2025-02-01',
                end: '2025-02-28'
            },
            timeSlots: ['18:00', '19:00', '20:00'],
            guestCounts: [2, 4, 6],
            includeHolidays: true
        },
        exampleResponse: {
            success: true,
            predictions: [
                {
                    date: '2025-02-14',
                    dayOfWeek: 'Friday',
                    timeSlot: '19:00',
                    holiday: { name: "Valentine's Day", type: 'international' },
                    predictions: [
                        { guestCount: 2, price: 180, confidence: 0.92 },
                        { guestCount: 4, price: 140, confidence: 0.89 }
                    ],
                    averagePrice: 160
                }
            ],
            insights: {
                peakDays: [],
                holidayImpact: [],
                recommendations: []
            },
            revenueForecast: {
                totalForecast: { expectedRevenue: 45000, expectedBookings: 320 }
            }
        }
    };

    return NextResponse.json(documentation);
}
