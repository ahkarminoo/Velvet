# Customer LINE Chatbot Implementation

This document describes the implementation of the customer-side LINE chatbot that integrates with your existing restaurant booking system.

## Overview

The customer LINE chatbot allows customers to:
- **Unified Account System**: Use the same LINE User ID from LIFF registration
- **View Booking History**: See all past and upcoming bookings
- **Cancel Bookings**: Cancel existing reservations directly from LINE
- **Access Restaurant Info**: Get restaurant details, hours, and contact information
- **View Floorplan**: Access restaurant layout information (with future screenshot capability)

## Key Features

### 1. **Unified Account Management**
- **Same LINE User ID**: Customers who registered via LIFF can use the same account in LINE chat
- **Automatic Account Creation**: New customers get accounts created automatically when they first use the chatbot
- **Seamless Integration**: No separate registration needed for LINE chat users

### 2. **Complete Inline Booking Flow**
- **📅 Date Selection**: Choose from available dates (next 30 days)
- **🕐 Time Selection**: Select time slots based on restaurant operating hours
- **👥 Guest Count**: Choose number of guests (1-6+)
- **🍽️ Table Selection**: View and select available tables with capacity info
- **✅ Confirmation**: Review and confirm booking details
- **🎉 Completion**: Receive booking confirmation with reference number

### 3. **Booking Management**
- **View Bookings**: See all active bookings in a carousel format
- **Booking Details**: Full booking information including date, time, table, and status
- **Cancel Bookings**: One-click booking cancellation with confirmation
- **Booking History**: Access to past and upcoming reservations

### 4. **Restaurant Information**
- **Restaurant Details**: Name, address, contact information
- **Operating Hours**: Current business hours
- **Floorplan Access**: Link to view restaurant layout
- **Quick Actions**: Direct links to make new bookings

### 5. **User Experience**
- **Rich UI**: Uses LINE's Flex Message and Template Message formats
- **Intuitive Navigation**: Clear button-based menu system
- **Error Handling**: Comprehensive error messages and fallbacks
- **Mobile Optimized**: Designed for mobile LINE app usage

## Implementation Details

### File Structure
```
app/api/line/webhook/route.js - Main webhook handler (enhanced)
app/api/line/floorplan-screenshot/route.js - Floorplan screenshot API
CUSTOMER_LINE_CHATBOT_README.md - This documentation
```

### Database Integration
- **User Model**: Uses existing `User` model with `lineUserId` field
- **Booking Model**: Integrates with existing `Booking` model
- **Restaurant Model**: Accesses restaurant information
- **Floorplan Model**: Retrieves floorplan data

### API Endpoints

#### Customer Actions
- `action=customer_mode` - Initialize customer mode
- `action=customer_book` - Start inline booking flow
- `action=customer_bookings` - View customer bookings
- `action=customer_floorplan` - View restaurant floorplan
- `action=customer_info` - Get restaurant information
- `action=cancel_booking&bookingId={id}` - Cancel a specific booking

#### Inline Booking Flow Actions
- `action=booking_time&date={date}` - Select time for chosen date
- `action=booking_guests&date={date}&time={time}` - Select number of guests
- `action=booking_tables&date={date}&time={time}&guests={count}` - Select available table
- `action=booking_confirm&date={date}&time={time}&guests={count}&table={id}` - Confirm booking details
- `action=booking_complete&date={date}&time={time}&guests={count}&table={id}` - Complete booking

## User Flow

### 1. **First-Time Customer**
```
Customer sends message → System checks for existing account
├── Account exists (from LIFF): Welcome back + show menu
└── No account: Create new account + show welcome menu
```

### 2. **Customer Menu Options**
```
Main Menu:
├── 📅 Make Booking → Complete inline booking flow
├── 📋 My Bookings → Show booking carousel with cancel options
├── 🏢 View Floorplan → Show floorplan info + website link
└── ℹ️ Restaurant Info → Display restaurant details
```

### 3. **Complete Inline Booking Flow**
```
📅 Make Booking:
├── Step 1: Date Selection → Choose from next 30 days
├── Step 2: Time Selection → Based on restaurant hours (30-min intervals)
├── Step 3: Guest Count → Select 1-6+ guests
├── Step 4: Table Selection → View available tables with capacity
├── Step 5: Confirmation → Review all details
└── Step 6: Completion → Receive booking reference
```

### 4. **Booking Management**
```
My Bookings:
├── Show active bookings in carousel format
├── Each booking shows: date, time, table, status, reference
└── Cancel button for each booking with confirmation
```

## Technical Implementation

### Customer Authentication
```javascript
async function checkCustomerInDatabase(lineUserId) {
  // Check if customer exists by LINE User ID
  let customer = await User.findOne({ 
    lineUserId: lineUserId,
    role: 'customer'
  });
  return { exists: !!customer, customer };
}
```

### Account Creation
```javascript
async function createCustomerAccount(lineUserId, displayName, pictureUrl) {
  // Create new customer account similar to LIFF login
  const lineEmail = `line.${lineUserId}@foodloft.local`;
  const customer = new User({
    email: lineEmail,
    firstName: displayName || "LINE User",
    lineUserId: lineUserId,
    role: "customer",
    // ... other fields
  });
  await customer.save();
  return customer;
}
```

### Booking Retrieval
```javascript
async function handleCustomerBookings(event, userId, client, customer) {
  const bookings = await Booking.find({
    userId: customer._id,
    status: { $in: ['pending', 'confirmed'] }
  })
  .populate('restaurantId', 'restaurantName')
  .populate('floorplanId', 'name')
  .sort({ date: 1, startTime: 1 });
  
  // Format as LINE Flex Message carousel
}
```

## Integration with Existing System

### 1. **LIFF Integration**
- Customers who registered via LIFF can immediately use LINE chat
- Same `lineUserId` is used for both systems
- No duplicate accounts or data inconsistency

### 2. **Booking System Integration**
- Uses existing booking APIs and models
- Maintains booking history and status tracking
- Integrates with floorplan and table management

### 3. **Staff System Compatibility**
- Staff and customer systems work independently
- Same LINE webhook handles both user types
- Clear separation of permissions and functionality

## Future Enhancements

### 1. **Inline Booking Flow**
- Implement full booking creation within LINE chat
- Date/time selection via LINE's date picker
- Guest count and table selection
- Confirmation and payment integration

### 2. **Floorplan Screenshots**
- Generate actual floorplan images
- Send visual floorplan via LINE
- Real-time table availability visualization

### 3. **Advanced Features**
- Push notifications for booking confirmations
- Menu browsing and pre-ordering
- Loyalty program integration
- Multi-language support

### 4. **Analytics and Insights**
- Customer usage tracking
- Popular booking times analysis
- Customer preference learning
- A/B testing for UI improvements

## Testing

### Test Scenarios
1. **New Customer Registration**
   - Send message to LINE bot
   - Verify account creation
   - Test menu functionality

2. **Existing Customer (LIFF)**
   - Use same LINE User ID from LIFF
   - Verify account recognition
   - Test booking history access

3. **Booking Management**
   - View existing bookings
   - Cancel a booking
   - Verify status updates

4. **Error Handling**
   - Invalid actions
   - Network errors
   - Database connection issues

## Deployment

### Environment Variables
Ensure these are set in your environment:
```
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_URL=your_application_url
```

### LINE Bot Configuration
1. **Webhook URL**: `https://yourdomain.com/api/line/webhook`
2. **Message Types**: Text, Postback, Flex Message
3. **Rich Menu**: Optional - can be added for better UX

## Monitoring and Maintenance

### Logging
- All customer interactions are logged
- Error tracking for debugging
- Performance monitoring for response times

### Database Maintenance
- Regular cleanup of old booking data
- Customer account optimization
- Index optimization for LINE User ID queries

## Security Considerations

### Data Protection
- LINE User IDs are treated as sensitive data
- Customer information is protected
- Booking data follows existing security protocols

### Access Control
- Only authenticated customers can access their data
- Staff and customer systems are properly separated
- API endpoints are secured

## Support and Troubleshooting

### Common Issues
1. **Customer not recognized**: Check LINE User ID in database
2. **Booking not found**: Verify booking ownership and status
3. **Menu not showing**: Check postback data handling

### Debug Tools
- LINE webhook logs
- Database query logs
- Customer interaction tracking

## Conclusion

The customer LINE chatbot provides a seamless experience for customers to manage their restaurant bookings directly through LINE. It leverages your existing infrastructure while providing a modern, mobile-friendly interface that customers expect.

The unified account system ensures that customers who registered via LIFF can immediately use the chatbot without any additional setup, creating a cohesive user experience across all touchpoints.
