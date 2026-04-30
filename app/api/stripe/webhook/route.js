import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Missing Stripe secret key' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Here you can add logic to:
        // - Update booking status in database
        // - Send confirmation emails
        // - Update restaurant records
        // - Log payment success
        
        // Example: Update booking status
        if (paymentIntent.metadata.restaurantId && paymentIntent.metadata.tableId) {
          // Add your booking update logic here
          console.log('Updating booking for restaurant:', paymentIntent.metadata.restaurantId);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        // Here you can add logic to:
        // - Update booking status to failed
        // - Send failure notifications
        // - Release table locks
        // - Log payment failure
        
        if (failedPayment.metadata.restaurantId && failedPayment.metadata.tableId) {
          console.log('Handling failed payment for restaurant:', failedPayment.metadata.restaurantId);
        }
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object;
        console.log('Payment canceled:', canceledPayment.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
