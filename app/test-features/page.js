'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function TestFeaturesPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const handleTestEmail = async (e) => {
    e.preventDefault();
    
    if (!restaurantId || !customerEmail) {
      toast.error('Please provide restaurant ID and customer email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          customerEmail
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResults(result);
        toast.success('Test email sent successfully!');
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error sending test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Feature Testing Page</h1>
        
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Email with Menu Images Test */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-green-600">📧 Email with Menu Images Test</h2>
            <p className="text-gray-600 mb-6">
              Test the confirmation email feature that includes restaurant menu images.
            </p>
            
            <form onSubmit={handleTestEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant ID
                </label>
                <input
                  type="text"
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  placeholder="Enter restaurant ID (e.g., 507f1f77bcf86cd799439011)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter customer email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Test Email...
                  </>
                ) : (
                  'Send Test Email'
                )}
              </button>
            </form>
            
            {testResults && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-semibold text-green-800 mb-2">✅ Test Results</h3>
                <div className="text-sm text-green-700">
                  <p><strong>Restaurant:</strong> {testResults.restaurant.name}</p>
                  <p><strong>Menu Images:</strong> {testResults.restaurant.menuImagesCount} images found</p>
                  <p><strong>Email Status:</strong> {testResults.emailResult.success ? 'Sent Successfully' : 'Failed'}</p>
                  {testResults.emailResult.messageId && (
                    <p><strong>Message ID:</strong> {testResults.emailResult.messageId}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Review Management Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">🔍 Review Management Features</h2>
            <p className="text-gray-600 mb-4">
              The review management system has been implemented with the following features:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Admin Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• View all reviews with filtering</li>
                  <li>• Flag inappropriate reviews</li>
                  <li>• Hide reviews from public view</li>
                  <li>• Remove reviews permanently</li>
                  <li>• Restore hidden reviews</li>
                  <li>• Search reviews by content</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Review Status:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <span className="text-green-600">Active</span> - Visible to public</li>
                  <li>• <span className="text-yellow-600">Flagged</span> - Under review</li>
                  <li>• <span className="text-gray-600">Hidden</span> - Hidden from public</li>
                  <li>• <span className="text-red-600">Removed</span> - Permanently deleted</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Access:</strong> Admin can access the review management system through the Admin Dashboard → Reviews tab.
                The system automatically recalculates restaurant ratings when reviews are removed or restored.
              </p>
            </div>
          </div>

          {/* Implementation Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-purple-600">📋 Implementation Summary</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">✅ Completed Features:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-700">Review Management:</h4>
                    <ul className="text-gray-600 space-y-1 ml-4">
                      <li>• Updated Review model with status tracking</li>
                      <li>• Admin API endpoints for review management</li>
                      <li>• Reviews Management component for admin dashboard</li>
                      <li>• Automatic rating recalculation</li>
                      <li>• Public filtering of hidden/removed reviews</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-700">Email with Menu Images:</h4>
                    <ul className="text-gray-600 space-y-1 ml-4">
                      <li>• Updated email templates with menu section</li>
                      <li>• Automatic menu image fetching</li>
                      <li>• Responsive email design</li>
                      <li>• Fallback text version</li>
                      <li>• Test API endpoint</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-800 mb-2">📁 Files Created/Updated:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Models:</strong> models/Review.js (added status fields)</p>
                  <p><strong>API:</strong> app/api/admin/reviews/[id]/route.js (new)</p>
                  <p><strong>Components:</strong> components/admin/ReviewsManagement.js (new)</p>
                  <p><strong>Email:</strong> lib/email/templates.js, lib/email/bookingNotifications.js</p>
                  <p><strong>Notifications:</strong> lib/lineNotificationService.js</p>
                  <p><strong>Dashboard:</strong> components/AdminDashboard.js</p>
                  <p><strong>Test:</strong> app/api/test-email/route.js (new)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
