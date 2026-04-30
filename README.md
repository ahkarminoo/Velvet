# FoodLoft – Restaurant Reservation & Management Platform

**FoodLoft** is a modern web application for restaurant discovery, reservation, table management, and staff/admin operations. Built on Next.js, it features interactive 3D floorplans, SaaS multi-tenancy, Stripe payments, Line/Firebase integration, staff management tools, and rich UI/UX suitable for desktop and touchscreen devices.

## ✨ Features

- **Restaurant Discovery:**  
  Search, filter, and browse restaurants with categorization, favorites, and location-aware listings.

- **Interactive 3D Floorplans:**  
  Book seats using real-time, interactive 3D layouts, with full touch support and smooth UI animation.

- **SaaS & Multi-Tenant:**  
  Enables multiple restaurants/organizations, isolated per tenant. Flexible subscription plans with feature flags and analytics.

- **Admin Dashboard:**  
  Comprehensive interface for managing restaurants, staff, bookings, reviews, and analytics.

- **Staff Management:**  
  Role-based access, Line bot integration, waiters/hosts/managers/admin roles, and robust permissioning.

- **Stripe Payments:**  
  Secure credit card and PromptPay QR payments integrated into the reservation flow.

- **Google Auth for Owners:**  
  Owners can sign up and log in with Google (backed by Firebase Auth and MongoDB user profiles).

- **Review Management:**  
  Advanced admin controls for review flagging, hiding, or restoring, including effect on restaurant ratings.

- **Touch and Mobile Support:**  
  Rich support for touch gestures in both the booking and editing floorplan experiences.

## 🚀 Getting Started

1. **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

2. **Environment Setup**

    Create a `.env.local` file with your MongoDB, Firebase, Stripe, and other secrets. See example below:

    ```
    MONGODB_URI=your_mongodb_uri
    FIREBASE_API_KEY=your_firebase_key
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
    STRIPE_SECRET_KEY=sk_test_xxx
    ...
    ```

3. **Run the development server**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

4. **Open your browser** at [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

- `/app` – Next.js App directory, with routes for user/customer views, admin, signup, restaurant and floorplan UIs.
- `/components` – Core and feature components (modals, managers, dialogs, 3D/floorplan, auth, etc).
- `/models` – Mongoose schemas (Restaurant, Booking, Review, Staff, Subscription, and others).
- `/lib` – Utility libraries for Firebase, Stripe, authentication, emailing, etc.
- `/middleware` – API and feature-flag middleware.
- `/contexts` – React context for Firebase auth, Google Maps, etc.
- `/css` – App styles, including scene and touch-specific styles.
- `/public` – Static assets including images and 3D models.

## 📦 Key Technologies

- **Frontend:** Next.js, React 19, Tailwind CSS, Framer Motion, FontAwesome/MUI/Lucide for icons, GSAP for animation.
- **Backend:** Next.js API routes, Express, MongoDB (Mongoose), Firebase Admin.
- **Payments:** Stripe (credit card), PromptPay QR.
- **Authentication:** Firebase Auth (Google, Line), Next-Auth.
- **SaaS/Analytics:** Multi-tenant, feature flags, and real-time analytics.

## 📝 Documentation

- `SAAS_IMPLEMENTATION.md` – SaaS/multi-tenant details
- `STAFF_MANAGEMENT_README.md` – Staff/role management
- `STRIPE_INTEGRATION_README.md` – Payments integration
- `RESTAURANT_GOOGLE_AUTH_README.md` – Owner Google OAuth
- `REVIEW_AND_EMAIL_FEATURES_README.md` – Review controls and enhanced emails
- `TOUCH_SUPPORT_README.md` – Touch/3D usage for the floorplan system

Refer to these files for detailed explanations and advanced usage.

## 🛠️ Scripts

A range of scripts are available in `/scripts` for seeding data, admin creation, managing floorplans, and more.

```bash
npm run create-super-admin
npm run create-test-data
npm run seed-thai-holidays
```

## 🛡️ Security & Compliance

- Uses Stripe Elements for PCI-compliant credit card processing.
- JWT-based session and role authorization throughout.

## 🚧 Contributing

Please submit issues or pull requests via GitHub. All contributions and feedback are welcome!
