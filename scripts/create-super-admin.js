import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin.username);
      return;
    }

    // Create super admin
    const superAdminData = {
      username: 'admin',
      email: 'admin@foodloft.com',
      password: 'admin123', // Change this in production!
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin'
    };

    const superAdmin = await Admin.createSuperAdmin(superAdminData);
    
    console.log('Super admin created successfully:');
    console.log('Username:', superAdmin.username);
    console.log('Email:', superAdmin.email);
    console.log('Password: admin123 (Please change this!)');
    console.log('Role:', superAdmin.role);
    console.log('Permissions:', superAdmin.permissions.length, 'permissions granted');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createSuperAdmin();
