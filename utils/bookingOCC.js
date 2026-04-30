/**
 * Optimistic Concurrency Control (OCC) utilities for booking system
 * Provides functions for managing reservation holds and preventing conflicts
 */

import dbConnect, { startSession } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import TableLock from '@/models/TableLock';

/**
 * Create a short-term reservation hold for a table
 * @param {Object} params - Reservation parameters
 * @param {string} params.restaurantId - Restaurant ID
 * @param {string} params.tableId - Table ID
 * @param {string} params.date - Booking date
 * @param {string} params.startTime - Start time
 * @param {string} params.endTime - End time
 * @param {number} params.guestCount - Number of guests
 * @param {string} params.userId - User ID
 * @param {number} params.holdDurationMinutes - Hold duration in minutes (default: 5)
 * @returns {Promise<Object>} Lock information
 */
export async function createReservationHold({
  restaurantId,
  tableId,
  date,
  startTime,
  endTime,
  guestCount,
  userId,
  holdDurationMinutes = 5
}) {
  await dbConnect();
  
  const lockDate = new Date(date);
  lockDate.setHours(0, 0, 0, 0);
  const expiresAt = new Date(Date.now() + (holdDurationMinutes * 60 * 1000));

  // Check for existing conflicts
  const conflicts = await checkBookingConflicts({
    restaurantId,
    tableId,
    date: lockDate,
    startTime,
    endTime
  });

  if (conflicts.hasConflicts) {
    throw new Error(`Table conflicts detected: ${conflicts.summary}`);
  }

  // Create lock
  const lockId = TableLock.generateLockId();
  const tableLock = new TableLock({
    lockId,
    restaurantId,
    tableId,
    userId,
    date: lockDate,
    startTime,
    endTime,
    guestCount,
    expiresAt
  });

  await tableLock.save();
  return tableLock;
}

/**
 * Confirm a reservation hold and create a booking
 * @param {string} lockId - Lock ID to confirm
 * @param {Object} bookingData - Additional booking data
 * @returns {Promise<Object>} Created booking
 */
export async function confirmReservationHold(lockId, bookingData = {}) {
  await dbConnect();
  
  const tableLock = await TableLock.findOne({ 
    lockId,
    status: 'active'
  });

  if (!tableLock) {
    throw new Error('Reservation hold not found or expired');
  }

  if (tableLock.isExpired()) {
    await tableLock.updateOne({ status: 'expired' });
    throw new Error('Reservation hold has expired');
  }

  // Start transaction
  const session = await startSession();
  
  try {
    let createdBooking;
    
    await session.withTransaction(async () => {
      // Double-check for conflicts
      const conflicts = await checkBookingConflicts({
        restaurantId: tableLock.restaurantId,
        tableId: tableLock.tableId,
        date: tableLock.date,
        startTime: tableLock.startTime,
        endTime: tableLock.endTime
      });

      if (conflicts.hasConflicts) {
        throw new Error('Table is no longer available');
      }

      // Create booking
      const booking = new Booking({
        restaurantId: tableLock.restaurantId,
        tableId: tableLock.tableId,
        userId: tableLock.userId,
        date: tableLock.date,
        startTime: tableLock.startTime,
        endTime: tableLock.endTime,
        guestCount: tableLock.guestCount,
        status: 'confirmed',
        customerName: bookingData.customerName || tableLock.metadata.customerName,
        customerEmail: bookingData.customerEmail || tableLock.metadata.customerEmail,
        customerPhone: bookingData.customerPhone || tableLock.metadata.customerPhone,
        specialRequests: bookingData.specialRequests || '',
        pricing: bookingData.pricing || tableLock.metadata.pricing,
        lockInfo: {
          lockId: tableLock.lockId,
          lockedAt: tableLock.lockedAt,
          lockExpiresAt: tableLock.expiresAt
        }
      });

      booking.addToHistory('created', {
        tableId: tableLock.tableId,
        guestCount: tableLock.guestCount,
        startTime: tableLock.startTime,
        endTime: tableLock.endTime,
        fromLock: true,
        lockId: tableLock.lockId
      });

      createdBooking = await booking.save({ session });

      // Mark lock as confirmed
      tableLock.status = 'confirmed';
      tableLock.confirmedAt = new Date();
      await tableLock.save({ session });
    });

    return createdBooking;
  } finally {
    await session.endSession();
  }
}

/**
 * Release a reservation hold
 * @param {string} lockId - Lock ID to release
 * @returns {Promise<Object>} Release confirmation
 */
export async function releaseReservationHold(lockId) {
  await dbConnect();
  
  const tableLock = await TableLock.findOne({ lockId });
  
  if (!tableLock) {
    throw new Error('Reservation hold not found');
  }

  if (tableLock.status === 'confirmed') {
    throw new Error('Cannot release a confirmed reservation');
  }

  await tableLock.release();
  return { success: true, lockId, status: 'released' };
}

/**
 * Check for booking conflicts
 * @param {Object} params - Conflict check parameters
 * @returns {Promise<Object>} Conflict analysis
 */
export async function checkBookingConflicts({
  restaurantId,
  tableId,
  date,
  startTime,
  endTime,
  excludeLockId = null
}) {
  await dbConnect();
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // Check for existing bookings
  const existingBookings = await Booking.countDocuments({
    restaurantId,
    tableId,
    date: checkDate,
    startTime,
    endTime,
    status: { $in: ['pending', 'confirmed'] }
  });

  // Check for active locks
  const activeLocks = await TableLock.countDocuments({
    restaurantId,
    tableId,
    date: checkDate,
    startTime,
    endTime,
    status: 'active',
    expiresAt: { $gt: new Date() },
    ...(excludeLockId && { lockId: { $ne: excludeLockId } })
  });

  const hasConflicts = existingBookings > 0 || activeLocks > 0;
  
  return {
    hasConflicts,
    existingBookings,
    activeLocks,
    summary: hasConflicts 
      ? `${existingBookings} bookings, ${activeLocks} active locks`
      : 'No conflicts detected'
  };
}

/**
 * Update booking with optimistic concurrency control
 * @param {string} bookingId - Booking ID
 * @param {Object} updates - Updates to apply
 * @param {number} expectedVersion - Expected version number
 * @returns {Promise<Object>} Updated booking
 */
export async function updateBookingWithOCC(bookingId, updates, expectedVersion) {
  await dbConnect();
  
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  return await booking.updateWithOCC(updates, expectedVersion);
}

/**
 * Extend a reservation hold
 * @param {string} lockId - Lock ID to extend
 * @param {number} minutes - Minutes to extend
 * @returns {Promise<Object>} Extended lock
 */
export async function extendReservationHold(lockId, minutes = 5) {
  await dbConnect();
  
  const tableLock = await TableLock.findOne({ 
    lockId,
    status: 'active'
  });

  if (!tableLock) {
    throw new Error('Active reservation hold not found');
  }

  if (tableLock.isExpired()) {
    throw new Error('Reservation hold has already expired');
  }

  await tableLock.extendLock(minutes);
  return tableLock;
}

/**
 * Get reservation hold status
 * @param {string} lockId - Lock ID
 * @returns {Promise<Object>} Lock status
 */
export async function getReservationHoldStatus(lockId) {
  await dbConnect();
  
  const tableLock = await TableLock.findOne({ lockId });
  
  if (!tableLock) {
    throw new Error('Reservation hold not found');
  }

  const isExpired = tableLock.isExpired();
  const timeRemaining = isExpired ? 0 : Math.max(0, tableLock.expiresAt - Date.now());

  return {
    lockId: tableLock.lockId,
    status: isExpired ? 'expired' : tableLock.status,
    expiresAt: tableLock.expiresAt,
    timeRemainingMs: timeRemaining,
    timeRemainingMinutes: Math.ceil(timeRemaining / (1000 * 60)),
    tableId: tableLock.tableId,
    date: tableLock.date,
    startTime: tableLock.startTime,
    endTime: tableLock.endTime,
    guestCount: tableLock.guestCount,
    isExpired
  };
}

/**
 * Cleanup expired reservation holds
 * @returns {Promise<number>} Number of cleaned up locks
 */
export async function cleanupExpiredHolds() {
  await dbConnect();
  return await TableLock.cleanupExpiredLocks();
}

/**
 * Get booking with version information for OCC
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Booking with version
 */
export async function getBookingForOCC(bookingId) {
  await dbConnect();
  
  const booking = await Booking.findById(bookingId).select('+version');
  if (!booking) {
    throw new Error('Booking not found');
  }

  return {
    _id: booking._id,
    version: booking.version,
    status: booking.status,
    // Include other necessary fields for client-side OCC
    tableId: booking.tableId,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    guestCount: booking.guestCount
  };
}
