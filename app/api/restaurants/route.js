import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurants";
import jwt from "jsonwebtoken";
import RestaurantOwner from "@/models/restaurant-owner"; // Import restaurant owner model
import Subscription from "@/models/Subscription";

// Add a verifyToken function if you don't have it imported
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

const normalizeLocation = (location) => {
  if (!location) return { address: "", placeId: "", coordinates: { lat: null, lng: null } };

  if (typeof location === "string") {
    return {
      address: location,
      placeId: "",
      coordinates: { lat: null, lng: null }
    };
  }

  return {
    address: location.address || "",
    placeId: location.placeId || "",
    coordinates: {
      lat: location.coordinates?.lat ?? null,
      lng: location.coordinates?.lng ?? null
    }
  };
};

// ✅ POST: Create new restaurant profile
export async function POST(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const ownerId = decoded.userId;

    // Get owner and check SaaS limits through organization
    const owner = await RestaurantOwner.findById(ownerId);
    if (!owner) {
      return NextResponse.json({ message: "Owner not found" }, { status: 404 });
    }

    // Find organization that this owner belongs to and populate subscription
    const Organization = await import('@/models/Organization').then(mod => mod.default);
    const organization = await Organization.findOne({ 
      'members.userId': ownerId 
    }).populate('subscriptionId');

    // Check SaaS restaurant limit if organization and subscription exist
    if (organization && organization.subscriptionId) {
      const currentRestaurants = await Restaurant.countDocuments({ ownerId });
      const limit = organization.subscriptionId.usage?.restaurantsLimit || -1;
      
      if (currentRestaurants >= limit && limit !== -1) { // -1 means unlimited
        return NextResponse.json({ 
          error: 'Restaurant limit reached',
          message: `You have reached your limit of ${limit} restaurants. Please upgrade your plan to add more restaurants.`,
          currentPlan: organization.subscriptionId.planType,
          upgradeRequired: true,
          currentUsage: currentRestaurants,
          limit: limit
        }, { status: 403 });
      }
    }

    // Check if owner already has a restaurant
    const existingRestaurant = await Restaurant.findOne({ ownerId });
    if (existingRestaurant) {
      // If restaurant already exists, check if we need to add a contact number
      console.log("DEBUG - POST: Restaurant already exists");
      console.log("Existing contact number:", existingRestaurant.contactNumber || "NOT SET");
      
      const restaurantData = await req.json();
      console.log("Received contact number:", restaurantData.contactNumber || "NOT PROVIDED");
      
      // If we need to add a contact number to an existing restaurant
      if (!existingRestaurant.contactNumber && restaurantData.contactNumber) {
        console.log("DEBUG - Adding contact number to existing restaurant");
        existingRestaurant.contactNumber = restaurantData.contactNumber;
        await existingRestaurant.save();
        
        console.log("DEBUG - Contact number added successfully");
        console.log("Updated restaurant:", existingRestaurant);
        
        return NextResponse.json({ 
          message: "Contact number added successfully", 
          restaurant: existingRestaurant 
        }, { status: 200 });
      }
      
      return NextResponse.json({ message: "Restaurant profile already exists" }, { status: 400 });
    }

    const restaurantData = await req.json();
    console.log("DEBUG - Creating new restaurant with data:", restaurantData);
    console.log("Contact number from request:", restaurantData.contactNumber || "NOT PROVIDED");
    
    // Validate required fields
    if (!restaurantData.restaurantName || !restaurantData.cuisineType || !restaurantData.description) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Create new restaurant with validated data
    const restaurant = new Restaurant({
      ownerId,
      restaurantName: restaurantData.restaurantName,
      cuisineType: restaurantData.cuisineType,
      location: normalizeLocation(restaurantData.location),
      description: restaurantData.description,
      contactNumber: restaurantData.contactNumber || "", // Default to empty string if not provided
      openingHours: restaurantData.openingHours || {},
      images: restaurantData.images || { main: "", gallery: [] }
    });

    await restaurant.save();
    console.log("DEBUG - New restaurant created with ID:", restaurant._id);
    console.log("Contact number stored:", restaurant.contactNumber || "NOT SET");

    // Update owner with restaurant reference
    await RestaurantOwner.findByIdAndUpdate(ownerId, { restaurantId: restaurant._id });

    // Update SaaS usage tracking
    if (owner.subscriptionId) {
      await owner.subscriptionId.incrementUsage('restaurantsUsed', 1);
      await owner.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
    }

    return NextResponse.json({ message: "Profile created successfully!", restaurant }, { status: 201 });
  } catch (error) {
    console.error("Error creating restaurant profile:", error);
    return NextResponse.json({ 
      message: "Internal server error", 
      error: error.message 
    }, { status: 500 });
  }
}

// ✅ GET: Fetch single restaurant profile
export async function GET(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const ownerId = decoded.userId;

    // Find single restaurant by owner ID
    const restaurant = await Restaurant.findOne({ ownerId });
    
    // Debug log to check if contact number is stored
    console.log("DEBUG - GET Restaurant Profile:");
    console.log("Restaurant found:", !!restaurant);
    if (restaurant) {
      console.log("Restaurant ID:", restaurant._id);
      console.log("Restaurant Name:", restaurant.restaurantName);
      console.log("Contact Number:", restaurant.contactNumber || "NOT SET");
      console.log("Has contact number:", !!restaurant.contactNumber);
      console.log("Full restaurant object:", JSON.stringify(restaurant, null, 2));
    }
    
    if (!restaurant) {
      return NextResponse.json({ message: "No restaurant found", restaurant: null }, { status: 200 });
    }

    return NextResponse.json({ restaurant }, { status: 200 });

  } catch (error) {
    console.error("Error fetching restaurant profile:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ✅ PUT: Update restaurant profile
export async function PUT(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const ownerId = decoded.userId;
    
    // Get restaurant data from request body
    const data = await req.json();
    console.log("DEBUG - PUT: Received restaurant update data:", data);
    console.log("Contact number from request:", data.contactNumber || "NOT PROVIDED");
    
    const { restaurantName, cuisineType, location, description, contactNumber, openingHours, images } = data;
    
    // Find the restaurant using ownerId
    const restaurant = await Restaurant.findOne({ ownerId });
    if (!restaurant) {
      console.log("DEBUG - Restaurant not found for owner ID:", ownerId);
      return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
    }
    
    // Debug existing state
    console.log("DEBUG - Current restaurant state before update:");
    console.log("ID:", restaurant._id);
    console.log("Name:", restaurant.restaurantName);
    console.log("Current contact number:", restaurant.contactNumber || "NOT SET");
    
    // Prepare update fields
    const updateFields = {};
    if (restaurantName) updateFields.restaurantName = restaurantName;
    if (cuisineType) updateFields.cuisineType = cuisineType;
    if (location !== undefined) updateFields.location = normalizeLocation(location);
    if (description) updateFields.description = description;
    if (contactNumber !== undefined) updateFields.contactNumber = contactNumber;
    if (openingHours) updateFields.openingHours = openingHours;
    if (images) updateFields.images = images;
    
    console.log("DEBUG - Update fields prepared:", updateFields);
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { $set: updateFields },
      { new: true }
    );
    
    console.log("DEBUG - Restaurant after update:");
    console.log("ID:", updatedRestaurant._id);
    console.log("Name:", updatedRestaurant.restaurantName);
    console.log("Updated contact number:", updatedRestaurant.contactNumber || "NOT SET");
    console.log("Full updated restaurant:", JSON.stringify(updatedRestaurant, null, 2));
    
    return NextResponse.json({ restaurant: updatedRestaurant }, { status: 200 });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
