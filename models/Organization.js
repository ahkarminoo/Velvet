import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  // Basic organization info
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Organization type
  type: {
    type: String,
    enum: ['restaurant', 'hotel', 'cafe', 'bar', 'catering', 'other'],
    default: 'restaurant'
  },
  
  // Contact information
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Organization settings
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Bangkok'
    },
    currency: {
      type: String,
      default: 'THB'
    },
    language: {
      type: String,
      default: 'th'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      default: '24h'
    }
  },
  
  // Branding
  branding: {
    logo: {
      type: String,
      default: ''
    },
    primaryColor: {
      type: String,
      default: '#FF4F18'
    },
    secondaryColor: {
      type: String,
      default: '#FFFFFF'
    },
    customDomain: {
      type: String,
      default: ''
    }
  },
  
  // Members and roles
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'staff'],
      default: 'staff'
    },
    permissions: [{
      type: String,
      enum: [
        'manage_organization',
        'manage_subscription',
        'manage_restaurants',
        'manage_staff',
        'manage_bookings',
        'view_analytics',
        'manage_settings'
      ]
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Organization status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  
  // Subscription reference
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  
  // Usage statistics
  stats: {
    totalRestaurants: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  
  // Metadata
  metadata: {
    industry: String,
    size: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise'],
      default: 'small'
    },
    foundedYear: Number,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ email: 1 });
organizationSchema.index({ 'members.userId': 1 });
organizationSchema.index({ status: 1 });

// Virtual for getting owner
organizationSchema.virtual('owner').get(function() {
  return this.members.find(member => member.role === 'owner');
});

// Virtual for getting active members
organizationSchema.virtual('activeMembers').get(function() {
  return this.members.filter(member => member.isActive);
});

// Method to add member
organizationSchema.methods.addMember = function(userId, role = 'staff', permissions = []) {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (existingMember) {
    existingMember.role = role;
    existingMember.permissions = permissions;
    existingMember.isActive = true;
  } else {
    this.members.push({
      userId,
      role,
      permissions,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Method to remove member
organizationSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
  
  return this.save();
};

// Method to check if user has permission
organizationSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
  
  if (!member) return false;
  
  // Owner has all permissions
  if (member.role === 'owner') return true;
  
  // Check specific permission
  return member.permissions.includes(permission);
};

// Method to get user role
organizationSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
  
  return member ? member.role : null;
};

// Static method to generate unique slug
organizationSchema.statics.generateSlug = async function(name) {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  let slug = baseSlug;
  let counter = 1;
  
  while (await this.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

// Pre-save middleware to generate slug if not provided
organizationSchema.pre('save', async function(next) {
  if (this.isNew && !this.slug) {
    this.slug = await this.constructor.generateSlug(this.name);
  }
  next();
});

export default mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
