'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'

function toLatLngLiteral(coordinates) {
  if (!coordinates) return null;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  const lat = Number(coordinates.lat ?? coordinates.latitude);
  const lng = Number(coordinates.lng ?? coordinates.lon ?? coordinates.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  return null;
}

export default function RestaurantProfile() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const fetchRestaurantProfiles = async () => {
      const token = localStorage.getItem("restaurantOwnerToken");
      const storedRestaurant = localStorage.getItem("selectedRestaurant");
      
      if (!token) {
        alert("Unauthorized! Please log in.");
        router.push('/login');
        return;
      }

      try {
        const response = await fetch("/api/restaurants", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const { restaurant } = await response.json();
          console.log("Fetched restaurant data:", restaurant); // Debug log

          if (!restaurant) {
            setLoading(false);
            return;
          }

          // Set both restaurants and selectedRestaurant
          setRestaurants([restaurant]);
          setSelectedRestaurant(restaurant);
          
          // Update localStorage
          localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
        } else {
          const errorText = await response.text();
          console.error("Failed to fetch restaurant profiles:", errorText);
        }
      } catch (error) {
        console.error("Error fetching restaurant profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantProfiles();
  }, [router]);

  if (loading) {
    return <div className="text-xl">Loading...</div>;
  }

  if (!selectedRestaurant) {
    return <div className="text-xl">No restaurant profile found</div>;
  }

  const restaurantCoordinates = toLatLngLiteral(selectedRestaurant?.location?.coordinates);

  return (
    <>
      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {restaurants.map((rest) => (
              <button
                key={rest._id}
                onClick={() => setSelectedRestaurant(rest)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                  selectedRestaurant?._id === rest._id
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {rest.restaurantName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Restaurant Profile Card */}
      <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {selectedRestaurant?.restaurantName}
            </h1>
            <p className="text-gray-500 mt-2">Restaurant Profile</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/restaurant-owner/setup/add')}
              className="flex items-center gap-2 bg-gray-900 text-white py-2.5 px-5 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Restaurant
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gray-900 text-white py-2.5 px-5 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow duration-200">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Category</h3>
              <p className="text-xl font-medium text-gray-800">{selectedRestaurant?.cuisineType}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow duration-200">
            <p className="text-xl font-medium text-gray-800">
              {selectedRestaurant?.location?.address || 'Location not set'}
            </p>
              {restaurantCoordinates && (
                <div className="mt-4 h-[200px] rounded-lg overflow-hidden">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={restaurantCoordinates}
                    zoom={15}
                  >
                    <Marker position={restaurantCoordinates} />
                  </GoogleMap>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow duration-200">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-xl font-medium text-gray-800">{selectedRestaurant?.description}</p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-inner">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Opening Hours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedRestaurant?.openingHours && Object.entries(selectedRestaurant.openingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
                  <span className="text-base font-semibold capitalize text-gray-700">{day}</span>
                  <span className="text-lg text-gray-800 font-medium">
                    {hours.open} - {hours.close}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
