import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('file');
    const type = data.get('type');

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const folder = type === 'restaurant' ? 'restaurant-images' :
                   type === 'customer' ? 'customer-profiles' :
                   type === 'review' ? 'review-images' :
                   type === '360view' ? 'panorama-360' :
                   'misc-uploads';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/${folder}/${fileName}`;
    return NextResponse.json({ url });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: "Error uploading file" }, { status: 500 });
  }
}
