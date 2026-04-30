'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

function TestStripeForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [result, setResult] = useState(null);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100, // 100 THB
          currency: 'thb',
          metadata: {
            test: 'true',
          },
        }),
      });

      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setResult('Payment intent created successfully!');
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setResult('Stripe not loaded or no client secret');
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setResult(`Payment failed: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        setResult(`Payment succeeded! ID: ${paymentIntent.id}`);
      }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Stripe Integration Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={createPaymentIntent}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Payment Intent (100 THB)
          </button>

          {clientSecret && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Information
                </label>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Pay 100 THB'}
              </button>
            </form>
          )}

          {result && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestStripePage() {
  return (
    <Elements stripe={stripePromise}>
      <TestStripeForm />
    </Elements>
  );
}
