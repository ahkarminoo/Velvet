"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faSolidHeart } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faRegularHeart } from "@fortawesome/free-regular-svg-icons";
import {
  faMapMarkerAlt,
  faClock,
  faChair,
  faSearch,
  faStar,
  faUtensils,
  faBowlRice,
  faFishFins,
  faPepperHot,
  faLeaf,
  faBurger,
  faPizzaSlice,
  faWineGlass,
  faChevronDown,
  faArrowUp
} from "@fortawesome/free-solid-svg-icons";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Toast from "../components/Toast";
import { motion } from "framer-motion";
import Image from "next/image";
import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
config.autoAddCss = false;

export default function HomePage() {
  const { isAuthenticated, getAuthToken } = useFirebaseAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedVenueType, setSelectedVenueType] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [cuisineTypes, setCuisineTypes] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetchWithRetry("/api/restaurants/all");
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();

        const transformedRestaurants = data.restaurants.map((restaurant) => ({
          _id: restaurant._id,
          name: restaurant.restaurantName,
          location: restaurant.location?.address || 'Location not available',
          description: restaurant.description,
          categories: [restaurant.cuisineType],
          cuisineType: restaurant.cuisineType,
          rating: 4.5,
          "opening-hours": formatOpeningHours(restaurant.openingHours),
          availableSeats: "20",
          fullLocation: restaurant.location,
          images: restaurant.images
        }));
        const uniqueCuisineTypes = [...new Set(transformedRestaurants.map(r => r.cuisineType))];
        setCuisineTypes(uniqueCuisineTypes);
        setRestaurants(transformedRestaurants);
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) return;
      try {
        const token = await getAuthToken();
        if (!token) return;
        const response = await fetchWithRetry('/api/user/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch favorites');
        const data = await response.json();
        setFavorites(data.favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };
    fetchFavorites();
  }, [isAuthenticated, getAuthToken]);

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearchTerm = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation
      ? restaurant.location.toLowerCase() === selectedLocation.toLowerCase()
      : true;
    const matchesCategory = selectedCategory
      ? restaurant.cuisineType.toLowerCase() === selectedCategory.toLowerCase() ||
        restaurant.categories.includes(selectedCategory)
      : true;
    const matchesVenueType = selectedVenueType === 'all'
      ? true
      : (restaurant.venueType || 'restaurant') === selectedVenueType;
    return matchesSearchTerm && matchesLocation && matchesCategory && matchesVenueType;
  });

  const limitedRestaurants = filteredRestaurants.slice(0, 15);

  const openModal = (restaurant) => setSelectedRestaurant(restaurant);
  const closeModal = () => setSelectedRestaurant(null);

  const handleFavorite = async (restaurant) => {
    if (!isAuthenticated) {
      setToastMessage("Please login to save restaurants");
      setShowToast(true);
      return;
    }
    try {
      const token = await getAuthToken();
      if (!token) {
        setToastMessage("Please login to save restaurants");
        setShowToast(true);
        return;
      }
      const response = await fetchWithRetry('/api/user/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ restaurantId: restaurant._id })
      });
      if (!response.ok) throw new Error('Failed to update favorite');
      const data = await response.json();
      if (data.isFavorite) {
        setFavorites(prev => [...prev, restaurant._id]);
        setToastMessage("Restaurant saved to favorites");
      } else {
        setFavorites(prev => prev.filter(id => id !== restaurant._id));
        setToastMessage("Restaurant removed from favorites");
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error updating favorite:', error);
      setToastMessage("Failed to update favorites");
      setShowToast(true);
    }
  };

  const isFavorite = (restaurantId) => favorites.includes(restaurantId);

  const formatOpeningHours = (hours) => {
    if (!hours || !hours.monday) return "Hours not available";
    return `${hours.monday.open} - ${hours.monday.close}`;
  };

  const getCuisineIcon = (cuisine) => {
    const icons = {
      Italian: faPizzaSlice,
      Chinese: faBowlRice,
      Japanese: faFishFins,
      Indian: faPepperHot,
      Mexican: faBurger,
      Thai: faLeaf,
      Wine: faWineGlass,
      default: faUtensils
    };
    return icons[cuisine] || icons.default;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setRecentSearches(prev => {
        const updated = [searchTerm, ...prev.filter(s => s !== searchTerm)].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        return updated;
      });
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  return (
    <>
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: '#0C0B10' }}>
          <div className="relative mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-full"
              style={{ border: '2px solid rgba(201,168,76,0.15)', borderTop: '2px solid #C9A84C' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-black text-2xl" style={{ color: '#C9A84C', fontFamily: 'serif' }}>V</span>
            </div>
          </div>
          <p className="font-black text-3xl tracking-tight" style={{ color: '#F5F0E8', fontFamily: 'serif' }}>Velvet</p>
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-2 text-sm tracking-widest uppercase"
            style={{ color: '#C9A84C' }}
          >
            Curating your experience
          </motion.p>
        </div>
      )}

      <Navbar className={`sticky top-0 z-40 transition-all duration-500 ${
        scrollPosition > 100 ? 'bg-white/80 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`} />

      <main className="min-h-screen" style={{ background: '#0C0B10' }}>
        {/* Hero Section */}
        <section className="relative h-[90vh] overflow-hidden">
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent z-10"
              style={{ backdropFilter: 'blur(1px)' }}
            />
            <motion.div
              animate={{
                scale: [1.25, 1.1, 1.25],
                opacity: [0.95, 1, 0.95],
              }}
              transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0"
            >
              <img
                src="/images/body-images/gastraeum-features-contemporary-dining-atmosphere-where-elegant-design-meets-exquisite-culinary-creations.jpg"
                alt="Modern Restaurant Interior"
                className="w-full h-full object-cover"
                fetchPriority="high"
              />
            </motion.div>
          </div>

          <div className="relative z-20 h-full container mx-auto px-4 sm:px-6 flex flex-col justify-end pb-20 sm:pb-36">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl space-y-4 sm:space-y-6"
            >
              <div className="space-y-3">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-semibold tracking-[0.3em] uppercase"
                  style={{ color: '#C9A84C' }}
                >
                  Bars · Clubs · Hotel Restaurants
                </motion.p>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight" style={{ fontFamily: 'serif', lineHeight: 1.05 }}>
                  <span className="text-white block">Reserve Your</span>
                  <span style={{ color: '#C9A84C' }}>Perfect Seat</span>
                </h1>
                <p className="text-lg sm:text-xl text-white/70 font-light max-w-lg">
                  Explore 3D interactive floorplans, choose your table, and book instantly at the finest venues.
                </p>
              </div>

              {/* Venue type filter tabs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex gap-2 flex-wrap"
              >
                {[
                  { value: 'all',              label: 'All Venues' },
                  { value: 'bar',              label: '🍸 Bar' },
                  { value: 'club',             label: '🎧 Club' },
                  { value: 'hotel_restaurant', label: '🏨 Hotel' },
                  { value: 'rooftop_bar',      label: '🌆 Rooftop' },
                  { value: 'lounge',           label: '🛋️ Lounge' },
                  { value: 'restaurant',       label: '🍽️ Restaurant' },
                ].map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => setSelectedVenueType(vt.value)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300"
                    style={{
                      background: selectedVenueType === vt.value
                        ? '#C9A84C'
                        : 'rgba(255,255,255,0.1)',
                      color: selectedVenueType === vt.value ? '#0C0B10' : 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${selectedVenueType === vt.value ? '#C9A84C' : 'rgba(255,255,255,0.15)'}`
                    }}
                  >
                    {vt.label}
                  </button>
                ))}
              </motion.div>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-2 rounded-2xl shadow-2xl"
                style={{ background: 'rgba(22,21,32,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,168,76,0.2)' }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 relative w-full">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2"
                      style={{ color: '#C9A84C' }}
                    />
                    <input
                      type="text"
                      placeholder="Search venues..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-sm outline-none"
                      style={{
                        background: 'rgba(12,11,16,0.6)',
                        color: '#F5F0E8',
                        border: '1px solid rgba(201,168,76,0.15)'
                      }}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto py-4 px-8 font-semibold rounded-xl
                             shadow-lg transition-all duration-300 whitespace-nowrap hover:shadow-xl"
                    style={{ background: '#C9A84C', color: '#0C0B10', boxShadow: '0 4px 20px rgba(201,168,76,0.25)' }}
                  >
                    Find Table
                  </motion.button>
                </div>
              </motion.div>

              {/* Feature Tags */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-4 mt-8"
              >
                {['Interactive 3D View', 'Real-time Availability', 'Instant Booking'].map((feature) => (
                  <div
                    key={feature}
                    className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10
                             text-white/80 text-sm font-medium"
                  >
                    {feature}
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[100px]"
            style={{ background: 'rgba(201,168,76,0.12)' }} />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px]"
            style={{ background: 'rgba(201,168,76,0.06)' }} />
        </section>

        {/* Cuisines Section */}
        <section className="py-20 px-6 relative" style={{ background: '#0C0B10' }}>
          <div className="container mx-auto relative">
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-4xl font-bold"
                  style={{ color: '#F5F0E8' }}
                >
                  Explore Cuisines
                </motion.h2>
                <div className="h-1 w-20 rounded-full" style={{ background: '#C9A84C' }} />
                <p className="mt-4" style={{ color: '#9B96A8' }}>Discover restaurants by cuisine type</p>
              </div>
              {selectedCategory && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory("")}
                  className="transition-colors flex items-center gap-2"
                  style={{ color: '#C9A84C' }}
                >
                  Clear Filter
                  <span className="text-sm">×</span>
                </motion.button>
              )}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cuisineTypes.map((cuisine, index) => (
                <motion.button
                  key={cuisine}
                  onClick={() => setSelectedCategory(cuisine)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group p-4 rounded-xl transition-all duration-300"
                  style={{
                    background: selectedCategory === cuisine ? '#C9A84C' : '#161520',
                    border: `1px solid ${selectedCategory === cuisine ? '#C9A84C' : '#1E1D2A'}`
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-lg transition-all duration-300"
                      style={{ background: selectedCategory === cuisine ? 'rgba(12,11,16,0.2)' : '#1E1D2A' }}>
                      <FontAwesomeIcon
                        icon={getCuisineIcon(cuisine)}
                        className="text-lg transition-all duration-300"
                        style={{ color: selectedCategory === cuisine ? '#0C0B10' : '#C9A84C' }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="font-medium text-sm transition-all duration-300"
                        style={{ color: selectedCategory === cuisine ? '#0C0B10' : '#F5F0E8' }}>
                        {cuisine}
                      </span>
                      <p className="text-xs mt-0.5 transition-all duration-300"
                        style={{ color: selectedCategory === cuisine ? 'rgba(12,11,16,0.65)' : '#9B96A8' }}>
                        {restaurants.filter(r => r.cuisineType === cuisine).length} Places
                      </p>
                    </div>
                  </div>

                  {selectedCategory === cuisine && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl -z-10"
                      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15), transparent)' }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
        </section>

        {/* Restaurants Section */}
        <section className="py-20 px-6 relative overflow-hidden" style={{ background: '#161520' }}>
          <div className="container mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-12"
            >
              <div className="relative">
                <h2 className="text-4xl font-bold" style={{ color: '#F5F0E8' }}>
                  Featured Restaurants
                  {selectedCategory && (
                    <motion.span
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3"
                      style={{ color: '#C9A84C' }}
                    >
                      • {selectedCategory}
                    </motion.span>
                  )}
                </h2>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "33%" }}
                  viewport={{ once: true }}
                  className="absolute -bottom-4 left-0 h-1 rounded-full"
                  style={{ background: '#C9A84C' }}
                />
                <p className="mt-6 text-lg" style={{ color: '#9B96A8' }}>
                  {filteredRestaurants.length} restaurants available
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRestaurants.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-16 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 mb-6" style={{ color: '#9B96A8' }}>
                    <FontAwesomeIcon icon={faUtensils} className="text-5xl" />
                  </div>
                  <h3 className="text-xl font-medium mb-2" style={{ color: '#F5F0E8' }}>No restaurants found</h3>
                  <p className="max-w-md mb-6" style={{ color: '#9B96A8' }}>
                    We couldn't find any restaurants matching your search criteria. Try adjusting your filters or search term.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("");
                      setSelectedLocation("");
                    }}
                    className="px-6 py-2 rounded-lg font-semibold transition-colors"
                    style={{ background: '#C9A84C', color: '#0C0B10' }}
                  >
                    Clear All Filters
                  </button>
                </motion.div>
              )}
              {limitedRestaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-500"
                  style={{ background: '#0C0B10', border: '1px solid #1E1D2A', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
                >
                  <div className="relative h-64 overflow-hidden">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10" />
                      {restaurant.images?.main ? (
                        <Image
                          src={restaurant.images.main}
                          alt={restaurant.name}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: '#1E1D2A' }}>
                          <FontAwesomeIcon
                            icon={faUtensils}
                            className="text-4xl"
                            style={{ color: '#9B96A8' }}
                          />
                        </div>
                      )}
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(restaurant);
                      }}
                      aria-label={isFavorite(restaurant._id) ? "Remove from favorites" : "Add to favorites"}
                      className="absolute top-4 right-4 z-20 p-3 rounded-full shadow-lg"
                      style={{ background: 'rgba(12,11,16,0.75)', backdropFilter: 'blur(8px)' }}
                    >
                      <FontAwesomeIcon
                        icon={isFavorite(restaurant._id) ? faSolidHeart : faRegularHeart}
                        className="text-xl"
                        style={{ color: isFavorite(restaurant._id) ? '#C9A84C' : '#9B96A8' }}
                      />
                    </motion.button>
                  </div>

                  {/* Restaurant Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4" style={{ color: '#F5F0E8' }}>{restaurant.name}</h3>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center" style={{ color: '#9B96A8' }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 mr-3" style={{ color: '#C9A84C' }} />
                        <span className="text-sm">{restaurant.location}</span>
                      </div>
                      <div className="flex items-center" style={{ color: '#9B96A8' }}>
                        <FontAwesomeIcon icon={faClock} className="w-4 mr-3" style={{ color: '#C9A84C' }} />
                        <span className="text-sm">{restaurant["opening-hours"]}</span>
                      </div>
                      <div className="flex items-center" style={{ color: '#9B96A8' }}>
                        <FontAwesomeIcon icon={faChair} className="w-4 mr-3" style={{ color: '#C9A84C' }} />
                        <span className="text-sm">{restaurant.availableSeats || "N/A"} seats available</span>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/restaurants/${restaurant._id}/floorplan`)}
                      className="w-full py-3 rounded-xl font-semibold transition-all duration-300"
                      style={{
                        background: '#C9A84C',
                        color: '#0C0B10',
                        boxShadow: '0 4px 16px rgba(201,168,76,0.2)'
                      }}
                    >
                      View Floor Plan & Reserve
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'rgba(201,168,76,0.05)' }} />
          <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'rgba(201,168,76,0.05)' }} />
        </section>
      </main>

      <Toast show={showToast} message={toastMessage} />

      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 rounded-full shadow-lg z-40 transition-opacity hover:opacity-80"
          style={{ background: '#C9A84C', color: '#0C0B10', boxShadow: '0 4px 20px rgba(201,168,76,0.35)' }}
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </motion.button>
      )}
    </>
  );
}
