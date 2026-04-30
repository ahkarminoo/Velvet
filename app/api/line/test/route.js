import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurants";
import User from "@/models/user";
import Staff from "@/models/Staff";

// Test time slot generation
function generateTimeSlots(openTime, closeTime, intervalMinutes = 30, selectedDate = null) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const open = new Date();
  open.setHours(openHour, openMinute, 0, 0);
  
  const close = new Date();
  close.setHours(closeHour, closeMinute, 0, 0);
  
  const current = new Date(open);
  
  // Get current time for filtering past slots
  const now = new Date();
  const isToday = selectedDate && new Date(selectedDate).toDateString() === now.toDateString();
  
  // Add 1-hour buffer before closing
  const lastBookingTime = new Date(close);
  lastBookingTime.setHours(closeHour - 1, closeMinute);
  
  while (current < lastBookingTime) {
    const timeStr = current.toTimeString().slice(0, 5);
    const currentHour = current.getHours();
    
    if (currentHour >= 5 && currentHour <= 23) {
      
      // Filter out past times if booking for today
      if (isToday) {
        const slotTime = new Date();
        slotTime.setHours(currentHour, current.getMinutes(), 0, 0);
        
        // Only add slots that are at least 1 hour in the future
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        
        if (slotTime >= oneHourFromNow) {
          slots.push(timeStr);
        }
      } else {
        // For future dates, add all valid time slots
        slots.push(timeStr);
      }
    }
    
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  
  return slots;
}

export async function GET() {
  try {
    await dbConnect();
    
    // Test database connections
    const restaurant = await Restaurant.findOne();
    const user = await User.findOne();
    const staff = await Staff.findOne();
    
    // Test time slot generation with different scenarios
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const testScenarios = [
      { name: "Regular hours (today)", open: "09:00", close: "22:00", date: today },
      { name: "Regular hours (tomorrow)", open: "09:00", close: "22:00", date: tomorrow },
      { name: "24-hour format (today)", open: "00:00", close: "23:59", date: today },
      { name: "24-hour format (tomorrow)", open: "00:00", close: "23:59", date: tomorrow }
    ];
    
    const timeSlotTests = testScenarios.map(scenario => {
      const timeSlots = generateTimeSlots(scenario.open, scenario.close, 30, scenario.date);
      const limitedSlots = timeSlots.slice(0, 12);
      return {
        scenario: scenario.name,
        hours: `${scenario.open}-${scenario.close}`,
        date: scenario.date,
        totalSlots: timeSlots.length,
        limitedSlots: limitedSlots.length,
        firstFewSlots: timeSlots.slice(0, 5),
        lastFewSlots: timeSlots.slice(-5),
        currentTime: new Date().toTimeString().slice(0, 5)
      };
    });
    
    // Test pricing API
    let pricingTest = null;
    if (restaurant) {
      try {
        const pricingRequest = {
          restaurantId: restaurant._id.toString(),
          tableId: 'test-table',
          date: new Date().toISOString().split('T')[0],
          time: '19:00',
          guestCount: 2,
          tableCapacity: 4,
          tableLocation: 'center'
        };
        
        const pricingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pricing/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pricingRequest)
        });
        
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          pricingTest = {
            success: true,
            request: pricingRequest,
            response: pricingData,
            hasFinalPrice: !!pricingData.finalPrice,
            finalPrice: pricingData.finalPrice
          };
        } else {
          pricingTest = {
            success: false,
            status: pricingResponse.status,
            error: 'Pricing API failed'
          };
        }
      } catch (error) {
        pricingTest = {
          success: false,
          error: error.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database connections working",
      data: {
        hasRestaurant: !!restaurant,
        hasUser: !!user,
        hasStaff: !!staff,
        restaurantId: restaurant?._id,
        restaurantHours: restaurant?.openingHours,
        timeSlotTests: timeSlotTests,
        pricingTest: pricingTest,
        environment: {
          hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
          hasLineSecret: !!process.env.LINE_CHANNEL_SECRET,
          hasMongoUri: !!process.env.MONGODB_URI,
        }
      }
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
