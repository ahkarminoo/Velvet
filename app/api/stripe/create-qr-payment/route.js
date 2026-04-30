import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          success: true,
          manualConfirmation: true,
          message: 'Payment service unavailable. Booking will be submitted as pending restaurant confirmation.',
          paymentIntent: {
            id: `manual_pending_${Date.now()}`,
            clientSecret: null,
            amount: 0,
            currency: 'thb',
            status: 'pending_manual'
          }
        },
        { status: 200 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { amount, currency = 'thb', metadata = {} } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Convert amount to smallest currency unit (satang for THB)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent for QR code tracking
    // We'll generate our own QR code but track payment through Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        type: 'qr_payment',
        restaurantId: metadata.restaurantId || '',
        tableId: metadata.tableId || '',
        date: metadata.date || '',
        time: metadata.time || '',
        guestCount: metadata.guestCount || '',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
    });

    // Generate QR code data
    const qrCodeData = {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      currency: currency.toUpperCase(),
      qrCodeUrl: `https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/display_bank_transfer_instructions`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
    };

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
        currency: currency.toLowerCase(),
        status: paymentIntent.status
      },
      qrCode: qrCodeData
    });

  } catch (error) {
    console.error('Error creating QR payment intent:', error);
    
    return NextResponse.json(
      {
        success: true,
        manualConfirmation: true,
        message: 'Payment service unavailable. Booking will be submitted as pending restaurant confirmation.',
        paymentIntent: {
          id: `manual_pending_${Date.now()}`,
          clientSecret: null,
          amount: 0,
          currency: 'thb',
          status: 'pending_manual'
        },
        error: error.message || 'Failed to create QR payment intent'
      },
      { status: 200 }
    );
  }
}
