import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { dataAnalyzer } from '@/utils/dataAnalyzer';
import { dynamicPricing } from '@/utils/dynamicPricing';

/**
 * Data Analysis API for Dynamic Pricing
 * GET /api/pricing/analyze-data
 * 
 * Analyzes all booking data to show how the algorithm uses it
 */

export async function GET(request) {
    try {
        await dbConnect();

        console.log('🔍 Starting comprehensive booking data analysis...');

        // Analyze all booking data
        const dataAnalysis = await dataAnalyzer.analyzeAllBookingData();

        if (dataAnalysis.totalBookings === 0) {
            return NextResponse.json({
                success: false,
                message: 'No booking data found',
                suggestion: 'Create some test bookings first to see the algorithm in action',
                analysis: dataAnalysis
            });
        }

        console.log('📊 Data analysis completed:', {
            restaurants: dataAnalysis.totalRestaurants,
            bookings: dataAnalysis.totalBookings
        });

        // Test algorithm with sample data from each restaurant
        const algorithmTests = [];
        
        for (const restaurant of dataAnalysis.restaurants) {
            if (restaurant.bookingCount > 0) {
                try {
                    console.log(`🧪 Testing algorithm with ${restaurant.name} data...`);

                    // Test with a future date
                    const testDate = new Date();
                    testDate.setDate(testDate.getDate() + 7); // 1 week ahead

                    const testScenarios = [
                        { time: '12:00', guestCount: 2, tableCapacity: 2, label: 'Lunch couple' },
                        { time: '19:00', guestCount: 4, tableCapacity: 4, label: 'Dinner family' },
                        { time: '20:00', guestCount: 6, tableCapacity: 6, label: 'Group dinner' }
                    ];

                    const restaurantTests = [];

                    for (const scenario of testScenarios) {
                        const pricingResult = await dynamicPricing.calculatePrice({
                            restaurantId: restaurant.id,
                            tableId: `test_${scenario.guestCount}p`,
                            date: testDate,
                            time: scenario.time,
                            guestCount: scenario.guestCount,
                            tableCapacity: scenario.tableCapacity,
                            tableLocation: 'center'
                        });

                        if (pricingResult.success) {
                            restaurantTests.push({
                                scenario: scenario.label,
                                input: scenario,
                                price: pricingResult.finalPrice,
                                factors: {
                                    demand: pricingResult.breakdown.demandFactor.value,
                                    time: pricingResult.breakdown.temporalFactor.value,
                                    history: pricingResult.breakdown.historicalFactor.value,
                                    capacity: pricingResult.breakdown.capacityFactor.value,
                                    holiday: pricingResult.breakdown.holidayFactor.value
                                },
                                historicalContext: {
                                    dataPoints: pricingResult.breakdown.historicalFactor.dataPoints,
                                    timeSlotBookings: pricingResult.breakdown.historicalFactor.timeSlotBookings,
                                    dayBookings: pricingResult.breakdown.historicalFactor.dayBookings
                                },
                                confidence: pricingResult.confidence
                            });
                        }
                    }

                    algorithmTests.push({
                        restaurant: {
                            id: restaurant.id,
                            name: restaurant.name,
                            bookingCount: restaurant.bookingCount
                        },
                        tests: restaurantTests,
                        dataUtilization: {
                            historicalBookings: restaurant.bookingCount,
                            dateRange: restaurant.dateRange,
                            avgGuestCount: restaurant.avgGuestCount,
                            popularTimes: restaurant.popularTimes,
                            recentActivity: restaurant.recentActivity
                        }
                    });

                } catch (testError) {
                    console.error(`Error testing algorithm for ${restaurant.name}:`, testError);
                    algorithmTests.push({
                        restaurant: {
                            id: restaurant.id,
                            name: restaurant.name,
                            bookingCount: restaurant.bookingCount
                        },
                        error: testError.message,
                        tests: []
                    });
                }
            }
        }

        // Generate insights
        const insights = generateDataInsights(dataAnalysis, algorithmTests);

        return NextResponse.json({
            success: true,
            message: 'Data analysis completed successfully',
            dataAnalysis,
            algorithmTests,
            insights,
            summary: {
                totalRestaurants: dataAnalysis.totalRestaurants,
                totalBookings: dataAnalysis.totalBookings,
                dateRange: dataAnalysis.dateRange,
                algorithmsWorking: algorithmTests.filter(t => t.tests && t.tests.length > 0).length,
                dataQuality: assessDataQuality(dataAnalysis)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Data analysis API error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to analyze booking data',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

/**
 * Generate insights from data analysis
 */
function generateDataInsights(dataAnalysis, algorithmTests) {
    const insights = [];

    // Data volume insights
    if (dataAnalysis.totalBookings < 10) {
        insights.push({
            type: 'warning',
            message: `Only ${dataAnalysis.totalBookings} bookings found. Algorithm needs more data for better accuracy.`,
            recommendation: 'Add more test bookings to improve pricing intelligence.'
        });
    } else {
        insights.push({
            type: 'success',
            message: `Good data volume: ${dataAnalysis.totalBookings} bookings across ${dataAnalysis.totalRestaurants} restaurants.`,
            recommendation: 'Algorithm has sufficient data for intelligent pricing.'
        });
    }

    // Time pattern insights
    const timePatterns = dataAnalysis.timeSlotPatterns;
    const peakSlot = Object.entries(timePatterns).sort(([,a], [,b]) => b.count - a.count)[0];
    if (peakSlot) {
        insights.push({
            type: 'info',
            message: `Peak booking time: ${peakSlot[0]} (${peakSlot[1].percentage}% of bookings)`,
            recommendation: 'Algorithm will apply higher pricing during peak hours.'
        });
    }

    // Algorithm performance insights
    const workingAlgorithms = algorithmTests.filter(t => t.tests && t.tests.length > 0);
    if (workingAlgorithms.length > 0) {
        insights.push({
            type: 'success',
            message: `Algorithm working for ${workingAlgorithms.length} restaurants.`,
            recommendation: 'Dynamic pricing is actively using your booking data.'
        });

        // Price variation insight
        const allPrices = workingAlgorithms.flatMap(t => t.tests.map(test => test.price));
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        
        insights.push({
            type: 'info',
            message: `Price range: ${minPrice}-${maxPrice} THB based on your data patterns.`,
            recommendation: 'Pricing varies intelligently based on demand and historical patterns.'
        });
    }

    // Historical data quality
    const restaurantsWithGoodData = dataAnalysis.restaurants.filter(r => r.bookingCount >= 5);
    if (restaurantsWithGoodData.length > 0) {
        insights.push({
            type: 'success',
            message: `${restaurantsWithGoodData.length} restaurants have strong historical data (5+ bookings).`,
            recommendation: 'These restaurants will have more accurate historical pricing factors.'
        });
    }

    return insights;
}

/**
 * Assess data quality for algorithm effectiveness
 */
function assessDataQuality(dataAnalysis) {
    let score = 0;
    let maxScore = 100;

    // Volume score (40 points)
    if (dataAnalysis.totalBookings >= 50) score += 40;
    else if (dataAnalysis.totalBookings >= 20) score += 30;
    else if (dataAnalysis.totalBookings >= 10) score += 20;
    else if (dataAnalysis.totalBookings >= 5) score += 10;

    // Distribution score (30 points)
    const timeSlots = Object.values(dataAnalysis.timeSlotPatterns);
    const nonZeroSlots = timeSlots.filter(slot => slot.count > 0).length;
    score += Math.min(30, nonZeroSlots * 6); // 6 points per active time slot

    // Recency score (30 points)
    if (dataAnalysis.dateRange && dataAnalysis.dateRange.span) {
        if (dataAnalysis.dateRange.span <= 7) score += 30;      // Very recent
        else if (dataAnalysis.dateRange.span <= 30) score += 25; // Recent
        else if (dataAnalysis.dateRange.span <= 90) score += 15; // Somewhat recent
        else score += 5; // Old data
    }

    const quality = score >= 80 ? 'excellent' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'fair' : 'poor';

    return {
        score: Math.round(score),
        quality,
        breakdown: {
            volume: Math.min(40, Math.floor(dataAnalysis.totalBookings / 50 * 40)),
            distribution: Math.min(30, nonZeroSlots * 6),
            recency: dataAnalysis.dateRange ? Math.max(5, 35 - Math.floor(dataAnalysis.dateRange.span / 7)) : 0
        }
    };
}
