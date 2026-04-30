'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RestaurantInformation from '@/components/RestaurantInformation'
import RestaurantProfileForm from '@/components/RestaurantProfileForm'
import SubscriptionManagement from '@/components/SubscriptionManagement'
import { RiRestaurantLine, RiLayoutLine, RiCalendarLine, RiVipCrownLine, RiUserLine, RiTeamLine, RiBarChartLine, RiMapPinLine, RiCalendarEventLine } from 'react-icons/ri'
import { motion } from 'framer-motion'
import OwnerProfile from '@/components/OwnerProfile'
import RestaurantFloorPlan from '@/components/RestaurantFloorPlan'
import RestaurantReservation from '@/components/RestaurantReservation'
import StaffManagement from '@/components/StaffManagement'
import ZoneManager from '@/components/ZoneManager'
import EventManager from '@/components/EventManager'
import Link from 'next/link'
import Image from 'next/image'
import { FaHome, FaSignOutAlt } from 'react-icons/fa'

const RESTAURANT_CATEGORIES = [
  "Buffet",
  "Cafe",
  "Casual Dining",
  "Fine Dining",
  "BBQ",
  "Fast Food",
  "Seafood",
  "Steakhouse",
  "Italian",
  "Japanese",
  "Thai",
  "Chinese",
  "Indian",
  "Mexican",
  "Vegetarian",
  "Food Court",
  "Bistro",
  "Pub & Bar",
  "Food Truck"
];

export default function RestaurantSetupDashboard() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('owner-profile')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [floorplan, setFloorplan] = useState(null)
  const [token, setToken] = useState(null)
  const [restaurantId, setRestaurantId] = useState(null)
  const [allFloorplans, setAllFloorplans] = useState([])
  const [allZones, setAllZones] = useState([])

  const fetchRestaurantProfile = async () => {
    try {
      const storedToken = localStorage.getItem("restaurantOwnerToken");
      const response = await fetch("/api/restaurants", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRestaurant(data.restaurant);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("restaurantOwnerToken");
    if (!storedToken) {
      router.push('/restaurant-owner/login');
      return;
    }
    setToken(storedToken);

    // Get restaurant owner data
    const ownerData = localStorage.getItem('restaurantOwnerUser');
    if (ownerData) {
      const { userId } = JSON.parse(ownerData);
      setRestaurantId(userId);
    }

    fetchRestaurantProfile();
  }, [router]);

  // Fetch floorplans and zones when restaurant is loaded
  useEffect(() => {
    const storedToken = localStorage.getItem("restaurantOwnerToken");
    if (!restaurant?._id || !storedToken) return;
    const rid = restaurant._id;

    fetch(`/api/restaurants/${rid}/floorplans`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    }).then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAllFloorplans(d.floorplans || []); })
      .catch(() => {});

    fetch(`/api/venues/${rid}/zones`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    }).then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAllZones(d.zones || []); })
      .catch(() => {});
  }, [restaurant]);

  const fetchFloorplan = async () => {
    if (!restaurant?.floorplanId) return;

    try {
      setIsFloorplanLoading(true);
      const response = await fetch(`/api/scenes/${restaurant.floorplanId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFloorplan(data.data);
      }
    } catch (error) {
      console.error("Error fetching floorplan:", error);
    } finally {
      // Floorplan loading complete
    }
  };

  useEffect(() => {
    if (restaurant?.floorplanId) {
      if (activeSection === 'floorplan') {
        fetchFloorplan();
      }
    }
  }, [restaurant, activeSection, token]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("restaurantOwnerUser");
      localStorage.removeItem("restaurantOwnerToken");
      localStorage.removeItem("restaurantData");
      router.push("/restaurant-owner");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };


  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Sidebar */}
      <div className="w-72 bg-white z-50 shadow-lg fixed left-0 top-0 h-screen border-r border-gray-100">
        <div className="p-6 flex flex-col h-full">
          {/* Velvet Brand */}
          <div className="mb-8">
            <Link href="/restaurant-owner" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
                <span className="font-black text-sm" style={{ color: '#0C0B10' }}>V</span>
              </div>
              <span className="font-black text-xl tracking-tight text-gray-800" style={{ fontFamily: 'serif' }}>
                Velvet
              </span>
            </Link>
            <p className="text-xs text-gray-400 mt-1 ml-10">Venue Management</p>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 space-y-2">
            <button
              onClick={() => setActiveSection('owner-profile')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'owner-profile'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
            >
              <RiUserLine className="text-xl" />
              <span className="text-sm">Profile</span>
            </button>

            <button
              onClick={() => setActiveSection('profile')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'profile'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
              type="button"
            >
              <RiRestaurantLine className="text-xl" />
              <span className="text-sm">Restaurant Profile</span>
            </button>
            
            <button
              onClick={() => setActiveSection('floorplan')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'floorplan'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
              type="button"
            >
              <RiLayoutLine className="text-xl" />
              <span className="text-sm">Floor Plan</span>
            </button>
            
            <button
              onClick={() => setActiveSection('reservation')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'reservation'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
            >
              <RiCalendarLine className="text-xl" />
              <span className="text-sm">Reservation</span>
            </button>
            
            <button
              onClick={() => setActiveSection('zones')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'zones'
                  ? 'text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={activeSection === 'zones' ? { background: '#C9A84C' } : {}}
              type="button"
            >
              <RiMapPinLine className="text-xl" />
              <span className="text-sm">Zones & Pricing</span>
            </button>

            <button
              onClick={() => setActiveSection('events')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'events'
                  ? 'text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={activeSection === 'events' ? { background: '#C9A84C' } : {}}
              type="button"
            >
              <RiCalendarEventLine className="text-xl" />
              <span className="text-sm">Events</span>
            </button>

            <button
              onClick={() => setActiveSection('subscription-management')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'subscription-management'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
            >
              <RiVipCrownLine className="text-xl" />
              <span className="text-sm">Subscription & Usage</span>
            </button>
            
            <button
              onClick={() => setActiveSection('staff')}
              className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
                activeSection === 'staff'
                  ? 'bg-[#FF4F18] text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]'
              }`}
            >
              <RiTeamLine className="text-xl" />
              <span className="text-sm">Staff Management</span>
            </button>
            
            <Link
              href="/restaurant-owner"
              className="flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200
                text-gray-600 hover:bg-gray-50 hover:text-[#FF4F18]"
            >
              <FaHome className="text-xl" />
              <span className="text-sm">Home</span>
            </Link>

            {/* Sign Out Button at Bottom */}
            <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200"
              >
                <FaSignOutAlt className="text-xl" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-72 p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800">
              {activeSection === 'owner-profile' && 'Owner Profile'}
              {activeSection === 'profile' && 'Venue Profile'}
              {activeSection === 'floorplan' && 'Floor Plan'}
              {activeSection === 'reservation' && 'Reservations'}
              {activeSection === 'zones' && 'Zones & Pricing'}
              {activeSection === 'events' && 'Events'}
              {activeSection === 'subscription-management' && 'Subscription & Usage'}
              {activeSection === 'staff' && 'Staff Management'}
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your venue settings and information
            </p>
          </div>

          {/* Content Sections */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {!restaurant && !isCreatingNew ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Create Your Restaurant Profile
                  </h2>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 rounded-lg bg-[#FF4F18] text-white hover:bg-[#FF4F18]/90 
                             transition-all duration-200 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create Restaurant Profile
                  </button>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#F2F4F7]">
                  {isCreatingNew ? (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-[#141517]">
                          Create Restaurant Profile
                        </h2>
                        <button 
                          onClick={() => setIsCreatingNew(false)}
                          className="text-[#64748B] hover:text-[#141517]"
                        >
                          Cancel
                        </button>
                      </div>
                      <RestaurantProfileForm 
                        mode="create"
                        initialData={null}
                        onSubmitSuccess={(newRestaurant) => {
                          console.log('Create success:', newRestaurant);
                          setRestaurant(newRestaurant);
                          setIsCreatingNew(false);
                        }}
                        onCancel={() => setIsCreatingNew(false)}
                      />
                    </div>
                  ) : (
                    <RestaurantInformation 
                      restaurant={restaurant}
                      onEditClick={(updatedRestaurant) => {
                        console.log('Edit click:', updatedRestaurant);
                        setRestaurant(updatedRestaurant);
                      }}
                      onUpdateSuccess={(updatedRestaurant) => {
                        console.log('Update success:', updatedRestaurant);
                        setRestaurant(updatedRestaurant);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
          {activeSection === 'floorplan' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#F2F4F7]">
              {restaurant ? (
                <RestaurantFloorPlan 
                  token={token}
                  restaurantId={restaurant._id}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#64748B]">No restaurant selected.</p>
                </div>
              )}
            </div>
          )}
          {activeSection === 'reservation' && (
            <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F7] h-[calc(100vh-120px)]">
              {restaurant ? (
                <div className="h-full flex flex-col">
                  {/* Single Tab Content - Only Reservation List */}
                  <div className="flex-1 overflow-hidden">
                    <RestaurantReservation restaurantId={restaurant._id} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#64748B]">Please create a restaurant profile first</p>
                </div>
              )}
            </div>
          )}
          {activeSection === 'subscription-management' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#F2F4F7] mt-4">
              <SubscriptionManagement ownerId={restaurantId} />
            </div>
          )}
          {activeSection === 'owner-profile' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#F2F4F7]">
              <OwnerProfile />
            </div>
          )}
          {activeSection === 'staff' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#F2F4F7]">
              <StaffManagement restaurantId={restaurant?._id} />
            </div>
          )}

          {activeSection === 'zones' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
              {restaurant ? (
                <ZoneManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#9B96A8' }}>
                  Create your venue profile first to manage zones.
                </p>
              )}
            </div>
          )}

          {activeSection === 'events' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
              {restaurant ? (
                <EventManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                  zones={allZones}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#9B96A8' }}>
                  Create your venue profile first to manage events.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
