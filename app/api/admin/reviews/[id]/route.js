import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import Restaurant from '@/models/Restaurants';
import Admin from '@/models/Admin';
import { verifyAdminAuth } from '@/lib/adminAuth';

// GET: Get a specific review with details
export async function GET(req, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const review = await Review.findById(id)
      .populate('restaurantId', 'restaurantName location')
      .populate('userId', 'firstName lastName email')
      .populate('flaggedBy', 'firstName lastName username');

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update review status (flag, hide, remove)
export async function PATCH(req, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Check if admin has review management permissions
    if (!authResult.admin.permissions.includes('manage_reviews')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const { status, reason } = await req.json();

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Update review status
    const updateData = { status };
    
    if (status === 'flagged' || status === 'hidden' || status === 'removed') {
      updateData.flaggedReason = reason;
      updateData.flaggedBy = authResult.admin.id;
      updateData.flaggedAt = new Date();
    } else if (status === 'active') {
      // Reset flagging data when reactivating
      updateData.flaggedReason = null;
      updateData.flaggedBy = null;
      updateData.flaggedAt = null;
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('restaurantId', 'restaurantName')
     .populate('userId', 'firstName lastName')
     .populate('flaggedBy', 'firstName lastName username');

    // If review is removed, recalculate restaurant rating
    if (status === 'removed') {
      await recalculateRestaurantRating(review.restaurantId);
    }

    return NextResponse.json({
      success: true,
      review: updatedReview,
      message: `Review ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Permanently delete a review
export async function DELETE(req, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Check if admin has review management permissions
    if (!authResult.admin.permissions.includes('manage_reviews')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const restaurantId = review.restaurantId;

    // Delete the review
    await Review.findByIdAndDelete(id);

    // Recalculate restaurant rating
    await recalculateRestaurantRating(restaurantId);

    return NextResponse.json({
      success: true,
      message: 'Review permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to recalculate restaurant rating
async function recalculateRestaurantRating(restaurantId) {
  try {
    const activeReviews = await Review.find({
      restaurantId: restaurantId,
      status: 'active'
    });

    if (activeReviews.length === 0) {
      // No active reviews, reset rating
      await Restaurant.findByIdAndUpdate(restaurantId, {
        rating: 0,
        totalReviews: 0
      });
    } else {
      // Calculate new average rating
      const totalRating = activeReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / activeReviews.length;

      await Restaurant.findByIdAndUpdate(restaurantId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        totalReviews: activeReviews.length
      });
    }
  } catch (error) {
    console.error('Error recalculating restaurant rating:', error);
  }
}
