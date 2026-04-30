import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Floorplan from '@/models/Floorplan';

async function getExistingFloorplan(floorplanId) {
  try {
    await dbConnect();
    return await Floorplan.findById(floorplanId);
  } catch (error) {
    console.error('Error fetching existing floorplan:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: "Unauthorized - Invalid token format" 
      }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.userId) {
        return NextResponse.json({ 
          error: "Unauthorized - Invalid token payload" 
        }, { status: 401 });
      }
    } catch (jwtError) {
      return NextResponse.json({ 
        error: "Unauthorized - Token verification failed"
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('screenshot');
    const floorplanId = formData.get('floorplanId');
    const isEditing = formData.get('isEditing') === 'true';

    if (!file || !floorplanId) {
      return NextResponse.json({
        error: 'Missing screenshot file or floorplan ID'
      }, { status: 400 });
    }

    // Convert the file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check if we're in production (Vercel, Netlify, etc.)
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.VERCEL || 
                        process.env.NETLIFY;
    
    let imageUrl;
    
    if (isProduction) {
      // Use cloud storage for production
      try {
        const { storage } = await import('@/lib/firebase-admin');
        const bucket = storage.bucket('foodloft-450813.firebasestorage.app');
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `floorplan_${floorplanId}_${timestamp}.png`;
        const fileRef = bucket.file(`floorplans/${filename}`);
        
        // Upload to Firebase Storage
        await fileRef.save(buffer, {
          metadata: { contentType: 'image/png' },
        });
        
        // Make file public
        await fileRef.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/floorplans/${filename}`;
        
        console.log('Screenshot uploaded to cloud storage:', imageUrl);
        
      } catch (cloudError) {
        console.error('Cloud storage upload failed, falling back to local storage:', cloudError);
        // Fall back to local storage
        const screenshotsDir = path.join(process.cwd(), 'public', 'images', 'floorplans');
        try {
          await mkdir(screenshotsDir, { recursive: true });
        } catch (error) {
          // Directory might already exist, that's okay
        }
        
        const timestamp = Date.now();
        const filename = `floorplan_${floorplanId}_${timestamp}.png`;
        const filePath = path.join(screenshotsDir, filename);
        await writeFile(filePath, buffer);
        imageUrl = `/images/floorplans/${filename}`;
      }
    } else {
      // Use local storage for development
      const screenshotsDir = path.join(process.cwd(), 'public', 'images', 'floorplans');
      try {
        await mkdir(screenshotsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, that's okay
      }
      
      const timestamp = Date.now();
      const filename = `floorplan_${floorplanId}_${timestamp}.png`;
      const filePath = path.join(screenshotsDir, filename);
      await writeFile(filePath, buffer);
      imageUrl = `/images/floorplans/${filename}`;
    }

    return NextResponse.json({
      message: 'Screenshot uploaded successfully',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload screenshot'
    }, { status: 500 });
  }
} 