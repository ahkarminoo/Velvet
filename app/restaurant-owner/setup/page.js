"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaUtensils, FaMapMarkerAlt, FaChair, FaChartLine, FaRocket, FaArrowRight } from "react-icons/fa";
import RestaurantProfileForm from "@/components/RestaurantProfileForm";

export default function RestaurantOwnerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem('restaurantOwnerToken');
    const user = localStorage.getItem('restaurantOwnerUser');

    if (!token || !user) {
      // Redirect to login if not authenticated
      router.push('/restaurant-owner');
    } else {
      // Set the token in state
      setAuthToken(token);
    }

    setIsLoading(false);
  }, [router]);

  const steps = [
    { id: 1, title: "Welcome", icon: FaUtensils, description: "Get started with FoodLoft" },
    { id: 2, title: "Profile", icon: FaMapMarkerAlt, description: "Restaurant details" },
    { id: 3, title: "Floor Plan", icon: FaChair, description: "Layout setup" },
    { id: 4, title: "Deploy", icon: FaRocket, description: "Go live" }
  ];

  // Static restaurant data for demo
  const restaurant = {
    name: "Delicious Bites",
    type: "Fine Dining",
    location: "123 Food Street, NYC",
    hours: "10 AM - 11 PM",
    tables: 12,
  };

  const progressPercentage = (step / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a961]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-velvet-surface to-velvet-surface/30">
      {/* Side Progress Bar - Adjusted dimensions */}
      <div className="fixed left-0 top-0 h-screen w-80 bg-velvet-surface shadow-xl p-8 border-r border-velvet-border">
        <div className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-6 py-2 bg-gradient-to-r from-[#c9a961]/10 to-[#e2c887]/10 
                     rounded-full mb-4 border border-[#c9a961]/20"
          >
            <span className="text-[#c9a961] font-medium">Setup Progress</span>
          </motion.div>
          <h2 className="text-3xl font-bold text-[#15130f] mb-2">Restaurant Setup</h2>
          <p className="text-velvet-muted text-sm">Step {step} of {steps.length}</p>
          <div className="mt-6 h-1.5 w-full bg-velvet-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#c9a961] to-[#e2c887] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        
        <div className="space-y-3">
          {steps.map((s) => (
            <motion.div
              key={s.id}
              className={`flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                step === s.id 
                  ? 'bg-gradient-to-r from-[#c9a961] to-[#e2c887] text-white shadow-lg' 
                  : 'text-velvet-muted hover:bg-velvet-surface hover:text-[#c9a961]'
              }`}
              onClick={() => setStep(s.id)}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center">
                <s.icon className={`w-5 h-5 mr-3 ${step === s.id ? 'text-white' : 'text-[#c9a961]'}`} />
                <span className="font-medium">{s.title}</span>
                {step > s.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-white"
                  >
                    ✓
                  </motion.div>
                )}
              </div>
              <span className={`text-sm mt-1 ${step === s.id ? 'text-white/90' : 'text-velvet-muted'}`}>
                {s.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content Area - Adjusted margin */}
      <div className="ml-80 p-12 min-h-screen">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          {step === 1 && (
            <div className="space-y-8 bg-velvet-surface p-8 rounded-2xl shadow-lg border border-velvet-border">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-[#15130f] leading-tight">
                  Welcome to <span className="text-[#c9a961]">FoodLoft</span>
                </h1>
                <p className="text-xl text-velvet-muted leading-relaxed max-w-2xl">
                  Transform your restaurant management with our innovative platform. 
                  Let&apos;s create a digital presence that matches your restaurant&apos;s excellence.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 mt-12">
                {[
                  { title: '3D Floor Planning', desc: 'Design your space visually' },
                  { title: 'Smart Reservations', desc: 'Automated booking management' },
                  { title: 'Real-time Analytics', desc: 'Data-driven insights' }
                ].map((feature) => (
                  <motion.div
                    whileHover={{ y: -5 }}
                    key={feature.title}
                    className="p-6 bg-velvet-surface rounded-2xl hover:shadow-xl transition-all duration-300 border border-velvet-border"
                  >
                    <h3 className="text-xl font-semibold mb-2 text-[#15130f]">{feature.title}</h3>
                    <p className="text-velvet-muted">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                className="mt-8 px-8 py-4 bg-gradient-to-r from-[#c9a961] to-[#e2c887] text-white rounded-xl 
                font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Start Setup →
              </motion.button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-velvet-surface rounded-2xl shadow-lg border border-velvet-border p-8">
              <RestaurantProfileForm 
                mode="create"
                initialData={null}
                onSubmitSuccess={async (restaurantData) => {
                  try {
                    // Store the complete restaurant data in localStorage
                    localStorage.setItem("restaurantData", JSON.stringify({
                      id: restaurantData._id || restaurantData.id,
                      name: restaurantData.name,
                      floorplanId: restaurantData.floorplanId,
                      ownerId: restaurantData.ownerId,
                      location: restaurantData.location,
                      cuisineType: restaurantData.cuisineType,
                      // Add any other necessary data
                      description: restaurantData.description,
                      openingHours: restaurantData.openingHours
                    }));

                    console.log('Stored restaurant data:', restaurantData);
                    setStep(3);
                  } catch (error) {
                    console.error('Error storing restaurant data:', error);
                    alert('Error saving restaurant data. Please try again.');
                  }
                }}
                onCancel={() => {
                  // Handle cancel if needed
                  console.log('Form cancelled');
                }}
                className="text-[#15130f]"
              />
            </div>
          )}

          {step === 3 && (
            <div className="bg-velvet-surface rounded-2xl shadow-lg border border-velvet-border p-8">
              <h2 className="text-3xl font-bold text-velvet-cream mb-6">Restaurant Floor Plan</h2>
              <p className="text-velvet-muted mb-6">Design your restaurant&apos;s layout using our interactive 3D floor plan editor.</p>
              <div className="flex space-x-4">
                <button
                  onClick={async () => {
                    const restaurantData = JSON.parse(localStorage.getItem("restaurantData"));
                    if (!restaurantData?.id) {
                      alert('Restaurant data not found');
                      return;
                    }
                    
                    try {
                      // Get fresh restaurant data
                      const token = localStorage.getItem("restaurantOwnerToken");
                      const response = await fetch(`/api/restaurants/${restaurantData.id}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      if (!response.ok) throw new Error('Failed to fetch restaurant data');
                      
                      const freshRestaurantData = await response.json();
                      
                      // Only update necessary data in localStorage
                      localStorage.setItem("restaurantData", JSON.stringify({
                        id: freshRestaurantData._id || freshRestaurantData.id,
                        floorplanId: freshRestaurantData.defaultFloorplanId
                      }));

                      // Navigate based on floorplan existence
                      router.push("/floorplan");
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Failed to load restaurant data');
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#c9a961] to-[#e2c887] text-white rounded-md 
                  hover:shadow-lg transition-all duration-300"
                >
                  Open Floor Plan Editor
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-3 bg-velvet-surface text-[#15130f] border border-velvet-border rounded-md 
                  hover:bg-velvet-surface transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-velvet-surface rounded-2xl shadow-lg border border-velvet-border p-8">
              <h2 className="text-3xl font-bold text-[#15130f] mb-6">Ready to Deploy</h2>
              <p className="text-velvet-muted mb-6">Your restaurant profile is complete and ready to go live.</p>
              <button
                onClick={() => router.push("/restaurant-owner/setup/dashboard")}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-[#c9a961] to-[#e2c887] text-white rounded-xl 
                hover:shadow-lg transition-all duration-300 flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <FaArrowRight className="text-sm" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
