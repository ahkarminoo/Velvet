import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Zone from '@/models/Zone';

/**
 * GET /api/venues/[id]/zones/table-price
 * Query params: tableId, floorplanId
 *
 * Returns the zone pricing for a specific table.
 * If the table has no zone assigned, returns a zero-price default.
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id: restaurantId } = await params;
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');
    const floorplanId = searchParams.get('floorplanId');

    if (!tableId || !floorplanId) {
      return NextResponse.json(
        { error: 'tableId and floorplanId are required' },
        { status: 400 }
      );
    }

    // Find the zone that contains this table
    const zone = await Zone.findOne({
      restaurantId,
      floorplanId,
      tableIds: tableId,
      isActive: true
    }).lean();

    if (!zone) {
      // No zone configured for this table — price is 0 (free / no deposit)
      return NextResponse.json({
        success: true,
        hasZone: false,
        finalPrice: 0,
        minimumSpend: 0,
        depositRequired: false,
        depositAmount: 0,
        currency: 'THB',
        zoneName: null,
        zoneType: null,
        zoneColor: null
      });
    }

    const pricing = zone.pricing || {};
    const basePrice = pricing.basePrice || 0;

    // Apply peak multiplier by default (can be extended with event detection)
    const peakMultiplier = pricing.peakMultiplier || 1.0;
    const finalPrice = Math.round(basePrice * peakMultiplier);

    return NextResponse.json({
      success: true,
      hasZone: true,
      zoneId: zone._id,
      zoneName: zone.name,
      zoneType: zone.type,
      zoneColor: zone.color,
      basePrice,
      peakMultiplier,
      finalPrice,
      minimumSpend: pricing.minimumSpend || 0,
      depositRequired: pricing.depositRequired || false,
      depositAmount: pricing.depositAmount || 0,
      currency: 'THB'
    });
  } catch (error) {
    console.error('Zone table-price error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
