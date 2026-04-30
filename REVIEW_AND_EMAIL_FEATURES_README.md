# Review Management & Email Enhancement Features

This document outlines the implementation of two key features for the FoodLoft restaurant management system:

1. **Inappropriate Review Management System**
2. **Menu Images in Confirmation Emails**

## 🔍 Feature 1: Inappropriate Review Management

### Overview
A comprehensive system that allows administrators to manage inappropriate reviews by flagging, hiding, or removing them while maintaining restaurant rating accuracy.

### Key Features

#### Admin Capabilities
- **View All Reviews**: Complete list with filtering and search
- **Flag Reviews**: Mark reviews for inappropriate content
- **Hide Reviews**: Remove from public view without permanent deletion
- **Remove Reviews**: Permanently delete inappropriate reviews
- **Restore Reviews**: Reactivate hidden reviews
- **Search & Filter**: By status, rating, restaurant, or content

#### Review Status System
- **Active**: Visible to public, included in rating calculations
- **Flagged**: Under admin review, still visible but marked
- **Hidden**: Not visible to public, excluded from rating calculations
- **Removed**: Permanently deleted, excluded from rating calculations

### Database Schema Updates

#### Review Model (`models/Review.js`)
```javascript
{
  // ... existing fields ...
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
}
```

### API Endpoints

#### Admin Review Management
```
PATCH /api/admin/reviews/[id] - Update review status
DELETE /api/admin/reviews/[id] - Permanently delete review
GET /api/admin/reviews/[id] - Get specific review details
```

#### Public Review Filtering
- Updated `/api/restaurants/[id]/reviews` to exclude hidden/removed reviews
- Only shows `active` and `flagged` reviews to public users

### Components

#### ReviewsManagement Component
- **Location**: `components/admin/ReviewsManagement.js`
- **Features**:
  - Comprehensive review table with filtering
  - Status management actions
  - Search functionality
  - Detailed review modal
  - Bulk operations support

#### Admin Dashboard Integration
- Added to Admin Dashboard under "Reviews" tab
- Accessible to admins with `manage_reviews` permission

### Automatic Rating Recalculation
- When reviews are removed or restored, restaurant ratings are automatically recalculated
- Only `active` reviews contribute to the overall rating
- Maintains data integrity and accuracy

## 📧 Feature 2: Menu Images in Confirmation Emails

### Overview
Enhanced confirmation emails that automatically include restaurant menu images to provide customers with a preview of available dishes.

### Key Features

#### Email Enhancement
- **Automatic Menu Fetching**: Retrieves menu images from restaurant data
- **Responsive Design**: Menu images adapt to different email clients
- **Fallback Support**: Text version mentions menu availability
- **Professional Layout**: Clean, branded email design

#### Menu Image Display
- Grid layout for multiple menu pages
- Optimized image sizing for email clients
- Page numbering for multi-page menus
- Hover effects (where supported)

### Email Template Updates

#### Enhanced Booking Confirmation Template
```html
<!-- Menu Section (conditional) -->
${bookingData.menuImages && bookingData.menuImages.length > 0 ? `
<div class="menu-section">
  <h3>🍽️ Our Menu</h3>
  <p>Take a look at our delicious offerings</p>
  <div class="menu-grid">
    ${bookingData.menuImages.map((imageUrl, index) => `
      <div>
        <img src="${imageUrl}" alt="Menu Page ${index + 1}" class="menu-image" />
        <p>Page ${index + 1}</p>
      </div>
    `).join('')}
  </div>
</div>
` : ''}
```

#### CSS Enhancements
```css
.menu-section { 
  background: #f8f9fa; 
  padding: 20px; 
  border-radius: 8px; 
  margin: 20px 0; 
}
.menu-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
  gap: 15px; 
  margin-top: 15px; 
}
.menu-image { 
  width: 100%; 
  height: 200px; 
  object-fit: cover; 
  border-radius: 8px; 
  border: 2px solid #e9ecef; 
}
```

### Email Service Updates

#### Automatic Menu Fetching
```javascript
// Fetch restaurant menu images if not provided
if (!bookingData.menuImages && bookingData.restaurantId) {
  try {
    const Restaurant = (await import('@/models/Restaurants')).default;
    const restaurant = await Restaurant.findById(bookingData.restaurantId);
    if (restaurant && restaurant.images && restaurant.images.menu) {
      bookingData.menuImages = restaurant.images.menu;
    }
  } catch (error) {
    console.error('Error fetching restaurant menu images:', error);
  }
}
```

#### Updated Notification Service
- Modified `lib/lineNotificationService.js` to include `restaurantId`
- Enhanced `lib/email/bookingNotifications.js` with menu fetching
- Updated text version to mention menu availability

## 🧪 Testing

### Test Endpoints

#### Email Testing
```
POST /api/test-email
{
  "restaurantId": "restaurant_id_here",
  "customerEmail": "test@example.com"
}
```

#### Test Page
- **URL**: `/test-features`
- **Features**:
  - Email testing with menu images
  - Feature documentation
  - Implementation summary

### Manual Testing Steps

#### Review Management
1. Access Admin Dashboard → Reviews tab
2. Test filtering by status, rating, and search
3. Flag a review and verify status change
4. Hide a review and check public visibility
5. Restore a hidden review
6. Delete a review and verify permanent removal

#### Email with Menu Images
1. Use test page with valid restaurant ID
2. Send test email to your email address
3. Verify menu images appear in email
4. Check both HTML and text versions
5. Test with restaurants that have no menu images

## 📁 File Structure

### New Files Created
```
components/admin/ReviewsManagement.js    # Admin review management component
app/api/admin/reviews/[id]/route.js     # Admin review API endpoints
app/api/test-email/route.js             # Email testing endpoint
app/test-features/page.js               # Feature testing page
REVIEW_AND_EMAIL_FEATURES_README.md     # This documentation
```

### Updated Files
```
models/Review.js                        # Added status and flagging fields
components/AdminDashboard.js            # Integrated ReviewsManagement
app/api/restaurants/[id]/reviews/route.js # Added status filtering
lib/email/templates.js                  # Enhanced with menu section
lib/email/bookingNotifications.js       # Added menu fetching
lib/lineNotificationService.js          # Added restaurantId for emails
```

## 🔐 Security & Permissions

### Admin Permissions
- **Required Permission**: `manage_reviews`
- **Authentication**: Admin JWT token required
- **Audit Trail**: All review actions logged with admin ID and timestamp

### Data Protection
- **Soft Delete**: Reviews are hidden rather than permanently deleted by default
- **Rating Integrity**: Automatic recalculation maintains accuracy
- **Public Filtering**: Hidden/removed reviews never appear in public APIs

## 🚀 Deployment Considerations

### Database Migration
- Review model changes are backward compatible
- Existing reviews default to 'active' status
- No data migration required

### Email Configuration
- Ensure email service supports HTML content
- Test with various email clients
- Verify image loading from external URLs

### Admin Access
- Ensure admin accounts have `manage_reviews` permission
- Test admin authentication flow
- Verify permission checking in API endpoints

## 📊 Performance Considerations

### Database Indexes
- Existing indexes on `userId` and `restaurantId` maintained
- New status-based queries optimized with existing indexes

### Email Performance
- Menu images fetched only when needed
- Cached restaurant data for multiple emails
- Graceful fallback when menu images unavailable

### Caching
- Restaurant menu images can be cached for better performance
- Consider implementing Redis cache for frequently accessed restaurant data

## 🔄 Future Enhancements

### Review Management
- **Automated Flagging**: AI-based inappropriate content detection
- **Bulk Operations**: Select and manage multiple reviews
- **Review Analytics**: Track flagging patterns and trends
- **Customer Appeals**: Allow customers to appeal hidden reviews

### Email Features
- **Menu Categories**: Organize menu images by categories
- **Dynamic Pricing**: Include current menu prices
- **Personalization**: Show recommended dishes based on booking
- **Social Sharing**: Add social media sharing for menu items

## 📞 Support & Troubleshooting

### Common Issues

#### Review Management
- **Permission Errors**: Verify admin has `manage_reviews` permission
- **Rating Discrepancies**: Check for hidden/removed reviews affecting calculations
- **API Errors**: Ensure proper authentication headers

#### Email Issues
- **Missing Menu Images**: Verify restaurant has menu images uploaded
- **Email Not Sending**: Check email service configuration
- **Image Loading**: Ensure menu image URLs are publicly accessible

### Debug Tools
- Use `/test-features` page for testing
- Check server logs for email sending errors
- Verify database queries for review status filtering

## 📈 Analytics & Monitoring

### Metrics to Track
- **Review Management**: Flagging frequency, resolution time
- **Email Performance**: Delivery rates, image loading success
- **Admin Activity**: Review management actions per admin
- **Customer Satisfaction**: Email engagement rates

### Monitoring Points
- Review status change frequency
- Email delivery success rates
- Menu image loading performance
- Admin dashboard usage patterns

---

**Implementation Date**: December 2024  
**Version**: 1.0  
**Status**: Production Ready
