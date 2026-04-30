import mongoose from 'mongoose';

const tableLockSchema = new mongoose.Schema({
    lockId: {
        type: String,
        unique: true,
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    tableId: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    guestCount: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'confirmed', 'released'],
        default: 'active'
    },
    lockedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    confirmedAt: {
        type: Date,
        required: false
    },
    metadata: {
        customerName: String,
        customerEmail: String,
        customerPhone: String,
        specialRequests: String,
        pricing: {
            basePrice: { type: Number, default: 100 },
            finalPrice: { type: Number, required: true },
            currency: { type: String, default: 'THB' },
            factors: {
                demandFactor: { type: Number, default: 1.0 },
                temporalFactor: { type: Number, default: 1.0 },
                historicalFactor: { type: Number, default: 1.0 },
                capacityFactor: { type: Number, default: 1.0 },
                holidayFactor: { type: Number, default: 1.0 }
            },
            context: {
                occupancyRate: Number,
                tableCapacity: Number,
                tableLocation: String,
                demandLevel: String,
                holidayName: String
            },
            confidence: { type: Number, default: 0.8 },
            calculatedAt: { type: Date, default: Date.now }
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
tableLockSchema.index({ lockId: 1 }, { unique: true });
tableLockSchema.index({ restaurantId: 1, date: 1, tableId: 1 });
tableLockSchema.index({ userId: 1 });
tableLockSchema.index({ status: 1, expiresAt: 1 });
tableLockSchema.index({ expiresAt: 1 }); // For cleanup jobs

// Unique compound index to prevent multiple locks on same table-time
tableLockSchema.index(
    { 
        restaurantId: 1, 
        tableId: 1, 
        date: 1, 
        startTime: 1, 
        endTime: 1 
    }, 
    { 
        unique: true,
        partialFilterExpression: {
            status: 'active'
        }
    }
);

// Method to check if lock is expired
tableLockSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to extend lock expiration
tableLockSchema.methods.extendLock = function(minutes = 5) {
    this.expiresAt = new Date(Date.now() + (minutes * 60 * 1000));
    return this.save();
};

// Method to confirm lock (convert to booking)
tableLockSchema.methods.confirm = function() {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    return this.save();
};

// Method to release lock
tableLockSchema.methods.release = function() {
    this.status = 'released';
    return this.save();
};

// Static method to find active locks for a table-time
tableLockSchema.statics.findActiveLocks = function(restaurantId, tableId, date, startTime, endTime) {
    const lockDate = new Date(date);
    lockDate.setHours(0, 0, 0, 0);
    
    return this.find({
        restaurantId,
        tableId,
        date: lockDate,
        startTime,
        endTime,
        status: 'active',
        expiresAt: { $gt: new Date() }
    });
};

// Static method to cleanup expired locks
tableLockSchema.statics.cleanupExpiredLocks = async function() {
    const result = await this.updateMany(
        {
            status: 'active',
            expiresAt: { $lt: new Date() }
        },
        {
            status: 'expired'
        }
    );
    
    console.log(`Cleaned up ${result.modifiedCount} expired locks`);
    return result.modifiedCount;
};

// Static method to generate unique lock ID
tableLockSchema.statics.generateLockId = function() {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const TableLock = mongoose.models.TableLock || mongoose.model('TableLock', tableLockSchema);

export default TableLock;