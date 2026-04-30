import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    // Verify bucket exists
    const bucket = storage.bucket('foodloft-450813.firebasestorage.app');
    console.log('Using bucket:', bucket.name);
    const [exists] = await bucket.exists();
    console.log('Bucket exists?', exists);
    if (!exists) {
      return NextResponse.json(
        { error: `Bucket ${bucket.name} does not exist or inaccessible.` },
        { status: 500 }
      );
    }

    // Proceed with your existing code
    const data = await req.formData();
    const file = data.get('file');
    const type = data.get('type'); // 'restaurant', 'customer', 'review'

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine folder based on upload type
    const folder = type === 'restaurant' ? 'restaurant-images' :
                  type === 'customer' ? 'customer-profiles' :
                  type === 'review' ? 'review-images' :
                  'misc-uploads';

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const fileRef = bucket.file(fileName);
    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    // Make file public (optional)
    await fileRef.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ url: imageUrl });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    );
  }
}
