import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Organization from '@/models/Organization';
import Restaurant from '@/models/Restaurants';

// Get all subscriptions with filtering and pagination
export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const planType = searchParams.get('planType');
    const organizationId = searchParams.get('organizationId');
    
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (planType) filter.planType = planType;
    if (organizationId) filter.organizationId = organizationId;
    
    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('organizationId', 'name slug type status')
        .populate('ownerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscription.countDocuments(filter)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// Create new subscription
export async function POST(req) {
  try {
    const { organizationId, ownerId, planType, billingCycle = 'monthly' } = await req.json();
    
    if (!organizationId || !ownerId || !planType) {
      return NextResponse.json(
        { success: false, error: 'Organization ID, Owner ID, and Plan Type are required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ organizationId });
    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription already exists for this organization' },
        { status: 400 }
      );
    }
    
    // Get plan limits and pricing
    const planLimits = Subscription.getPlanLimits(planType);
    const pricing = getPlanPricing(planType, billingCycle);
    
    // Create subscription
    const subscription = new Subscription({
      organizationId,
      ownerId,
      planType,
      billingCycle,
      price: pricing.price,
      currency: pricing.currency,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      usage: {
        floorPlansLimit: planLimits.floorPlansLimit,
        tablesLimit: planLimits.tablesLimit,
        staffLimit: planLimits.staffLimit,
        bookingsLimit: planLimits.bookingsLimit,
        apiCallsLimit: planLimits.apiCallsLimit,
        storageLimit: planLimits.storageLimit
      },
      features: planLimits.features
    });
    
    await subscription.save();
    
    // Update organization with subscription reference
    organization.subscriptionId = subscription._id;
    await organization.save();
    
    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// Helper function to get plan pricing
function getPlanPricing(planType, billingCycle) {
  const pricing = {
    free: { price: 0, currency: 'THB' },
    basic: { price: billingCycle === 'yearly' ? 12000 : 1200, currency: 'THB' },
    business: { price: billingCycle === 'yearly' ? 28000 : 2800, currency: 'THB' },
    professional: { price: billingCycle === 'yearly' ? 55000 : 5500, currency: 'THB' },
    enterprise: { price: billingCycle === 'yearly' ? 120000 : 12000, currency: 'THB' }
  };
  
  return pricing[planType] || pricing.free;
}
