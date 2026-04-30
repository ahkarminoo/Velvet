# Restaurant Owner Google Authentication Integration

## Overview
This implementation adds Google signup/signin functionality for restaurant owners, similar to the customer authentication system. The authentication uses Firebase for user management while storing restaurant owner data in MongoDB.

## Features Added

### 1. Updated RestaurantOwner Model
- Added `firebaseUid` field for Firebase authentication
- Made `password` field optional for Google-only users
- Added `profileImage` field for Google profile images

### 2. New API Endpoints
- **POST `/api/restaurant-owner/signup`** - Handles Google signup/signin and MongoDB profile creation
- **Updated POST `/api/restaurant-owner/login`** - Now supports both traditional email/password and Firebase UID authentication

### 3. Updated Components
- **RestaurantOwnerLoginModal** - Added Google sign-in button and functionality
- **RestaurantOwnerSignupModal** - New component with Google signup functionality

## How It Works

### Google Signup Flow
1. User clicks "Continue with Google" button
2. Firebase popup opens for Google authentication
3. After successful Google auth, the system:
   - Calls `/api/restaurant-owner/signup` to create/find MongoDB profile
   - Calls `/api/restaurant-owner/login` with Firebase UID to get JWT token
   - Stores user data and token in localStorage
   - Redirects to appropriate page based on restaurant setup status

### Google Signin Flow
1. User clicks "Continue with Google" button
2. Firebase popup opens for Google authentication
3. System checks if restaurant owner exists by Firebase UID
4. If exists, generates JWT token and logs user in
5. If not exists, redirects to signup flow

## Database Schema Changes

### RestaurantOwner Model Updates
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (optional), // Made optional for Google users
  firebaseUid: String (unique, sparse), // New field for Firebase auth
  contactNumber: String (required),
  profileImage: String (default: ""), // New field for Google profile images
  role: String (default: "restaurant-owner"),
  subscriptionPlan: String (default: "Basic"),
  restaurantId: ObjectId (ref: 'Restaurant')
}
```

## Environment Variables Required
Make sure these environment variables are set:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `JWT_SECRET` - Secret for JWT token generation
- MongoDB connection string

## Usage

### For Restaurant Owners
1. Visit `/restaurant-owner` page
2. Click "Login" to open login modal
3. Click "Continue with Google" for Google authentication
4. Or click "Register here" to go to traditional signup page

### For Developers
The new components can be imported and used:
```javascript
import RestaurantOwnerSignupModal from '@/components/RestaurantOwnerSignupModal';
import RestaurantOwnerLoginModal from '@/components/RestaurantOwnerLoginModal';
```

## Testing
To test the integration:
1. Start the development server: `npm run dev`
2. Navigate to `/restaurant-owner`
3. Click "Login" and test Google sign-in
4. Test both new user signup and existing user signin flows

## Security Notes
- Firebase handles Google authentication securely
- JWT tokens are used for session management
- MongoDB stores restaurant owner data separately from Firebase
- Password field is optional for Google-only users
- Firebase UID is used as the primary identifier for Google users

## Compatibility
- Works alongside existing email/password authentication
- Existing restaurant owners can still use traditional login
- New users can choose between Google or traditional signup
- Maintains backward compatibility with existing data
