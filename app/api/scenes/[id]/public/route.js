import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Floorplan from '@/models/Floorplan';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const floorplan = await Floorplan.findById(id);
    if (!floorplan) {
      return NextResponse.json(
        { error: 'Floor plan not found' },
        { status: 404 }
      );
    }

    // Manually construct the response object to avoid circular references
    const sanitizedObjects = floorplan.data.objects.map(obj => ({
      type: obj.type,
      position: obj.position,
      rotation: {
        x: obj.rotation.x,
        y: obj.rotation.y,
        z: obj.rotation.z,
        order: obj.rotation.order
      },
      scale: obj.scale,
      userData: Object.fromEntries(obj.userData || new Map())
    }));

    return NextResponse.json({
      id: floorplan._id.toString(),
      name: floorplan.name,
      data: {
        objects: sanitizedObjects,
        version: floorplan.data.version
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 