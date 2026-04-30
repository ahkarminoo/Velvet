import mongoose from 'mongoose';

const thaiHolidaySchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    nameEn: { 
        type: String, 
        required: true 
    },
    nameTh: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: [
            'major_festival',    // Songkran, New Year
            'celebration',       // New Year's Eve, Valentine's Day
            'cultural_festival', // Loy Krathong, Chinese New Year
            'religious',         // Buddhist holidays
            'royal',            // Royal birthdays, ceremonies
            'national',         // Constitution Day, Labour Day
            'international'     // Valentine's, Mother's Day
        ],
        required: true 
    },
    impact: { 
        type: Number, 
        min: 1.0, 
        max: 2.0, 
        required: true,
        default: 1.1
    },
    description: {
        type: String,
        default: ''
    },
    isNationalHoliday: {
        type: Boolean,
        default: true
    },
    businessImpact: {
        type: String,
        enum: ['very_high', 'high', 'medium', 'low'],
        required: true
    },
    recommendedActions: [{
        type: String
    }],
    
    // Pricing strategy for this holiday
    pricingStrategy: {
        coupleTableMultiplier: { type: Number, default: 1.0 },
        familyTableMultiplier: { type: Number, default: 1.0 },
        groupTableMultiplier: { type: Number, default: 1.0 },
        peakHoursExtension: { type: Boolean, default: false },
        earlyBookingRecommended: { type: Boolean, default: false }
    }
}, { 
    timestamps: true 
});

// Indexes for fast lookups
thaiHolidaySchema.index({ date: 1 });
thaiHolidaySchema.index({ type: 1 });
thaiHolidaySchema.index({ businessImpact: 1 });

// Method to get holiday by date
thaiHolidaySchema.statics.getHolidayByDate = async function(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.findOne({ date: targetDate });
};

// Method to get holidays in date range
thaiHolidaySchema.statics.getHolidaysInRange = async function(startDate, endDate) {
    return this.find({
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ date: 1 });
};

// Method to get next upcoming holiday
thaiHolidaySchema.statics.getNextHoliday = async function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.findOne({
        date: { $gte: today }
    }).sort({ date: 1 });
};

// Method to check if date is near holiday (within 3 days)
thaiHolidaySchema.statics.isNearHoliday = async function(date) {
    const targetDate = new Date(date);
    const threeDaysBefore = new Date(targetDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    const threeDaysAfter = new Date(targetDate);
    threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);
    
    const holidays = await this.find({
        date: {
            $gte: threeDaysBefore,
            $lte: threeDaysAfter
        }
    });
    
    return holidays.length > 0 ? holidays : null;
};

const ThaiHoliday = mongoose.models.ThaiHoliday || mongoose.model('ThaiHoliday', thaiHolidaySchema);

export default ThaiHoliday;
