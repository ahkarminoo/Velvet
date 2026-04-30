# Optimistic Concurrency Control (OCC) Implementation

## Overview

This document describes the implementation of Optimistic Concurrency Control (OCC) with unique constraints and optional short reservation holds for the restaurant booking system.

## Key Features

### 1. Optimistic Concurrency Control (OCC)
- **Version Field**: Each booking document includes a `version` field that increments on every update
- **Version Checking**: Updates require the expected version number to prevent concurrent modifications
- **Conflict Detection**: Automatic detection of concurrent booking attempts

### 2. Unique Constraints
- **Compound Index**: Prevents double bookings with a unique compound index on `(restaurantId, tableId, date, startTime, endTime)`
- **Partial Filter**: Only applies to active bookings (`pending`, `confirmed` status)
- **Database-Level Protection**: MongoDB enforces uniqueness at the database level

### 3. Short Reservation Holds
- **TableLock Model**: Temporary locks that reserve tables for a specified duration (default: 5 minutes)
- **Automatic Expiration**: Locks automatically expire and can be cleaned up
- **Lock Management**: Create, confirm, extend, and release locks through dedicated APIs

## Database Schema Changes

### Booking Model Updates

```javascript
// Added fields for OCC and lock management
{
  version: { type: Number, default: 0 },           // OCC version field
  lockInfo: {                                      // Lock information
    lockId: String,
    lockedAt: Date,
    lockExpiresAt: Date
  }
}

// New indexes for OCC and locks
bookingSchema.index(
  { restaurantId: 1, tableId: 1, date: 1, startTime: 1, endTime: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }
  }
);
```

### New TableLock Model

```javascript
{
  lockId: String,                    // Unique lock identifier
  restaurantId: ObjectId,            // Restaurant reference
  tableId: String,                   // Table identifier
  userId: ObjectId,                  // User who created the lock
  date: Date,                        // Booking date
  startTime: String,                 // Start time
  endTime: String,                   // End time
  guestCount: Number,                // Number of guests
  status: String,                    // active, expired, confirmed, released
  lockedAt: Date,                    // When lock was created
  expiresAt: Date,                   // When lock expires
  confirmedAt: Date,                 // When lock was confirmed (optional)
  metadata: {                        // Additional booking data
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    pricing: Object
  }
}
```

## API Endpoints

### 1. Create Soft Lock
**POST** `/api/bookings/create-soft-lock`

Creates a temporary reservation hold for a table.

**Request Body:**
```json
{
  "restaurantId": "string",
  "tableId": "string", 
  "date": "string",
  "startTime": "string",
  "endTime": "string",
  "guestCount": "number",
  "holdDurationMinutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "lock": {
    "lockId": "string",
    "tableId": "string",
    "expiresAt": "date",
    "holdDurationMinutes": 5,
    "status": "active"
  }
}
```

### 2. Confirm Soft Lock
**POST** `/api/bookings/confirm-soft-lock`

Converts a lock into a confirmed booking.

**Request Body:**
```json
{
  "lockId": "string",
  "specialRequests": "string",
  "pricing": {}
}
```

### 3. Release Soft Lock
**POST** `/api/bookings/release-soft-lock`

Releases a reservation hold.

**GET** `/api/bookings/release-soft-lock?lockId=string`

Checks lock status and remaining time.

### 4. Conflict Check
**POST** `/api/bookings/conflict-check`

Comprehensive conflict analysis.

**GET** `/api/bookings/conflict-check`

Quick availability check.

### 5. Resolve Conflict
**POST** `/api/bookings/resolve-conflict`

Admin endpoint to resolve booking conflicts.

**GET** `/api/bookings/resolve-conflict`

Lists active conflicts.

### 6. Cleanup Expired
**POST** `/api/bookings/cleanup-expired`

System endpoint to clean up expired locks and stale bookings.

## Usage Patterns

### 1. Basic Booking Flow (Without Holds)

```javascript
// 1. Check availability
const availability = await fetch('/api/bookings/conflict-check', {
  method: 'GET',
  params: { restaurantId, tableId, date, startTime, endTime }
});

// 2. Create booking directly
const booking = await fetch('/api/scenes/[id]/book', {
  method: 'POST',
  body: { /* booking data */ }
});
```

### 2. Booking Flow with Reservation Holds

```javascript
// 1. Create reservation hold
const lock = await fetch('/api/bookings/create-soft-lock', {
  method: 'POST',
  body: { /* lock data */ }
});

// 2. User completes payment/form
// ... user interaction ...

// 3. Confirm the hold
const booking = await fetch('/api/bookings/confirm-soft-lock', {
  method: 'POST',
  body: { lockId: lock.lockId, /* additional data */ }
});

// Or release if user cancels
await fetch('/api/bookings/release-soft-lock', {
  method: 'POST',
  body: { lockId: lock.lockId }
});
```

### 3. Updating Bookings with OCC

```javascript
// 1. Get booking with version
const booking = await fetch('/api/bookings/[id]');
const { version } = booking;

// 2. Update with version check
const updated = await fetch('/api/bookings/[id]', {
  method: 'PATCH',
  body: { 
    status: 'cancelled',
    version: version  // Include current version
  }
});
```

## Error Handling

### Conflict Errors

- **409 Conflict**: Table already booked or locked
- **410 Gone**: Lock has expired
- **422 Unprocessable Entity**: OCC version mismatch

### Error Response Format

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "conflict": {
    "type": "booking|lock",
    "id": "conflict_id",
    "status": "current_status"
  }
}
```

## Configuration

### Environment Variables

```bash
# System cleanup token for automated cleanup
SYSTEM_CLEANUP_TOKEN=your_secure_token_here

# Default lock duration (minutes)
DEFAULT_LOCK_DURATION=5

# Cleanup interval (minutes)
CLEANUP_INTERVAL=10
```

### Default Settings

- **Lock Duration**: 5 minutes
- **Cleanup Interval**: Every 10 minutes
- **Stale Booking Threshold**: 24 hours
- **Max Lock Extensions**: 3 per lock

## Monitoring and Maintenance

### 1. Automated Cleanup

Set up a cron job or scheduled task to call the cleanup endpoint:

```bash
# Every 10 minutes
*/10 * * * * curl -X POST -H "Authorization: Bearer $SYSTEM_CLEANUP_TOKEN" \
  https://your-domain.com/api/bookings/cleanup-expired
```

### 2. Monitoring Metrics

Track these metrics for system health:

- Active locks count
- Expired locks count
- Booking conflict rate
- Average lock duration
- Cleanup success rate

### 3. Alerting

Set up alerts for:

- High conflict rates (>5%)
- Failed cleanup jobs
- Unusual lock durations
- Database constraint violations

## Performance Considerations

### 1. Indexes

The system uses optimized compound indexes for:
- Conflict detection queries
- Lock expiration cleanup
- User booking lookups

### 2. Transaction Usage

- Use MongoDB transactions for atomic operations
- Keep transactions short to reduce lock contention
- Handle transaction failures gracefully

### 3. Caching

Consider caching for:
- Restaurant table configurations
- Active lock counts
- Availability status

## Security Considerations

### 1. Authentication

- All endpoints require valid Firebase authentication
- Admin endpoints require additional authorization
- System cleanup requires special token

### 2. Rate Limiting

Implement rate limiting for:
- Lock creation (max 5 per user per minute)
- Conflict checks (max 20 per user per minute)
- Cleanup endpoint (max 1 per minute)

### 3. Data Validation

- Validate all input parameters
- Sanitize user-provided data
- Check user permissions for restaurant operations

## Testing

### 1. Unit Tests

Test individual functions:
- Lock creation and expiration
- Conflict detection
- OCC version handling
- Cleanup operations

### 2. Integration Tests

Test complete flows:
- End-to-end booking with holds
- Concurrent booking attempts
- Lock expiration scenarios
- Cleanup job execution

### 3. Load Testing

Test under concurrent load:
- Multiple users booking same table
- High-frequency lock creation
- Cleanup job performance

## Migration Guide

### 1. Database Migration

```javascript
// Add version field to existing bookings
db.bookings.updateMany(
  { version: { $exists: false } },
  { $set: { version: 0 } }
);

// Create new indexes
db.bookings.createIndex(
  { restaurantId: 1, tableId: 1, date: 1, startTime: 1, endTime: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }
  }
);
```

### 2. API Updates

- Update client code to handle new error codes
- Implement lock status checking
- Add version handling for booking updates

### 3. Monitoring Setup

- Deploy cleanup job
- Set up monitoring dashboards
- Configure alerting rules

## Troubleshooting

### Common Issues

1. **"Optimistic concurrency control failed"**
   - Client has stale version number
   - Refresh booking data and retry

2. **"Table is already locked"**
   - Another user has a reservation hold
   - Wait for lock to expire or choose different time

3. **"Lock has expired"**
   - Reservation hold exceeded time limit
   - Create new lock if table still available

4. **Cleanup job failures**
   - Check system token configuration
   - Verify database connectivity
   - Review error logs for specific issues

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_OCC=true
```

This will log detailed information about:
- Lock creation and expiration
- Conflict detection
- OCC version checks
- Cleanup operations
