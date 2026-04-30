import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCreditCard, 
  FaUsers, 
  FaBuilding, 
  FaTable, 
  FaCalendarAlt, 
  FaChartLine, 
  FaHdd,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCrown,
  FaStar,
  FaRocket,
  FaGem,
  FaInfinity,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

const SubscriptionManagement = ({ ownerId }) => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const sliderRef = useRef(null);

  const plans = [
    {
      name: 'free',
      title: 'Free Plan',
      price: 0,
      currency: 'THB',
      features: [
        'Basic 3D floor plan system',
        'Real-time reservation management',
        'Basic customer support',
        '1 floor plan',
        'Up to 10 tables',
        'Up to 2 staff members',
        '100 bookings per month'
      ],
      description: 'Perfect for getting started with digital floor plan management.',
      isFree: true,
      isDefault: true
    },
    {
      name: 'basic',
      title: 'Basic Plan',
      price: 1200,
      currency: 'THB',
      features: [
        'All Free features',
        'Email notifications',
        'Basic analytics and reporting',
        'Customer database with notes',
        '1 floor plan',
        'Up to 20 tables',
        'Up to 5 staff members',
        '1,000 bookings per month',
        '10,000 API calls per month'
      ],
      description: 'Ideal for small restaurants.',
      popular: false
    },
    {
      name: 'business',
      title: 'Business Plan',
      price: 2800,
      currency: 'THB',
      features: [
        'All Basic features',
        'Custom 3D models',
        'Advanced analytics',
        'Priority support (24h response)',
        'API access',
        '2 floor plans',
        'Up to 50 tables',
        'Up to 10 staff members',
        '5,000 bookings per month',
        '50,000 API calls per month'
      ],
      description: 'Perfect for growing restaurants.',
      popular: true
    },
    {
      name: 'professional',
      title: 'Professional Plan',
      price: 5500,
      currency: 'THB',
      features: [
        'All Business features',
        'AR support',
        'White-label options',
        'Custom integrations',
        'Priority support (2h response)',
        '5 floor plans',
        'Up to 100 tables',
        'Up to 25 staff members',
        '15,000 bookings per month',
        '150,000 API calls per month'
      ],
      description: 'For established restaurants.',
      premium: true
    },
    {
      name: 'enterprise',
      title: 'Enterprise Plan',
      price: 12000,
      currency: 'THB',
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
      description: 'For large restaurant chains.',
      enterprise: true
    }
  ];

  useEffect(() => {
    fetchSubscriptionData();
  }, [ownerId]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCardsPerView(1);
      } else if (width < 768) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3); // Default to 3 cards for better horizontal layout
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-slide functionality (optional)
  useEffect(() => {
    if (isHovered) return; // Pause auto-slide when hovered
    
    const interval = setInterval(() => {
      const maxSlide = Math.max(0, plans.length - cardsPerView);
      setCurrentSlide(prev => prev >= maxSlide ? 0 : prev + 1);
    }, 5000); // Auto-slide every 5 seconds

    return () => clearInterval(interval);
  }, [cardsPerView, plans.length, isHovered]);

  const togglePlanExpansion = (planName) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planName]: !prev[planName]
    }));
  };

  const showPlanDetails = (plan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handlePlanUpgrade = (plan) => {
    if (subscription?.planType === plan.name) {
      return; // Already on this plan
    }
    
    setUpgradePlan(plan);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!upgradePlan) return;
    
    setIsUpgrading(true);
    try {
      // TODO: Implement actual payment processing here
      // For now, we'll simulate the upgrade
      const response = await fetch('/api/restaurant-owner/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId,
          newPlanType: upgradePlan.name,
          newPrice: upgradePlan.price
        }),
      });

      if (response.ok) {
        // Refresh subscription data
        await fetchSubscriptionData();
        setShowUpgradeModal(false);
        setUpgradePlan(null);
        
        // Show success message
        alert(`Successfully upgraded to ${upgradePlan.title}!`);
      } else {
        throw new Error('Upgrade failed');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Upgrade failed. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const checkFeatureAccess = (featureName) => {
    if (!subscriptionData?.subscription?.features) return false;
    return subscriptionData.subscription.features[featureName] === true;
  };

  const showPaywall = (featureName, planName) => {
    alert(`This feature requires ${planName} plan. Please upgrade to access this feature.`);
  };

  const getPlanHierarchy = (planName) => {
    const hierarchy = {
      'free': 0,
      'basic': 1,
      'business': 2,
      'professional': 3,
      'enterprise': 4
    };
    return hierarchy[planName] || 0;
  };

  const getButtonTextAndStyle = (plan, currentPlanType) => {
    if (currentPlanType === plan.name) {
      return {
        text: 'Current Plan',
        className: 'bg-gray-100 text-gray-400 cursor-not-allowed',
        disabled: true
      };
    }

    const currentLevel = getPlanHierarchy(currentPlanType);
    const planLevel = getPlanHierarchy(plan.name);

    if (planLevel > currentLevel) {
      // Higher tier plan - upgrade
      return {
        text: 'Upgrade Now',
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg',
        disabled: false
      };
    } else if (planLevel < currentLevel) {
      // Lower tier plan - downgrade
      return {
        text: 'Downgrade',
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg',
        disabled: false
      };
    } else {
      // Same level plan
      return {
        text: 'Switch Plan',
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg',
        disabled: false
      };
    }
  };

  const nextSlide = () => {
    const maxSlide = Math.max(0, plans.length - cardsPerView);
    setCurrentSlide(prev => Math.min(prev + 1, maxSlide));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurant-owner/subscription?ownerId=${ownerId}`);
      const data = await response.json();
      
      if (data.success) {
        setSubscriptionData(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'free':
      case 'basic': return <FaCheckCircle className="text-green-500" />;
      case 'business': return <FaRocket className="text-blue-500" />;
      case 'professional': return <FaCrown className="text-purple-500" />;
      case 'enterprise': return <FaGem className="text-pink-500" />;
      default: return <FaCheckCircle className="text-green-500" />;
    }
  };

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'free':
      case 'basic': return 'bg-green-100 text-green-800 border-green-200';
      case 'business': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'professional': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'enterprise': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const ProgressBar = ({ label, used, limit, percentage, icon, isUnlimited = false }) => {
    const isExceeded = !isUnlimited && used >= limit;
    const isNearLimit = !isUnlimited && percentage >= 80;
    
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-gray-700">{label}</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-900">
              {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
            </span>
            {isExceeded && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <FaExclamationTriangle />
                <span>Limit Exceeded</span>
              </div>
            )}
            {isNearLimit && !isExceeded && (
              <div className="flex items-center gap-1 text-orange-600 text-sm">
                <FaExclamationTriangle />
                <span>Near Limit</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isExceeded 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-orange-500' 
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <FaInfinity className="text-green-500" />
              Unlimited usage
            </span>
          ) : (
            `${percentage.toFixed(1)}% used`
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading subscription data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <FaExclamationTriangle />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  if (!subscriptionData.hasSubscription) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-green-800 mb-2">
          <FaCheckCircle />
          <span className="font-semibold">Free Plan</span>
        </div>
        <p className="text-green-700">{subscriptionData.message}</p>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Upgrade Plan
        </button>
      </div>
    );
  }

  const { subscription, usage, exceededLimits, summary } = subscriptionData;

  return (
    <div className="space-y-6">
      {/* Subscription Plans Section - Horizontal Slider Design */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl"></div>
        
        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-[#FF4F18] text-white px-6 py-3 rounded-full text-sm font-semibold mb-4">
              <FaRocket className="text-lg" />
              Choose Your Perfect Plan
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
              Subscription Plans
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Scale your restaurant business with our flexible pricing plans
            </p>
          </div>
          
          {/* Slider Container */}
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <FaChevronLeft className="text-lg" />
            </button>
            
            <button
              onClick={nextSlide}
              disabled={currentSlide >= plans.length - cardsPerView}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <FaChevronRight className="text-lg" />
            </button>
            
            {/* Slider */}
            <div 
              className="overflow-hidden rounded-2xl"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div 
                ref={sliderRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ 
                  transform: `translateX(-${currentSlide * (100 / cardsPerView)}%)`,
                  width: `${(plans.length / cardsPerView) * 100}%`
                }}
              >
                {plans.map((plan, index) => (
                  <div
                    key={plan.name}
                    className="flex-shrink-0 px-4"
                    style={{ width: `${100 / plans.length}%` }}
                  >
                    {/* Horizontal Card Design */}
                    <div
                      className={`relative group cursor-pointer h-72 rounded-2xl overflow-hidden transition-all duration-300 ${
                        subscription?.planType === plan.name 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl scale-105' 
                          : 'bg-white text-gray-900 shadow-lg hover:shadow-xl hover:scale-105'
                      }`}
                      onClick={() => showPlanDetails(plan)}
                    >
                      {/* Badges */}
                      {subscription?.planType === plan.name && (
                        <div className="absolute top-4 right-4 bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                          ✓ Current
                        </div>
                      )}
                      
                      {plan.popular && subscription?.planType !== plan.name && (
                        <div className="absolute top-4 left-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                          ⭐ Popular
                        </div>
                      )}
                      
                      {/* Card Content - Horizontal Layout */}
                      <div className="p-5 h-full flex flex-col">
                        {/* Header Section */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            subscription?.planType === plan.name 
                              ? 'bg-white/20' 
                              : 'bg-gradient-to-br from-blue-100 to-purple-100'
                          }`}>
                            {plan.enterprise ? (
                              <FaGem className="text-lg text-pink-500" />
                            ) : plan.premium ? (
                              <FaCrown className="text-lg text-yellow-500" />
                            ) : plan.popular ? (
                              <FaStar className="text-lg text-yellow-300" />
                            ) : plan.isFree ? (
                              <FaCheckCircle className="text-lg text-green-500" />
                            ) : (
                              <FaRocket className="text-lg text-blue-500" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-base font-bold mb-1">{plan.title}</h3>
                            <p className="text-xs opacity-80 line-clamp-1">{plan.description}</p>
                          </div>
                        </div>
                        
                        {/* Pricing Section */}
                        <div className="mb-3">
                          <div className="flex items-baseline">
                            <span className="text-2xl font-bold">
                              {plan.isFree ? 'FREE' : `${plan.currency} ${plan.price.toLocaleString()}`}
                            </span>
                            {!plan.isFree && (
                              <span className="text-xs opacity-70 ml-1">/mo</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Features Section - Horizontal Layout */}
                        <div className="flex-grow mb-3">
                          <div className="grid grid-cols-2 gap-1">
                            {plan.features.slice(0, 4).map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-start text-xs">
                                <div className={`w-3 h-3 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 ${
                                  subscription?.planType === plan.name
                                    ? 'bg-white/20'
                                    : 'bg-green-100'
                                }`}>
                                  <FaCheckCircle className={`text-xs ${
                                    subscription?.planType === plan.name
                                      ? 'text-white'
                                      : 'text-green-500'
                                  }`} />
                                </div>
                                <span className="leading-tight line-clamp-1 text-xs">{feature}</span>
                              </div>
                            ))}
                          </div>
                          {plan.features.length > 4 && (
                            <div className="text-xs opacity-70 text-center mt-1">
                              +{plan.features.length - 4} more
                            </div>
                          )}
                        </div>
                        
                        {/* CTA Button */}
                        {(() => {
                          const buttonConfig = getButtonTextAndStyle(plan, subscription?.planType);
                          return (
                            <button 
                              className={`w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all duration-200 ${
                                subscription?.planType === plan.name
                                  ? 'bg-white/20 text-white cursor-not-allowed'
                                  : 'bg-[#FF4F18] text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
                              }`}
                              disabled={buttonConfig.disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlanUpgrade(plan);
                              }}
                            >
                              {subscription?.planType === plan.name ? 'Current Plan' : 
                               plan.name === 'enterprise' ? 'Contact Sales' : buttonConfig.text}
                            </button>
                          );
                        })()}
                      </div>
                      
                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Dots Indicator */}
            <div className="flex justify-center mt-6 gap-2">
              {Array.from({ length: Math.ceil(plans.length / cardsPerView) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === Math.floor(currentSlide / cardsPerView) 
                      ? 'bg-[#FF4F18] scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Bottom CTA */}
          
        </div>
      </div>

      {/* Subscription Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaCreditCard className="text-blue-600" />
            Subscription Overview
          </h2>
          <div className="flex gap-2">
            <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              Manage Subscription
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${getPlanColor(subscription.planType || 'basic')}`}>
            <div className="flex items-center gap-2 mb-2">
              {getPlanIcon(subscription.planType || 'basic')}
              <span className="font-bold text-lg">{(subscription.planType || 'basic').toUpperCase()}</span>
            </div>
            <div className="text-sm">
              <div>Status: <span className="font-semibold">{subscription.status}</span></div>
              <div>Billing: <span className="font-semibold">{subscription.billingCycle}</span></div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Monthly Cost</div>
            <div className="text-2xl font-bold text-gray-900">
              {subscription.currency} {subscription.price}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Next Billing</div>
            <div className="text-lg font-semibold text-gray-900">
              {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FaChartLine className="text-green-600" />
          Usage & Limits
        </h3>
        
        {exceededLimits.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <FaExclamationTriangle />
              <span className="font-semibold">Limits Exceeded</span>
            </div>
            <p className="text-red-700 text-sm">
              You have exceeded limits for: {exceededLimits.join(', ')}. 
              Consider upgrading your plan to continue using these features.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProgressBar
            label="Staff Members"
            used={usage.staff.used}
            limit={usage.staff.limit}
            percentage={usage.staff.percentage}
            icon={<FaUsers className="text-purple-600" />}
            isUnlimited={usage.staff.limit === -1}
          />
          
          <ProgressBar
            label="Floor Plans"
            used={usage.floorPlans.used}
            limit={usage.floorPlans.limit}
            percentage={usage.floorPlans.percentage}
            icon={<FaBuilding className="text-green-600" />}
            isUnlimited={usage.floorPlans.limit === -1}
          />
          
          <ProgressBar
            label="Tables"
            used={usage.tables.used}
            limit={usage.tables.limit}
            percentage={usage.tables.percentage}
            icon={<FaTable className="text-orange-600" />}
            isUnlimited={usage.tables.limit === -1}
          />
          
          <ProgressBar
            label="Monthly Bookings"
            used={usage.monthlyBookings.used}
            limit={usage.monthlyBookings.limit}
            percentage={usage.monthlyBookings.percentage}
            icon={<FaCalendarAlt className="text-blue-600" />}
            isUnlimited={usage.monthlyBookings.limit === -1}
          />
          
          <ProgressBar
            label="API Calls (Monthly)"
            used={usage.apiCalls.used}
            limit={usage.apiCalls.limit}
            percentage={usage.apiCalls.percentage}
            icon={<FaChartLine className="text-indigo-600" />}
            isUnlimited={usage.apiCalls.limit === -1}
          />
          
          <ProgressBar
            label="Storage (MB)"
            used={usage.storage.used}
            limit={usage.storage.limit}
            percentage={usage.storage.percentage}
            icon={<FaHdd className="text-gray-600" />}
            isUnlimited={usage.storage.limit === -1}
          />
        </div>
      </div>


      {/* Quick Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.totalStaff}</div>
            <div className="text-sm text-gray-600">Staff Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.totalFloorPlans}</div>
            <div className="text-sm text-gray-600">Floor Plans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.monthlyBookings}</div>
            <div className="text-sm text-gray-600">This Month's Bookings</div>
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Plan Features</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(subscription.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-2">
              {enabled ? (
                <FaCheckCircle className="text-green-500" />
              ) : (
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
              )}
              <span className="text-sm text-gray-700 capitalize">
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Details Modal - Compact Design */}
      {showDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {selectedPlan.enterprise ? (
                    <FaGem className="text-xl text-white" />
                  ) : selectedPlan.premium ? (
                    <FaCrown className="text-xl text-white" />
                  ) : selectedPlan.popular ? (
                    <FaStar className="text-xl text-white" />
                  ) : selectedPlan.isFree ? (
                    <FaCheckCircle className="text-xl text-white" />
                  ) : (
                    <FaRocket className="text-xl text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{selectedPlan.title}</h3>
                  <p className="text-white/90 text-sm">{selectedPlan.description}</p>
                </div>
              </div>
              
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">
                  {selectedPlan.isFree ? 'FREE' : `${selectedPlan.currency} ${selectedPlan.price.toLocaleString()}`}
                </span>
                {!selectedPlan.isFree && <span className="text-sm ml-2 opacity-80">/month</span>}
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Features Grid */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" />
                  All Features
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <FaCheckCircle className="text-green-500 text-xs" />
                      </div>
                      <span className="text-gray-700 leading-relaxed text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Comparison with Current Plan */}
              {subscription?.planType && subscription.planType !== selectedPlan.name && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2">Upgrade Benefits</h5>
                  <p className="text-blue-800 text-sm">
                    {selectedPlan.isFree 
                      ? "Switch to our free plan to get started with basic features."
                      : `Upgrade to ${selectedPlan.title} to unlock advanced features and higher limits.`
                    }
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
                >
                  Close
                </button>
                {(() => {
                  const buttonConfig = getButtonTextAndStyle(selectedPlan, subscription?.planType);
                  return (
                    <button
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                        subscription?.planType === selectedPlan.name
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
                      }`}
                      disabled={buttonConfig.disabled}
                      onClick={() => {
                        setShowDetailModal(false);
                        handlePlanUpgrade(selectedPlan);
                      }}
                    >
                      {subscription?.planType === selectedPlan.name ? 'Current Plan' : 
                       selectedPlan.name === 'enterprise' ? 'Contact Sales' : buttonConfig.text}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && upgradePlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  upgradePlan.enterprise 
                    ? 'bg-gradient-to-br from-pink-100 to-purple-100'
                    : upgradePlan.premium
                    ? 'bg-gradient-to-br from-yellow-100 to-orange-100'
                    : upgradePlan.popular
                    ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                    : upgradePlan.isFree
                    ? 'bg-gradient-to-br from-blue-100 to-indigo-100'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200'
                }`}>
                  {upgradePlan.enterprise ? (
                    <FaGem className="text-2xl text-pink-500" />
                  ) : upgradePlan.premium ? (
                    <FaCrown className="text-2xl text-yellow-500" />
                  ) : upgradePlan.popular ? (
                    <FaStar className="text-2xl text-yellow-500" />
                  ) : upgradePlan.isFree ? (
                    <FaCheckCircle className="text-2xl text-green-500" />
                  ) : (
                    <FaRocket className="text-2xl text-blue-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to {upgradePlan.title}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {upgradePlan.isFree 
                    ? "Switch to our free plan to get started with basic features."
                    : `Upgrade to ${upgradePlan.title} for ${upgradePlan.currency} ${upgradePlan.price.toLocaleString()}/month`
                  }
                </p>
              </div>

              {/* Benefits */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">What you'll get:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {upgradePlan.features.slice(0, 5).map((feature, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {upgradePlan.features.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{upgradePlan.features.length - 5} more features
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
                >
                  Cancel
                </button>
                {(() => {
                  const buttonConfig = getButtonTextAndStyle(upgradePlan, subscription?.planType);
                  return (
                    <button
                      onClick={confirmUpgrade}
                      disabled={isUpgrading || buttonConfig.disabled}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg ${isUpgrading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUpgrading ? 'Processing...' : 
                       upgradePlan.name === 'enterprise' ? 'Contact Sales' : buttonConfig.text}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
