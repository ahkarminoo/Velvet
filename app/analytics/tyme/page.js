'use client';

import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion'; // Removed for JS compatibility
import { 
  RiRestaurantLine, 
  RiBarChartLine, 
  RiCalendarLine, 
  RiMoneyDollarCircleLine,
  RiUserLine,
  RiTimeLine,
  RiTrophyLine,
  RiLineChartLine,
  RiStarLine,
  RiMapPinLine,
  RiRefreshLine
} from 'react-icons/ri';
import Link from 'next/link';

const TYME_RESTAURANT_ID = '67b7164d8d2856f0a190046d';

export default function TymeAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching analytics for Tyme restaurant...');
      
      const response = await fetch(`/api/restaurants/${TYME_RESTAURANT_ID}/analytics`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
        setLastRefresh(new Date());
        console.log('📊 Analytics loaded successfully:', data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
        console.error('❌ Analytics API error:', data.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Analytics</h2>
          <p className="text-gray-500">Analyzing Tyme restaurant data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Analytics Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { restaurant, overview, patterns, tableAnalysis, pricing, advanced, algorithmTest } = analytics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-orange-500 hover:text-orange-600 transition-colors">
                <RiRestaurantLine className="w-8 h-8" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <RiBarChartLine className="w-8 h-8 text-orange-500 mr-3" />
                  {restaurant.name} Analytics
                </h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive data insights and pricing analysis
                </p>
              </div>
            </div>
            <button 
              onClick={fetchAnalytics}
              className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <RiRefreshLine className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
        {/* Restaurant Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <RiRestaurantLine className="w-6 h-6 text-orange-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
                {restaurant.rating && (
                  <div className="ml-4 flex items-center">
                    <RiStarLine className="w-5 h-5 text-yellow-500 mr-1" />
                    <span className="font-semibold text-gray-700">{restaurant.rating}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <RiMapPinLine className="w-4 h-4 mr-2 text-gray-400" />
                  {restaurant.location || 'Location not specified'}
                </div>
                <div className="flex items-center">
                  <RiRestaurantLine className="w-4 h-4 mr-2 text-gray-400" />
                  {restaurant.cuisine || 'Cuisine not specified'}
                </div>
                <div className="flex items-center">
                  <RiTimeLine className="w-4 h-4 mr-2 text-gray-400" />
                  Data quality: <span className={`ml-1 font-semibold ${
                    overview.dataQuality === 'Excellent' ? 'text-green-600' :
                    overview.dataQuality === 'Good' ? 'text-blue-600' :
                    overview.dataQuality === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{overview.dataQuality}</span>
                </div>
              </div>
              {restaurant.description && (
                <p className="mt-3 text-gray-600">{restaurant.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{overview.totalBookings.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  {overview.recentBookings} in last 30 days
                </p>
              </div>
              <RiCalendarLine className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{overview.totalRevenue.toLocaleString()} THB</p>
                <p className="text-sm text-gray-500 mt-1">
                  Avg: {overview.avgBookingValue} THB/booking
                </p>
              </div>
              <RiMoneyDollarCircleLine className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Guests</p>
                <p className="text-3xl font-bold text-gray-900">{overview.totalGuests.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Avg: {overview.avgGuestsPerBooking} per booking
                </p>
              </div>
              <RiUserLine className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Price Range</p>
                <p className="text-3xl font-bold text-gray-900">{pricing.minPrice}-{pricing.maxPrice}</p>
                <p className="text-sm text-gray-500 mt-1">THB per table</p>
              </div>
              <RiLineChartLine className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Peak Times */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiTrophyLine className="w-5 h-5 text-orange-500 mr-2" />
              Peak Time Slots
            </h3>
            <div className="space-y-4">
              {patterns.peakTimes.map((slot, index) => (
                <div key={slot.time} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      'bg-orange-600'
                    }`}></div>
                    <span className="font-medium text-gray-700">{slot.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{slot.count}</span>
                    <span className="text-sm text-gray-500 ml-2">({slot.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Days */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiCalendarLine className="w-5 h-5 text-blue-500 mr-2" />
              Popular Days
            </h3>
            <div className="space-y-4">
              {patterns.popularDays.map((day, index) => (
                <div key={day.day} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-blue-400' :
                      'bg-blue-300'
                    }`}></div>
                    <span className="font-medium text-gray-700">{day.day}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{day.count}</span>
                    <span className="text-sm text-gray-500 ml-2">({day.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Analysis & Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Table Capacity Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiUserLine className="w-5 h-5 text-purple-500 mr-2" />
              Table Capacity Preferences
            </h3>
            <div className="space-y-3">
              {Object.entries(tableAnalysis).map(([capacity, count]) => {
                const percentage = Math.round((count / overview.totalBookings) * 100);
                return (
                  <div key={capacity} className="relative">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{capacity} tables</span>
                      <span className="text-sm text-gray-500">{count} bookings ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiMoneyDollarCircleLine className="w-5 h-5 text-green-500 mr-2" />
              Price Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(pricing.priceDistribution).map(([range, count]) => {
                const percentage = Math.round((count / overview.totalBookings) * 100);
                return (
                  <div key={range} className="relative">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{range}</span>
                      <span className="text-sm text-gray-500">{count} bookings ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Algorithm Test Results */}
        {algorithmTest && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiLineChartLine className="w-5 h-5 text-orange-500 mr-2" />
              Live Algorithm Test
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Sample Booking (2-person table, 7:30 PM today):</p>
                  <p className="text-2xl font-bold text-gray-900">{algorithmTest.finalPrice} THB</p>
                  <p className="text-sm text-gray-500">
                    Confidence: {Math.round((algorithmTest.confidence || 0.8) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Algorithm Status:</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    algorithmTest.success !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {algorithmTest.success !== false ? '✅ Working Correctly' : '❌ Needs Attention'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Trends */}
        {patterns.monthlyBookings && patterns.monthlyBookings.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RiBarChartLine className="w-5 h-5 text-blue-500 mr-2" />
              Monthly Booking Trends
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patterns.monthlyBookings.map((month, index) => (
                <div key={month.month} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{month.month}</p>
                  <p className="text-2xl font-bold text-blue-600">{month.count}</p>
                  <p className="text-sm text-gray-500">bookings</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            Last updated: {lastRefresh ? lastRefresh.toLocaleString() : 'Just now'} | 
            <Link href="/test-pricing" className="text-orange-500 hover:text-orange-600 ml-2">
              Test Dynamic Pricing Algorithm
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
