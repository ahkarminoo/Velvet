import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import mongoose from 'mongoose';
import Restaurant from '@/models/Restaurants';
import User from '@/models/user';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

// Helper function to ensure user exists in MongoDB
async function ensureUserExists(firebaseUid, email) {
  try {
    // First try to find by firebaseUid
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      console.log("User not found by firebaseUid, attempting to create...");
      try {
        // Create new user
        user = await User.create({
          firebaseUid,
          email,
          role: 'customer'
        });
        console.log("New user created:", user._id);
      } catch (createError) {
        // If duplicate email error, try to find by email as fallback
        if (createError.code === 11000) {
          console.log("Duplicate key error, finding existing user by email...");
          user = await User.findOne({ email });
          if (user) {
            // Update existing user with firebaseUid if missing
            if (!user.firebaseUid) {
              user.firebaseUid = firebaseUid;
              await user.save();
            }
          }
        }
        if (!user) {
          throw createError;
        }
      }
    }
    
    return user;
  } catch (error) {
    console.error("Error in ensureUserExists:", error);
    throw error;
  }
}

// GET: Fetch reviews for a restaurant
export async function GET(req, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const url = new URL(req.url);
    const checkUserReview = url.searchParams.get('checkUserReview') === 'true';

    // If checking for user's specific review
    if (checkUserReview) {
      const authResult = await verifyFirebaseAuth(req);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 });
      }

      const { firebaseUid, email } = authResult;
      const user = await ensureUserExists(firebaseUid, email);

      const userReview = await Review.findOne({
        restaurantId: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(user._id)
      }).populate({
        path: 'userId',
        model: User,
        select: 'firstName lastName profileImage email'
      });

      return NextResponse.json({ 
        hasReview: !!userReview,
        userReview: userReview && userReview.userId ? {
          ...userReview.toObject(),
          userId: {
            ...userReview.userId.toObject(),
            profileImage: userReview.userId.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userReview.userId.firstName || 'U')}+${encodeURIComponent(userReview.userId.lastName || 'ser')}&background=f3f4f6&color=6b7280&size=128`
          }
        } : null
      });
    }

    // Fetch all active reviews for the restaurant (exclude hidden/removed)
    const reviews = await Review.find({ 
      restaurantId: new mongoose.Types.ObjectId(id),
      status: { $in: ['active', 'flagged'] } // Include flagged for admin review
    })
    .populate({
      path: 'userId',
      model: User,
      select: 'firstName lastName profileImage email'
    })
    .sort({ createdAt: -1 });

    // Ensure each review has a valid profile image and handle null userIds
    const processedReviews = reviews
      .filter(review => review.userId) // Filter out reviews with null userId
      .map(review => ({
        ...review.toObject(),
        userId: {
          ...review.userId.toObject(),
          profileImage: review.userId.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId.firstName || 'U')}+${encodeURIComponent(review.userId.lastName || 'ser')}&background=f3f4f6&color=6b7280&size=128`
        },
        // When processing review images, do not attempt to construct S3 URLs. Assume all image URLs are full URLs (Firebase Storage or otherwise).
        images: review.images
      }));

    return NextResponse.json({ reviews: processedReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new review
export async function POST(req, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const { rating, comment, images } = await req.json();
    
    // Verify Firebase authentication
    const authResult = await verifyFirebaseAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { firebaseUid, email } = authResult;

    // Ensure user exists in MongoDB
    const user = await ensureUserExists(firebaseUid, email);
    
    // Check if user has already reviewed this restaurant
    const existingReview = await Review.findOne({
      restaurantId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user._id)
    });

    let review;
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.images = images || [];
      review = await existingReview.save();
    } else {
      // Create new review
      review = await Review.create({
        restaurantId: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(user._id),
        rating,
        comment,
        images: images || [] // Make sure images array is properly formatted
      });
    }

    // Update restaurant rating
    const allReviews = await Review.find({ restaurantId: id });
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;

    await Restaurant.findByIdAndUpdate(id, {
      rating: averageRating,
      totalReviews: allReviews.length
    });

    // Populate user data before sending response
    await review.populate({
      path: 'userId',
      model: User,
      select: 'firstName lastName profileImage'
    });

    return NextResponse.json({ 
      review,
      message: existingReview ? 'Review updated successfully' : 'Review created successfully',
      isUpdate: !!existingReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: "User account conflict. Please contact support." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a review
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const id = params.id;
    const { reviewId } = await req.json();
    
    // Verify Firebase authentication
    const authResult = await verifyFirebaseAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { firebaseUid, email } = authResult;

    // Ensure user exists in MongoDB
    const user = await ensureUserExists(firebaseUid, email);
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Not authorized to delete this review" }, { status: 403 });
    }

    await Review.findByIdAndDelete(reviewId);

    // Update restaurant rating
    const allReviews = await Review.find({ restaurantId: id });
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    await Restaurant.findByIdAndUpdate(id, {
      rating: averageRating,
      totalReviews: allReviews.length
    });

    return NextResponse.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error('Error deleting review:', error);
    
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: "User account conflict. Please contact support." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 