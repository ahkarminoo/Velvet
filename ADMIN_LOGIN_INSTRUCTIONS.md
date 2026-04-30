## Admin Login Instructions

The admin system is properly configured. To fix the review management authentication issue:

### 1. Create Admin Account (if not exists)
Run this command in your terminal:
```bash
node scripts/create-super-admin.js
```

This will create:
- **Username**: admin
- **Email**: admin@foodloft.com  
- **Password**: admin123

### 2. Login to Admin Dashboard
1. Go to: `http://localhost:3000/admin/login`
2. Use the credentials above
3. This will store the `adminToken` in localStorage

### 3. Access Review Management
After logging in, you can access the reviews management and it should work properly.

### 4. Alternative Quick Fix
If you want to bypass authentication temporarily for testing, you can modify the API to skip auth:

In `/api/admin/reviews/route.js`, comment out the auth check:
```javascript
// const authResult = await verifyAdminAuth(req);
// if (!authResult.success) {
//   return NextResponse.json({ error: authResult.error }, { status: 401 });
// }
```

But remember to uncomment it for production security!