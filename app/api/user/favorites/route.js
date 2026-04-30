import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Favorite from "@/models/favorites";
import User from "@/models/user";
import jwt from "jsonwebtoken";

async function getAuthenticatedUser(req) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    return { success: false, message: "No token provided" };
  }

  if (token.startsWith('line.')) {
    const lineUserId = token.replace('line.', '');
    const lineUser = await User.findOne({ lineUserId });
    if (!lineUser) {
      return { success: false, message: "LINE user not found" };
    }
    return { success: true, user: lineUser };
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return { success: false, message: "JWT secret is not configured" };
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    return { success: true, user };
  } catch {
    return { success: false, message: "Invalid token" };
  }
}

// GET: Fetch user's favorite restaurants
export async function GET(req) {
  await dbConnect();

  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }
    const user = authResult.user;

    const favorites = await Favorite.find({ userId: user._id }).populate('restaurantId');

    // Add null check before accessing _id
    return NextResponse.json({ 
      favorites: favorites.map(fav => fav.restaurantId?._id || null).filter(Boolean)
    });

  } catch (error) {
    console.error("Error in favorites GET API:", error);
    
    // Handle MongoDB duplicate key errors specifically
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
    
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }

    const { restaurantId } = await req.json();
    const user = authResult.user;

    // Check if the favorite already exists
    const existingFavorite = await Favorite.findOne({ userId: user._id, restaurantId });

    if (existingFavorite) {
      // Remove favorite
      await Favorite.deleteOne({ userId: user._id, restaurantId });
      return NextResponse.json({
        message: "Restaurant removed from favorites",
        isFavorite: false
      });
    } else {
      // Add favorite
      await Favorite.create({ userId: user._id, restaurantId });
      return NextResponse.json({
        message: "Restaurant added to favorites",
        isFavorite: true
      });
    }

  } catch (error) {
    console.error("Error in favorites PUT API:", error);
    
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      return NextResponse.json({ 
        message: "User account conflict. Please contact support." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 
