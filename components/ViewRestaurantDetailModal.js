import React from 'react';

const ViewRestaurantDetailModal = ({ restaurant, onClose }) => {
  if (!restaurant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg w-1/2">
        <h2 className="text-2xl font-semibold mb-4">{restaurant.name}</h2>
        <p className="text-lg text-gray-700 mb-4">{restaurant.location}</p>
        <p className="text-md text-gray-600 mb-4">{restaurant.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {restaurant.categories.map((category, index) => (
            <span key={index} className="bg-[#F4A261] text-white text-xs font-medium px-2 py-1 rounded-full">
              {category}
            </span>
          ))}
        </div>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewRestaurantDetailModal;
