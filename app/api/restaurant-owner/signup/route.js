import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RestaurantOwner from "@/models/restaurant-owner";
import Restaurant from "@/models/Restaurants";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";

export async function POST(req) {
  try {
    console.log("📌 [API] Restaurant Owner Signup request received");

    await dbConnect();
    console.log("✅ [API] Database connected successfully");
    
    const body = await req.json();
    console.log("📥 [API] Request Body:", body);

    const { email, firebaseUid, firstName = '', lastName = '', profileImage = '', contactNumber = '' } = body;

    // Basic validation
    if (!email || !firebaseUid) {
      console.warn("⚠️ [API] Missing required fields:", { email, firebaseUid });
      return NextResponse.json(
        { message: "Email and firebaseUid are required" },
        { status: 400 }
      );
    }

    // Check if restaurant owner already exists by firebaseUid first
    let owner = await RestaurantOwner.findOne({ firebaseUid });
    
    if (!owner) {
      // Check if owner exists by email (for existing owners before Firebase migration)
      owner = await RestaurantOwner.findOne({ email });
      if (owner) {
        console.log("🔄 [API] Found existing restaurant owner by email, updating with Firebase UID");
        // Update existing owner with Firebase UID
        owner.firebaseUid = firebaseUid;
      }
    }
    
    if (owner) {
      // Always overwrite with new info if provided
      let updated = false;
      if (firstName) { owner.firstName = firstName; updated = true; }
      if (lastName) { owner.lastName = lastName; updated = true; }
      if (profileImage) { owner.profileImage = profileImage; updated = true; }
      if (!owner.firebaseUid) { owner.firebaseUid = firebaseUid; updated = true; }
      
      if (updated) {
        await owner.save();
        console.log("✅ [API] Restaurant owner updated with Firebase UID:", owner.firebaseUid);
      }

      // Check if owner has any restaurants
      const restaurant = await Restaurant.findOne({ ownerId: owner._id });
      const hasRestaurant = !!restaurant;
      
      const ownerData = {
        userId: owner._id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: "restaurantOwner",
        isRestaurantOwner: true,
        subscriptionPlan: owner.subscriptionPlan || "Basic",
        hasRestaurant,
        profileImage: owner.profileImage
      };
      
      return NextResponse.json(
        { message: "Restaurant owner found and updated", user: ownerData },
        { status: 200 }
      );
    }

    // Create new restaurant owner profile in MongoDB
    console.log("🆕 [API] Creating new restaurant owner:", email);
    owner = new RestaurantOwner({
      email,
      firebaseUid,
      firstName,
      lastName,
      profileImage,
      contactNumber: contactNumber || "Not provided", // Default contact number
      createdAt: new Date(),
      role: "restaurant-owner",
      subscriptionPlan: "Basic"
    });

    await owner.save();
    console.log("✅ [API] New restaurant owner saved in MongoDB:", owner);

    // Create default organization and subscription for new owner
    
    // Generate a unique slug for the organization
    const orgName = `${firstName} ${lastName}`.trim();
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = baseSlug || 'restaurant-owner';
    
    // Ensure slug is unique by checking existing organizations
    let counter = 1;
    let existingOrg = await Organization.findOne({ slug });
    while (existingOrg) {
      slug = `${baseSlug}-${counter}`;
      existingOrg = await Organization.findOne({ slug });
      counter++;
    }
    
    const organization = new Organization({
      name: `${orgName}'s Organization`,
      slug: slug,
      description: 'Default organization for restaurant owner',
      type: 'restaurant',
      email: email,
      members: [{
        userId: owner._id,
        role: 'owner',
        permissions: [
          'manage_organization',
          'manage_subscription',
          'manage_restaurants',
          'manage_staff',
          'manage_bookings',
          'view_analytics',
          'manage_settings'
        ],
        joinedAt: new Date(),
        isActive: true
      }],
      status: 'active'
    });
    
    await organization.save();
    
    // Create default basic subscription (free)
    const basicPlanLimits = Subscription.getPlanLimits('basic');
    const subscription = new Subscription({
      restaurantId: null, // Will be set when first restaurant is created
      ownerId: owner._id,
      organizationId: organization._id,
      planType: 'basic',
      billingCycle: 'monthly',
      price: 0,
      currency: 'THB',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usage: {
        restaurantsUsed: 0,
        restaurantsLimit: basicPlanLimits.restaurantsLimit,
        floorPlansUsed: 0,
        floorPlansLimit: basicPlanLimits.floorPlansLimit,
        tablesUsed: 0,
        tablesLimit: basicPlanLimits.tablesLimit,
        staffUsed: 0,
        staffLimit: basicPlanLimits.staffLimit,
        bookingsUsed: 0,
        bookingsLimit: basicPlanLimits.bookingsLimit,
        apiCallsUsed: 0,
        apiCallsLimit: basicPlanLimits.apiCallsLimit,
        storageUsed: 0,
        storageLimit: basicPlanLimits.storageLimit
      },
      features: basicPlanLimits.features
    });
    
    await subscription.save();
    
    // Update organization with subscription reference
    organization.subscriptionId = subscription._id;
    await organization.save();
    
    const ownerData = {
      userId: owner._id,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      role: "restaurantOwner",
      isRestaurantOwner: true,
      subscriptionPlan: owner.subscriptionPlan,
      hasRestaurant: false,
      profileImage: owner.profileImage
    };

    return NextResponse.json(
      { message: "Restaurant owner profile created successfully", user: ownerData },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API] Error in restaurant owner signup API:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
