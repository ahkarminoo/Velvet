import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';

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

    await dbConnect();

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update booking status for both regular and QR payments
        if (paymentIntent.metadata) {
          const { restaurantId, tableId, bookingId, type } = paymentIntent.metadata;
          
          if (bookingId) {
            // Update existing booking
            await Booking.findByIdAndUpdate(bookingId, {
              paymentStatus: 'completed',
              paymentIntentId: paymentIntent.id,
              paymentMethod: type === 'qr_payment' ? 'stripe_qr' : 'stripe_card',
              paidAmount: paymentIntent.amount / 100, // Convert from cents
              paidAt: new Date()
            });
            
            console.log(`Booking ${bookingId} payment completed via ${type || 'card'}`);
          }
          
          // Log payment for analytics
          console.log('Payment completed:', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            restaurantId,
            tableId,
            method: type === 'qr_payment' ? 'QR Code' : 'Credit Card'
          });
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        if (failedPayment.metadata?.bookingId) {
          await Booking.findByIdAndUpdate(failedPayment.metadata.bookingId, {
            paymentStatus: 'failed',
            paymentIntentId: failedPayment.id,
            failureReason: failedPayment.last_payment_error?.message || 'Payment failed'
          });
          
          console.log(`Booking ${failedPayment.metadata.bookingId} payment failed`);
        }
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object;
        console.log('Payment canceled:', canceledPayment.id);
        
        if (canceledPayment.metadata?.bookingId) {
          await Booking.findByIdAndUpdate(canceledPayment.metadata.bookingId, {
            paymentStatus: 'canceled',
            paymentIntentId: canceledPayment.id
          });
          
          console.log(`Booking ${canceledPayment.metadata.bookingId} payment canceled`);
        }
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
