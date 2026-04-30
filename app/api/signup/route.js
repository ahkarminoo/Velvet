import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      email,
      password,
      firstName = "",
      lastName = "",
      username = "",
      contactNumber = "",
      profileImage = ""
    } = body;

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName || username,
      lastName,
      contactNumber,
      profileImage,
      role: "customer",
    });

    await user.save();

    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { message: "JWT secret is not configured" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        isCustomer: true
      },
      jwtSecret,
      { expiresIn: "7d" }
    );
    
    const userData = {
      _id: user._id,
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
    };

    return NextResponse.json(
      { message: "Profile created successfully", user: userData, token },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
