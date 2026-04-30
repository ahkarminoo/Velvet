import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

// Test endpoint to check admin users and create one if none exists
export async function GET(req) {
  try {
    await dbConnect();
    
    // Check if any admin users exist
    const adminCount = await Admin.countDocuments();
    console.log('Total admin users in database:', adminCount);
    
    const allAdmins = await Admin.find({}, { username: 1, email: 1, role: 1, status: 1 });
    console.log('Admin users:', allAdmins);
    
    return NextResponse.json({
      success: true,
      adminCount,
      admins: allAdmins,
      message: 'Admin check complete'
    });
    
  } catch (error) {
    console.error('Error checking admins:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Create a test admin user
export async function POST(req) {
  try {
    await dbConnect();
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'testadmin' });
    
    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Test admin already exists'
      });
    }
    
    const admin = new Admin({
      username: 'testadmin',
      email: 'admin@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'super_admin',
      status: 'active',
      permissions: ['manage_users', 'manage_restaurants', 'manage_bookings']
    });
    
    await admin.save();
    
    return NextResponse.json({
      success: true,
      message: 'Test admin created successfully',
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Error creating test admin:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}