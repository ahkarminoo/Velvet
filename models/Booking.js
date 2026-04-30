import mongoose from 'mongoose';

const DEFAULT_BOOKING_DURATION_MINUTES = 120;

function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;

    const trimmed = timeStr.trim();
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
        let hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2]);
        const period = twelveHourMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = Number(twentyFourHourMatch[1]);
        const minutes = Number(twentyFourHourMatch[2]);
        return hours * 60 + minutes;
    }

    return NaN;
}

function inferDurationMinutes(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (Number.isNaN(start) || Number.isNaN(end)) return DEFAULT_BOOKING_DURATION_MINUTES;

    let duration = end - start;
    if (duration <= 0) duration += 24 * 60;

    if (duration < 30 || duration > 360) {
        return DEFAULT_BOOKING_DURATION_MINUTES;
    }

    return duration;
}
 
const bookingSchema = new mongoose.Schema({
    bookingRef: {
        type: String,
        unique: true,
        // Will be auto-generated in pre-save
    },
    version: {
        type: Number,
        default: 0
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    floorplanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Floorplan',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: false
    },
    zoneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
        required: false
    },
    bookingType: {
        type: String,
        enum: ['table', 'booth', 'bottle_service', 'event_ticket', 'group'],
        default: 'table'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tableId: {
        type: String,
        required: true        // This will store the friendly ID (e.g., 't1')
    },
    originalTableId: {        // Add this new field
        type: String,
        required: false       // Optional, stores the original UUID if needed
    },
    customerName: {
        type: String,
        required: [true, 'Please provide customer name']
    },
    customerEmail: {
        type: String,
        required: [true, 'Please provide customer email'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    customerPhone: {
        type: String,
        required: false, // Made optional to support Google login users without phone numbers
        default: 'Not provided'
    },
    date: {
        type: Date,
        required: [true, 'Please provide booking date']
    },
    startTime: {
        type: String,
        required: [true, 'Please provide booking start time']
    },
    endTime: {
        type: String,
        required: [true, 'Please provide booking end time']
    },
    durationMinutes: {
        type: Number,
        min: 30,
        max: 360,
        default: DEFAULT_BOOKING_DURATION_MINUTES
    },
    guestCount: {
        type: Number,
        required: [true, 'Please provide number of guests'],
        min: [1, 'Must have at least 1 guest']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    specialRequests: {
        type: String,
        default: ''
    },
   
    // Lock information for reservation holds
    lockInfo: {
        lockId: { type: String, required: false },
        lockedAt: { type: Date, required: false },
        lockExpiresAt: { type: Date, required: false }
    },
   
    // Dynamic pricing information
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
        // Zone & event extensions
        zoneBasePrice: { type: Number, default: 0 },
        zoneName: { type: String, default: '' },
        eventCoverCharge: { type: Number, default: 0 },
        minimumSpend: { type: Number, default: 0 },
        depositPaid: { type: Number, default: 0 },
        confidence: { type: Number, default: 0.8 },
        calculatedAt: { type: Date, default: Date.now }
    },
    history: [{
        action: {
            type: String,
            enum: ['created', 'modified', 'cancelled', 'completed', 'confirmed', 'rejected'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    }]
}, {
    timestamps: true
});
 
// Generate booking reference number before saving
bookingSchema.pre('save', async function(next) {
    if (!this.bookingRef) {
        // Generate date-based prefix (e.g., "BK230224" for Feb 24, 2023)
        const datePrefix = new Date().toISOString().slice(2,8).replace(/-/g, '');
       
        // Find the latest booking number for today
        const latestBooking = await this.constructor.findOne(
            { bookingRef: new RegExp(`^BK${datePrefix}`) },
            { bookingRef: 1 },
            { sort: { bookingRef: -1 } }
        );
 
        // Generate new sequence number
        let sequenceNumber = '001';
        if (latestBooking && latestBooking.bookingRef) {
            const lastSequence = parseInt(latestBooking.bookingRef.slice(-3));
            sequenceNumber = String(lastSequence + 1).padStart(3, '0');
        }
 
        // Combine to create booking reference (e.g., "BK230224001")
        this.bookingRef = `BK${datePrefix}${sequenceNumber}`;
    }
    next();
});

bookingSchema.pre('validate', function(next) {
    if (!this.durationMinutes || this.durationMinutes < 30 || this.durationMinutes > 360) {
        this.durationMinutes = inferDurationMinutes(this.startTime, this.endTime);
    }
    next();
});
 
// Indexes for querying bookings efficiently
bookingSchema.index({ restaurantId: 1, date: 1 });
bookingSchema.index({ tableId: 1, date: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ bookingRef: 1 }, { unique: true });
bookingSchema.index({ 'history.timestamp': 1 });
 
// Compound indexes for better performance
bookingSchema.index({ restaurantId: 1, date: 1, status: 1 });
bookingSchema.index({ tableId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, date: -1 });
bookingSchema.index({ status: 1, date: 1 });
 
// Unique compound index to prevent double bookings (OCC constraint)
bookingSchema.index(
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
            status: { $in: ['pending', 'confirmed'] }
        }
    }
);
 
// Index for lock management
bookingSchema.index({ 'lockInfo.lockId': 1 });
bookingSchema.index({ 'lockInfo.lockExpiresAt': 1 });
 
// Method to check if table is available for a specific time
bookingSchema.statics.isTableAvailable = async function(tableId, date, startTime, endTime, restaurantId = null, excludeBookingId = null) {
    console.log('Checking availability for:', { tableId, date, startTime, endTime, restaurantId, excludeBookingId });

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(bookingDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const timeToMinutes = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return NaN;

        const trimmed = timeStr.trim();
        const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (twelveHourMatch) {
            let hours = Number(twelveHourMatch[1]);
            const minutes = Number(twelveHourMatch[2]);
            const period = twelveHourMatch[3].toUpperCase();

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        }

        const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
        if (twentyFourHourMatch) {
            const hours = Number(twentyFourHourMatch[1]);
            const minutes = Number(twentyFourHourMatch[2]);
            return hours * 60 + minutes;
        }

        return NaN;
    };

    const requestStart = timeToMinutes(startTime);
    const requestEnd = timeToMinutes(endTime);

    if (Number.isNaN(requestStart) || Number.isNaN(requestEnd)) {
        console.warn('Invalid time format in isTableAvailable:', { startTime, endTime });
        return false;
    }

    const query = {
        date: { $gte: bookingDate, $lt: nextDate },
        status: { $in: ['pending', 'confirmed'] },
        $or: [
            { tableId },
            { originalTableId: tableId }
        ]
    };

    if (restaurantId) {
        query.restaurantId = restaurantId;
    }

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const existingBookings = await this.find(query)
        .select('_id startTime endTime tableId originalTableId')
        .lean();

    if (existingBookings.length === 0) {
        return true;
    }

    const hasOverlap = existingBookings.some((booking) => {
        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);

        if (Number.isNaN(bookingStart) || Number.isNaN(bookingEnd)) return false;
        return bookingStart < requestEnd && bookingEnd > requestStart;
    });

    console.log(`Checking table ${tableId} for date ${bookingDate.toISOString().split('T')[0]}:`, hasOverlap ? 'Booked' : 'Available');

    return !hasOverlap;
};
 
// Method to get all bookings for a restaurant on a specific date
bookingSchema.statics.getRestaurantBookings = async function(restaurantId, date) {
    return this.find({
        restaurantId,
        date,
        status: { $in: ['pending', 'confirmed'] }
    })
    .populate('userId', 'firstName lastName contactNumber')
    .sort({ time: 1 });
};
 
// Method to get table bookings
bookingSchema.statics.getTableBookings = async function(tableId, date) {
    return this.find({
        $or: [
            { tableId: tableId },
            { originalTableId: tableId }
        ],
        date,
        status: { $in: ['pending', 'confirmed'] }
    })
    .populate('userId', 'firstName lastName contactNumber')
    .sort({ time: 1 });
};
 
// Method to find booking by reference
bookingSchema.statics.findByBookingRef = async function(bookingRef) {
    return this.findOne({ bookingRef });
};
 
// Method to get bookings for a specific user
bookingSchema.statics.getUserBookings = async function(userId) {
    return this.find({ userId })
        .populate('restaurantId')
        .sort({ date: -1, time: -1 });
};
 
// Pre-save middleware to increment version for OCC
bookingSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.version += 1;
    }
    next();
});
 
// Add a method to record history
bookingSchema.methods.addToHistory = function(action, details = {}) {
    // Check for duplicate recent entries (within last 5 seconds)
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
   
    const recentDuplicate = this.history.find(entry => {
        if (entry.action !== action) return false;
        if (entry.timestamp < fiveSecondsAgo) return false;
       
        // Check if details are the same
        if (action === 'modified' && details.previousStatus && details.newStatus) {
            return entry.details.get('previousStatus') === details.previousStatus &&
                   entry.details.get('newStatus') === details.newStatus;
        }
       
        return false;
    });
   
    // Only add if no recent duplicate found
    if (!recentDuplicate) {
        this.history.push({
            action,
            details
        });
    }
};
 
// OCC method to update booking with version check
bookingSchema.methods.updateWithOCC = async function(updates, expectedVersion) {
    if (this.version !== expectedVersion) {
        throw new Error(`Optimistic concurrency control failed. Expected version ${expectedVersion}, but current version is ${this.version}`);
    }
   
    // Apply updates
    Object.assign(this, updates);
    return await this.save();
};
 
// Static method to find and update with OCC
bookingSchema.statics.findAndUpdateWithOCC = async function(filter, updates, expectedVersion) {
    const booking = await this.findOne(filter);
    if (!booking) {
        throw new Error('Booking not found');
    }
   
    return await booking.updateWithOCC(updates, expectedVersion);
};
 
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
 
export default Booking;
 
