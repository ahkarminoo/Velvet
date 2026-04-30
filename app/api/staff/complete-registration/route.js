import { NextResponse } from 'next/server';
import { getToken, deleteToken } from '../../../../lib/tokenStorage';
import dbConnect from '../../../../lib/mongodb';
import Staff from '../../../../models/Staff';

export async function POST(request) {
  try {
    const { token, lineUserId, lineId } = await request.json();

    if (!token || !lineUserId || !lineId) {
      return NextResponse.json({
        error: 'Token, Line User ID, and Line ID are required'
      }, { status: 400 });
    }

    // Verify token
    const registrationData = getToken(token);
    
    if (!registrationData) {
      return NextResponse.json({
        error: 'Invalid or expired registration token'
      }, { status: 404 });
    }

    await dbConnect();

    // Check if staff member already exists
    const existingStaff = await Staff.findOne({
      $or: [
        { lineId: lineId.toLowerCase() },
        { lineUserId: lineUserId }
      ]
    });

    if (existingStaff) {
      return NextResponse.json({
        error: 'Staff member with this Line ID or User ID already exists'
      }, { status: 409 });
    }

    // Create new staff member
    const newStaff = new Staff({
      lineId: lineId.toLowerCase(),
      lineUserId: lineUserId,
      displayName: registrationData.displayName,
      restaurantId: registrationData.restaurantId,
      role: registrationData.role,
      isActive: true
    });

    await newStaff.save();
    await newStaff.populate('restaurantId', 'restaurantName');

    // Clean up used token
    deleteToken(token);

    return NextResponse.json({
      success: true,
      message: 'Staff registration completed successfully',
      staff: {
        id: newStaff._id,
        lineId: newStaff.lineId,
        displayName: newStaff.displayName,
        role: newStaff.role,
        restaurantName: newStaff.restaurantId.restaurantName
      }
    });

  } catch (error) {
    console.error('Error completing registration:', error);
    return NextResponse.json({
      error: 'Failed to complete registration'
    }, { status: 500 });
  }
}
