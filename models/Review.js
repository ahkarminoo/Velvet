import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  images: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'flagged', 'hidden', 'removed'],
    default: 'active'
  },
  flaggedReason: {
    type: String,
    default: null
  },
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  flaggedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compound index to ensure a user can only review a restaurant once
reviewSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review; 