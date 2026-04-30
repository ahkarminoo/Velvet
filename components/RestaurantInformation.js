import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { RiRestaurantLine, RiTimeLine, RiMapPinLine, RiEdit2Line, RiDeleteBinLine, RiImageAddLine, RiPhoneLine } from 'react-icons/ri';
import { MdRestaurantMenu, MdAnalytics } from 'react-icons/md';
import { FaPhone } from 'react-icons/fa';
import { GoogleMap, Marker } from '@react-google-maps/api';
import RestaurantProfileForm from './RestaurantProfileForm';
import MenuImageUpload from './MenuImageUpload';
import ImageUpload from './ImageUpload';

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

const formatOpeningHours = (hours) => {
  if (!hours || typeof hours !== 'object') return [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.map(day => {
    const time = hours[day];
    if (!time || !time.open || !time.close || time.isClosed) {
      return {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        status: 'Closed',
        isOpen: false
      };
    }
    return {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      hours: `${time.open} - ${time.close}`,
      isOpen: true
    };
  });
};

export default function RestaurantInformation({ restaurant, onEditClick, onUpdateSuccess }) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Debug logging
  useEffect(() => {
    console.log('RestaurantInformation component received restaurant:', restaurant);
    console.log('Contact number in received restaurant:', restaurant?.contactNumber);
  }, [restaurant]);

  // Ensure menu images is always an array
  const menuImages = Array.isArray(restaurant?.images?.menu) 
    ? restaurant.images.menu 
    : restaurant?.images?.menu 
      ? [restaurant.images.menu] 
      : [];

  const restaurantCoordinates = toLatLngLiteral(restaurant?.location?.coordinates);

  console.log('DEBUG - Menu Images:', {
    original: restaurant?.images?.menu,
    processed: menuImages,
    isArray: Array.isArray(restaurant?.images?.menu),
    length: menuImages.length
  });

  // Add console log to debug component state
  console.log('RestaurantInformation render:', { isEditing, restaurant });

  if (isEditing) {
    console.log('Entering edit mode with data:', restaurant); // Debug log
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        <RestaurantProfileForm
          mode="update"
          initialData={restaurant}
          onSubmitSuccess={(updatedRestaurant) => {
            console.log('Update success in RestaurantInformation:', updatedRestaurant); 
            console.log('Contact number in updated restaurant:', updatedRestaurant?.contactNumber);
            onUpdateSuccess(updatedRestaurant);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </motion.div>
    );
  }

  const formattedHours = formatOpeningHours(restaurant.openingHours);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden">
        {restaurant.images?.main ? (
          <Image
            src={restaurant.images.main}
            alt={restaurant.restaurantName}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 
            flex items-center justify-center">
            <RiRestaurantLine className="text-6xl text-gray-400" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 p-6 flex flex-col justify-between">
          <button
            onClick={() => setIsEditing(true)}
            className="self-end bg-white/90 text-[#FF4F18] px-4 py-2 rounded-lg 
              shadow-lg hover:bg-white transition-all duration-200 flex items-center gap-2"
          >
            <RiEdit2Line />
            Edit Profile
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{restaurant.restaurantName}</h1>
            <p className="text-white/90">{restaurant.cuisineType}</p>
          </div>
        </div>
      </div>

      {/* Debug Info - Remove in production */}
      <div className="bg-gray-100 rounded-xl p-4 text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Contact Number: {restaurant.contactNumber ? `"${restaurant.contactNumber}"` : "not set"}</p>
        <p>Type: {typeof restaurant.contactNumber}</p>
      </div>

      {/* Restaurant Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Description */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
            <MdRestaurantMenu className="text-[#FF4F18]" />
            About
          </h3>
          <p className="text-gray-600">{restaurant.description || 'No description provided'}</p>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
            <RiTimeLine className="text-[#FF4F18]" />
            Opening Hours
          </h3>
          <div className="space-y-3">
            {formattedHours.map(({ day, hours, isOpen, status }) => (
              <div key={day} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium text-gray-900">{day}</span>
                {isOpen ? (
                  <span className="text-gray-900">{hours}</span>
                ) : (
                  <span className="text-red-500">{status}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
            <FaPhone className="text-[#FF4F18]" />
            Contact
          </h3>
          {restaurant.contactNumber ? (
            <p className="text-gray-600 flex items-center gap-2">
              <span className="font-medium">Phone:</span> {restaurant.contactNumber}
            </p>
          ) : (
            <p className="text-gray-500 italic">No contact number provided</p>
          )}
        </div>

        {/* Location */}
        {restaurant.location && (
          <div className={`bg-white rounded-xl shadow-lg p-6 ${!restaurant.contactNumber ? 'md:col-span-2' : ''}`}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
              <RiMapPinLine className="text-[#FF4F18]" />
              Location
            </h3>
            <p className="text-gray-600 mb-4">{restaurant.location.address}</p>
            {restaurantCoordinates && (
              <div className="h-[300px] rounded-lg overflow-hidden">
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
        )}
      </div>

      {/* Menu Images Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
          <MdRestaurantMenu className="text-[#FF4F18]" />
          Menu Images
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuImages.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-[3/4] relative rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={`Menu page ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              {isEditing && (
                <button
                  onClick={async () => {
                    const updatedMenu = menuImages.filter((_, i) => i !== index);
                    try {
                      const response = await fetch(`/api/restaurants/${restaurant._id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('restaurantOwnerToken')}`
                        },
                        body: JSON.stringify({
                          images: {
                            ...restaurant.images,
                            menu: updatedMenu
                          }
                        })
                      });
                      
                      if (response.ok) {
                        const updatedRestaurant = await response.json();
                        onUpdateSuccess(updatedRestaurant);
                      }
                    } catch (error) {
                      console.error('Error updating menu images:', error);
                    }
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-red-500 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                >
                  <RiDeleteBinLine className="text-xl" />
                </button>
              )}
            </div>
          ))}
          
          {isEditing && menuImages.length < 5 && (
            <div className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg 
              hover:border-[#FF4F18] transition-colors">
              <ImageUpload
                onImageUpload={async (url) => {
                  const newMenuImages = [...menuImages, url];
                  try {
                    const response = await fetch(`/api/restaurants/${restaurant._id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('restaurantOwnerToken')}`
                      },
                      body: JSON.stringify({
                        images: {
                          ...restaurant.images,
                          menu: newMenuImages
                        }
                      })
                    });
                    
                    if (response.ok) {
                      const updatedRestaurant = await response.json();
                      onUpdateSuccess(updatedRestaurant);
                    }
                  } catch (error) {
                    console.error('Error updating menu images:', error);
                  }
                }}
                type="restaurant"
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <RiImageAddLine className="text-3xl text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Add Menu Image</span>
                <span className="text-xs text-gray-400">
                  ({menuImages.length}/5)
                </span>
              </ImageUpload>
            </div>
          )}
        </div>
        
        {menuImages.length === 0 && !isEditing && (
          <p className="text-gray-500 italic">No menu images uploaded yet.</p>
        )}
      </div>

      {/* Gallery Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black">
          <RiImageAddLine className="text-[#FF4F18]" />
          Gallery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurant.images?.gallery?.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-[16/9] relative rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={`Gallery image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              {isEditing && (
                <button
                  onClick={async () => {
                    const updatedGallery = restaurant.images.gallery.filter((_, i) => i !== index);
                    try {
                      const response = await fetch(`/api/restaurants/${restaurant._id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('restaurantOwnerToken')}`
                        },
                        body: JSON.stringify({
                          images: {
                            ...restaurant.images,
                            gallery: updatedGallery
                          }
                        })
                      });
                      
                      if (response.ok) {
                        const updatedRestaurant = await response.json();
                        onUpdateSuccess(updatedRestaurant);
                      }
                    } catch (error) {
                      console.error('Error updating gallery images:', error);
                    }
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-red-500 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                >
                  <RiDeleteBinLine className="text-xl" />
                </button>
              )}
            </div>
          ))}
          
          {isEditing && restaurant.images?.gallery?.length < 10 && (
            <div className="aspect-[16/9] border-2 border-dashed border-gray-300 rounded-lg 
              hover:border-[#FF4F18] transition-colors">
              <ImageUpload
                onImageUpload={async (url) => {
                  const newGallery = [...(restaurant.images?.gallery || []), url];
                  try {
                    const response = await fetch(`/api/restaurants/${restaurant._id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('restaurantOwnerToken')}`
                      },
                      body: JSON.stringify({
                        images: {
                          ...restaurant.images,
                          gallery: newGallery
                        }
                      })
                    });
                    
                    if (response.ok) {
                      const updatedRestaurant = await response.json();
                      onUpdateSuccess(updatedRestaurant);
                    }
                  } catch (error) {
                    console.error('Error updating gallery images:', error);
                  }
                }}
                type="restaurant"
                multiple={true}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <RiImageAddLine className="text-3xl text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Add Gallery Images</span>
                <span className="text-xs text-gray-400">
                  ({restaurant.images?.gallery?.length || 0}/10)
                </span>
              </ImageUpload>
            </div>
          )}
          </div>
      </div>
    </div>
  );
}
