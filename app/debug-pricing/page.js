'use client';

import { useState } from 'react';

export default function DebugPricingPage() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testPricingAPI = async () => {
    setLoading(true);
    try {
      // Test with Tyme restaurant (the one you specified)
      const testData = {
        restaurantId: '67b7164d8d2856f0a190046d', // Tyme restaurant
        tableId: 'test-table',
        date: '2025-02-14', // Valentine's Day
        time: '19:30',
        guestCount: 2,
        tableCapacity: 2,
        tableLocation: 'window'
      };

      console.log('🧪 Testing pricing API with:', testData);

      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response:', result);
        setTestResult(result);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error:', response.status, errorData);
        setTestResult({
          success: false,
          error: `HTTP ${response.status}: ${errorData.error || 'Unknown error'}`,
          details: errorData
        });
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      setTestResult({
        success: false,
        error: `Network Error: ${error.message}`,
        details: null
      });
    } finally {
      setLoading(false);
    }
  };

  const testWeekdayPricing = async () => {
    setLoading(true);
    try {
      const testData = {
        restaurantId: '67b7164d8d2856f0a190046d',
        tableId: 'test-table',
        date: '2025-01-15', // Wednesday
        time: '12:30', // Lunch
        guestCount: 4,
        tableCapacity: 4,
        tableLocation: 'center'
      };

      console.log('🧪 Testing weekday lunch pricing:', testData);

      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setTestResult({
          success: false,
          error: `HTTP ${response.status}: ${errorData.error || 'Unknown error'}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: `Network Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔍 Dynamic Pricing API Debug
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
          
          <div className="space-y-4">
            <button
              onClick={testPricingAPI}
              disabled={loading}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 mr-4"
            >
              {loading ? '⏳ Testing...' : '💕 Test Valentine\'s Day (Feb 14, 7:30 PM)'}
            </button>

            <button
              onClick={testWeekdayPricing}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '⏳ Testing...' : '🍽️ Test Weekday Lunch (Wed, 12:30 PM)'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Test Result</h3>
            
            {testResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-800 text-sm">✅ Final Price</h4>
                    <p className="text-xl font-bold text-green-900">
                      {testResult.finalPrice} {testResult.currency}
                    </p>
                    <p className="text-xs text-green-700">
                      Base: {testResult.basePrice} THB
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-800 text-sm">📊 Confidence</h4>
                    <p className="text-xl font-bold text-blue-900">
                      {Math.round((testResult.confidence || 0.8) * 100)}%
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-800 text-sm">🔢 Total Impact</h4>
                    <p className="text-xl font-bold text-purple-900">
                      {Math.round((Object.values(testResult.breakdown || {}).reduce((acc, d) => acc * (d.value || 1), 1) - 1) * 100)}%
                    </p>
                    <p className="text-xs text-purple-700">vs base price</p>
                  </div>
                </div>

                {testResult.breakdown && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-2 text-blue-800 text-sm">💡 Pricing Breakdown</h4>
                    
                    {/* Base Price */}
                    <div className="mb-2 p-2 bg-white rounded border-l-3 border-blue-500">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">🏪 Base Fee</span>
                        <span className="font-bold text-blue-600">{testResult.basePrice} THB</span>
                      </div>
                    </div>

                    {/* Factors */}
                    <div className="space-y-2 mb-4">
                      {Object.entries(testResult.breakdown).map(([factor, data]) => {
                        const factorName = {
                          demandFactor: { icon: '📊', name: 'Current Demand' },
                          temporalFactor: { icon: '⏰', name: 'Time Slot' },
                          historicalFactor: { icon: '📈', name: 'Historical Popularity' },
                          capacityFactor: { icon: '🪑', name: 'Table Type & Location' },
                          holidayFactor: { icon: '🎉', name: 'Special Events' }
                        }[factor] || { icon: '📝', name: factor };

                        const multiplier = data.value || 1;
                        const isIncrease = multiplier > 1;
                        const isDecrease = multiplier < 1;
                        const percentage = Math.round((multiplier - 1) * 100);
                        
                        return (
                          <div key={factor} className={`p-3 rounded border-l-4 ${
                            isIncrease ? 'bg-red-50 border-red-400' : 
                            isDecrease ? 'bg-green-50 border-green-400' : 
                            'bg-gray-50 border-gray-400'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <span className="mr-2 text-lg">{factorName.icon}</span>
                                <span className="font-medium text-gray-700">{factorName.name}</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold text-lg ${
                                  isIncrease ? 'text-red-600' : 
                                  isDecrease ? 'text-green-600' : 
                                  'text-gray-600'
                                }`}>
                                  {isIncrease ? '+' : isDecrease ? '' : ''}{percentage}%
                                </span>
                                <div className="text-sm text-gray-500">
                                  Multiplier: {multiplier.toFixed(2)}x
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 ml-8">{data.reason || 'No details available'}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculation */}
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Step-by-step calculation:</strong>
                      </div>
                      <div className="font-mono text-sm text-gray-700 mb-2 space-y-1">
                        <div>Base: {testResult.basePrice} THB</div>
                        <div>Factors: {Object.values(testResult.breakdown).map(d => (d.value || 1).toFixed(2)).join(' × ')}</div>
                        <div>Raw result: {testResult.basePrice} × {Object.values(testResult.breakdown).reduce((acc, d) => acc * (d.value || 1), 1).toFixed(2)} = {Math.round(testResult.basePrice * Object.values(testResult.breakdown).reduce((acc, d) => acc * (d.value || 1), 1))} THB</div>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="font-semibold text-gray-700">Final Price (after 70-200 THB cap):</span>
                        <span className="text-2xl font-bold text-indigo-600">{testResult.finalPrice} THB</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-sm text-yellow-800">
                        <strong>💭 Summary:</strong> 
                        {(() => {
                          const total = Object.values(testResult.breakdown).reduce((acc, d) => acc * (d.value || 1), 1);
                          const rawPrice = Math.round(testResult.basePrice * total);
                          
                          if (testResult.finalPrice > rawPrice) {
                            return ` Price was capped at maximum (${testResult.finalPrice} THB).`;
                          } else if (testResult.finalPrice < rawPrice) {
                            return ` Price was capped at minimum (${testResult.finalPrice} THB).`;
                          } else if (total > 1.3) {
                            return ` High demand and premium factors resulted in ${Math.round((total - 1) * 100)}% markup.`;
                          } else if (total > 1.1) {
                            return ` Moderate demand factors added ${Math.round((total - 1) * 100)}% to base price.`;
                          } else if (total < 0.9) {
                            return ` Off-peak discount of ${Math.round((1 - total) * 100)}% applied.`;
                          } else {
                            return ` Standard pricing with minimal adjustments.`;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {testResult.context && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">🔍 Context Data</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(testResult.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800">❌ Error</h4>
                <p className="text-red-700 mb-2">{testResult.error}</p>
                {testResult.details && (
                  <pre className="text-sm text-red-600 whitespace-pre-wrap">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Full Response</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Open browser console (F12) to see detailed logs
          </p>
        </div>
      </div>
    </div>
  );
}
