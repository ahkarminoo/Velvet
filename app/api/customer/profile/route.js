import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/resolveUser";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// GET: Fetch user data
export async function GET(req) {
  try {
    await dbConnect();

    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    }

    // Strip password before returning
    const { password, ...safeUser } = user.toObject();

    return NextResponse.json({ user: safeUser }, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: CORS_HEADERS });
  }
}

// PUT: Update user information
export async function PUT(req) {
  try {
    await dbConnect();

    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const { firstName, lastName, contactNumber, newPassword, profileImage } = body;

    const updateDoc = { firstName, lastName, contactNumber };
    if (profileImage) updateDoc.profileImage = profileImage;

    let passwordUpdated = false;
    if (newPassword) {
      updateDoc.password = await bcrypt.hash(newPassword, 10);
      passwordUpdated = true;
    }

    // Direct MongoDB update bypasses Mongoose middleware; preserves prior behavior.
    const collection = mongoose.connection.collection('users');
    await collection.updateOne({ _id: user._id }, { $set: updateDoc });

    const updatedUser = await collection.findOne(
      { _id: user._id },
      { projection: { password: 0 } },
    );

    const userResponse = {
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      contactNumber: updatedUser.contactNumber,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
    };

    return NextResponse.json({
      message: passwordUpdated
        ? "Profile updated successfully! Password has been changed."
        : "Profile updated successfully!",
      user: userResponse,
      passwordUpdated,
    }, { status: 200, headers: CORS_HEADERS });

  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({
      message: "Internal Server Error",
      error: error.message,
    }, { status: 500, headers: CORS_HEADERS });
  }
}
