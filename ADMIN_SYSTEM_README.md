# Admin System for FoodLoft

This document outlines the comprehensive admin system that allows administrators to manage all aspects of the FoodLoft platform through a centralized dashboard.

## 🏗️ System Architecture

### Core Components

1. **Admin Authentication System**
   - Role-based access control
   - Secure JWT authentication
   - Account lockout protection
   - Activity logging

2. **Database Management Interface**
   - CRUD operations for all models
   - Advanced filtering and search
   - Bulk operations
   - Data export capabilities

3. **Analytics & Monitoring**
   - Real-time system metrics
   - User activity tracking
   - Performance monitoring
   - Revenue analytics

4. **System Administration**
   - User management
   - Restaurant management
   - Booking oversight
   - Subscription management

## 👥 Admin Roles & Permissions

### Super Admin
- **Full system access**
- All permissions granted
- Can create other admins
- System maintenance access

### Admin
- **Full management access**
- User and restaurant management
- Analytics and reporting
- Subscription management

### Moderator
- **Content management**
- Restaurant and booking management
- Review moderation
- Support ticket handling

### Support
- **Read-only access**
- View analytics and logs
- Handle support tickets
- Limited system access

## 🔐 Authentication System

### Admin Model (`models/Admin.js`)
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String, // super_admin, admin, moderator, support
  permissions: [String],
  status: String, // active, inactive, suspended
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  activityLog: [Object],
  preferences: Object
}
```

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **Account Lockout**: 5 failed attempts = 2-hour lock
- **JWT Tokens**: 24-hour expiration
- **Activity Logging**: All admin actions tracked
- **IP Tracking**: Login attempts logged with IP

## 📊 Admin Dashboard Features

### Overview Tab
- **Key Metrics**: Total users, restaurants, bookings, organizations
- **Growth Analytics**: User and booking growth percentages
- **Recent Activity**: Latest users and restaurants
- **Quick Actions**: Direct access to management sections

### User Management
- **View All Users**: Customers and restaurant owners
- **Search & Filter**: By role, email, name, date
- **User Details**: Full profile information
- **Account Actions**: Activate, suspend, delete
- **Role Management**: Assign and modify user roles

### Restaurant Management
- **Restaurant List**: All restaurants with details
- **Status Management**: Active, inactive, suspended
- **Owner Information**: Restaurant owner details
- **Location Data**: Address and coordinates
- **Performance Metrics**: Booking counts, ratings

### Booking Management
- **All Bookings**: Complete booking history
- **Status Tracking**: Pending, confirmed, completed, cancelled
- **Date Filtering**: By date range
- **Customer Information**: Booking details and contact info
- **Restaurant Details**: Associated restaurant information

### Organization Management
- **Multi-tenant Support**: All organizations
- **Subscription Status**: Plan types and billing
- **Member Management**: Organization members and roles
- **Usage Analytics**: Resource consumption
- **Billing Information**: Payment status and history

### Subscription Management
- **Plan Overview**: All subscription plans
- **Usage Tracking**: Resource limits and consumption
- **Billing Management**: Payment status and history
- **Plan Changes**: Upgrades and downgrades
- **Revenue Analytics**: Monthly and yearly revenue

### System Management
- **Database Tools**: Collection management
- **Data Export**: CSV, JSON, Excel formats
- **Backup & Restore**: System backup tools
- **Log Monitoring**: System and error logs
- **Performance Metrics**: System health monitoring

## 🚀 Getting Started

### 1. Create Super Admin
```bash
npm run create-super-admin
```

This creates the initial super admin account:
- **Username**: admin
- **Email**: admin@foodloft.com
- **Password**: admin123 (⚠️ Change this immediately!)

### 2. Access Admin Dashboard
1. Navigate to `/admin/login`
2. Login with super admin credentials
3. Access dashboard at `/admin`

### 3. Create Additional Admins
1. Go to System → Admin Management
2. Click "Add Admin"
3. Fill in admin details
4. Assign appropriate role and permissions

## 🔧 API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/verify` - Verify admin token

### User Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `GET /api/admin/users/[id]` - Get user details
- `PUT /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user

### Restaurant Management
- `GET /api/admin/restaurants` - List all restaurants
- `POST /api/admin/restaurants` - Create restaurant
- `GET /api/admin/restaurants/[id]` - Get restaurant details
- `PUT /api/admin/restaurants/[id]` - Update restaurant
- `DELETE /api/admin/restaurants/[id]` - Delete restaurant

### Booking Management
- `GET /api/admin/bookings` - List all bookings
- `POST /api/admin/bookings` - Create booking
- `GET /api/admin/bookings/[id]` - Get booking details
- `PUT /api/admin/bookings/[id]` - Update booking
- `DELETE /api/admin/bookings/[id]` - Delete booking

### Analytics
- `GET /api/admin/analytics` - Get system analytics
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/analytics/revenue` - Revenue analytics
- `GET /api/admin/analytics/usage` - Usage analytics

## 🛡️ Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Account Lockout**: Protection against brute force
- **Session Management**: Automatic token expiration

### Access Control
- **Role-based Permissions**: Granular permission system
- **API Protection**: All endpoints require admin authentication
- **Activity Logging**: Complete audit trail
- **IP Tracking**: Login attempt monitoring

### Data Protection
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Mongoose ODM protection
- **XSS Prevention**: React built-in protection
- **CSRF Protection**: Token-based CSRF protection

## 📈 Analytics & Monitoring

### System Metrics
- **User Growth**: New user registrations over time
- **Booking Trends**: Booking patterns and peak times
- **Revenue Analytics**: Subscription revenue tracking
- **Usage Statistics**: Resource consumption monitoring

### Performance Monitoring
- **Response Times**: API endpoint performance
- **Error Rates**: System error tracking
- **Database Performance**: Query optimization insights
- **Server Health**: System resource monitoring

### Business Intelligence
- **Customer Analytics**: User behavior patterns
- **Restaurant Performance**: Booking success rates
- **Revenue Forecasting**: Growth predictions
- **Market Analysis**: Geographic and demographic insights

## 🔄 Data Management

### Export Capabilities
- **CSV Export**: User data, bookings, restaurants
- **JSON Export**: Complete data dumps
- **Excel Export**: Formatted reports
- **Custom Reports**: Filtered data exports

### Backup & Restore
- **Automated Backups**: Scheduled database backups
- **Manual Backups**: On-demand backup creation
- **Restore Functionality**: Data recovery tools
- **Version Control**: Backup versioning

### Data Cleanup
- **Orphaned Data**: Clean up unused records
- **Duplicate Removal**: Merge duplicate entries
- **Archive Management**: Move old data to archive
- **Data Validation**: Ensure data integrity

## 🎯 Best Practices

### Security
1. **Change Default Password**: Immediately change super admin password
2. **Regular Updates**: Keep system and dependencies updated
3. **Monitor Logs**: Regularly review activity logs
4. **Backup Regularly**: Schedule automated backups
5. **Limit Access**: Only grant necessary permissions

### Performance
1. **Monitor Metrics**: Track system performance
2. **Optimize Queries**: Use efficient database queries
3. **Cache Data**: Implement caching for frequently accessed data
4. **Load Testing**: Regular performance testing
5. **Resource Monitoring**: Monitor server resources

### Maintenance
1. **Regular Audits**: Review admin accounts and permissions
2. **Data Cleanup**: Remove old and unused data
3. **Log Rotation**: Manage log file sizes
4. **Update Documentation**: Keep documentation current
5. **User Training**: Train admin users on system features

## 🆘 Troubleshooting

### Common Issues

#### Login Problems
- **Invalid Credentials**: Check username/password
- **Account Locked**: Wait for lockout period or contact super admin
- **Token Expired**: Re-login to get new token

#### Permission Errors
- **Access Denied**: Check user role and permissions
- **Feature Unavailable**: Verify feature is enabled for user role
- **API Errors**: Check authentication token

#### Performance Issues
- **Slow Loading**: Check database performance
- **High Memory Usage**: Monitor server resources
- **Timeout Errors**: Check API response times

### Support
- **Documentation**: Refer to this guide and API docs
- **Logs**: Check system logs for error details
- **Database**: Verify database connectivity and performance
- **Network**: Check network connectivity and latency

## 🔮 Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning insights
- **Automated Reports**: Scheduled report generation
- **Multi-language Support**: Internationalization
- **Mobile App**: Admin mobile application
- **API Rate Limiting**: Advanced rate limiting
- **Real-time Notifications**: Live system alerts

### Scalability
- **Microservices**: Break down into smaller services
- **Load Balancing**: Distribute load across servers
- **Database Sharding**: Scale database horizontally
- **CDN Integration**: Global content delivery
- **Caching Layer**: Redis/Memcached integration

---

This admin system provides comprehensive management capabilities for the FoodLoft platform, ensuring efficient operation, security, and scalability.
