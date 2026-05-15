'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RestaurantInformation from '@/components/RestaurantInformation'
import RestaurantProfileForm from '@/components/RestaurantProfileForm'
import SubscriptionManagement from '@/components/SubscriptionManagement'
import { RiRestaurantLine, RiLayoutLine, RiCalendarLine, RiVipCrownLine, RiUserLine, RiTeamLine, RiBarChartLine, RiMapPinLine, RiCalendarEventLine, RiDashboardLine, RiCameraLine, RiPriceTag3Line } from 'react-icons/ri'
import { motion } from 'framer-motion'
import OwnerProfile from '@/components/OwnerProfile'
import RestaurantFloorPlan from '@/components/RestaurantFloorPlan'
import RestaurantReservation from '@/components/RestaurantReservation'
import StaffManagement from '@/components/StaffManagement'
import ZoneManager from '@/components/ZoneManager'
import EventManager from '@/components/EventManager'
import DashboardOverview from '@/components/DashboardOverview'
import RealViewManager from '@/components/RealViewManager'
import TableLabelManager from '@/components/TableLabelManager'
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
  const [activeSection, setActiveSection] = useState('overview')
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


  const NAV = [
    { id: 'overview',               icon: RiDashboardLine,    label: 'Overview' },
    { id: 'owner-profile',          icon: RiUserLine,         label: 'Profile' },
    { id: 'profile',                icon: RiRestaurantLine,   label: 'Venue Profile' },
    { id: 'floorplan',              icon: RiLayoutLine,       label: 'Floor Plan' },
    { id: 'reservation',            icon: RiCalendarLine,     label: 'Reservations' },
    { id: 'zones',                  icon: RiMapPinLine,       label: 'Zones & Pricing' },
    { id: 'events',                 icon: RiCalendarEventLine,label: 'Events' },
    { id: 'realview',               icon: RiCameraLine,       label: '360° Views' },
    { id: 'table-labels',           icon: RiPriceTag3Line,    label: 'Table Labels' },
    { id: 'subscription-management',icon: RiVipCrownLine,     label: 'Subscription' },
    { id: 'staff',                  icon: RiTeamLine,         label: 'Staff' },
  ];

  const SECTION_LABEL = {
    'overview': 'Overview', 'owner-profile': 'Owner Profile', 'profile': 'Venue Profile',
    'floorplan': 'Floor Plan', 'reservation': 'Reservations', 'zones': 'Zones & Pricing',
    'events': 'Events', 'realview': '360° Views', 'table-labels': 'Table Labels', 'subscription-management': 'Subscription & Usage', 'staff': 'Staff Management',
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#15130f' }}>
      {/* Sidebar */}
      <div className="w-64 z-50 fixed left-0 top-0 h-screen flex flex-col" style={{ background: '#0a0908', borderRight: '1px solid #2a241b' }}>
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#2a241b' }}>
          <Link href="/restaurant-owner" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #c9a961, #e2c887)' }}>
              <span className="font-black text-sm" style={{ color: '#0a0908', fontFamily: 'serif' }}>V</span>
            </div>
            <span className="font-black text-lg tracking-tight" style={{ color: '#f5efe3', fontFamily: 'serif' }}>Velvet</span>
          </Link>
          <p className="text-xs mt-1 ml-10" style={{ color: '#8b847a' }}>Venue Management</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, icon: Icon, label }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? 'rgba(201, 169, 97, 0.15)' : 'transparent',
                  color: active ? '#c9a961' : '#8b847a',
                  border: active ? '1px solid rgba(201, 169, 97, 0.25)' : '1px solid transparent',
                }}
              >
                <Icon style={{ fontSize: '16px', flexShrink: 0 }} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t space-y-0.5" style={{ borderColor: '#2a241b' }}>
          <Link
            href="/restaurant-owner"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#8b847a' }}
          >
            <FaHome style={{ fontSize: '14px' }} />
            <span>Home</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#EF4444' }}
          >
            <FaSignOutAlt style={{ fontSize: '14px' }} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-velvet-cream">{SECTION_LABEL[activeSection]}</h1>
            <p className="text-velvet-muted mt-1">Manage your venue settings and information</p>
          </div>

          {/* Content Sections */}
          {activeSection === 'overview' && (
            <div className="rounded-xl">
              {restaurant ? (
                <DashboardOverview restaurantId={restaurant._id} token={token} />
              ) : (
                <div className="text-center py-12 text-velvet-muted">
                  Create your restaurant profile first to see your overview.
                </div>
              )}
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="space-y-6">
              {!restaurant && !isCreatingNew ? (
                <div className="bg-velvet-surface rounded-xl shadow-md border border-velvet-border p-6">
                  <h2 className="text-xl font-semibold text-velvet-cream mb-4">
                    Create Your Restaurant Profile
                  </h2>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 rounded-lg text-white transition-all duration-200 flex items-center gap-2"
                    style={{ background: '#c9a961', color: '#0a0908' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create Restaurant Profile
                  </button>
                </div>
              ) : (
                <div className="bg-velvet-surface p-6 rounded-xl shadow-sm border border-[#15130f]">
                  {isCreatingNew ? (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-[#15130f]">
                          Create Restaurant Profile
                        </h2>
                        <button 
                          onClick={() => setIsCreatingNew(false)}
                          className="text-[#8b847a] hover:text-[#15130f]"
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
            <div className="bg-velvet-surface p-6 rounded-xl shadow-sm border border-[#15130f]">
              {restaurant ? (
                <RestaurantFloorPlan 
                  token={token}
                  restaurantId={restaurant._id}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#8b847a]">No restaurant selected.</p>
                </div>
              )}
            </div>
          )}
          {activeSection === 'reservation' && (
            <div className="bg-velvet-surface rounded-xl shadow-sm border border-[#15130f] h-[calc(100vh-120px)]">
              {restaurant ? (
                <div className="h-full flex flex-col">
                  {/* Single Tab Content - Only Reservation List */}
                  <div className="flex-1 overflow-hidden">
                    <RestaurantReservation restaurantId={restaurant._id} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#8b847a]">Please create a restaurant profile first</p>
                </div>
              )}
            </div>
          )}
          {activeSection === 'subscription-management' && (
            <div className="bg-velvet-surface p-6 rounded-xl shadow-sm border border-[#15130f] mt-4">
              <SubscriptionManagement ownerId={restaurantId} />
            </div>
          )}
          {activeSection === 'owner-profile' && (
            <div className="bg-velvet-surface p-6 rounded-xl shadow-sm border border-[#15130f]">
              <OwnerProfile />
            </div>
          )}
          {activeSection === 'staff' && (
            <div className="bg-velvet-surface p-6 rounded-xl shadow-sm border border-[#15130f]">
              <StaffManagement restaurantId={restaurant?._id} />
            </div>
          )}

          {activeSection === 'zones' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
              {restaurant ? (
                <ZoneManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#8b847a' }}>
                  Create your venue profile first to manage zones.
                </p>
              )}
            </div>
          )}

          {activeSection === 'events' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
              {restaurant ? (
                <EventManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                  zones={allZones}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#8b847a' }}>
                  Create your venue profile first to manage events.
                </p>
              )}
            </div>
          )}

          {activeSection === 'realview' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
              {restaurant ? (
                <RealViewManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#8b847a' }}>
                  Create your venue profile first to manage 360° views.
                </p>
              )}
            </div>
          )}

          {activeSection === 'table-labels' && (
            <div className="p-6 rounded-xl shadow-sm" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
              {restaurant ? (
                <TableLabelManager
                  restaurantId={restaurant._id}
                  token={token}
                  floorplans={allFloorplans}
                />
              ) : (
                <p className="text-center py-8" style={{ color: '#8b847a' }}>
                  Create your venue profile first to manage table labels.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
