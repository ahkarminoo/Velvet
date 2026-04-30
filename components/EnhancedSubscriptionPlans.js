'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FaCheckCircle, 
  FaCrown, 
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
  FaCog,
  FaChartLine,
  FaUsers,
  FaTable,
  FaBuilding,
  FaRocket,
  FaLock,
  FaHeadset,
  FaCode,
  FaPalette,
  FaLink
} from 'react-icons/fa'

export default function EnhancedSubscriptionPlans() {
  const [currentPlan, setCurrentPlan] = useState('basic')
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      // Try to get owner ID from localStorage or context
      const ownerData = localStorage.getItem('restaurantOwnerUser');
      let ownerId = null;
      
      if (ownerData) {
        try {
          const parsed = JSON.parse(ownerData);
          ownerId = parsed._id || parsed.id || parsed.userId;
        } catch (e) {
          console.error('Failed to parse owner data:', e);
        }
      }
      
      if (!ownerId) {
        setSubscription({
          planType: 'basic',
          status: 'active',
          price: 0,
          billingCycle: 'month',
          currency: 'THB'
        });
        setCurrentPlan('basic');
        setUsage(null);
        return;
      }
      
      // Fetch subscription using the working endpoint
      const subscriptionResponse = await fetch(`/api/restaurant-owner/subscription?ownerId=${ownerId}`)
      const subscriptionData = await subscriptionResponse.json()
      
      if (subscriptionData.success && subscriptionData.data.hasSubscription) {
        setSubscription(subscriptionData.data.subscription)
        // Handle legacy 'free' plan type as 'basic'
        const planType = subscriptionData.data.subscription.planType === 'free' ? 'basic' : subscriptionData.data.subscription.planType
        setCurrentPlan(planType)
        setUsage(subscriptionData.data.usage)
      } else {
        // Set default basic plan
        setCurrentPlan('basic')
        setSubscription({
          planType: 'basic',
          status: 'active',
          price: 0,
          currency: 'THB'
        })
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = (planType) => {
    setSelectedPlan(planType)
    setShowUpgradeModal(true)
  }

  const confirmUpgrade = async () => {
    try {
      const response = await fetch('/api/saas/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: selectedPlan
        })
      })

      const data = await response.json()
      if (data.success) {
        setShowUpgradeModal(false)
        fetchSubscriptionData() // Refresh data
        // Show success message
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
    }
  }

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const UsageBar = ({ label, used, limit, icon: Icon }) => {
    const percentage = getUsagePercentage(used, limit)
    const isUnlimited = limit === -1
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="text-gray-500 text-sm" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <span className={`text-sm font-semibold ${getUsageColor(percentage)}`}>
            {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                percentage >= 90 ? 'bg-red-500' :
                percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  const FeatureIcon = ({ feature }) => {
    const icons = {
      floorPlan3D: FaBuilding,
      realTimeReservations: FaTable,
      emailNotifications: FaInfoCircle,
      basicAnalytics: FaChartLine,
      custom3DModels: FaPalette,
      arSupport: FaRocket,
      advancedAnalytics: FaChartLine,
      prioritySupport: FaHeadset,
      apiAccess: FaCode,
      whiteLabel: FaLock,
      customIntegrations: FaLink
    }
    
    const Icon = icons[feature] || FaCheckCircle
    return <Icon className="text-sm" />
  }

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      period: 'month',
      description: 'Perfect for getting started',
      features: [
        'Interactive 3D floor plan system',
        'Real-time reservation management',
        'Customer database with tagging and notes',
        'Automated email and SMS notifications',
        'Standard reporting and analytics',
        'Integration with basic POS systems',
        'Support for 2 floor plans',
        'Up to 50 tables',
        '5,000 bookings per month'
      ],
      limits: {
        floorPlans: 2,
        tables: 50,
        staff: 5,
        bookings: 5000,
        apiCalls: 10000,
        storage: 1000
      },
      featureFlags: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: false,
        arSupport: false,
        advancedAnalytics: false,
        prioritySupport: false,
        apiAccess: false,
        whiteLabel: false,
        customIntegrations: false
      }
    },
    {
      id: 'business',
      name: 'Business',
      price: 1200,
      period: 'month',
      description: 'Perfect for growing restaurants',
      popular: true,
      features: [
        'All features included in the Basic Plan',
        'Support for up to 3 floor plans',
        'Up to 100 tables',
        '10,000 bookings per month',
        'Priority technical support with a 24-hour response time',
        'Advanced analytics dashboard'
      ],
      limits: {
        floorPlans: 3,
        tables: 100,
        staff: 10,
        bookings: 10000,
        apiCalls: 50000,
        storage: 5000
      },
      featureFlags: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: false,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: false,
        customIntegrations: false
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 2800,
      period: 'month',
      description: 'For established restaurants',
      popular: false,
      features: [
        'All features included in the Business Plan',
        'Support for up to 5 floor plans',
        'Up to 200 tables',
        '25,000 bookings per month',
        'Inclusion of 10 custom 3D models for unique restaurant layouts',
        'Priority technical support with a 12-hour response time',
        'API access for integrations'
      ],
      limits: {
        floorPlans: 5,
        tables: 200,
        staff: 25,
        bookings: 25000,
        apiCalls: 150000,
        storage: 15000
      },
      featureFlags: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 12000,
      period: 'month',
      description: 'For large restaurant chains',
      popular: false,
      features: [
        'All Professional features',
        'Unlimited everything',
        'Dedicated account manager',
        'Custom development',
        'SLA guarantee',
        'Unlimited floor plans',
        'Unlimited tables',
        'Unlimited staff',
        'Unlimited bookings',
        'Unlimited API calls'
      ],
      limits: {
        floorPlans: -1,
        tables: -1,
        staff: -1,
        bookings: -1,
        apiCalls: -1,
        storage: -1
      },
      featureFlags: {
        floorPlan3D: true,
        realTimeReservations: true,
        emailNotifications: true,
        basicAnalytics: true,
        custom3DModels: true,
        arSupport: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: true,
        customIntegrations: true
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Overview */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
              <p className="text-gray-600">Your subscription details and usage</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                THB {subscription.price.toLocaleString()}
                <span className="text-lg text-gray-500">/{subscription.billingCycle}</span>
              </div>
              <div className="text-sm text-gray-600 capitalize">{subscription.planType} Plan</div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UsageBar
              label="Floor Plans"
              used={usage?.floorPlansUsed || 0}
              limit={usage?.floorPlansLimit || 1}
              icon={FaBuilding}
            />
            <UsageBar
              label="Tables"
              used={usage?.tablesUsed || 0}
              limit={usage?.tablesLimit || 20}
              icon={FaTable}
            />
            <UsageBar
              label="Staff Members"
              used={usage?.staffUsed || 0}
              limit={usage?.staffLimit || 5}
              icon={FaUsers}
            />
            <UsageBar
              label="Bookings This Month"
              used={usage?.bookingsThisMonth || 0}
              limit={usage?.bookingsLimit || 1000}
              icon={FaChartLine}
            />
            <UsageBar
              label="API Calls This Month"
              used={usage?.apiCallsThisMonth || 0}
              limit={usage?.apiCallsLimit || 10000}
              icon={FaCode}
            />
            <UsageBar
              label="Storage Used"
              used={usage?.storageUsed || 0}
              limit={usage?.storageLimit || 1000}
              icon={FaCog}
            />
          </div>
        </motion.div>
      )}

      {/* Available Plans */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upgrade or downgrade your plan anytime. All plans include our core features with different limits and additional capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl p-6 flex flex-col h-full transform transition-all duration-200 hover:shadow-xl border-2 ${
                currentPlan === plan.id ? 'border-blue-500 shadow-lg' :
                plan.popular ? 'border-green-500 shadow-lg' : 'border-gray-100'
              }`}
            >
              {currentPlan === plan.id && (
                <div className="absolute -top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Current Plan
                </div>
              )}
              {plan.popular && currentPlan !== plan.id && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    THB {plan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-500">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>

              <div className="flex-grow">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start text-sm text-gray-600">
                      <FaCheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto">
                {currentPlan === plan.id ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed font-semibold"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] ${
                      plan.id === 'enterprise'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {(currentPlan === 'free' || currentPlan === 'basic') || plans.find(p => p.id === currentPlan)?.price < plan.price ? (
                      <>
                        <FaArrowUp className="inline mr-2" />
                        Upgrade
                      </>
                    ) : (
                      <>
                        <FaArrowDown className="inline mr-2" />
                        Downgrade
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Plan Change</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {(currentPlan === 'free' || currentPlan === 'basic') || plans.find(p => p.id === currentPlan)?.price < plans.find(p => p.id === selectedPlan)?.price ? 'upgrade' : 'downgrade'} to the {plans.find(p => p.id === selectedPlan)?.name} plan?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpgrade}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
