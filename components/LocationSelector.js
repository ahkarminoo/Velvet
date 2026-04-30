"use client";

import { useState, useEffect } from 'react';

export default function LocationSelector({ onLocationSelect, initialLocation }) {
  const [searchBox, setSearchBox] = useState(null);
  const [marker, setMarker] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (window.google && !mapLoaded) {
      initializeMap();
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (initialLocation?.address) {
      setInputValue(initialLocation.address);
      setMarker(initialLocation.coordinates);
    }
  }, [initialLocation]);

  const initializeMap = () => {
    const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
      center: marker || { lat: 1.3521, lng: 103.8198 },
      zoom: marker ? 15 : 11,
    });

    const searchBoxInstance = new window.google.maps.places.SearchBox(
      document.getElementById('location-search')
    );

    mapInstance.addListener('bounds_changed', () => {
      searchBoxInstance.setBounds(mapInstance.getBounds());
    });

    searchBoxInstance.addListener('places_changed', () => {
      const places = searchBoxInstance.getPlaces();
      if (places.length === 0) return;

      const place = places[0];
      if (!place.geometry) return;

      const location = {
        address: place.formatted_address,
        placeId: place.place_id,
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      };

      setMarker(location.coordinates);
      setInputValue(location.address);
      onLocationSelect(location);

      mapInstance.setCenter(location.coordinates);
      mapInstance.setZoom(15);
    });

    if (marker) {
      new window.google.maps.Marker({
        position: marker,
        map: mapInstance,
      });
    }

    setMap(mapInstance);
    setMapLoaded(true);
  };

  const handleMapLoad = (map) => {
    if (!map) {
      setMapError(true);
      console.error('Error loading Google Maps');
      return;
    }
    // ... rest of your map load logic
  };

  return (
    <div className="space-y-4">
      <input
        id="location-search"
        type="text"
        placeholder="Search for a location"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#FF4F18] focus:ring-1 focus:ring-[#FF4F18] outline-none transition-all duration-200"
      />
      {mapError ? (
        <div className="text-red-500 p-4">
          Error loading map. Please try again later.
        </div>
      ) : (
        <div 
          id="map" 
          className="w-full h-[300px] rounded-lg"
        />
      )}
    </div>
  );
} 