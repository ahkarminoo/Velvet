import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  lineId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  lineUserId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  displayName: {
    type: String,
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['waiter', 'manager', 'hostess', 'admin'],
    default: 'waiter'
  },
  permissions: {
    canViewBookings: {
      type: Boolean,
      default: true
    },
    canCreateBookings: {
      type: Boolean,
      default: true
    },
    canUpdateBookings: {
      type: Boolean,
      default: true
    },
    canCancelBookings: {
      type: Boolean,
      default: false
    },
    canDeleteBookings: {
      type: Boolean,
      default: false
    },
    canManageStaff: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    required: false,
    default: ''
  }
}, { 
  timestamps: true,
  strict: true
});

// Set default permissions based on role
staffSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = {
          canViewBookings: true,
          canCreateBookings: true,
          canUpdateBookings: true,
          canCancelBookings: true,
          canDeleteBookings: true,
          canManageStaff: true
        };
        break;
      case 'manager':
        this.permissions = {
          canViewBookings: true,
          canCreateBookings: true,
          canUpdateBookings: true,
          canCancelBookings: true,
          canDeleteBookings: false,
          canManageStaff: true
        };
        break;
      case 'hostess':
        this.permissions = {
          canViewBookings: true,
          canCreateBookings: true,
          canUpdateBookings: true,
          canCancelBookings: true,
          canDeleteBookings: false,
          canManageStaff: false
        };
        break;
      case 'waiter':
      default:
        this.permissions = {
          canViewBookings: true,
          canCreateBookings: false,
          canUpdateBookings: true,
          canCancelBookings: false,
          canDeleteBookings: false,
          canManageStaff: false
        };
        break;
    }
  }
  next();
});

// Force model recreation to avoid cache issues
if (mongoose.models.Staff) {
  delete mongoose.models.Staff;
}

export default mongoose.model('Staff', staffSchema);
