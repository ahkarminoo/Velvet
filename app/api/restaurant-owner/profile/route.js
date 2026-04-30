import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RestaurantOwner from '@/models/restaurant-owner';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const ownerId = decoded.userId;

    // Find the restaurant owner
    const owner = await RestaurantOwner.findById(ownerId).select('-password');
    
    if (!owner) {
      return NextResponse.json({ message: 'Owner not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: `${owner.firstName} ${owner.lastName}`,
      email: owner.email,
      phoneNumber: owner.contactNumber,
      createdAt: owner.createdAt,
      subscriptionPlan: owner.subscriptionPlan,
      imageUrl: owner.profileImage
    });

  } catch (error) {
    console.error('Error fetching owner profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const ownerId = decoded.userId;

    // Get updated profile data from request body
    const { name, email, phoneNumber, imageUrl } = await req.json();
    
    // Find the restaurant owner
    const owner = await RestaurantOwner.findById(ownerId);
    
    if (!owner) {
      return NextResponse.json({ message: 'Owner not found' }, { status: 404 });
    }

    // Update owner profile
    if (name) {
      const nameParts = name.split(' ');
      owner.firstName = nameParts[0] || owner.firstName;
      owner.lastName = nameParts.slice(1).join(' ') || owner.lastName;
    }
    
    if (email) owner.email = email;
    if (phoneNumber) owner.contactNumber = phoneNumber;
    if (imageUrl) owner.profileImage = imageUrl;

    await owner.save();

    return NextResponse.json({
      name: `${owner.firstName} ${owner.lastName}`,
      email: owner.email,
      phoneNumber: owner.contactNumber,
      createdAt: owner.createdAt,
      subscriptionPlan: owner.subscriptionPlan,
      imageUrl: owner.profileImage
    });

  } catch (error) {
    console.error('Error updating owner profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}