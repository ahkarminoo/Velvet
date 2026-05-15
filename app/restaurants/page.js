"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // Track selected restaurant
  const [isModalOpen, setIsModalOpen] = useState(false); // Track modal state

  useEffect(() => {
    fetch("/data/restaurants.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const sortedRestaurants = data.restaurants.sort((a, b) => b.rating - a.rating);
        setRestaurants(sortedRestaurants);
        setFilteredRestaurants(sortedRestaurants);

        // Extract unique categories from the restaurants
        const uniqueCategories = new Set();
        sortedRestaurants.forEach((restaurant) => {
          restaurant.categories.forEach((category) => uniqueCategories.add(category));
        });
        setCategories(["All", ...Array.from(uniqueCategories)]);
      })
      .catch((error) => {
        console.error("Error fetching restaurant data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filter restaurants by selected category
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === "All") {
      setFilteredRestaurants(restaurants);
    } else {
      const filtered = restaurants.filter((restaurant) =>
        restaurant.categories.includes(category)
      );
      setFilteredRestaurants(filtered);
    }
  };

  // Open modal with selected restaurant details
  const openModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setSelectedRestaurant(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <Navbar />
      <div className="bg-velvet-black min-h-screen flex flex-col lg:flex-row pt-16 sm:pt-20">
        {/* Sidebar — full width on mobile, side on desktop */}
        <div className="w-full lg:w-1/4 lg:max-w-xs bg-velvet-surface lg:border-r border-b lg:border-b-0 border-velvet-border shadow-lg p-4 sm:p-6 flex flex-col gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-velvet-cream">Categories</h2>
          <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
            {categories.map((category) => (
              <li
                key={category}
                className={`cursor-pointer text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 lg:flex-shrink ${
                  selectedCategory === category
                    ? "bg-velvet-gold text-velvet-black"
                    : "bg-velvet-black/40 text-velvet-cream hover:bg-velvet-gold/10"
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </li>
            ))}
          </ul>
          <button
            className="hidden lg:flex items-center text-sm font-medium text-velvet-gold hover:text-velvet-gold-light transition-colors mt-2"
            onClick={() => router.push("/")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5 mr-2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>

        {/* Main Content */}
        <div className="w-full lg:w-3/4 p-4 sm:p-6 lg:p-8 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-left text-velvet-cream mb-5 sm:mb-8">
            {selectedCategory === "All"
              ? "All Restaurants (Sorted by Rating)"
              : `Restaurants in ${selectedCategory}`}
          </h1>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg font-medium text-velvet-muted">Loading restaurants...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="w-full h-auto bg-velvet-surface border border-velvet-border shadow-lg rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 hover:border-velvet-gold/40"
                >
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-36 object-cover rounded-t-lg"
                  />
                  <div className="p-4">
                    <h2 className="text-lg text-velvet-cream font-semibold mb-2">{restaurant.name}</h2>
                    <p className="text-velvet-muted text-sm mb-2">{restaurant.location}</p>
                    <p className="text-velvet-muted text-sm">
                      <strong className="text-velvet-cream">Rating:</strong> {restaurant.rating} ⭐
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {restaurant.categories.map((category, index) => (
                        <span
                          key={index}
                          className="bg-velvet-gold text-velvet-black text-xs font-medium px-2 py-1 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <button
                      className="mt-4 text-sm font-medium text-velvet-gold hover:text-velvet-gold-light transition-colors"
                      onClick={() => openModal(restaurant)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 modal-backdrop sm:p-4">
        <div className="bg-velvet-surface border border-velvet-border p-5 sm:p-8 rounded-t-2xl sm:rounded-2xl shadow-2xl relative w-full sm:max-w-lg overflow-y-auto max-h-[92vh] sm:max-h-none"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.25rem)' }}>
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-3 right-3 text-velvet-muted hover:text-velvet-cream text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-velvet-black/40 transition"
          >
            &times;
          </button>

          {/* Image */}
          <img
            src={selectedRestaurant.image}
            alt={selectedRestaurant.name}
            className="w-full h-64 object-cover rounded-lg mb-4"
          />

          {/* Restaurant Details */}
          <h3 className="text-2xl font-semibold mb-4 text-velvet-cream">{selectedRestaurant.name}</h3>
          <p className="text-velvet-cream/80 mb-2">{selectedRestaurant.description}</p>
          <p className="text-velvet-muted text-sm mb-2">
            <strong className="text-velvet-cream">Rating:</strong> {selectedRestaurant.rating} ⭐
          </p>
          <p className="text-velvet-muted text-sm mb-2">
            <strong className="text-velvet-cream">Address:</strong> {selectedRestaurant["detail-address"]}
          </p>
          <p className="text-velvet-muted text-sm mb-2">
            <strong className="text-velvet-cream">Opening Hours:</strong> {selectedRestaurant["opening-hours"]}
          </p>
          <p className="text-velvet-muted text-sm">
            <strong className="text-velvet-cream">Price Range:</strong> {selectedRestaurant["price-range-per-person"]}
          </p>
          <button className="bg-velvet-gold text-velvet-black rounded-xl hover:bg-velvet-gold-light transition-all font-bold py-2 px-6 mt-4">Book Now</button>
        </div>
      </div>
      )}
    </>
  );
}
