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
      <div className="bg-[#F3EDE5] min-h-screen flex">
        {/* Sidebar */}
        <div className="w-1/4 bg-white shadow-lg p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-black mb-4">Categories</h2>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li
                key={category}
                className={`cursor-pointer text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? "bg-[#F4A261] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </li>
            ))}
          </ul>
          <button
            className="mb-6 flex items-center text-sm font-medium text-[#F4A261] hover:text-[#e76f51] transition-colors mt-4"
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
        <div className="w-3/4 p-8">
          <h1 className="text-3xl font-semibold text-left text-[#2E2D2B] mb-8">
            {selectedCategory === "All"
              ? "All Restaurants (Sorted by Rating)"
              : `Restaurants in ${selectedCategory}`}
          </h1>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg font-medium text-gray-600">Loading restaurants...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="w-full h-auto bg-white shadow-lg rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-36 object-cover rounded-t-lg"
                  />
                  <div className="p-4">
                    <h2 className="text-lg text-black font-semibold mb-2">{restaurant.name}</h2>
                    <p className="text-gray-600 text-sm mb-2">{restaurant.location}</p>
                    <p className="text-gray-500 text-sm">
                      <strong>Rating:</strong> {restaurant.rating} ⭐
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {restaurant.categories.map((category, index) => (
                        <span
                          key={index}
                          className="bg-[#F4A261] text-white text-xs font-medium px-2 py-1 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <button
                      className="mt-4 text-sm font-medium text-[#F4A261] hover:text-[#e76f51] transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 modal-backdrop">
        <div className="bg-white p-8 rounded-lg shadow-lg relative max-w-lg w-full">
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl font-bold"
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
          <h3 className="text-2xl font-semibold mb-4 text-black">{selectedRestaurant.name}</h3>
          <p className="text-gray-700 mb-2">{selectedRestaurant.description}</p>
          <p className="text-gray-500 text-sm mb-2">
            <strong>Rating:</strong> {selectedRestaurant.rating} ⭐
          </p>
          <p className="text-gray-500 text-sm mb-2">
            <strong>Address:</strong> {selectedRestaurant["detail-address"]}
          </p>
          <p className="text-gray-500 text-sm mb-2">
            <strong>Opening Hours:</strong> {selectedRestaurant["opening-hours"]}
          </p>
          <p className="text-gray-500 text-sm">
            <strong>Price Range:</strong> {selectedRestaurant["price-range-per-person"]}
          </p>
          <button className="bg-[#F4A261] rounded-xl w-1/4 hover:bg-[#F4A261] hover:opacity-80 transition-all font-bold py-2 px-2 mt-3">Book Now</button>
        </div>
      </div>
      )}
    </>
  );
}
