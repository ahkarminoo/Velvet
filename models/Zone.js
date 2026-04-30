import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
    maxlength: 50
  },
  type: {
    type: String,
    enum: ['vip', 'standard', 'bar_counter', 'outdoor', 'private', 'dance_floor', 'stage', 'lounge'],
    default: 'standard'
  },
  color: {
    type: String,
    default: '#C9A84C'
  },
  tableIds: [{ type: String }],
  pricing: {
    basePrice: { type: Number, default: 0, min: 0 },
    minimumSpend: { type: Number, default: 0, min: 0 },
    depositRequired: { type: Boolean, default: false },
    depositAmount: { type: Number, default: 0, min: 0 },
    peakMultiplier: { type: Number, default: 1.0, min: 0.1, max: 10 },
    eventMultiplier: { type: Number, default: 1.0, min: 0.1, max: 10 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

zoneSchema.index({ restaurantId: 1, floorplanId: 1 });
zoneSchema.index({ restaurantId: 1, isActive: 1 });

export default mongoose.models.Zone || mongoose.model('Zone', zoneSchema);
