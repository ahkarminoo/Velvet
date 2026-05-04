'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import RestaurantFloorPlan from '@/components/RestaurantFloorPlan';
import { FaMapMarkerAlt, FaClock, FaPhone, FaStar, FaHome, FaShare, FaBookmark, FaUtensils, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Image from 'next/image';
import PublicFloorPlan from '@/components/PublicFloorPlan';
import PublicFloorplanSelector from '@/components/PublicFloorplanSelector';
import { GoogleMap, Marker } from '@react-google-maps/api';
import ReviewSection from '@/components/ReviewSection';
import { MdRestaurantMenu } from 'react-icons/md';
import { RiImageAddLine } from 'react-icons/ri';

const DEFAULT_RESTAURANT_ID = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID || "68d548d7a11657653c2d49ec";
const LINE_LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID || "2007787204-zGYZn1ZE";

function toLatLngLiteral(coordinates) {
  if (!coordinates) return null;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  }

  const lat = Number(coordinates.lat ?? coordinates.latitude);
  const lng = Number(coordinates.lng ?? coordinates.lon ?? coordinates.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

function RestaurantFloorplanContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0);
  const router = useRouter();

  const prefilledDate = searchParams.get('date') || null;
  const prefilledTime = searchParams.get('time') || null;
  const prefilledEventId = searchParams.get('eventId') || null;
  
  // Get restaurant ID from URL params or LIFF query parameters
  const getRestaurantId = () => {
    // First try URL params
    if (params.id) {
      return params.id;
    }
    
    // Then try LIFF query parameters (when coming from LINE chatbot)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const restaurantIdParam = urlParams.get('restaurantId');
      if (restaurantIdParam) {
        return restaurantIdParam;
      }
    }
    
    // Fallback to default restaurant ID
    return DEFAULT_RESTAURANT_ID;
  };
  
  const restaurantId = getRestaurantId();
  const restaurantCoordinates = toLatLngLiteral(restaurant?.location?.coordinates);

  useEffect(() => {
    if (typeof window !== "undefined") {
      function startLiff() {
        window.liff.init({ liffId: LINE_LIFF_ID })
          .then(() => {
            if (window.liff.isInClient()) {
              // Use sessionStorage to prevent infinite login loop
              const loginAttempted = sessionStorage.getItem('liffLoginComplete');

              if (!loginAttempted) {
                if (window.liff.isLoggedIn()) {
                  window.liff.getProfile().then(profile => {
                    // Send to server for authentication
                    fetch("/api/line-liff-login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: profile.userId,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.user) {
                        // Store LINE user data in localStorage
                        localStorage.setItem('customerUser', JSON.stringify(data.user));
                        
                        // Trigger custom event to notify AuthContext
                        window.dispatchEvent(new CustomEvent('lineUserLogin', { detail: data.user }));
                        
                        // Set flag to prevent login loop
                        sessionStorage.setItem('liffLoginComplete', 'true');
                      } else {
                        sessionStorage.setItem('liffLoginComplete', 'true');
                        window.location.reload();
                      }
                    })
                    .catch(error => {
                      console.error("LIFF login error:", error);
                    });
                  }).catch(error => {
                    console.error("Error getting LIFF profile:", error);
                  });
                } else {
                  // If not logged into LINE, initiate login
                  window.liff.login();
                }
              }
            }
          })
          .catch(error => {
            console.error("LIFF init error:", error);
          });
      }

      if (!window.liff) {
        const script = document.createElement("script");
        script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.onload = startLiff;
        script.onerror = () => {
          // Try alternative CDN
          const altScript = document.createElement("script");
          altScript.src = "https://d.line-scdn.net/liff/edge/2/sdk.js";
          altScript.onload = startLiff;
          document.body.appendChild(altScript);
        };
        document.body.appendChild(script);
      } else {
        startLiff();
      }
    }

    // Restaurant and floorplan fetching logic
    const fetchRestaurantAndFloorplan = async () => {
      try {
        // Fast path: 3-minute local cache for public restaurant + floorplans
        const restaurantCacheKey = `restaurant_public_${restaurantId}`;
        const restaurantCacheTsKey = `restaurant_public_${restaurantId}_ts`;
        const staleMs = 3 * 60 * 1000;

        try {
          const cached = localStorage.getItem(restaurantCacheKey);
          const tsRaw = localStorage.getItem(restaurantCacheTsKey);
          const ts = tsRaw ? Number(tsRaw) : 0;
          const fresh = cached && ts && (Date.now() - ts) < staleMs;

          if (fresh) {
            const cachedRestaurant = JSON.parse(cached);
            setRestaurant(cachedRestaurant);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to read restaurant cache:', e);
        }

        const response = await fetch(`/api/restaurants/${restaurantId}/public-floorplan`);
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant');
        }
        
        const data = await response.json();
        setRestaurant(data);

        // Cache response and also cache each floorplan JSON by id
        try {
          localStorage.setItem(restaurantCacheKey, JSON.stringify(data));
          localStorage.setItem(restaurantCacheTsKey, String(Date.now()));

          if (Array.isArray(data?.allFloorplans)) {
            const now = Date.now();
            data.allFloorplans.forEach((fp) => {
              if (!fp?._id || !fp?.data) return;
              localStorage.setItem(`floorplan_${fp._id}`, JSON.stringify({ data: fp.data }));
              localStorage.setItem(`floorplan_${fp._id}_ts`, String(now));
            });
          }
        } catch (e) {
          console.warn('Failed to write caches:', e);
        }
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurantAndFloorplan();
    }
  }, [restaurantId]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: restaurant.restaurantName,
        text: `Check out ${restaurant.restaurantName} on our platform!`,
        url: window.location.href,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleGalleryNav = (direction) => {
    if (!restaurant?.images?.gallery?.length) return;
    setCurrentGalleryIndex((prev) => 
      direction === 'next' 
        ? (prev === restaurant.images.gallery.length - 1 ? 0 : prev + 1)
        : (prev === 0 ? restaurant.images.gallery.length - 1 : prev - 1)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C0B10' }}>
        <div className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(201,168,76,0.15)', borderTopColor: '#C9A84C' }} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#0C0B10' }}>
        <p className="text-2xl font-bold" style={{ color: '#F5F0E8' }}>Venue not found</p>
        <button onClick={() => router.back()}
          className="px-8 py-3 rounded-xl font-semibold text-sm"
          style={{ background: '#C9A84C', color: '#0C0B10' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0C0B10' }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(12,11,16,0.92)', borderColor: '#1E1D2A', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 transition-opacity hover:opacity-70" style={{ color: '#9B96A8' }}>
            <FaHome />
            <span className="text-sm font-medium">Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#C9A84C' }}>
              <span className="font-black text-sm" style={{ color: '#0C0B10' }}>V</span>
            </div>
            <span className="font-bold tracking-wide hidden sm:block" style={{ color: '#F5F0E8', fontFamily: 'serif' }}>Velvet</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm" style={{ color: '#9B96A8' }}>
              <FaStar style={{ color: '#C9A84C', fontSize: '12px' }} />
              <span>{restaurant.rating ? restaurant.rating.toFixed(1) : '—'}</span>
            </div>
            <button onClick={handleShare} className="p-2 rounded-xl transition-opacity hover:opacity-60" style={{ color: '#9B96A8' }}>
              <FaShare size={14} />
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: isSaved ? 'rgba(201,168,76,0.15)' : '#C9A84C', color: isSaved ? '#C9A84C' : '#0C0B10', border: isSaved ? '1px solid #C9A84C' : 'none' }}>
              <FaBookmark size={12} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Layout */}
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-57px)]">

        {/* Left sidebar */}
        <div className="w-full lg:w-[340px] flex-shrink-0 border-b lg:border-b-0 lg:border-r overflow-y-auto"
          style={{ background: '#161520', borderColor: '#1E1D2A' }}>

          {/* Venue header */}
          <div className="p-5 border-b" style={{ borderColor: '#1E1D2A' }}>
            {restaurant.images?.main && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden mb-4">
                <Image src={restaurant.images.main} alt={restaurant.restaurantName} fill className="object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,11,16,0.7), transparent)' }} />
              </div>
            )}
            <h1 className="text-xl font-black tracking-tight mb-1" style={{ color: '#F5F0E8', fontFamily: 'serif' }}>{restaurant.restaurantName}</h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#9B96A8' }}>
              <FaMapMarkerAlt style={{ color: '#C9A84C', fontSize: '12px' }} />
              <span className="truncate">{restaurant.location?.address || 'Location not set'}</span>
            </div>
            {restaurant.venueSettings?.dresscode && (
              <div className="mt-2 px-2 py-1 rounded-lg text-xs inline-block" style={{ background: 'rgba(201,168,76,0.08)', color: '#C9A84C' }}>
                Dress code: {restaurant.venueSettings.dresscode}
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* About */}
            {restaurant.description && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FaUtensils style={{ color: '#C9A84C', fontSize: '12px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>About</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#9B96A8' }}>{restaurant.description}</p>
              </div>
            )}

            {/* Hours */}
            {restaurant.openingHours && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FaClock style={{ color: '#C9A84C', fontSize: '12px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Hours</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(restaurant.openingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-xs">
                      <span style={{ color: '#9B96A8' }}>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      <span style={{ color: hours.isClosed ? '#EF4444' : '#F5F0E8' }}>
                        {hours.isClosed ? 'Closed' : `${hours.open} – ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            {restaurant.contactNumber && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-1">
                  <FaPhone style={{ color: '#C9A84C', fontSize: '12px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Contact</span>
                </div>
                <p className="text-sm" style={{ color: '#F5F0E8' }}>{restaurant.contactNumber}</p>
              </div>
            )}

            {/* Menu */}
            {restaurant.images?.menu?.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-3">
                  <MdRestaurantMenu style={{ color: '#C9A84C', fontSize: '14px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Menu</span>
                </div>
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2">
                  <Image src={restaurant.images.menu[currentMenuIndex]} alt="Menu" fill className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 340px" />
                  <div className="absolute inset-0 flex items-center justify-between p-2">
                    <button onClick={() => setCurrentMenuIndex(p => p === 0 ? restaurant.images.menu.length - 1 : p - 1)}
                      className="p-1.5 rounded-full" style={{ background: 'rgba(12,11,16,0.7)' }}>
                      <FaChevronLeft style={{ color: '#F5F0E8', fontSize: '12px' }} />
                    </button>
                    <button onClick={() => setCurrentMenuIndex(p => p === restaurant.images.menu.length - 1 ? 0 : p + 1)}
                      className="p-1.5 rounded-full" style={{ background: 'rgba(12,11,16,0.7)' }}>
                      <FaChevronRight style={{ color: '#F5F0E8', fontSize: '12px' }} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'rgba(12,11,16,0.7)', color: '#9B96A8' }}>
                    {currentMenuIndex + 1}/{restaurant.images.menu.length}
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {restaurant.images.menu.map((url, i) => (
                    <button key={i} onClick={() => setCurrentMenuIndex(i)}
                      className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ outline: currentMenuIndex === i ? '2px solid #C9A84C' : 'none', outlineOffset: '1px' }}>
                      <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {restaurant.images?.gallery?.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-3">
                  <RiImageAddLine style={{ color: '#C9A84C', fontSize: '14px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Gallery</span>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                  <Image src={restaurant.images.gallery[currentGalleryIndex]} alt="Gallery" fill className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 340px" />
                  <div className="absolute inset-0 flex items-center justify-between p-2">
                    <button onClick={() => handleGalleryNav('prev')} className="p-1.5 rounded-full" style={{ background: 'rgba(12,11,16,0.7)' }}>
                      <FaChevronLeft style={{ color: '#F5F0E8', fontSize: '12px' }} />
                    </button>
                    <button onClick={() => handleGalleryNav('next')} className="p-1.5 rounded-full" style={{ background: 'rgba(12,11,16,0.7)' }}>
                      <FaChevronRight style={{ color: '#F5F0E8', fontSize: '12px' }} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {restaurant.images.gallery.map((url, i) => (
                    <button key={i} onClick={() => setCurrentGalleryIndex(i)}
                      className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ outline: currentGalleryIndex === i ? '2px solid #C9A84C' : 'none', outlineOffset: '1px' }}>
                      <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {restaurantCoordinates && (
              <div className="p-4 rounded-xl" style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FaMapMarkerAlt style={{ color: '#C9A84C', fontSize: '12px' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Location</span>
                </div>
                <p className="text-xs mb-3" style={{ color: '#9B96A8' }}>{restaurant.location.address}</p>
                <div className="h-40 rounded-xl overflow-hidden">
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={restaurantCoordinates} zoom={15}>
                    <Marker position={restaurantCoordinates} />
                  </GoogleMap>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main panel — floorplan + reviews */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#0C0B10' }}>
          {/* Event banner — only shown when arriving from an event page */}
          {prefilledDate && prefilledTime && (
            <div className="mx-4 lg:mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <span style={{ color: '#C9A84C', fontSize: 18 }}>🎟</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: '#C9A84C' }}>Booking for Event Night</p>
                <p className="text-xs mt-0.5" style={{ color: '#9B96A8' }}>
                  Date and time pre-selected from the event. Pick your table below.
                </p>
              </div>
              <button
                onClick={() => window.history.back()}
                className="text-xs flex-shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: '#9B96A8' }}
              >
                ← Back to event
              </button>
            </div>
          )}

          {/* Floorplan */}
          <div className="m-4 lg:m-6 rounded-2xl overflow-hidden" style={{ border: '1px solid #1E1D2A' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1E1D2A', background: '#161520' }}>
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>Floor Plan</h2>
              <span className="text-xs" style={{ color: '#9B96A8' }}>
                {prefilledDate ? `${prefilledDate} · ${prefilledTime}` : 'Click a table to book'}
              </span>
            </div>
            <div style={{ background: '#0C0B10' }}>
              <PublicFloorplanSelector
                restaurant={restaurant}
                defaultDate={prefilledDate}
                defaultTime={prefilledTime}
                defaultEventId={prefilledEventId}
              />
            </div>
          </div>

          {/* Reviews */}
          <div className="mx-4 lg:mx-6 mb-6 p-5 rounded-2xl" style={{ background: '#161520', border: '1px solid #1E1D2A' }}>
            <ReviewSection restaurantId={restaurantId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantFloorplanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C0B10' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(201,168,76,0.2)', borderTop: '2px solid #C9A84C' }} />
      </div>
    }>
      <RestaurantFloorplanContent />
    </Suspense>
  );
}
