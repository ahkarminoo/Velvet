import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  // Basic admin info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Personal info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  
  // Admin role and permissions
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator', 'support'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      // User management
      'manage_users',
      'manage_restaurant_owners',
      'manage_customers',
      'view_user_analytics',
      
      // Restaurant management
      'manage_restaurants',
      'manage_floorplans',
      'manage_bookings',
      'view_restaurant_analytics',
      
      // System management
      'manage_subscriptions',
      'manage_organizations',
      'manage_system_settings',
      'view_system_analytics',
      
      // Content management
      'manage_reviews',
      'manage_messages',
      'manage_notifications',
      
      // Financial management
      'view_revenue_analytics',
      'manage_payments',
      'view_billing_data',
      
      // Support
      'manage_support_tickets',
      'view_system_logs',
      'manage_api_keys',
      
      // Advanced
      'database_access',
      'system_maintenance',
      'backup_restore',
      'export_data'
    ]
  }],
  
  // Admin status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Security
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  activityLog: [{
    action: String,
    target: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // Settings
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      system: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ lastLogin: -1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if admin has permission
adminSchema.methods.hasPermission = function(permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;
  
  return this.permissions.includes(permission);
};

// Method to check if admin has any of the given permissions
adminSchema.methods.hasAnyPermission = function(permissions) {
  if (this.role === 'super_admin') return true;
  
  return permissions.some(permission => this.permissions.includes(permission));
};

// Method to log activity
adminSchema.methods.logActivity = function(action, target, details = {}, req = null) {
  this.activityLog.push({
    action,
    target,
    details,
    timestamp: new Date(),
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.headers?.['user-agent']
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to get default permissions by role
adminSchema.statics.getDefaultPermissions = function(role) {
  const permissions = {
    super_admin: [
      'manage_users',
      'manage_restaurant_owners',
      'manage_customers',
      'view_user_analytics',
      'manage_restaurants',
      'manage_floorplans',
      'manage_bookings',
      'view_restaurant_analytics',
      'manage_subscriptions',
      'manage_organizations',
      'manage_system_settings',
      'view_system_analytics',
      'manage_reviews',
      'manage_messages',
      'manage_notifications',
      'view_revenue_analytics',
      'manage_payments',
      'view_billing_data',
      'manage_support_tickets',
      'view_system_logs',
      'manage_api_keys',
      'database_access',
      'system_maintenance',
      'backup_restore',
      'export_data'
    ],
    admin: [
      'manage_users',
      'manage_restaurant_owners',
      'manage_customers',
      'view_user_analytics',
      'manage_restaurants',
      'manage_floorplans',
      'manage_bookings',
      'view_restaurant_analytics',
      'manage_subscriptions',
      'manage_organizations',
      'manage_reviews',
      'manage_messages',
      'view_revenue_analytics',
      'manage_support_tickets',
      'view_system_logs',
      'export_data'
    ],
    moderator: [
      'manage_restaurants',
      'manage_floorplans',
      'manage_bookings',
      'manage_reviews',
      'manage_messages',
      'manage_support_tickets'
    ],
    support: [
      'view_user_analytics',
      'view_restaurant_analytics',
      'manage_support_tickets',
      'view_system_logs'
    ]
  };
  
  return permissions[role] || [];
};

// Static method to create super admin
adminSchema.statics.createSuperAdmin = async function(adminData) {
  const superAdmin = new this({
    ...adminData,
    role: 'super_admin',
    permissions: this.getDefaultPermissions('super_admin')
  });
  
  return superAdmin.save();
};

export default mongoose.models.Admin || mongoose.model('Admin', adminSchema);
