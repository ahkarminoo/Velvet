# Stripe Credit Card Payment Integration

This document describes the Stripe credit card payment integration implemented in the FoodLoft application.

## Overview

The application now supports both Promtpay QR code payments and Stripe credit card payments for restaurant table reservations. The integration uses Stripe Elements for secure card input and follows Stripe's best practices for PCI compliance.

## Features

- **Secure Card Input**: Uses Stripe Elements for PCI-compliant card data collection
- **Real-time Validation**: Card information is validated in real-time
- **Payment Intent Flow**: Implements Stripe's Payment Intent API for secure payment processing
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Mobile-friendly payment interface
- **Dual Payment Methods**: Supports both Promtpay and credit card payments

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### Getting Stripe Keys

1. Sign up for a Stripe account at [stripe.com](https://stripe.com)
2. Go to the Stripe Dashboard
3. Navigate to Developers → API Keys
4. Copy your Publishable key and Secret key
5. Use test keys for development (they start with `pk_test_` and `sk_test_`)

## API Endpoints

### 1. Create Payment Intent
**Endpoint**: `POST /api/stripe/create-payment-intent`

Creates a Stripe Payment Intent for processing credit card payments.

**Request Body**:
```json
{
  "amount": 100,
  "currency": "thb",
  "metadata": {
    "restaurantId": "restaurant_id",
    "tableId": "table_id",
    "date": "2024-01-15",
    "time": "19:00",
    "guestCount": 2
  }
}
```

**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### 2. Confirm Payment
**Endpoint**: `POST /api/stripe/confirm-payment`

Retrieves the status of a payment intent.

**Request Body**:
```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Response**:
```json
{
  "status": "succeeded",
  "paymentIntent": {
    "id": "pi_xxx",
    "amount": 10000,
    "currency": "thb",
    "status": "succeeded",
    "metadata": {}
  }
}
```

## Components

### PaymentDialog Component

The main payment dialog component (`components/PaymentDialog.js`) has been updated to support both payment methods:

- **Promtpay**: QR code-based payment (existing functionality)
- **Credit Card**: Stripe Elements integration (new)

### StripePaymentForm Component

A new component within PaymentDialog that handles:
- Payment intent creation
- Card element rendering
- Payment confirmation
- Error handling

## Usage

### In the Payment Dialog

1. User selects "Credit Card" payment method
2. Stripe Elements card input is displayed
3. User enters card information (number, expiry, CVV)
4. Payment intent is created automatically
5. User clicks "Pay" button
6. Payment is processed through Stripe
7. Success/error feedback is shown

### Test Cards

For testing, use these Stripe test card numbers:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVV.

## Testing

### Test Page

A test page is available at `/test-stripe` to verify the integration:

1. Navigate to `http://localhost:3000/test-stripe`
2. Click "Create Payment Intent"
3. Enter test card information
4. Click "Pay 100 THB"
5. Verify payment processing

### Manual Testing

1. Go through the booking flow
2. Select "Credit Card" payment method
3. Use test card numbers
4. Verify payment success/failure handling

## Security Features

- **PCI Compliance**: Card data never touches your servers
- **Encryption**: All communication with Stripe is encrypted
- **Tokenization**: Card data is tokenized by Stripe
- **Webhook Support**: Ready for webhook integration (endpoint exists)

## Error Handling

The integration handles various error scenarios:

- **Network errors**: Connection issues with Stripe
- **Card errors**: Declined cards, insufficient funds, etc.
- **Validation errors**: Invalid card information
- **API errors**: Stripe API issues

All errors are displayed to users with appropriate messaging.

## Webhook Integration (Optional)

A webhook endpoint is available at `/api/stripe/webhook` for handling Stripe events:

- Payment confirmations
- Payment failures
- Refunds
- Disputes

To enable webhooks:

1. Add webhook endpoint in Stripe Dashboard
2. Configure events to listen for
3. Add webhook secret to environment variables

## Production Deployment

### Environment Variables

Update your production environment with live Stripe keys:

```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
```

### Webhook Configuration

1. Set up webhook endpoint in Stripe Dashboard
2. Use your production domain: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook signing secret to environment variables

## Troubleshooting

### Common Issues

1. **"Stripe not loaded"**: Check publishable key configuration
2. **"Payment intent creation failed"**: Verify secret key and API endpoint
3. **Card validation errors**: Ensure proper card number format
4. **CORS errors**: Check API route configuration

### Debug Mode

Enable debug logging by adding to your environment:

```bash
STRIPE_DEBUG=true
```

## Support

For Stripe-related issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)

For application-specific issues, check the console logs and API responses.
