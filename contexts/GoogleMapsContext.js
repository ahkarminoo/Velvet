"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const GoogleMapsContext = createContext(null);

export function GoogleMapsProvider({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google?.maps) {
        setIsReady(true);
      } else {
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };

    checkGoogleMapsLoaded();
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isReady }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === null) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
} 