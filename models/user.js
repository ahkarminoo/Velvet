import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  firstName: {
    type: String,
    required: false,
    default: '',
  },
  lastName: {
    type: String,
    required: false,
    default: '',
  },
  contactNumber: {
    type: String,
    required: false,
    default: '',
  },
  profileImage: {
    type: String,
    required: false,
    default: '',
  },
  lineUserId: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  role: {
    type: String,
    required: true,
    default: 'customer',
    enum: ['customer', 'admin', 'restaurant']
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { 
  timestamps: true,
  strict: true
});

export default mongoose.models.User || mongoose.model('User', userSchema);
