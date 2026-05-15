"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaHome,
  FaSignOutAlt,
  FaUserEdit,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaCamera,
  FaSave,
  FaTimes,
  FaHeart,
  FaCalendarAlt,
  FaUtensils,
  FaClock,
  FaUsers,
  FaTable,
  FaTicketAlt,
} from "react-icons/fa";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

export default function CustomerProfile() {
  const router = useRouter();
  const { userProfile, isAuthenticated, logout, getAuthToken, refreshUserProfile, loading: authLoading } = useFirebaseAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    newPassword: "",
  });
  const [formInitialized, setFormInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Activity states
  const [activeTab, setActiveTab] = useState("profile");
  const [savedRestaurants, setSavedRestaurants] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // ✅ Initialize form only ONCE when userProfile is loaded
  useEffect(() => {
    if (userProfile && !formInitialized) {
      setFormData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        email: userProfile.email || "",
        contactNumber: userProfile.contactNumber || "",
        newPassword: "",
      });
      setFormInitialized(true);
    }
  }, [userProfile, formInitialized]);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // ✅ Handle form input changes - Simple and clean
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile?.email) {
      toast.error("User email is missing.");
      return;
    }

    // Basic password validation
    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Please log in again.");
        return;
      }

      const payload = {
        email: userProfile.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        newPassword: formData.newPassword || undefined,
      };

      const response = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        // Show different success message based on whether password was updated
        const successMessage = result.passwordUpdated 
          ? "Profile and password updated successfully!" 
          : "Profile updated successfully!";
        toast.success(successMessage);
        
        // Update the form data with the new values (clear password field)
        const updatedFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          newPassword: "",
        };
        setFormData(updatedFormData);
        
        // Refresh user profile from the server to get the latest data
        await refreshUserProfile();
        
        setIsEditing(false);
      } else {
        toast.error(result.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating your profile.");
    }
  };

  // Handle profile image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('type', 'customer');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload image');
      
      const { url } = await uploadResponse.json();
      const token = await getAuthToken();

      const updateResponse = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          contactNumber: userProfile.contactNumber,
          profileImage: url,
        }),
      });

      if (!updateResponse.ok) throw new Error('Failed to update profile');
      
      // Refresh user profile to show the new image
      await refreshUserProfile();
      
      toast.success('Profile image updated successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update profile image');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch saved restaurants
  const fetchSavedRestaurants = async () => {
    if (!userProfile?.email) return;
    
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/user/favorites', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to fetch favorites');
      
      const data = await response.json();
      const restaurantDetails = await Promise.all(
        data.favorites.map(async (restaurantId) => {
          try {
            const restaurantResponse = await fetch(`/api/restaurants/${restaurantId}`);
            if (restaurantResponse.ok) {
              const restaurantData = await restaurantResponse.json();
              return {
                _id: restaurantId,
                name: restaurantData.restaurantName,
                cuisine: restaurantData.cuisineType,
                location: restaurantData.location,
                images: restaurantData.images,
                rating: restaurantData.rating
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching restaurant ${restaurantId}:`, error);
            return null;
          }
        })
      );
      setSavedRestaurants(restaurantDetails.filter(r => r !== null));
    } catch (error) {
      console.error("Error fetching saved restaurants:", error);
    }
  };

  // Fetch user bookings
  const fetchUserBookings = async () => {
    if (!userProfile?.email) return;
    
    setBookingsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/bookings/customer', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch your reservations');
    } finally {
      setBookingsLoading(false);
    }
  };

  // Cancel booking function
  const cancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/bookings/customer', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      toast.success('Booking cancelled successfully');
      // Refresh bookings list
      fetchUserBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
    }
  };

  // Check if booking can be cancelled
  const canCancelBooking = (booking) => {
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return false;
    }

    // Parse booking date and time properly
    let bookingDateTime;
    
    // Handle different date formats that might come from the server
    if (typeof booking.date === 'string') {
      // If it's a string, create a date object and ensure we're using local timezone
      bookingDateTime = new Date(booking.date.split('T')[0] + 'T00:00:00');
    } else {
      // If it's already a Date object
      bookingDateTime = new Date(booking.date);
    }
    
    // Parse the time string (assuming format like "14:30" or "2:30 PM")
    let startHour, startMinute;
    
    if (booking.startTime.includes('PM') || booking.startTime.includes('AM')) {
      // Handle 12-hour format
      const [time, period] = booking.startTime.split(' ');
      const [hour, minute] = time.split(':').map(Number);
      startHour = period === 'PM' && hour !== 12 ? hour + 12 : 
                  period === 'AM' && hour === 12 ? 0 : hour;
      startMinute = minute;
    } else {
      // Handle 24-hour format
      const timeParts = booking.startTime.split(':');
      startHour = parseInt(timeParts[0]);
      startMinute = parseInt(timeParts[1]) || 0;
    }
    
    // Set the time on the booking date
    bookingDateTime.setHours(startHour, startMinute, 0, 0);
    
    // Get current time
    const now = new Date();
    
    // Calculate time difference in milliseconds
    const timeDifference = bookingDateTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDifference / (1000 * 60 * 60);
    
    // Debug logging to help troubleshoot
    console.log('Booking cancellation check:', {
      bookingDate: booking.date,
      startTime: booking.startTime,
      parsedDateTime: bookingDateTime,
      currentTime: now,
      hoursUntilBooking,
      canCancel: hoursUntilBooking >= 2
    });
    
    return hoursUntilBooking >= 2;
  };

  const fetchUserTickets = async () => {
    if (!userProfile) return;
    setTicketsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/customer/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Effect for fetching data based on active tab
  useEffect(() => {
    if (activeTab === "activities") {
      fetchSavedRestaurants();
      fetchUserBookings();
    }
    if (activeTab === "tickets") {
      fetchUserTickets();
    }
  }, [activeTab, userProfile]);

  // Profile Image Component
  const ProfileImage = () => (
    <div className="relative group">
      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-velvet-gold shadow-lg shadow-velvet-gold/20">
        {userProfile?.profileImage ? (
          <img
            src={userProfile.profileImage}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-velvet-gold to-velvet-gold-light flex items-center justify-center">
            <span className="text-velvet-black font-bold text-2xl">
              {userProfile?.firstName?.charAt(0)?.toUpperCase() || userProfile?.email?.charAt(0)?.toUpperCase() || '?'}{userProfile?.lastName?.charAt(0)?.toUpperCase() || ''}
            </span>
          </div>
        )}
      </div>

      <label className="absolute bottom-0 right-0 w-8 h-8 bg-velvet-gold rounded-full shadow-lg cursor-pointer hover:bg-velvet-gold-light transition-colors flex items-center justify-center">
        <FaCamera className="text-velvet-black text-sm" />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>
      
      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );

  // Main content renderer
  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-velvet-border rounded-full"></div>
            <div className="h-4 w-48 bg-velvet-border rounded"></div>
          </div>
        </div>
      );
    }

    if (!userProfile) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-velvet-cream">Please log in to view your profile</h2>
            <p className="mt-2 text-velvet-muted">You need to be logged in to access this page</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-velvet-black pt-16 sm:pt-20">
        {/* Header */}
        <div className="bg-velvet-surface/60 backdrop-blur-md shadow-sm border-b border-velvet-border sticky top-16 sm:top-20 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <h1 className="text-xl sm:text-2xl font-bold text-velvet-cream">My Profile</h1>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => router.push("/")}
                  aria-label="Home"
                  className="flex items-center justify-center gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-velvet-muted hover:text-velvet-gold hover:bg-velvet-gold/10 rounded-lg transition"
                >
                  <FaHome />
                  <span className="hidden sm:inline">Home</span>
                </button>
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="flex items-center justify-center gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-velvet-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <FaSignOutAlt />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-velvet-surface border border-velvet-border rounded-2xl shadow-lg p-5 sm:p-6">
                {/* Profile Section */}
                <div className="text-center mb-5 sm:mb-6">
                  <ProfileImage />
                  <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-velvet-cream truncate">
                    {userProfile.firstName} {userProfile.lastName}
                  </h2>
                  <p className="text-sm text-velvet-muted truncate">{userProfile.email}</p>
                </div>

                {/* Navigation - horizontal scroll on mobile, vertical on lg */}
                <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex-shrink-0 lg:flex-shrink flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap lg:w-full ${
                      activeTab === "profile"
                        ? "bg-velvet-gold text-velvet-black font-semibold"
                        : "text-velvet-muted hover:bg-velvet-gold/10 hover:text-velvet-cream"
                    }`}
                  >
                    <FaUser className="text-sm" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("activities")}
                    className={`flex-shrink-0 lg:flex-shrink flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap lg:w-full ${
                      activeTab === "activities"
                        ? "bg-velvet-gold text-velvet-black font-semibold"
                        : "text-velvet-muted hover:bg-velvet-gold/10 hover:text-velvet-cream"
                    }`}
                  >
                    <FaHeart className="text-sm" />
                    <span>Activities</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("tickets")}
                    className={`flex-shrink-0 lg:flex-shrink flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap lg:w-full ${
                      activeTab === "tickets"
                        ? "bg-velvet-gold text-velvet-black font-semibold"
                        : "text-velvet-muted hover:bg-velvet-gold/10 hover:text-velvet-cream"
                    }`}
                  >
                    <FaTicketAlt className="text-sm" />
                    <span>Tickets</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === "profile" && (
                <div className="bg-velvet-surface border border-velvet-border rounded-2xl shadow-lg p-5 sm:p-6">
                  <div className="flex justify-between items-center mb-5 sm:mb-6 gap-3">
                    <h3 className="text-base sm:text-lg font-semibold text-velvet-cream">Profile Information</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        aria-label="Edit profile"
                        className="flex items-center justify-center gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-velvet-gold text-velvet-black rounded-lg hover:bg-velvet-gold-light transition font-semibold text-sm"
                      >
                        <FaUserEdit />
                        <span className="hidden sm:inline">Edit Profile</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(false)}
                        aria-label="Cancel"
                        className="flex items-center justify-center gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 border border-velvet-border text-velvet-cream rounded-lg hover:bg-velvet-gold/10 transition text-sm"
                      >
                        <FaTimes />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-sm font-medium text-velvet-cream mb-2">
                            <FaUser className="inline mr-2" />
                            First Name
                          </label>
                                                     <input
                             type="text"
                             name="firstName"
                             value={formData.firstName}
                             onChange={handleFormChange}
                             className="w-full px-4 py-3 bg-velvet-black border border-velvet-border rounded-lg focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold text-velvet-cream text-base outline-none transition placeholder-velvet-muted"
                             placeholder="Enter your first name"
                           />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-velvet-cream mb-2">
                            <FaUser className="inline mr-2" />
                            Last Name
                          </label>
                                                     <input
                             type="text"
                             name="lastName"
                             value={formData.lastName}
                             onChange={handleFormChange}
                             className="w-full px-4 py-3 bg-velvet-black border border-velvet-border rounded-lg focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold text-velvet-cream text-base outline-none transition placeholder-velvet-muted"
                             placeholder="Enter your last name"
                           />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-velvet-cream mb-2">
                            <FaEnvelope className="inline mr-2" />
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            disabled
                            className="w-full px-4 py-3 border border-velvet-border rounded-lg bg-velvet-black/60 text-velvet-muted cursor-not-allowed text-base"
                          />
                          <p className="text-xs text-velvet-muted mt-1">Email cannot be changed</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-velvet-cream mb-2">
                            <FaPhone className="inline mr-2" />
                            Contact Number
                          </label>
                                                     <input
                             type="text"
                             name="contactNumber"
                             value={formData.contactNumber}
                             onChange={handleFormChange}
                             className="w-full px-4 py-3 bg-velvet-black border border-velvet-border rounded-lg focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold text-velvet-cream text-base outline-none transition placeholder-velvet-muted"
                             placeholder="Enter your contact number"
                           />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-velvet-cream mb-2">
                          <FaLock className="inline mr-2" />
                          New Password (Optional)
                        </label>
                                                 <input
                           type="password"
                           name="newPassword"
                           value={formData.newPassword}
                           onChange={handleFormChange}
                           className="w-full px-4 py-3 bg-velvet-black border border-velvet-border rounded-lg focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold text-velvet-cream text-base outline-none transition placeholder-velvet-muted"
                           placeholder="Leave blank to keep current password"
                         />
                        <p className="text-xs text-velvet-muted mt-1">
                          Minimum 6 characters. This will update your login password.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-velvet-gold text-velvet-black font-semibold rounded-lg hover:bg-velvet-gold-light transition shadow-lg shadow-velvet-gold/20 min-h-[48px]"
                        >
                          <FaSave />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-velvet-black/50 border border-velvet-border rounded-lg p-3 sm:p-4">
                        <label className="text-xs sm:text-sm font-medium text-velvet-muted">First Name</label>
                        <p className="text-base sm:text-lg font-semibold text-velvet-cream mt-1 break-words">
                          {userProfile.firstName || "Not set"}
                        </p>
                      </div>

                      <div className="bg-velvet-black/50 border border-velvet-border rounded-lg p-3 sm:p-4">
                        <label className="text-xs sm:text-sm font-medium text-velvet-muted">Last Name</label>
                        <p className="text-base sm:text-lg font-semibold text-velvet-cream mt-1 break-words">
                          {userProfile.lastName || "Not set"}
                        </p>
                      </div>

                      <div className="bg-velvet-black/50 border border-velvet-border rounded-lg p-3 sm:p-4">
                        <label className="text-xs sm:text-sm font-medium text-velvet-muted">Email Address</label>
                        <p className="text-base sm:text-lg font-semibold text-velvet-cream mt-1 break-all">
                          {userProfile.email || "Not set"}
                        </p>
                      </div>

                      <div className="bg-velvet-black/50 border border-velvet-border rounded-lg p-3 sm:p-4">
                        <label className="text-xs sm:text-sm font-medium text-velvet-muted">Contact Number</label>
                        <p className="text-base sm:text-lg font-semibold text-velvet-cream mt-1 break-words">
                          {userProfile.contactNumber || "Not set"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activities" && (
                <div className="space-y-6">
                  {/* Saved Restaurants */}
                  <div className="bg-velvet-surface rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-velvet-cream mb-4">Saved Restaurants</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {savedRestaurants.length > 0 ? (
                        savedRestaurants.map((restaurant) => (
                          <div key={restaurant._id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative h-48">
                              {restaurant.images?.main ? (
                                <Image
                                  src={restaurant.images.main}
                                  alt={restaurant.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-velvet-border flex items-center justify-center">
                                  <FaUtensils className="text-4xl text-velvet-muted" />
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-velvet-cream">{restaurant.name}</h4>
                              <p className="text-velvet-muted text-sm">{restaurant.cuisine}</p>
                              <button
                                onClick={() => router.push(`/restaurants/${restaurant._id}/floorplan`)}
                                className="mt-3 w-full py-2 bg-[#c9a961] text-white rounded-lg hover:bg-[#c9a961]/90 transition-colors"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 text-velvet-muted">
                          No saved restaurants found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reservations */}
                  <div className="bg-velvet-surface rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-velvet-cream mb-4">Your Reservations</h3>
                    {bookingsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a961]"></div>
                      </div>
                    ) : bookings.length > 0 ? (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <div key={booking._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-velvet-cream">{booking.restaurantName}</h4>
                                <div className="mt-2 space-y-1 text-sm text-velvet-muted">
                                  <div className="flex items-center">
                                    <FaCalendarAlt className="mr-2" />
                                    {new Date(booking.date).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center">
                                    <FaClock className="mr-2" />
                                    {booking.startTime} - {booking.endTime}
                                  </div>
                                  <div className="flex items-center">
                                    <FaUsers className="mr-2" />
                                    {booking.guestCount} guests
                                  </div>
                                  <div className="flex items-center">
                                    <FaTable className="mr-2" />
                                    Table {booking.tableId}
                                  </div>
                                </div>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                                  booking.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-300' :
                                  booking.status === 'pending' ? 'bg-amber-500/15 text-amber-300' :
                                  booking.status === 'cancelled' ? 'bg-red-500/15 text-red-300' :
                                  'bg-velvet-surface text-velvet-cream'
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => router.push(`/restaurants/${booking.restaurantId}/floorplan`)}
                                  className="px-4 py-2 bg-[#c9a961] text-white rounded-lg hover:bg-[#c9a961]/90 transition-colors"
                                >
                                  View Restaurant
                                </button>
                                {canCancelBooking(booking) && (
                                  <button
                                    onClick={() => cancelBooking(booking._id)}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                  >
                                    Cancel Booking
                                  </button>
                                )}
                                {!canCancelBooking(booking) && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                  <div className="text-xs text-velvet-muted text-center">
                                    Cannot cancel within 2 hours of booking time
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-velvet-muted">
                        No reservations found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* My Tickets Tab */}
              {activeTab === "tickets" && (
                <div className="space-y-4">
                  <div className="bg-velvet-surface rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-velvet-cream mb-4">My Event Tickets</h3>
                    {ticketsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a961]" />
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-12 text-velvet-muted">
                        <FaTicketAlt className="text-4xl mx-auto mb-3 text-velvet-muted" />
                        <p>No tickets yet</p>
                        <button
                          onClick={() => router.push('/events')}
                          className="mt-4 px-6 py-2 bg-[#c9a961] text-white rounded-lg hover:bg-[#c9a961]/90 transition-colors text-sm"
                        >
                          Browse Events
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tickets.map((ticket) => {
                          const ev = ticket.eventId;
                          const venue = ticket.venueId;
                          const eventDate = ev?.date ? new Date(ev.date).toLocaleDateString('en-GB', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—';
                          const isPast = ev?.date ? new Date(ev.date) < new Date() : false;
                          return (
                            <div key={ticket._id}
                              className="border rounded-xl overflow-hidden"
                              style={{ borderColor: isPast ? '#2a241b' : '#c9a961' }}
                            >
                              {/* Ticket header */}
                              <div className="px-5 py-3 flex items-center justify-between"
                                style={{ background: isPast ? '#0a0908' : '#15130f' }}>
                                <div className="flex items-center gap-2">
                                  <FaTicketAlt style={{ color: isPast ? '#8b847a' : '#c9a961' }} />
                                  <span className="font-bold text-sm" style={{ color: isPast ? '#8b847a' : '#c9a961' }}>
                                    {ticket.ticketRef}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  isPast ? 'bg-velvet-surface text-velvet-muted' : 'bg-emerald-500/15 text-emerald-400'
                                }`}>
                                  {isPast ? 'Past' : 'Upcoming'}
                                </span>
                              </div>

                              {/* Ticket body */}
                              <div className="px-5 py-4">
                                <h4 className="font-bold text-velvet-cream text-base">{ev?.name || 'Event'}</h4>
                                {venue?.restaurantName && (
                                  <p className="text-sm text-velvet-muted mt-0.5">{venue.restaurantName}</p>
                                )}
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex items-center gap-2 text-velvet-muted">
                                    <FaCalendarAlt className="text-[#c9a961] flex-shrink-0" />
                                    {eventDate}
                                  </div>
                                  <div className="flex items-center gap-2 text-velvet-muted">
                                    <FaClock className="text-[#c9a961] flex-shrink-0" />
                                    {ev?.startTime || '—'}
                                  </div>
                                  <div className="flex items-center gap-2 text-velvet-muted">
                                    <FaUsers className="text-[#c9a961] flex-shrink-0" />
                                    {ticket.quantity} guest{ticket.quantity !== 1 ? 's' : ''}
                                  </div>
                                  <div className="flex items-center gap-2 text-velvet-muted">
                                    <FaTicketAlt className="text-[#c9a961] flex-shrink-0" />
                                    {ticket.attendanceType === 'ga' ? 'General Admission' : 'Table'}
                                  </div>
                                </div>
                                {ticket.coverCharge > 0 && (
                                  <p className="mt-2 text-sm font-semibold" style={{ color: '#c9a961' }}>
                                    ฿{ticket.coverCharge * ticket.quantity} cover at door
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      {renderContent()}
    </motion.div>
  );
}

