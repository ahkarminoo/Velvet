import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Restaurant from '@/models/Restaurants';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    // Find the restaurant first
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }
    
    // If restaurant has subscriptionId, get the subscription
    if (restaurant.subscriptionId) {
      const subscription = await Subscription.findById(restaurant.subscriptionId);
      
      if (subscription) {
        return NextResponse.json({
          success: true,
          data: subscription
        });
      }
    }
    
    // If no subscription found, return null
    return NextResponse.json({
      success: true,
      data: null
    });
    
  } catch (error) {
    console.error('Error fetching restaurant subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}