import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import RestaurantOwner from "@/models/restaurant-owner";
import Restaurant from "@/models/Restaurants";

export async function POST(req) {
  try {
    const { email, password, firebaseUid } = await req.json();
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

    if (!jwtSecret) {
      return NextResponse.json(
        { error: "JWT secret is not configured. Set JWT_SECRET or NEXTAUTH_SECRET." },
        { status: 500 }
      );
    }

    // Handle Firebase authentication (Google sign-in)
    if (firebaseUid) {
      await dbConnect();
      
      const owner = await RestaurantOwner.findOne({ firebaseUid });
      if (!owner) {
        return NextResponse.json({ error: "Restaurant owner not found" }, { status: 404 });
      }

      // Check if owner has any restaurants
      const restaurant = await Restaurant.findOne({ ownerId: owner._id });
      const hasRestaurant = !!restaurant;

      const token = jwt.sign(
        { 
          userId: owner._id, 
          email: owner.email,
          isRestaurantOwner: true,
          role: "restaurantOwner",
          hasRestaurant 
        },
        jwtSecret,
        { expiresIn: "2h" }
      );

      return NextResponse.json({
        message: "Login successful",
        token,
        user: {
          _id: owner._id,
          id: owner._id,
          userId: owner._id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          role: "restaurantOwner",
          isRestaurantOwner: true,
          subscriptionPlan: owner.subscriptionPlan || "Basic",
          hasRestaurant,
          profileImage: owner.profileImage
        },
      }, { status: 200 });
    }

    // Handle traditional email/password authentication
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = String(email).trim().toLowerCase();
    const owner = await RestaurantOwner.findOne({ email: normalizedEmail });
    if (!owner) {
      return NextResponse.json({ error: "Restaurant owner not found" }, { status: 404 });
    }

    // Check if owner has password (not a Google-only user)
    if (!owner.password) {
      return NextResponse.json({ error: "Please use Google sign-in for this account" }, { status: 400 });
    }

    let isPasswordMatch = false;

    try {
      isPasswordMatch = await bcrypt.compare(password, owner.password);
    } catch {
      isPasswordMatch = owner.password === password;
      if (isPasswordMatch) {
        owner.password = await bcrypt.hash(password, 10);
        await owner.save();
      }
    }

    if (!isPasswordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if owner has any restaurants
    const restaurant = await Restaurant.findOne({ ownerId: owner._id });
    const hasRestaurant = !!restaurant;

    const token = jwt.sign(
      { 
        userId: owner._id, 
        email: owner.email,
        isRestaurantOwner: true,
        role: "restaurantOwner",
        hasRestaurant 
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        _id: owner._id,
        id: owner._id,
        userId: owner._id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: "restaurantOwner",
        isRestaurantOwner: true,
        subscriptionPlan: owner.subscriptionPlan || "Basic",
        hasRestaurant,
        profileImage: owner.profileImage
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Error in restaurant owner login API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
