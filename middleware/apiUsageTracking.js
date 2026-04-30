import { NextResponse } from 'next/server';

// Middleware to track API usage for SaaS limits
export function trackApiUsage(request, response, restaurantId = null) {
  // This middleware would be called after successful API operations
  // to increment API call usage in the subscription
  
  // For now, we'll implement this in individual endpoints
  // In a production system, you might want to use a more sophisticated
  // middleware approach or background job processing
  
  return response;
}

// Helper function to increment API usage
export async function incrementApiUsage(restaurantId) {
  try {
    const Restaurant = require('@/models/Restaurants');
    const restaurant = await Restaurant.findById(restaurantId).populate('subscriptionId');
    
    if (restaurant && restaurant.subscriptionId) {
      await restaurant.subscriptionId.incrementUsage('apiCallsThisMonth', 1);
    }
  } catch (error) {
    console.error('Error tracking API usage:', error);
    // Don't throw error - API usage tracking shouldn't break the main operation
  }
}

// Helper function to check API usage limits
export async function checkApiUsageLimit(restaurantId) {
  try {
    const Restaurant = require('@/models/Restaurants');
    const restaurant = await Restaurant.findById(restaurantId).populate('subscriptionId');
    
    if (restaurant && restaurant.subscriptionId) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Reset monthly usage if it's a new month
      const lastReset = restaurant.subscriptionId.lastApiReset || new Date();
      if (lastReset.getMonth() !== currentMonth || lastReset.getFullYear() !== currentYear) {
        restaurant.subscriptionId.usage.apiCallsThisMonth = 0;
        restaurant.subscriptionId.lastApiReset = new Date();
        await restaurant.subscriptionId.save();
      }
      
      const limit = restaurant.subscriptionId.usage.apiCallsLimit;
      const currentUsage = restaurant.subscriptionId.usage.apiCallsThisMonth || 0;
      
      if (currentUsage >= limit && limit !== -1) { // -1 means unlimited
        return {
          exceeded: true,
          currentUsage,
          limit,
          planType: restaurant.subscriptionId.planType
        };
      }
      
      return {
        exceeded: false,
        currentUsage,
        limit,
        planType: restaurant.subscriptionId.planType
      };
    }
    
    return { exceeded: false, currentUsage: 0, limit: -1, planType: 'free' };
  } catch (error) {
    console.error('Error checking API usage limit:', error);
    return { exceeded: false, currentUsage: 0, limit: -1, planType: 'free' };
  }
}
