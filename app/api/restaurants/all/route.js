import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurants";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function GET(request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { restaurants: [], total: 0, page: 1, limit: DEFAULT_LIMIT, hasMore: false },
      { status: 200 },
    );
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const venueType = searchParams.get('venueType');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const query = {};
    if (venueType && venueType !== 'all') query.venueType = venueType;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query)
        .select('restaurantName cuisineType venueType location description openingHours images rating totalReviews venueSettings')
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments(query),
    ]);

    return NextResponse.json({
      restaurants,
      total,
      page,
      limit,
      hasMore: skip + restaurants.length < total,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
