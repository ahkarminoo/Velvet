import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function uploadToGitHub(buffer, filename, contentType) {
  const token = process.env.GITHUB_PANORAMA_TOKEN;
  const repo = process.env.GITHUB_PANORAMA_REPO;
  if (!token || !repo) {
    throw new Error('GITHUB_PANORAMA_TOKEN or GITHUB_PANORAMA_REPO not configured');
  }

  const date = new Date().toISOString().slice(0, 10);
  const repoPath = `panoramas/${date}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}`;

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'velvet-app',
    },
    body: JSON.stringify({
      message: `panorama: ${filename}`,
      content: buffer.toString('base64'),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub upload failed (${res.status}): ${errText}`);
  }

  return `https://cdn.jsdelivr.net/gh/${repo}@main/${repoPath}`;
}

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('file');
    const type = data.get('type');

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    if (type === '360view') {
      try {
        const url = await uploadToGitHub(buffer, fileName, file.type || 'image/jpeg');
        return NextResponse.json({ url });
      } catch (err) {
        console.error('360view GitHub upload failed:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    const folder = type === 'restaurant' ? 'restaurant-images' :
                   type === 'customer' ? 'customer-profiles' :
                   type === 'review' ? 'review-images' :
                   'misc-uploads';

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
