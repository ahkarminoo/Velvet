'use client'

import { useState, useEffect } from 'react';
import { FaSpinner, FaCheckCircle, FaTimes, FaQrcode, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';

export default function StripeQRPayment({ amount, onSuccess, onError, bookingDetails }) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isManualFallback, setIsManualFallback] = useState(false);

  // Create QR code payment intent
  useEffect(() => {
    const createQRPayment = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/stripe/create-qr-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'thb',
            metadata: {
              restaurantId: bookingDetails.restaurantId,
              tableId: bookingDetails.tableId,
              date: bookingDetails.date,
              time: bookingDetails.time,
              guestCount: bookingDetails.guestCount,
            },
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          setPaymentIntent(data.paymentIntent);
          setIsManualFallback(!!data.manualConfirmation);
          
          // For now, use a simple PromptPay QR code format
          // In production, you would integrate with your actual PromptPay account
          const qrCodeData = `https://promptpay.io/0891234567/${amount}`;
          
          const qrDataURL = await QRCode.toDataURL(qrCodeData, {
            width: 200,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          setQrCodeDataURL(qrDataURL);
          setIsPolling(true);
        } else {
          throw new Error(data.error || 'Failed to create QR payment');
        }
      } catch (error) {
        console.error('Error creating QR payment:', error);
        setIsManualFallback(true);
        setPaymentIntent({
          id: `manual_pending_${Date.now()}`,
          status: 'pending_manual'
        });

        const qrCodeData = `https://promptpay.io/0891234567/${amount}`;
        const qrDataURL = await QRCode.toDataURL(qrCodeData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataURL(qrDataURL);
        setIsPolling(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (amount > 0) {
      createQRPayment();
    }
  }, [amount, bookingDetails, onError]);

  // For QR payments, we'll use a manual confirmation approach
  // In a real implementation, you would integrate with your payment gateway's webhook
  const handleManualConfirmation = async () => {
    try {
      // Simulate payment confirmation
      // In production, this would be handled by webhooks from your payment provider
      setPaymentStatus('processing');
      
      // For demo purposes, automatically confirm after 3 seconds
      setTimeout(() => {
        setPaymentStatus('succeeded');
        setIsPolling(false);
        onSuccess({
          id: paymentIntent.id,
          amount: amount * 100, // Convert back to cents
          currency: 'thb',
          status: 'succeeded',
          metadata: {
            type: 'qr_payment'
          }
        });
      }, 3000);
      
    } catch (error) {
      console.error('Error confirming payment:', error);
      onError('Payment confirmation failed. Please try again.');
    }
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsPolling(false);
      onError('QR code expired. Please try again.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onError]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FaSpinner className="animate-spin text-[#FF4F18] text-2xl mr-3" />
        <span className="text-gray-600">Generating QR code...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* QR Code Display */}
      <div className="text-center">
        <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-200 mb-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-lg font-semibold text-gray-800 mb-2">
              Scan QR Code to Pay
            </div>
            
            {qrCodeDataURL ? (
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img
                  src={qrCodeDataURL}
                  alt="Payment QR Code"
                  className="mx-auto w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <FaQrcode className="text-gray-400 text-4xl" />
              </div>
            )}
            
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FF4F18] mb-2">
                {amount} THB
              </div>
              <div className="text-sm text-gray-600 px-2">
                Use your mobile banking app to scan and pay
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mb-4">
          {paymentStatus === 'pending' && (
            <div className="flex items-center justify-center text-orange-600">
              <FaSpinner className="animate-spin mr-2" />
              <span>Waiting for payment...</span>
            </div>
          )}
          {paymentStatus === 'processing' && (
            <div className="flex items-center justify-center text-blue-600">
              <FaSpinner className="animate-spin mr-2" />
              <span>Processing payment...</span>
            </div>
          )}
          {paymentStatus === 'succeeded' && (
            <div className="flex items-center justify-center text-green-600">
              <FaCheckCircle className="mr-2" />
              <span>Payment successful!</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center text-gray-500 mb-4">
          <FaClock className="mr-2" />
          <span>Expires in {formatTime(timeLeft)}</span>
        </div>

        {/* Instructions */}
        {isManualFallback && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p className="text-yellow-800 text-sm">
              Payment gateway is temporarily unavailable. You can still continue and your booking will be submitted as pending confirmation by the restaurant.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs">ℹ️</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">How to pay with QR code:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Open your mobile banking app</li>
                <li>Select "Scan QR" or "PromptPay QR"</li>
                <li>Scan the QR code above</li>
                <li>Confirm payment amount: {amount} THB</li>
                <li>Enter your PIN or use biometric authentication</li>
                <li>Complete the transaction</li>
                <li><strong>Click "I've Paid" below after completing payment</strong></li>
              </ol>
            </div>
          </div>
        </div>

        {/* Manual Confirmation Button */}
        {paymentStatus === 'pending' && (
          <div className="mt-4">
            <button
              onClick={handleManualConfirmation}
              className="w-full px-6 py-3 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90 
                transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <FaCheckCircle />
              I've Completed the Payment
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Click this button only after you've successfully completed the payment in your banking app
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
