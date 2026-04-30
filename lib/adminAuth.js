import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

/**
 * Verify admin authentication from request headers
 * @param {Request} req - The request object
 * @returns {Object} - { success: boolean, admin?: Object, error?: string }
 */
export async function verifyAdminAuth(req) {
  try {
    const authHeader = req.headers.get('authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in admin auth');
      return { success: false, error: 'No token provided' };
    }
    
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully. AdminId:', decoded.adminId);
    
    if (!decoded.adminId) {
      console.log('No adminId in token payload');
      return { success: false, error: 'Invalid token - no adminId' };
    }
    
    await dbConnect();
    console.log('Database connected for admin lookup');
    
    const admin = await Admin.findById(decoded.adminId);
    console.log('Admin lookup result:', admin ? `Found: ${admin.username}` : 'Not found');
    
    if (!admin) {
      return { success: false, error: 'Admin not found' };
    }
    
    console.log('Admin status:', admin.status);
    
    if (admin.status !== 'active') {
      return { success: false, error: 'Admin account is not active' };
    }
    
    return {
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
    };
    
  } catch (error) {
    console.error('Error verifying admin auth:', error);
    return { success: false, error: 'Token verification failed' };
  }
}

/**
 * Middleware function to protect admin routes
 * @param {Function} handler - The route handler function
 * @returns {Function} - Protected route handler
 */
export function withAdminAuth(handler) {
  return async (req, ...args) => {
    const authResult = await verifyAdminAuth(req);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Add admin info to request object
    req.admin = authResult.admin;
    
    return handler(req, ...args);
  };
}
