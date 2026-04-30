import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

// Verify admin authentication
export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.adminId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }
    
    if (admin.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Admin account is not active' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        profileImage: admin.profileImage,
        lastLogin: admin.lastLogin,
        preferences: admin.preferences
      }
    });
    
  } catch (error) {
    console.error('Error verifying admin auth:', error);
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
