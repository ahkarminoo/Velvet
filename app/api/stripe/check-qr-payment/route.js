import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Missing Stripe secret key' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      success: true,
      status: paymentIntent.status,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created,
        last_payment_error: paymentIntent.last_payment_error
      }
    });

  } catch (error) {
    console.error('Error checking QR payment status:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check QR payment status' 
      },
      { status: 500 }
    );
  }
}
