import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { saveToken, cleanupExpiredTokens } from '../../../../lib/tokenStorage';

// ========================================
// RESTAURANT CONFIGURATION
// ========================================
// Change this restaurant ID to switch between different restaurants
const DEFAULT_RESTAURANT_ID = process.env.DEFAULT_RESTAURANT_ID || "68d548d7a11657653c2d49ec";

export async function POST(request) {
  try {
    const { restaurantId, role, displayName } = await request.json();

    // Use configurable restaurant ID if none provided
    const finalRestaurantId = restaurantId || DEFAULT_RESTAURANT_ID;

    if (!role || !displayName) {
      return NextResponse.json({
        error: 'Role and display name are required'
      }, { status: 400 });
    }

    // Generate unique registration token
    const token = crypto.randomUUID();
    const timestamp = Date.now();

    // Clean up expired tokens first
    cleanupExpiredTokens();

    // Store token with registration data (expires in 30 minutes)
    const tokenData = {
      restaurantId: finalRestaurantId,
      role,
      displayName,
      timestamp,
      expiresAt: timestamp + (30 * 60 * 1000) // 30 minutes
    };

    saveToken(token, tokenData);

    console.log('🔑 Generated new registration token:', {
      token,
      displayName,
      role,
      restaurantId: finalRestaurantId,
      expiresAt: new Date(timestamp + (30 * 60 * 1000)).toISOString()
    });

    // Create registration URL that will be embedded in QR code
    const registrationUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/staff-register/${token}`;

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(registrationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      token,
      registrationUrl,
      expiresAt: timestamp + (30 * 60 * 1000)
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({
      error: 'Failed to generate QR code'
    }, { status: 500 });
  }
}

// Cleanup expired tokens periodically
setInterval(() => {
  cleanupExpiredTokens();
}, 5 * 60 * 1000); // Clean up every 5 minutes
