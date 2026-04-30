import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can't favorite the same restaurant twice
favoriteSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
export default Favorite; 