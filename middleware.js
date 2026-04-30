import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (for development - use Redis in production)
const rateLimitMap = new Map();

function getRateLimitKey(request) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function isRateLimited(key, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const requests = rateLimitMap.get(key);
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(key, validRequests);
  
  if (validRequests.length >= limit) {
    return true; // Rate limited
  }
  
  validRequests.push(now);
  return false; // Not rate limited
}

export function middleware(request) {
  const response = NextResponse.next();

  // Add CORS headers with more restrictive settings
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://yourdomain.com', // Replace with your actual domain
    process.env.NEXT_PUBLIC_FRONTEND_URL
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitKey = getRateLimitKey(request);
    
    // Different limits for different endpoints
    let limit = 100; // Default limit
    let windowMs = 60000; // 1 minute
    
    // Stricter limits for sensitive endpoints
    if (request.nextUrl.pathname.includes('/login') || request.nextUrl.pathname.includes('/signup')) {
      limit = 5; // 5 requests per minute for auth endpoints
      windowMs = 60000;
    } else if (request.nextUrl.pathname.includes('/book')) {
      limit = 10; // 10 booking requests per minute
      windowMs = 60000;
    }
    
    if (isRateLimited(rateLimitKey, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(windowMs / 1000).toString()
          }
        }
      );
    }
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add CSP header for additional security
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.gstatic.com https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://*.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://*.gstatic.com; " +
    "connect-src 'self' https: wss: https://api.stripe.com https://*.stripe.com; " +
    "frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://*.stripe.com; " +
    "child-src 'self' https://js.stripe.com https://*.stripe.com;"
  );

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/restaurant-owner/:path*',
  ],
};