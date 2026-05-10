import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function uploadToGitHub(buffer, filename) {
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
      message: `panorama (stitched): ${filename}`,
      content: buffer.toString('base64'),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub upload failed (${res.status}): ${errText}`);
  }

  return `https://cdn.jsdelivr.net/gh/${repo}@main/${repoPath}`;
}

// POST /api/realview/capture-finalize
// Body: { sessionId }
// Fetches the stitched panorama from Velvet360 Railway service, persists to GitHub,
// returns the permanent jsDelivr URL.
export async function POST(req) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId || !SAFE_ID.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }

    const velvet360 = process.env.VELVET360_URL;
    if (!velvet360) {
      return NextResponse.json({ error: 'VELVET360_URL not configured' }, { status: 500 });
    }

    const statusRes = await fetch(`${velvet360}/status/${sessionId}`);
    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Failed to read stitch status' }, { status: 502 });
    }
    const status = await statusRes.json();
    if (status.stage !== 'done') {
      return NextResponse.json(
        { error: `Stitch not ready (stage: ${status.stage})`, stage: status.stage },
        { status: 409 }
      );
    }

    const panoRes = await fetch(`${velvet360}/result/${sessionId}.jpg`);
    if (!panoRes.ok) {
      return NextResponse.json({ error: 'Failed to download stitched panorama' }, { status: 502 });
    }
    const arrayBuffer = await panoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `${uuidv4()}.jpg`;
    const url = await uploadToGitHub(buffer, filename);

    return NextResponse.json({ url, sessionId });
  } catch (err) {
    console.error('capture-finalize error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
