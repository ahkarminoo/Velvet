# Staff Notification System for LINE Bot

This document describes the implementation of the staff notification system that sends LINE messages to restaurant staff when customers book tables, creating a pending booking workflow that requires staff confirmation.

## Overview

The notification system creates a workflow where:
1. **Customer makes booking** → Booking created with `pending` status
2. **Staff receive LINE notification** → With options to confirm/reject
3. **Staff confirm/reject** → Booking status updated, customer notified
4. **Customer gets final confirmation** → Booking confirmed or rejected

## Key Features

### 🔔 **Automatic Staff Notifications**
- Instant LINE messages to all eligible staff when bookings are created
- Rich interactive buttons for quick confirmation/rejection
- Role-based permissions respected (only staff with appropriate permissions get action buttons)
- Works for both LINE bot bookings and web bookings

### ⏳ **Pending Booking Workflow**
- All new bookings start as `pending` instead of `confirmed`
- Staff must actively confirm bookings before they're finalized
- Prevents overbooking and gives staff control over reservations
- Booking history tracks all status changes with staff information

### 📱 **Customer Notifications**
- Customers receive confirmation when booking is approved
- Customers receive notification if booking is rejected
- Clear messaging about booking status throughout the process
- Only LINE customers receive LINE notifications (web customers handled separately)

### 👥 **Role-Based Access Control**
- **View Bookings**: All active staff with `canViewBookings` permission receive notifications
- **Confirm Bookings**: Only staff with `canUpdateBookings` can confirm bookings
- **Reject Bookings**: Only staff with `canCancelBookings` can reject bookings
- **Notification Content**: Varies based on staff permissions

## Technical Implementation

### Core Components

#### 1. **LINE Notification Service** (`lib/lineNotificationService.js`)
```javascript
// Send notifications to staff
await notifyStaffOfNewBooking(booking, restaurantId);

// Send confirmation to customer
await notifyCustomerOfBookingConfirmation(booking, staff);

// Send rejection to customer  
await notifyCustomerOfBookingRejection(booking, staff, reason);
```

#### 2. **Booking Status Flow**
```
Customer Request → PENDING → Staff Action → CONFIRMED/CANCELLED → Customer Notified
```

#### 3. **LINE Webhook Handlers**
- `action=confirm_booking&bookingId=X&staffId=Y` - Confirm pending booking
- `action=reject_booking&bookingId=X&staffId=Y` - Reject pending booking
- `action=booking_details&bookingId=X` - View detailed booking information

### Database Changes

#### Booking Model Updates
- **Status**: Now defaults to `pending` instead of `confirmed`
- **History Tracking**: Enhanced to track staff confirmations/rejections
- **Staff Information**: Stores which staff member performed actions

```javascript
booking.addToHistory('confirmed', {
  staffId: staff._id,
  staffName: staff.displayName,
  confirmedAt: new Date()
});
```

#### Staff Model Integration
- Uses existing `Staff` model with role-based permissions
- Filters notifications based on `isActive` and `canViewBookings`
- Respects `canUpdateBookings` and `canCancelBookings` for actions

### Message Templates

#### Staff Notification
```
🔔 NEW BOOKING REQUEST

📅 Date: Monday, December 25, 2023
🕐 Time: 19:00 - 21:00
👥 Guests: 4
🪑 Table: T1
👤 Customer: John Doe
📧 Email: john@example.com
📱 Phone: +1234567890
📋 Reference: BK123456

⏳ Status: PENDING CONFIRMATION

Please confirm or reject this booking request.

[✅ Confirm Booking] [❌ Reject Booking] [📋 View Details]
```

#### Customer Confirmation
```
✅ BOOKING CONFIRMED!

Your table reservation has been confirmed by our staff.

📋 Reference: BK123456
📅 Date: Monday, December 25, 2023
🕐 Time: 19:00 - 21:00
👥 Guests: 4
🪑 Table: T1

Thank you for choosing us! We look forward to serving you.

[📋 My Bookings] [ℹ️ Restaurant Info]
```

#### Customer Rejection
```
❌ BOOKING REQUEST DECLINED

We're sorry, but your table reservation request could not be confirmed.

📋 Reference: BK123456
📅 Date: Monday, December 25, 2023
🕐 Time: 19:00 - 21:00
👥 Guests: 4
🪑 Table: T1

📝 Reason: Table not available at requested time

Please try booking a different time slot or contact us directly.

[📅 Make New Booking] [ℹ️ Contact Us]
```

## API Endpoints

### Staff Notification Management
- `POST /api/bookings/confirm` - Confirm or reject bookings via API
- `GET /api/bookings/confirm?restaurantId=X&staffId=Y` - Get pending bookings

### LINE Webhook Integration
- Enhanced `POST /api/line/webhook` with new notification handlers
- Automatic notification triggering on booking creation
- Interactive button handling for staff actions

## Configuration Requirements

### Environment Variables
```bash
# Existing LINE Bot configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# MongoDB connection (existing)
MONGODB_URI=your_mongodb_connection_string
```

### Staff Setup Requirements
1. **Staff Registration**: Staff must be registered in the system with LINE User IDs
2. **Permissions**: Appropriate permissions must be set based on staff roles
3. **LINE Bot**: Staff must have the LINE bot added as a friend
4. **Active Status**: Staff must have `isActive: true` to receive notifications

## Workflow Examples

### Successful Booking Flow
1. Customer creates booking via LINE bot or web
2. Booking saved with `status: 'pending'`
3. All eligible staff receive LINE notification
4. Manager confirms booking via LINE bot
5. Booking status updated to `confirmed`
6. Customer receives confirmation message
7. Booking appears in confirmed bookings list

### Rejected Booking Flow
1. Customer creates booking via LINE bot or web
2. Booking saved with `status: 'pending'`
3. All eligible staff receive LINE notification
4. Hostess rejects booking via LINE bot
5. Booking status updated to `cancelled`
6. Customer receives rejection message with reason
7. Customer can make new booking attempt

### Multiple Staff Handling
1. Multiple staff receive the same notification
2. First staff member to act processes the booking
3. Other staff members get "already processed" message if they try to act
4. All actions are logged in booking history
5. Staff can view booking details even after processing

## Error Handling

### Notification Failures
- Booking creation continues even if notifications fail
- Failed notifications are logged but don't block the process
- Staff can still manage bookings through web interface if needed

### Permission Errors
- Staff without appropriate permissions see view-only notifications
- Action buttons only appear for staff with correct permissions
- Clear error messages for unauthorized actions

### Booking State Conflicts
- Prevents double-processing of bookings
- Clear messages when booking status has changed
- Automatic status checks before processing actions

## Monitoring and Logging

### Success Metrics
- Notification delivery success rates
- Staff response times to notifications
- Booking confirmation/rejection ratios
- Customer satisfaction with notification timing

### Error Logging
- Failed notification deliveries
- Permission violations
- Booking state conflicts
- LINE API errors

## Future Enhancements

### Potential Improvements
1. **Bulk Actions**: Allow staff to confirm/reject multiple bookings
2. **Custom Rejection Reasons**: Predefined rejection reason templates
3. **Notification Scheduling**: Different notification rules based on time/day
4. **Staff Workload Distribution**: Smart notification routing based on staff availability
5. **Customer Preferences**: Allow customers to set notification preferences
6. **Analytics Dashboard**: Staff performance and booking metrics
7. **Integration with Calendar Systems**: Sync with external calendar applications

### Advanced Features
1. **Auto-confirmation Rules**: Automatic confirmation for trusted customers
2. **Capacity Management**: Smart suggestions for alternative times/tables
3. **Staff Scheduling Integration**: Only notify staff who are on duty
4. **Multi-language Support**: Notifications in multiple languages
5. **Voice Notifications**: Integration with voice assistants for busy kitchens

## Troubleshooting

### Common Issues

#### Staff Not Receiving Notifications
- Check if staff member has `isActive: true`
- Verify `lineUserId` is correctly set
- Confirm staff has appropriate permissions
- Check if LINE bot is added as friend

#### Customers Not Receiving Confirmations
- Verify customer has `lineUserId` (for LINE customers)
- Check if booking was created through LINE bot
- Confirm customer hasn't blocked the bot
- Check notification service logs for errors

#### Booking Status Issues
- Verify booking status is `pending` before staff action
- Check staff permissions for the attempted action
- Review booking history for previous status changes
- Confirm database connectivity and transaction success

#### LINE API Errors
- Verify LINE channel credentials
- Check API rate limits
- Confirm webhook URL is accessible
- Review LINE developer console for errors

## Security Considerations

### Data Protection
- Staff notifications only include necessary booking information
- Customer personal data is handled according to privacy policies
- LINE User IDs are encrypted in transit
- Booking references are used instead of internal IDs where possible

### Access Control
- Role-based permissions strictly enforced
- Staff can only access bookings for their assigned restaurant
- Audit trail for all booking status changes
- Session management for web-based actions

### API Security
- Webhook signature validation for LINE messages
- Staff authentication required for API endpoints
- Rate limiting to prevent abuse
- Input validation and sanitization

This notification system transforms your restaurant booking process into a professional, staff-controlled workflow that ensures every booking is properly reviewed and confirmed before finalizing the reservation.
