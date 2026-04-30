import { NextResponse } from 'next/server';
import { getToken, getAllTokens } from '../../../../lib/tokenStorage';

export async function POST(request) {
  try {
    const { token } = await request.json();

    const allTokens = getAllTokens();
    console.log('🔍 Token verification request:', { token, allTokens: Object.keys(allTokens) });

    if (!token) {
      return NextResponse.json({
        error: 'Token is required'
      }, { status: 400 });
    }

    // Check if token exists and is not expired
    const registrationData = getToken(token);
    console.log('🔍 Token lookup result:', { found: !!registrationData, registrationData });
    
    if (!registrationData) {
      console.log('❌ Token not found:', { 
        token, 
        availableTokens: Object.keys(allTokens),
        totalTokens: Object.keys(allTokens).length 
      });
      return NextResponse.json({
        error: 'Invalid or expired registration token'
      }, { status: 404 });
    }

    // Return registration data without sensitive info
    return NextResponse.json({
      success: true,
      registrationData: {
        restaurantId: registrationData.restaurantId,
        role: registrationData.role,
        displayName: registrationData.displayName,
        expiresAt: registrationData.expiresAt
      }
    });

  } catch (error) {
    console.error('Error verifying QR token:', error);
    return NextResponse.json({
      error: 'Failed to verify token'
    }, { status: 500 });
  }
}
