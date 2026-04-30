import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['live_music', 'dj_night', 'private_party', 'sports_viewing', 'themed_night', 'wine_tasting', 'gala', 'happy_hour', 'other'],
    default: 'other'
  },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  coverCharge: { type: Number, default: 0, min: 0 },
  floorplanIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Floorplan'
  }],
  zoneOverrides: [{
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    priceMultiplier: { type: Number, default: 1.0, min: 0 },
    minimumSpend: { type: Number, default: 0, min: 0 },
    isExclusive: { type: Boolean, default: false }
  }],
  capacity: { type: Number, default: 0, min: 0 },
  currentBookings: { type: Number, default: 0 },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  bookingDeadline: { type: Date },
  externalTicketUrl: { type: String, default: '' }
}, { timestamps: true });

eventSchema.index({ venueId: 1, date: 1 });
eventSchema.index({ venueId: 1, status: 1 });
eventSchema.index({ date: 1, status: 1 });

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
