import mongoose from "mongoose";

const restaurantOwnerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: false, default: "" },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Made optional for Google auth users
    firebaseUid: { type: String, unique: true, sparse: true }, // For Firebase auth
    contactNumber: { type: String, required: true },
    profileImage: { type: String, default: "" }, // For Google profile images
    role: { type: String, default: "restaurant-owner" }, // Default role
    subscriptionPlan: { type: String, default: "Basic" }, // Default plan
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }
  },
  { timestamps: true }
);

const RestaurantOwner =
  mongoose.models.RestaurantOwner ||
  mongoose.model("RestaurantOwner", restaurantOwnerSchema);

export default RestaurantOwner;
