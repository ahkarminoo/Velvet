import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/models/Organization';
import Restaurant from '@/models/Restaurants';

// Get organization for a specific restaurant
export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Find the restaurant first
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Find organization for this restaurant
    const organization = await Organization.findOne({ 
      'members.userId': restaurant.ownerId
    });
    
    if (!organization) {
      // Create default organization if none exists
      const newOrganization = new Organization({
        name: `${restaurant.restaurantName} Organization`,
        slug: await Organization.generateSlug(`${restaurant.restaurantName} Organization`),
        email: `admin@${restaurant.restaurantName.toLowerCase().replace(/\s+/g, '')}.com`,
        type: 'restaurant',
        address: {
          street: restaurant.location?.address || '',
          city: 'Bangkok',
          state: 'Bangkok',
          country: 'Thailand',
          coordinates: restaurant.location?.coordinates || { lat: 0, lng: 0 }
        },
        members: [{
          userId: restaurant.ownerId,
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
        status: 'active',
        settings: {
          timezone: 'Asia/Bangkok',
          currency: 'THB',
          language: 'th'
        }
      });
      
      await newOrganization.save();
      
      return NextResponse.json({
        success: true,
        data: newOrganization
      });
    }
    
    return NextResponse.json({
      success: true,
      data: organization
    });
    
  } catch (error) {
    console.error('Error fetching restaurant organization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// Update organization for a restaurant
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const updateData = await req.json();
    
    // Find and update the organization
    const organization = await Organization.findOneAndUpdate(
      { 'members.userId': restaurant.ownerId },
      updateData,
      { new: true }
    );
    
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: organization
    });
    
  } catch (error) {
    console.error('Error updating restaurant organization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
