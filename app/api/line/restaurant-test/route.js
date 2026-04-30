import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurants";
import Floorplan from "@/models/Floorplan";

// ========================================
// RESTAURANT CONFIGURATION
// ========================================
// Change this restaurant ID to switch between different restaurants
const DEFAULT_RESTAURANT_ID = process.env.DEFAULT_RESTAURANT_ID || "68d548d7a11657653c2d49ec";

export async function GET() {
  try {
    await dbConnect();
    
    // Get restaurant information using configurable restaurant ID
    const restaurantId = DEFAULT_RESTAURANT_ID;
    const restaurant = await Restaurant.findById(restaurantId).select('restaurantName operatingHours defaultFloorplanId');
    
    // Get floorplan information using restaurant ID
    const floorplan = await Floorplan.findOne({ restaurantId: restaurantId });
    
    return NextResponse.json({
      success: true,
      message: "Restaurant and floorplan test",
      data: {
        restaurant: {
          found: !!restaurant,
          name: restaurant?.restaurantName,
          operatingHours: restaurant?.operatingHours,
          hasDefaultFloorplan: !!restaurant?.defaultFloorplanId
        },
        floorplan: {
          found: !!floorplan,
          name: floorplan?.name,
          hasData: !!floorplan?.data,
          objectCount: floorplan?.data?.objects?.length || 0,
          tables: floorplan?.data?.objects?.filter(obj => 
            obj.type === 'table' || obj.objectId?.startsWith('t')
          ).length || 0
        }
      }
    });
  } catch (error) {
    console.error("Restaurant test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
