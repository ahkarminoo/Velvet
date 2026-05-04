import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketRef: { type: String, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  guestName: { type: String, required: true, trim: true },
  guestEmail: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 1, min: 1, max: 10 },
  attendanceType: { type: String, enum: ['ga', 'table'], default: 'ga' },
  tableBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  coverCharge: { type: Number, default: 0 },
  userId: { type: String, default: '' },
  status: { type: String, enum: ['active', 'used', 'cancelled'], default: 'active' },
}, { timestamps: true });

ticketSchema.pre('save', function (next) {
  if (!this.ticketRef) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let ref = 'TKT-';
    for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    this.ticketRef = ref;
  }
  next();
});

ticketSchema.index({ eventId: 1, status: 1 });
ticketSchema.index({ venueId: 1, createdAt: -1 });
ticketSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
