# Staff Management System

This system allows restaurant owners to manage staff members and grant them access to booking management through Line bot integration.

## Features

### 1. Staff Management Web Interface
- **Location**: `/staff-management`
- **Access**: Restaurant owners can access this through the navigation bar
- **Features**:
  - Add staff members with Line User ID
  - Set roles: Waiter, Hostess, Manager, Admin
  - Automatic permission assignment based on role
  - Edit staff information
  - Remove staff members (soft delete)

### 2. Role-Based Permissions

#### Waiter
- ✅ View Bookings
- ❌ Create Bookings
- ✅ Update Bookings
- ❌ Cancel Bookings
- ❌ Delete Bookings
- ❌ Manage Staff

#### Hostess
- ✅ View Bookings
- ✅ Create Bookings
- ✅ Update Bookings
- ✅ Cancel Bookings
- ❌ Delete Bookings
- ❌ Manage Staff

#### Manager
- ✅ View Bookings
- ✅ Create Bookings
- ✅ Update Bookings
- ✅ Cancel Bookings
- ❌ Delete Bookings
- ✅ Manage Staff

#### Admin
- ✅ All Permissions

### 3. Line Bot Integration
- **Authentication**: Staff members are authenticated by their Line User ID
- **Access Control**: Only registered staff can use the bot
- **Booking CRUD**: Staff can view, confirm, cancel, and complete bookings through Line interface

## How to Use

### Step 1: Add Staff Members
1. Navigate to Restaurant Owner Dashboard → Staff Management
2. Click "Add Staff Member"
3. Enter the staff member's **Line ID** (username like "akmo610") and details
4. Select appropriate role
5. Save

### Step 2: Staff Access via Line Bot
1. Staff member can immediately use the Line bot
2. System automatically authenticates using their display name
3. Staff sees personalized menu with role-based actions
4. Staff can:
   - View current bookings
   - See booking details
   - Confirm pending bookings
   - Cancel bookings (if permitted)
   - Complete bookings
   - View restaurant floorplan

### Step 3: Booking Management
Staff can manage bookings through interactive Line bot interface:
- **View Bookings**: See all active bookings in carousel format
- **Booking Details**: Get detailed information about specific bookings
- **Status Updates**: Confirm, cancel, or complete bookings with one tap
- **Permission Checks**: Only see actions they're authorized to perform

## API Endpoints

### Staff Management
- `GET /api/staff?restaurantId={id}` - Get all staff for a restaurant
- `POST /api/staff` - Create new staff member
- `PUT /api/staff` - Update staff member
- `DELETE /api/staff?staffId={id}` - Remove staff member

### Line Webhook
- `POST /api/line/webhook` - Handles all Line bot interactions
- Authenticates staff automatically
- Provides role-based menu options
- Handles booking CRUD operations

## Database Models

### Staff Model
```javascript
{
  lineUserId: String (required, unique),
  displayName: String (required),
  firstName: String,
  lastName: String,
  email: String,
  contactNumber: String,
  restaurantId: ObjectId (required),
  role: String (waiter|hostess|manager|admin),
  permissions: {
    canViewBookings: Boolean,
    canCreateBookings: Boolean,
    canUpdateBookings: Boolean,
    canCancelBookings: Boolean,
    canDeleteBookings: Boolean,
    canManageStaff: Boolean
  },
  isActive: Boolean,
  profileImage: String
}
```

## Security Features

1. **Line ID Authentication**: Only registered Line User IDs can access the system
2. **Restaurant Isolation**: Staff can only access bookings from their assigned restaurant
3. **Role-Based Access**: Permissions are automatically enforced based on role
4. **Audit Trail**: All booking updates include staff member information

## Getting Line ID

### How to find Line ID (Username):
1. Staff member opens Line app → Settings → Profile
2. Copy the Line ID (username) - e.g., "akmo610"
3. Use this when adding staff member to the system
4. Staff can immediately use the Line bot once added!

## Next Steps

1. **Add Staff**: Use the web interface to add your first staff member
2. **Test Access**: Have the staff member try using the Line bot
3. **Monitor Usage**: Check booking updates in your dashboard
4. **Adjust Permissions**: Modify roles as needed through the web interface
