import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if account is locked
    if (admin.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked due to too many failed login attempts' },
        { status: 423 }
      );
    }
    
    // Check if account is active
    if (admin.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }
    
    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Log login activity
    await admin.logActivity('login', 'system', {
      loginMethod: 'password',
      timestamp: new Date()
    }, req);
    
    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
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
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
