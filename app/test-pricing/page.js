'use client';

import { useState } from 'react';

export default function TestPricingPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    restaurantId: '67b716e98d2856f0a1900471',
    date: '2025-02-14',
    time: '19:30',
    guestCount: 2,
    tableCapacity: 2,
    tableLocation: 'window'
  });

  const testPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runAlgorithmTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/test');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const analyzeData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/analyze-data');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Dynamic Pricing Algorithm Test
        </h1>

        {/* Quick Test Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Pricing Test</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant ID
              </label>
              <input
                type="text"
                value={testData.restaurantId}
                onChange={(e) => setTestData({ ...testData, restaurantId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={testData.date}
                onChange={(e) => setTestData({ ...testData, date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={testData.time}
                onChange={(e) => setTestData({ ...testData, time: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Count
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={testData.guestCount}
                onChange={(e) => setTestData({ ...testData, guestCount: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Location
              </label>
              <select
                value={testData.tableLocation}
                onChange={(e) => setTestData({ ...testData, tableLocation: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="center">Center</option>
                <option value="window">Window</option>
                <option value="corner">Corner</option>
                <option value="private">Private</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testPricing}
              disabled={loading}
              className="bg-[#FF4F18] text-white px-6 py-2 rounded-lg hover:bg-[#FF4F18]/90 disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Price'}
            </button>
            
            <button
              onClick={runAlgorithmTest}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Full Algorithm Test'}
            </button>
            
            <button
              onClick={analyzeData}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Booking Data'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600">{result.error}</p>
              </div>
            ) : result.success ? (
              <div className="space-y-4">
                {/* Pricing Result */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-green-800 font-medium mb-2">✅ Success!</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Base Price:</span> {result.basePrice} THB
                    </div>
                    <div>
                      <span className="font-medium">Final Price:</span> 
                      <span className="text-2xl font-bold text-[#FF4F18] ml-2">
                        {result.finalPrice} THB
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Table Fee ({testData.tableCapacity || testData.guestCount}-person table):</span>
                      <span className="text-xl font-bold text-[#FF4F18] ml-2">
                        {result.finalPrice} THB
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span> {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Factor Breakdown */}
                {result.breakdown && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Pricing Factors Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span>Demand Factor:</span>
                        <span className="font-medium">{result.breakdown.demandFactor?.value}x ({result.breakdown.demandFactor?.reason})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Factor:</span>
                        <span className="font-medium">{result.breakdown.temporalFactor?.value}x ({result.breakdown.temporalFactor?.reason})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>History Factor:</span>
                        <span className="font-medium">{result.breakdown.historicalFactor?.value}x ({result.breakdown.historicalFactor?.reason})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity Factor:</span>
                        <span className="font-medium">{result.breakdown.capacityFactor?.value}x ({result.breakdown.capacityFactor?.reason})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Holiday Factor:</span>
                        <span className="font-medium">{result.breakdown.holidayFactor?.value}x ({result.breakdown.holidayFactor?.reason})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Context Information */}
                {result.context && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Context Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Demand Level:</span> {result.context.demandLevel}
                      </div>
                      <div>
                        <span className="font-medium">Table Efficiency:</span> {result.context.tableInfo?.efficiency}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : result.dataAnalysis ? (
              // Data analysis results
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-green-800 font-medium mb-2">📊 Data Analysis Results</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Restaurants:</span> {result.dataAnalysis.totalRestaurants}
                    </div>
                    <div>
                      <span className="font-medium">Total Bookings:</span> {result.dataAnalysis.totalBookings}
                    </div>
                    <div>
                      <span className="font-medium">Date Range:</span> 
                      {result.dataAnalysis.dateRange ? 
                        `${result.dataAnalysis.dateRange.earliest} to ${result.dataAnalysis.dateRange.latest}` : 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Data Quality:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        result.summary?.dataQuality?.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                        result.summary?.dataQuality?.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                        result.summary?.dataQuality?.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.summary?.dataQuality?.quality || 'unknown'} ({result.summary?.dataQuality?.score || 0}/100)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                {result.insights && result.insights.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">💡 Insights</h4>
                    <div className="space-y-2">
                      {result.insights.map((insight, index) => (
                        <div key={index} className={`p-3 rounded border-l-4 ${
                          insight.type === 'success' ? 'border-green-500 bg-green-50' :
                          insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                          insight.type === 'info' ? 'border-blue-500 bg-blue-50' :
                          'border-gray-500 bg-gray-50'
                        }`}>
                          <p className="text-sm font-medium">{insight.message}</p>
                          <p className="text-xs text-gray-600 mt-1">{insight.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Algorithm Tests */}
                {result.algorithmTests && result.algorithmTests.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">🧪 Algorithm Tests with Your Data</h4>
                    <div className="space-y-3">
                      {result.algorithmTests.map((test, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <h5 className="font-medium text-gray-800">{test.restaurant.name}</h5>
                          <p className="text-xs text-gray-500 mb-2">
                            {test.restaurant.bookingCount} historical bookings
                          </p>
                          
                          {test.tests && test.tests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                              {test.tests.map((scenario, idx) => (
                                <div key={idx} className="bg-gray-50 p-2 rounded">
                                  <div className="font-medium">{scenario.scenario}</div>
                                  <div className="text-[#FF4F18] font-bold">{scenario.price} THB</div>
                                  <div className="text-gray-500">
                                    Historical data: {scenario.historicalContext.dataPoints} bookings
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-red-600 text-sm">
                              {test.error || 'No test results available'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : result.summary ? (
              // Algorithm test results
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-blue-800 font-medium mb-2">Algorithm Test Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Tests:</span> {result.summary.overall?.totalTests}
                    </div>
                    <div>
                      <span className="font-medium">Success Rate:</span> {result.summary.overall?.successRate}
                    </div>
                    <div>
                      <span className="font-medium">Average Price:</span> {result.summary.pricing?.averagePrice} THB
                    </div>
                    <div>
                      <span className="font-medium">Price Range:</span> {result.summary.pricing?.priceRange}
                    </div>
                  </div>
                </div>

                {result.summary.insights && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Insights</h4>
                    <ul className="text-sm space-y-1">
                      {result.summary.insights.map((insight, index) => (
                        <li key={index} className="text-gray-700">• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-600 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
