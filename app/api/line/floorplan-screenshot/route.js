import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Floorplan from "@/models/Floorplan";
import Restaurant from "@/models/Restaurants";

export async function GET(request) {
  try {
    await dbConnect();
    
    // Get the first restaurant's floorplan (you can modify this logic as needed)
    const restaurant = await Restaurant.findOne().populate('floorplans');
    
    if (!restaurant || !restaurant.floorplans || restaurant.floorplans.length === 0) {
      return NextResponse.json({ 
        error: "No floorplan found" 
      }, { status: 404 });
    }

    const floorplan = restaurant.floorplans[0];
    
    // For now, return the floorplan data
    // Later you can implement actual screenshot generation using Puppeteer or similar
    return NextResponse.json({
      success: true,
      floorplan: {
        id: floorplan._id,
        name: floorplan.name,
        data: floorplan.data,
        restaurantName: restaurant.restaurantName
      },
      message: "Floorplan data retrieved successfully. Screenshot generation can be implemented here."
    });

  } catch (error) {
    console.error('Error fetching floorplan for screenshot:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST endpoint to generate and return screenshot
export async function POST(request) {
  try {
    const { floorplanId } = await request.json();
    
    if (!floorplanId) {
      return NextResponse.json({ 
        error: "Floorplan ID is required" 
      }, { status: 400 });
    }

    await dbConnect();
    
    const floorplan = await Floorplan.findById(floorplanId).populate('restaurantId', 'restaurantName');
    
    if (!floorplan) {
      return NextResponse.json({ 
        error: "Floorplan not found" 
      }, { status: 404 });
    }

    // Return existing screenshot URL if available
    if (floorplan.screenshotUrl) {
      return NextResponse.json({
        success: true,
        message: "Floorplan screenshot retrieved successfully",
        floorplan: {
          id: floorplan._id,
          name: floorplan.name,
          restaurantName: floorplan.restaurantId.restaurantName
        },
        screenshotUrl: floorplan.screenshotUrl
      });
    } else {
      // No screenshot available
      return NextResponse.json({
        success: false,
        message: "No screenshot available for this floorplan",
        floorplan: {
          id: floorplan._id,
          name: floorplan.name,
          restaurantName: floorplan.restaurantId.restaurantName
        },
        screenshotUrl: null
      });
    }

  } catch (error) {
    console.error('Error generating floorplan screenshot:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
