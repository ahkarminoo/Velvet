'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function StaffRegistrationPage() {
  const params = useParams();
  const [registrationData, setRegistrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/staff/verify-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: params.token }),
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrationData(data.registrationData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid registration link');
      }
    } catch (err) {
      setError('Failed to verify registration link');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = () => {
    // Redirect to add Line bot as friend
    // In production, this would be your actual Line bot's add friend URL
    const lineAddFriendUrl = `https://line.me/R/ti/p/@your-bot-id`;
    window.open(lineAddFriendUrl, '_blank');
  };

  const copyRegistrationCommand = async () => {
    const command = `register ${params.token}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy text: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF4F18] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying registration link...</p>
        </div>
      </div>
    );
  }

  if (error && !registrationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Registration Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-[#FF4F18] text-4xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Join Our Team!</h1>
          <p className="text-gray-600">Complete your staff registration</p>
        </div>

        {registrationData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Welcome!</h3>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {registrationData.displayName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Role:</strong> {registrationData.role}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Registration Code: <code className="bg-gray-200 px-1 rounded">{params.token}</code>
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📱 Step 1: Add Line Bot</h3>
            <p className="text-blue-700 text-sm mb-3">
              First, you need to add our restaurant's Line bot as a friend.
            </p>
            <button
              onClick={handleAddBot}
              className="w-full bg-[#00B900] hover:bg-[#00A000] text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
            >
              <span>📱</span>
              <span>Add Line Bot as Friend</span>
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">💬 Step 2: Complete Registration</h3>
            <p className="text-yellow-700 text-sm mb-2">
              After adding the bot, send this message in the Line chat:
            </p>
            <div className="bg-white border rounded p-3 font-mono text-sm relative">
              <div className="flex items-center justify-between">
                <span className="flex-1">register {params.token}</span>
                <button
                  onClick={copyRegistrationCommand}
                  className={`ml-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    copied 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
            <p className="text-yellow-600 text-xs mt-2">
              Click the copy button and paste this exact message to the Line bot
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ Step 3: You're Done!</h3>
            <p className="text-green-700 text-sm">
              The bot will confirm your registration and you'll be able to access staff features immediately.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact your manager for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}