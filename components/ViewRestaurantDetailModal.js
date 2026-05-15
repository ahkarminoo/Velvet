import React from 'react';

const ViewRestaurantDetailModal = ({ restaurant, onClose }) => {
  if (!restaurant) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-velvet-surface border border-velvet-border p-8 rounded-2xl shadow-2xl w-1/2">
        <h2 className="text-2xl font-semibold mb-4 text-velvet-cream">{restaurant.name}</h2>
        <p className="text-lg text-velvet-cream/80 mb-4">{restaurant.location}</p>
        <p className="text-md text-velvet-muted mb-4">{restaurant.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {restaurant.categories.map((category, index) => (
            <span key={index} className="bg-velvet-gold text-velvet-black text-xs font-medium px-2 py-1 rounded-full">
              {category}
            </span>
          ))}
        </div>
        <button
          onClick={onClose}
          className="bg-velvet-gold text-velvet-black px-6 py-2 rounded-md hover:bg-velvet-gold-light transition-all font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewRestaurantDetailModal;
