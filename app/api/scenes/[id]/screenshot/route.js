import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Floorplan from '@/models/Floorplan';
import jwt from 'jsonwebtoken';

// PUT /api/scenes/[id]/screenshot - Update floorplan screenshot URL
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const id = await params.id;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } catch (jwtError) {
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
    }

    const { screenshotUrl } = await request.json();

    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'Screenshot URL is required' },
        { status: 400 }
      );
    }

    // Update floorplan with screenshot URL
    const updatedFloorplan = await Floorplan.findByIdAndUpdate(
      id,
      { screenshotUrl },
      { new: true }
    );

    if (!updatedFloorplan) {
      return NextResponse.json(
        { error: 'Floorplan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Screenshot URL updated successfully",
      floorplan: updatedFloorplan
    });

  } catch (error) {
    console.error('Error updating screenshot URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 