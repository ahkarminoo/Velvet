import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Favorite from "@/models/favorites";
import { resolveUser } from "@/lib/auth/resolveUser";

// GET: Fetch user's favorite restaurants
export async function GET(req) {
  await dbConnect();

  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const favorites = await Favorite.find({ userId: user._id }).populate('restaurantId');

    return NextResponse.json({
      favorites: favorites.map(fav => fav.restaurantId?._id || null).filter(Boolean)
    });

  } catch (error) {
    console.error("Error in favorites GET API:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        message: "User account conflict. Please contact support."
      }, { status: 409 });
    }

    return NextResponse.json({ message: "Error fetching favorites" }, { status: 500 });
  }
}

// PUT: Toggle restaurant favorite status
export async function PUT(req) {
  try {
    await dbConnect();

    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { restaurantId } = await req.json();

    const existingFavorite = await Favorite.findOne({ userId: user._id, restaurantId });

    if (existingFavorite) {
      await Favorite.deleteOne({ userId: user._id, restaurantId });
      return NextResponse.json({
        message: "Restaurant removed from favorites",
        isFavorite: false
      });
    } else {
      await Favorite.create({ userId: user._id, restaurantId });
      return NextResponse.json({
        message: "Restaurant added to favorites",
        isFavorite: true
      });
    }

  } catch (error) {
    console.error("Error in favorites PUT API:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        message: "User account conflict. Please contact support."
      }, { status: 409 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
