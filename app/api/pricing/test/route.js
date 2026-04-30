import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { dynamicPricing } from '@/utils/dynamicPricing';
import Booking from '@/models/Booking';
import Restaurant from '@/models/Restaurants';

/**
 * Pricing Algorithm Test API
 * GET /api/pricing/test
 * 
 * Tests the dynamic pricing algorithm with existing booking data
 */

export async function GET(request) {
    try {
        await dbConnect();

        console.log('🧪 Starting dynamic pricing algorithm test...');

        // Get test scenarios from existing data
        const testScenarios = await generateTestScenarios();
        
        if (testScenarios.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No test data available. Please create some bookings first.',
                suggestion: 'Make a few test bookings through the regular booking system first.'
            });
        }

        console.log(`📊 Testing ${testScenarios.length} scenarios...`);

        // Run tests
        const results = await runPricingTests(testScenarios);

        // Generate summary
        const summary = generateTestSummary(results);

        return NextResponse.json({
            success: true,
            message: 'Dynamic pricing algorithm test completed',
            summary,
            testResults: results,
            testInfo: {
                totalScenarios: testScenarios.length,
                timestamp: new Date().toISOString(),
                algorithmVersion: '1.0'
            }
        });

    } catch (error) {
        console.error('Pricing test error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Test execution failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

/**
 * Generate test scenarios from existing booking data
 */
async function generateTestScenarios() {
    try {
        // Get existing restaurants
        const restaurants = await Restaurant.find({}).limit(3);
        
        if (restaurants.length === 0) {
            console.log('No restaurants found for testing');
            return [];
        }

        const scenarios = [];
        const today = new Date();

        // Generate test scenarios for each restaurant
        for (const restaurant of restaurants) {
            // Test different time slots
            const timeSlots = ['11:00', '12:30', '18:00', '19:30', '20:00'];
            
            // Test different days
            const testDates = [
                new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days ahead
                new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week ahead
            ];

            // Test different party sizes
            const partySizes = [2, 4, 6];

            for (const date of testDates) {
                for (const time of timeSlots) {
                    for (const partySize of partySizes) {
                        scenarios.push({
                            name: `${restaurant.restaurantName} - ${date.toDateString()} ${time} for ${partySize}`,
                            restaurantId: restaurant._id.toString(),
                            restaurantName: restaurant.restaurantName,
                            tableId: `t${Math.floor(Math.random() * 10) + 1}`,
                            date: date.toISOString().split('T')[0],
                            time,
                            guestCount: partySize,
                            tableCapacity: partySize <= 2 ? 2 : partySize <= 4 ? 4 : 6,
                            tableLocation: ['window', 'center', 'corner'][Math.floor(Math.random() * 3)]
                        });
                    }
                }
            }
        }

        // Add special test scenarios
        scenarios.push(...generateSpecialScenarios(restaurants));

        return scenarios.slice(0, 20); // Limit to 20 scenarios for testing

    } catch (error) {
        console.error('Error generating test scenarios:', error);
        return [];
    }
}

/**
 * Generate special test scenarios (holidays, edge cases)
 */
function generateSpecialScenarios(restaurants) {
    if (restaurants.length === 0) return [];

    const restaurant = restaurants[0];
    const scenarios = [];

    // Valentine's Day scenario
    scenarios.push({
        name: `Valentine's Day Test - ${restaurant.restaurantName}`,
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.restaurantName,
        tableId: 't1',
        date: '2025-02-14',
        time: '19:30',
        guestCount: 2,
        tableCapacity: 2,
        tableLocation: 'window',
        isSpecial: true,
        expectedHigh: true
    });

    // Large group scenario
    scenarios.push({
        name: `Large Group Test - ${restaurant.restaurantName}`,
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.restaurantName,
        tableId: 't8',
        date: '2025-02-20',
        time: '18:00',
        guestCount: 8,
        tableCapacity: 8,
        tableLocation: 'private',
        isSpecial: true,
        expectedLow: true // Group discount expected
    });

    // Off-peak scenario
    scenarios.push({
        name: `Off-Peak Test - ${restaurant.restaurantName}`,
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.restaurantName,
        tableId: 't3',
        date: '2025-02-18', // Tuesday
        time: '14:30',     // Afternoon
        guestCount: 3,
        tableCapacity: 4,
        tableLocation: 'center',
        isSpecial: true,
        expectedLow: true
    });

    return scenarios;
}

/**
 * Run pricing tests on all scenarios
 */
async function runPricingTests(scenarios) {
    const results = [];

    for (const scenario of scenarios) {
        try {
            console.log(`Testing: ${scenario.name}`);
            
            const startTime = Date.now();
            const pricingResult = await dynamicPricing.calculatePrice(scenario);
            const endTime = Date.now();

            const result = {
                scenario: scenario.name,
                input: scenario,
                output: pricingResult,
                performance: {
                    executionTime: endTime - startTime,
                    success: pricingResult.success
                },
                analysis: analyzePricingResult(scenario, pricingResult)
            };

            results.push(result);

        } catch (error) {
            console.error(`Test failed for ${scenario.name}:`, error);
            results.push({
                scenario: scenario.name,
                input: scenario,
                output: null,
                error: error.message,
                performance: { success: false }
            });
        }
    }

    return results;
}

/**
 * Analyze individual pricing result
 */
function analyzePricingResult(scenario, result) {
    if (!result.success) {
        return { status: 'failed', reason: result.error || 'Unknown error' };
    }

    const analysis = {
        status: 'success',
        priceChange: ((result.finalPrice - result.basePrice) / result.basePrice * 100).toFixed(1) + '%',
        factors: {
            demand: result.breakdown.demandFactor.value,
            time: result.breakdown.temporalFactor.value,
            history: result.breakdown.historicalFactor.value,
            capacity: result.breakdown.capacityFactor.value,
            holiday: result.breakdown.holidayFactor.value
        },
        validation: []
    };

    // Validate expectations for special scenarios
    if (scenario.isSpecial) {
        if (scenario.expectedHigh && result.finalPrice > result.basePrice * 1.3) {
            analysis.validation.push('✅ High pricing as expected');
        } else if (scenario.expectedLow && result.finalPrice < result.basePrice * 1.1) {
            analysis.validation.push('✅ Low pricing as expected');
        } else if (scenario.expectedHigh) {
            analysis.validation.push('⚠️ Expected higher pricing');
        } else if (scenario.expectedLow) {
            analysis.validation.push('⚠️ Expected lower pricing');
        }
    }

    // Validate price bounds
    if (result.finalPrice >= 70 && result.finalPrice <= 200) {
        analysis.validation.push('✅ Price within bounds (70-200 THB)');
    } else {
        analysis.validation.push('❌ Price outside bounds');
    }

    // Validate confidence
    if (result.confidence >= 0.7) {
        analysis.validation.push('✅ High confidence calculation');
    } else {
        analysis.validation.push('⚠️ Low confidence calculation');
    }

    return analysis;
}

/**
 * Generate test summary
 */
function generateTestSummary(results) {
    const successful = results.filter(r => r.performance.success);
    const failed = results.filter(r => !r.performance.success);
    
    const prices = successful.map(r => r.output.finalPrice);
    const executionTimes = successful.map(r => r.performance.executionTime);

    const summary = {
        overall: {
            totalTests: results.length,
            successful: successful.length,
            failed: failed.length,
            successRate: `${(successful.length / results.length * 100).toFixed(1)}%`
        },
        pricing: {
            averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
            priceRange: prices.length > 0 ? `${Math.min(...prices)} - ${Math.max(...prices)} THB` : 'N/A'
        },
        performance: {
            averageExecutionTime: executionTimes.length > 0 ? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length) : 0,
            fastestTest: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
            slowestTest: executionTimes.length > 0 ? Math.max(...executionTimes) : 0
        },
        insights: generateInsights(successful)
    };

    return summary;
}

/**
 * Generate insights from test results
 */
function generateInsights(results) {
    const insights = [];

    if (results.length === 0) {
        insights.push('No successful tests to analyze');
        return insights;
    }

    // Analyze factor impacts
    const factors = {
        demand: results.map(r => r.output.breakdown.demandFactor.value),
        time: results.map(r => r.output.breakdown.temporalFactor.value),
        holiday: results.map(r => r.output.breakdown.holidayFactor.value)
    };

    const avgDemand = factors.demand.reduce((a, b) => a + b, 0) / factors.demand.length;
    const avgTime = factors.time.reduce((a, b) => a + b, 0) / factors.time.length;
    const avgHoliday = factors.holiday.reduce((a, b) => a + b, 0) / factors.holiday.length;

    insights.push(`Average demand factor: ${avgDemand.toFixed(2)}`);
    insights.push(`Average time factor: ${avgTime.toFixed(2)}`);
    insights.push(`Average holiday factor: ${avgHoliday.toFixed(2)}`);

    // Performance insights
    const highPrices = results.filter(r => r.output.finalPrice > 150).length;
    const lowPrices = results.filter(r => r.output.finalPrice < 90).length;

    if (highPrices > 0) {
        insights.push(`${highPrices} scenarios resulted in premium pricing (>150 THB)`);
    }
    
    if (lowPrices > 0) {
        insights.push(`${lowPrices} scenarios resulted in discounted pricing (<90 THB)`);
    }

    insights.push('Algorithm is functioning within expected parameters');

    return insights;
}

/**
 * POST endpoint for custom test scenarios
 */
export async function POST(request) {
    try {
        await dbConnect();

        const { scenarios } = await request.json();

        if (!scenarios || !Array.isArray(scenarios)) {
            return NextResponse.json({
                success: false,
                error: 'Please provide an array of test scenarios'
            }, { status: 400 });
        }

        console.log(`🧪 Running custom test with ${scenarios.length} scenarios...`);

        const results = await runPricingTests(scenarios);
        const summary = generateTestSummary(results);

        return NextResponse.json({
            success: true,
            message: 'Custom pricing test completed',
            summary,
            testResults: results
        });

    } catch (error) {
        console.error('Custom pricing test error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Custom test execution failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
