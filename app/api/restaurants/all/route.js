import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurants";

export async function GET(request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ restaurants: [] }, { status: 200 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const venueType = searchParams.get('venueType');

    const query = {};
    if (venueType && venueType !== 'all') query.venueType = venueType;

    const restaurants = await Restaurant.find(query)
      .select('restaurantName cuisineType venueType location description openingHours images rating totalReviews venueSettings')
      .lean();

    return NextResponse.json({ restaurants }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 
