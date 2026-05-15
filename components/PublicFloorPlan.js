'use client';

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createScene, createFloor } from '@/scripts/floor';
import { chair, table, roundTable, sofa, create2SeaterTable, create8SeaterTable, plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox } from '@/scripts/asset';
import { DoorManager } from '@/scripts/managers/DoorManager';
import { WindowManager } from '@/scripts/managers/WindowManager';
import { createSpotlightBeams } from '@/lib/spotlightBeams';
import '@/css/booking.css';
import '@/css/loading.css';
import { toast } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import RestaurantReservation from '@/components/RestaurantReservation';
import Panorama360Modal from '@/components/Panorama360Modal';
import gsap from 'gsap';
import { motion, AnimatePresence } from "framer-motion";
import { performanceMonitor, measurePerformance } from '@/utils/performance';
import { handleSceneError } from '@/utils/errorHandler';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuth } from '@/context/AuthContext';
import '@/css/loading.css';
import PaymentDialog from './PaymentDialog';

// New Booking Confirmation Dialog Component
function BookingConfirmationDialog({ bookingDetails, onClose, onConfirm }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    
    // Add a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onConfirm();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-[95vw] sm:max-w-md mx-auto overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col my-auto rounded-2xl"
        style={{ background: '#15130f', border: '1px solid #2a241b', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#2a241b' }}>
          <div>
            <h3 className="text-lg font-black" style={{ color: '#f5efe3', fontFamily: 'serif' }}>Confirm Booking</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8b847a' }}>Review your reservation details</p>
          </div>
          <button onClick={onClose} disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-lg font-light"
            style={{ color: '#8b847a', background: '#2a241b' }}>×</button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {[
            { emoji: '📅', label: 'Date', value: formatDate(bookingDetails.date) },
            { emoji: '🕐', label: 'Time', value: bookingDetails.time, sub: bookingDetails.durationMinutes ? `${bookingDetails.durationMinutes} min` : null },
            { emoji: '🪑', label: 'Table', value: bookingDetails.tableName || bookingDetails.tableId },
            { emoji: '👥', label: 'Guests', value: bookingDetails.guestCount },
          ].map(({ emoji, label, value, sub }) => (
            <div key={label} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-xs" style={{ color: '#8b847a' }}>{label}</p>
                <p className="font-semibold text-sm" style={{ color: '#f5efe3' }}>{value}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: '#8b847a' }}>{sub}</p>}
              </div>
            </div>
          ))}

          <div className="p-4 rounded-xl" style={{ background: 'rgba(201, 169, 97, 0.06)', border: '1px solid rgba(201, 169, 97, 0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#c9a961' }}>Pending Confirmation</p>
            <p className="text-xs leading-relaxed" style={{ color: '#8b847a' }}>Your booking will be submitted and is pending venue confirmation. You'll be notified once approved.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-4 border-t flex gap-3 flex-shrink-0" style={{ borderColor: '#2a241b' }}>
          <button onClick={onClose} disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-all"
            style={{ background: '#2a241b', color: '#8b847a', border: '1px solid #2a241b' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: '#c9a961', color: '#0a0908' }}>
            {isLoading ? (
              <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(10, 9, 8, 0.2)', borderTopColor: '#0a0908' }} /><span>Confirming...</span></>
            ) : (
              <span>Confirm Booking</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PublicFloorPlan({ floorplanData, floorplanId, restaurantId, allFloorplans = [], defaultDate, defaultTime, defaultEventId }) {
  // Clean up any existing tooltips on component mount
  useEffect(() => {
    const cleanupExistingTooltips = () => {
      const existingTooltips = document.querySelectorAll('.table-hover-tooltip');
      existingTooltips.forEach(tooltip => {
        if (document.body.contains(tooltip)) {
          document.body.removeChild(tooltip);
        }
      });
    };
    
    cleanupExistingTooltips();
  }, []);

  // Cleanup when floorplanId changes to prevent object carryover
  useEffect(() => {
    return () => {
      // Cleanup on unmount or when floorplanId changes
      const existingTooltips = document.querySelectorAll('.table-hover-tooltip, .restaurant-table-label');
      existingTooltips.forEach(tooltip => {
        if (document.body.contains(tooltip)) {
          document.body.removeChild(tooltip);
        }
      });
    };
  }, [floorplanId]);

  const containerRef = useRef(null);
  const sceneHostRef = useRef(null);
  const bookingPanelRef = useRef(null);
  const floorplanShellRef = useRef(null);
  const timeSlotsRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const animateFnRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const doorManagerRef = useRef(null);
  const windowManagerRef = useRef(null);
  const beamsRef = useRef(null);
  const clockRef = useRef(null);
  const handleClickRef = useRef(null);
  const selectedTableRef = useRef(null);
  const isTouchRef = useRef(false);
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [mobileSelectedTableName, setMobileSelectedTableName] = useState(null);
  const availableTablesRef = useRef(new Set());
  const [selectedDate, setSelectedDate] = useState(() => {
    if (defaultDate) return defaultDate;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState(defaultTime || '');
  const [selectedDuration, setSelectedDuration] = useState(120);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [availableTables, setAvailableTables] = useState(new Set());
  const [unavailableByTable, setUnavailableByTable] = useState({});
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [zones, setZones] = useState([]); // zone pricing/color map
  const tableZoneMapRef = useRef({});
  
  const [localFloorplanData, setLocalFloorplanData] = useState(floorplanData);
  const [localFloorplanId, setLocalFloorplanId] = useState(floorplanId);
  const [venueEvents, setVenueEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  // panorama modal — when set, the Panorama360Modal opens with this table's data
  const [panoramaTable, setPanoramaTable] = useState(null); // tableUserData object or null
  // 360° badge overlay (toggleable per-table buttons that float over tables with realView)
  const [show360Badges, setShow360Badges] = useState(false);
  const badge360sRef = useRef([]); // [{el, tableObject}]

  // Cache floorplan JSON (non-sensitive) for fast revisits
  useEffect(() => {
    try {
      if (!floorplanId || !floorplanData) return;
      localStorage.setItem(`floorplan_${floorplanId}`, JSON.stringify({ data: floorplanData }));
      localStorage.setItem(`floorplan_${floorplanId}_ts`, String(Date.now()));
    } catch (e) {
      // Best-effort cache only
      console.warn('Failed to write floorplan cache:', e);
    }
  }, [floorplanId, floorplanData]);

  // Keep ref in sync with state for use inside closures (like click handler)
  useEffect(() => {
    availableTablesRef.current = availableTables;
  }, [availableTables]);

  // Detect touch device once on mount
  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
  }, []);

  // Drive red reserved beams from availableTables / date / time
  useEffect(() => {
    const beams = beamsRef.current;
    const scene = sceneRef.current;
    if (!beams || !scene) return;

    const tableMap = new Map();
    scene.traverse((obj) => {
      if (obj.userData?.isTable) {
        const id = obj.userData.objectId || obj.userData.friendlyId;
        if (id) tableMap.set(id, obj);
      }
    });

    // No date/time chosen OR availability data not yet fetched → no red beams.
    // Empty availableTables means "we don't know yet" (matches the existing
    // isBooked guard at line ~1138), NOT "everything is reserved".
    if (!selectedDate || !selectedTime || availableTables.size === 0) {
      beams.setReservedTables(tableMap, []);
      return;
    }

    const reservedIds = [];
    for (const id of tableMap.keys()) {
      if (!availableTables.has(id)) reservedIds.push(id);
    }
    beams.setReservedTables(tableMap, reservedIds);
  }, [availableTables, selectedDate, selectedTime]);

  // ── Fetch events for this venue ─────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/venues/${restaurantId}/events?public=true`);
        if (res.ok) {
          const data = await res.json();
          setVenueEvents(data.events || []);
        }
      } catch (e) {
        console.warn('Could not fetch events:', e);
      }
    };
    fetchEvents();
  }, [restaurantId]);

  // ── Check if selected date has an event and swap floorplan ─────────────────
  useEffect(() => {
    if (!selectedDate && !defaultEventId) return;

    // Prefer direct event ID lookup (passed from event page) over date-based matching
    const eventForDate = defaultEventId
      ? venueEvents.find(ev => ev._id?.toString() === defaultEventId)
      : venueEvents.find(ev => {
          const evDate = new Date(ev.date);
          // Compare against local-date string to handle timezone correctly
          const localDateStr = evDate.getFullYear() + '-' +
            String(evDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(evDate.getDate()).padStart(2, '0');
          return localDateStr === selectedDate;
        });

    setActiveEvent(eventForDate || null);

    if (eventForDate && eventForDate.floorplanIds?.length > 0) {
      const raw = eventForDate.floorplanIds[0];
      const targetId = (raw?._id || raw).toString();

      console.log('[FloorplanSwap] event found:', eventForDate.name, '| targetId:', targetId, '| localFloorplanId:', localFloorplanId);
      console.log('[FloorplanSwap] allFloorplans ids:', allFloorplans.map(fp => fp._id?.toString()));

      if (targetId === localFloorplanId?.toString()) {
        console.log('[FloorplanSwap] already showing event floorplan, no swap needed');
        return;
      }

      // Look up full floorplan data from the allFloorplans prop
      const match = allFloorplans.find(fp => fp._id?.toString() === targetId);
      if (match?.data) {
        console.log('[FloorplanSwap] swapping to:', match.name);
        setLocalFloorplanData(match.data);
        setLocalFloorplanId(targetId);
      } else {
        // Fallback: fetch from public-floorplan API (restaurant data includes all floorplans)
        console.warn('[FloorplanSwap] floorplan not in allFloorplans, fetching from API...');
        fetch(`/api/restaurants/${restaurantId}/public-floorplan`)
          .then(r => r.json())
          .then(data => {
            const fp = (data.allFloorplans || []).find(f => f._id?.toString() === targetId);
            if (fp?.data) {
              console.log('[FloorplanSwap] fallback found:', fp.name);
              setLocalFloorplanData(fp.data);
              setLocalFloorplanId(targetId);
            } else {
              console.warn('[FloorplanSwap] floorplan', targetId, 'not found in venue');
            }
          })
          .catch(e => console.warn('[FloorplanSwap] fallback fetch failed', e));
      }
    } else {
      console.log('[FloorplanSwap] event has no floorplanIds:', eventForDate?.name, eventForDate?.floorplanIds);
      // No event for this date — revert to the default floorplan
      if (localFloorplanId !== floorplanId) {
        setLocalFloorplanData(floorplanData);
        setLocalFloorplanId(floorplanId);
      }
    }
  }, [selectedDate, defaultEventId, venueEvents, floorplanData, floorplanId, allFloorplans, restaurantId]); // exclude localFloorplanId to prevent loops

  const durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Helper function to get the appropriate auth token
  const getAuthToken = async () => {
    try {
      return await lineAuth.getAuthToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadingOverlayRef = useRef(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const firebaseAuth = useFirebaseAuth(); // Firebase auth
  const lineAuth = useAuth(); // LINE auth from AuthContext
  const [authLoadingOverride, setAuthLoadingOverride] = useState(false);
  
  // Combine both auth states
  const userProfile = firebaseAuth.userProfile || lineAuth.user;
  const isAuthenticated = firebaseAuth.isAuthenticated || !!lineAuth.user;
  const authLoading = firebaseAuth.loading || lineAuth.loading;
  
  // Debug auth state changes
  useEffect(() => {
    console.log('🔍 PublicFloorPlan auth state updated:', {
      timestamp: new Date().toISOString(),
      firebaseAuth: {
        loading: firebaseAuth.loading,
        isAuthenticated: firebaseAuth.isAuthenticated,
        hasProfile: !!firebaseAuth.userProfile,
        profileData: firebaseAuth.userProfile ? {
          uid: firebaseAuth.userProfile.uid || firebaseAuth.userProfile.firebaseUid,
          email: firebaseAuth.userProfile.email
        } : null
      },
      lineAuth: {
        loading: lineAuth.loading,
        hasUser: !!lineAuth.user,
        isLineUser: lineAuth.user?.isLineUser,
        userData: lineAuth.user ? {
          id: lineAuth.user.id,
          lineUserId: lineAuth.user.lineUserId,
          email: lineAuth.user.email,
          firstName: lineAuth.user.firstName
        } : null
      },
      combined: {
        authLoading,
        isAuthenticated,
        hasUserProfile: !!userProfile,
        userProfileId: userProfile?.firebaseUid || userProfile?.uid || userProfile?.lineUserId || 'none',
        userType: userProfile?.isLineUser ? 'LINE' : userProfile ? 'Firebase' : 'none'
      }
    });
  }, [firebaseAuth.loading, firebaseAuth.isAuthenticated, firebaseAuth.userProfile, lineAuth.loading, lineAuth.user, authLoading, isAuthenticated, userProfile]);

  // Log initial mount state
  useEffect(() => {
    console.log('🎯 PublicFloorPlan mounted with initial auth state:', initialAuthSnapshotRef.current);
  }, []);


  // Override loading state after 3 seconds to prevent permanent blocking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn('🚨 PublicFloorPlan: Overriding auth loading after 3 seconds');
        setAuthLoadingOverride(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [authLoading]);

  const dateRef = useRef(selectedDate);
  const timeRef = useRef(selectedTime);
  const unavailableByTableRef = useRef(unavailableByTable);
  const initialAuthSnapshotRef = useRef({
    authLoading,
    isAuthenticated,
    hasUserProfile: !!userProfile
  });

  // Skip asset preloading and go straight to 3D scene loading for better UX
  useEffect(() => {
    // Set preload progress to 100 immediately to skip the basic loading screen
    setPreloadProgress(100);
    // Ensure scene loading starts immediately
    setSceneLoaded(false);
  }, []);

  useEffect(() => {
    dateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    timeRef.current = selectedTime;
  }, [selectedTime]);

  useEffect(() => {
    unavailableByTableRef.current = unavailableByTable;
  }, [unavailableByTable]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('PublicFloorPlan useEffect triggered with:', {
        containerRef: !!containerRef.current,
        sceneHostRef: !!sceneHostRef.current,
        floorplanData: !!localFloorplanData,
        floorplanDataObjects: localFloorplanData?.objects?.length,
        containerDimensions: containerRef.current ? {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        } : null
      });
    }

    if (!containerRef.current || !sceneHostRef.current || !localFloorplanData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Missing required refs or data, skipping initialization', {
          containerRef: !!containerRef.current,
          sceneHostRef: !!sceneHostRef.current,
          floorplanData: !!localFloorplanData,
          floorplanDataObjects: localFloorplanData?.objects?.length
        });
      }
      return;
    }

    // Start the exciting 3D scene loading immediately
    console.log('Starting optimized 3D scene loading!');

    // Cleanup function
    const cleanup = () => {
      // Clean up table labels
      const existingLabels = document.querySelectorAll('.table-hover-tooltip');
      existingLabels.forEach(label => {
        if (document.body.contains(label)) {
          document.body.removeChild(label);
        }
      });

      // Dispose spotlight beams before the scene is torn down
      if (beamsRef.current) {
        try { beamsRef.current.dispose(); } catch (e) { /* scene may already be gone */ }
        beamsRef.current = null;
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Dispose of Three.js objects
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        
        // Clear the scene
        sceneRef.current.clear();
      }

      // Dispose renderer
      const rendererElement = rendererRef.current?.domElement;
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      
      // Remove imperatively mounted nodes only
      if (loadingOverlayRef.current && sceneHostRef.current?.contains(loadingOverlayRef.current)) {
        sceneHostRef.current.removeChild(loadingOverlayRef.current);
      }
      loadingOverlayRef.current = null;

      if (rendererElement && sceneHostRef.current?.contains(rendererElement)) {
        sceneHostRef.current.removeChild(rendererElement);
      }
    };

    // Add context loss handlers - MOVED BEFORE initScene
    const handleContextLost = (event) => {
      event.preventDefault();
      console.warn('WebGL context lost. Attempting to restore...');
      cancelAnimationFrame(animationFrameRef.current);
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored. Reinitializing scene...');
      initScene();
    };

    const initScene = async () => {
      try {
        console.log('Starting optimized scene initialization');
        const startTime = performance.now();
        
        cleanup();

        // Start performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
          performanceMonitor.start();
        }

        // Loading overlay removed: placeholders render immediately
        const updateLoadingProgress = () => {};

        // Initialize Three.js scene
        console.log('Creating WebGL renderer');
        updateLoadingProgress('Setting up 3D environment...', 10);

        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          powerPreference: "high-performance",
          alpha: true
        });
        
        rendererRef.current = renderer;

        // Add context loss handling
        renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
        renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

        console.log('Setting up renderer properties');
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        renderer.setSize(containerWidth, containerHeight);
        
        // Conditional shadow settings based on environment
        if (process.env.NODE_ENV === 'production') {
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        } else {
          renderer.shadowMap.enabled = false;
        }
        
        sceneHostRef.current.appendChild(renderer.domElement);

        // Scene Initialization
        console.log('Creating scene');
        updateLoadingProgress('Creating 3D scene...', 20);

        const scene = createScene();
        // Premium charcoal palette with a subtle wine undertone. The wine
        // reads as warmth/polish, not as the dominant color, so the gold
        // and red spotlight beams stay visually dominant.
        scene.background = new THREE.Color(0x100A0E);
        sceneRef.current = scene;

        console.log('Setting up lights');
        updateLoadingProgress('Setting up lighting...', 30);

        // Quiet warm ambient so unlit corners aren't black.
        const ambientLight = new THREE.AmbientLight(0xd6c2a0, 0.55);
        scene.add(ambientLight);

        // Replaced the old (5,10,5) DirectionalLight (whose lit-side appeared
        // to follow the camera as the room rotated). This is a wide SpotLight
        // directly above the floorplan, pointing straight down — it stays put
        // when the camera moves, and its cone is wide enough to bathe the
        // whole 20×20 floor like a venue stage rig.
        const directionalLight = new THREE.SpotLight(
          0xfff0d8,         // warm cream
          11,               // intensity — punchy stage-light brightness
          90,               // distance reaches the corners
          Math.PI / 2.05,   // angle ~87° — near-max, covers the whole room
          0.9,              // very soft cone edge, no visible outline
          0.45              // gentle falloff — corners still bright
        );
        directionalLight.position.set(0, 28, 0);
        directionalLight.target.position.set(0, 0, 0);

        if (process.env.NODE_ENV === 'production') {
          directionalLight.castShadow = true;
          directionalLight.shadow.mapSize.width = 1024;
          directionalLight.shadow.mapSize.height = 1024;
        } else {
          directionalLight.castShadow = false;
        }

        scene.add(directionalLight);
        scene.add(directionalLight.target);

        console.log('Setting up camera');
        updateLoadingProgress('Configuring camera...', 40);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          75,
          containerWidth / containerHeight,
          0.1,
          1000
        );
        camera.position.set(0, 10, 10);

        console.log('Setting up controls');
        updateLoadingProgress('Setting up controls...', 50);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minDistance = 5;
        controls.maxDistance = 20;

        cameraRef.current = camera;
        controlsRef.current = controls;

        // Add floor
        console.log('Adding floor');
        updateLoadingProgress('Creating floor plan...', 60);

        const floor = createFloor(20, 20, 2);
        // Charcoal with a hint of wine. Specular set to 0 so the floor doesn't
        // have a camera-following "shiny spot" hot-spot — the whole floor reads
        // as uniformly lit under the overhead spotlight.
        if (floor.material) {
          floor.material.color.setHex(0x1F1820);
          floor.material.shininess = 0;
          floor.material.specular = new THREE.Color(0x000000);
          floor.material.needsUpdate = true;
        }
        floor.traverse((child) => {
          if (child.isLineSegments && child.material) {
            child.material.color.setHex(0x4A3A28);
            child.material.opacity = 0.32;
            child.material.transparent = true;
            child.material.needsUpdate = true;
          }
        });
        scene.add(floor);

        // Initialize managers
        console.log('Initializing managers');
        doorManagerRef.current = new DoorManager(scene, { walls: [] }, renderer);
        windowManagerRef.current = new WindowManager(scene, { walls: [] }, renderer);
        beamsRef.current = createSpotlightBeams({ scene });
        clockRef.current = new THREE.Clock();

        // Process floorplan data with optimized progressive loading
        if (localFloorplanData.objects) {
          console.log('Processing floorplan data with', localFloorplanData.objects.length, 'objects');
          const wallMap = new Map();

          // Create walls (fast, no loading needed)
          console.log("Loading walls...");
          updateLoadingProgress('Creating walls...', 65);
          const wallObjects = localFloorplanData.objects.filter(obj => obj.type === 'wall');
          for (const objData of wallObjects) {
            const wallGeometry = new THREE.BoxGeometry(2, 2, 0.2);
            const wallMaterial = new THREE.MeshPhongMaterial({
              color: 0x231A20,           // dark charcoal with the faintest wine warmth
              specular: 0x6B2438,
              shininess: 30,
            });
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            
            wall.position.fromArray(objData.position);
            wall.rotation.set(
              objData.rotation.x,
              objData.rotation.y,
              objData.rotation.z
            );
            wall.scale.fromArray(objData.scale);
            wall.userData = { 
              ...objData.userData,
              isWall: true,
              openings: []
            };
            
            scene.add(wall);
            wallMap.set(objData.userData.uuid, wall);
          }

          // Doors/windows render immediately (no OBJ loading)
          console.log("Loading doors and windows...");
          updateLoadingProgress('Adding doors and windows...', 70);
          const openingsObjects = localFloorplanData.objects.filter(obj => obj.type === 'door' || obj.type === 'window');

          for (const objData of openingsObjects) {
            const parentWall = wallMap.get(objData.userData.parentWallId);
            if (parentWall) {
              let opening;
              if (objData.type === 'door') {
                opening = doorManagerRef.current.createDoor(
                  parentWall,
                  new THREE.Vector3().fromArray(objData.position)
                );
              } else {
                opening = windowManagerRef.current.createWindow(
                  parentWall,
                  new THREE.Vector3().fromArray(objData.position)
                );
              }

              if (opening) {
                opening.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                opening.scale.fromArray(objData.scale);
                parentWall.userData.openings.push(opening);
              }
            }
          }

          // Furniture: placeholders first, then real models in parallel
          console.log("Creating furniture placeholders...");
          updateLoadingProgress('Creating placeholders...', 75);

          const getPlaceholderDims = (userData = {}) => {
            if (userData.isChair) return [0.7, 1.0, 0.7];
            if (userData.isSofa) return [1.6, 1.0, 0.8];
            if (userData.isTable) {
              if (userData.isRoundTable) return [1.1, 0.8, 1.1];
              if (userData.maxCapacity === 2) return [0.9, 0.8, 0.9];
              if (userData.maxCapacity === 8) return [1.6, 0.8, 1.6];
              return [1.2, 0.8, 1.2];
            }
            if (userData.isPlant) return [0.6, 1.2, 0.6];
            if (userData.isFridge) return [1.2, 2.0, 0.7];
            if (userData.isFoodStand) return [1.2, 0.9, 0.7];
            if (userData.isDrinkStand) return [0.9, 0.9, 0.6];
            if (userData.isIceBox) return [1.0, 0.9, 0.7];
            if (userData.isIceCreamBox) return [1.5, 1.1, 0.9];
            return [1.0, 1.0, 1.0];
          };

          const placeholderByObjectId = new Map();
          const furnitureObjects = localFloorplanData.objects.filter(obj => !['wall', 'door', 'window'].includes(obj.type));

          for (const objData of furnitureObjects) {
            if (!objData.userData) objData.userData = {};
            objData.userData.objectId = objData.objectId;

            const [w, h, d] = getPlaceholderDims(objData.userData);
            const geom = new THREE.BoxGeometry(w, h, d);
            geom.translate(0, h / 2, 0);
            const mat = new THREE.MeshPhongMaterial({
              color: 0x8a8a8a,
              transparent: true,
              opacity: 0.45
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.receiveShadow = true;

            const placeholderGroup = new THREE.Group();
            placeholderGroup.add(mesh);
            placeholderGroup.position.fromArray(objData.position);
            placeholderGroup.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
            placeholderGroup.scale.fromArray(objData.scale);
            placeholderGroup.userData = {
              ...objData.userData,
              objectId: objData.objectId
            };

            scene.add(placeholderGroup);
            placeholderByObjectId.set(objData.objectId, placeholderGroup);
          }

          console.log("Loading real models in parallel...");
          updateLoadingProgress('Loading detailed models...', 85);

          const loadModelForObject = (objData) => {
            if (objData.userData?.isChair) return chair(scene);
            if (objData.userData?.isSofa) return sofa(scene);
            if (objData.userData?.isPlant01) return plant01(scene);
            if (objData.userData?.isPlant02) return plant02(scene);
            if (objData.userData?.isTable) {
              if (objData.userData.isRoundTable) return roundTable(scene);
              if (objData.userData.maxCapacity === 2) return create2SeaterTable(scene);
              if (objData.userData.maxCapacity === 8) return create8SeaterTable(scene);
              return table(scene);
            }
            if (objData.userData?.isFridge) return Promise.resolve(largeFridge(scene));
            if (objData.userData?.isFoodStand) return Promise.resolve(foodStand(scene));
            if (objData.userData?.isDrinkStand) return Promise.resolve(drinkStand(scene));
            if (objData.userData?.isIceBox) return Promise.resolve(iceBox(scene));
            if (objData.userData?.isIceCreamBox) return Promise.resolve(iceCreamBox(scene));
            return Promise.resolve(null);
          };

          const modelLoadTasks = furnitureObjects.map(async (objData) => {
            try {
              const model = await loadModelForObject(objData);
              if (!model) return null;

              model.position.fromArray(objData.position);
              model.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
              model.scale.fromArray(objData.scale);
              model.userData = {
                ...model.userData,
                ...objData.userData,
                objectId: objData.objectId
              };

              const placeholder = placeholderByObjectId.get(objData.objectId);
              if (placeholder) {
                scene.remove(placeholder);
                placeholder.traverse((o) => {
                  if (o.geometry) o.geometry.dispose();
                  if (o.material) {
                    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                    else o.material.dispose();
                  }
                });
                placeholderByObjectId.delete(objData.objectId);
              }

              return model;
            } catch (e) {
              console.error('Failed to load model for object:', objData?.objectId, e);
              return null;
            }
          });

          // Keep loading in the background; placeholders render immediately
          Promise.allSettled(modelLoadTasks).then(() => {
            console.log('Detailed model loading finished');
          });
        }

        console.log("Loading complete!");
        updateLoadingProgress('Experience ready!', 100);

        // Placeholders show immediately; don't block with a loading screen
        setIsLoading(false);
        setSceneLoaded(true);

        setShowInstructions(true);
        setTimeout(() => {
          setShowInstructions(false);
        }, 6000);

        // Animation loop
        console.log('Starting animation loop');
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          controls.update();
          if (beamsRef.current && clockRef.current) {
            beamsRef.current.tick(clockRef.current.getDelta());
          }
          renderer.render(scene, camera);
        };
        animateFnRef.current = animate;
        animate();

        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current || !rendererRef.current) return;
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;

          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Add click event listener to the renderer
          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2();

          // Table hover tooltip functionality
          let hoverTooltip = null;

          const createHoverTooltip = (tableId, event, tableUserData = {}) => {
            // Remove existing tooltip
            if (hoverTooltip) {
              document.body.removeChild(hoverTooltip);
            }

            // Look up zone info from ref (always current)
            const zone = tableZoneMapRef.current[tableId];
            const zoneHtml = zone
              ? `<div class="tooltip-zone" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.12)">
                   <span class="zone-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${zone.color || '#c9a961'};margin-right:5px;vertical-align:middle"></span>
                   <span style="color:${zone.color || '#c9a961'};font-weight:600;font-size:11px">${zone.name}</span>
                   ${zone.pricing?.minimumSpend > 0 ? `<span style="color:rgba(255,255,255,0.45);font-size:10px;margin-left:4px">· min ฿${zone.pricing.minimumSpend.toLocaleString()}</span>` : ''}
                   ${zone.pricing?.basePrice > 0 ? `<span style="color:rgba(255,255,255,0.45);font-size:10px;margin-left:4px">· ฿${zone.pricing.basePrice.toLocaleString()} fee</span>` : ''}
                 </div>`
              : '';

            // Create new tooltip — hover info only; 360° access is via the badge toggle
            hoverTooltip = document.createElement('div');
            hoverTooltip.className = 'table-hover-tooltip';
            hoverTooltip.innerHTML = `
              <div class="tooltip-content" style="background:#15130f;border:1px solid rgba(201, 169, 97, 0.25);color:#f5efe3;padding:8px 12px;border-radius:10px;min-width:120px">
                <span class="table-number" style="font-size:12px;font-weight:700">Table ${tableUserData.customName || tableId}</span>
                ${zoneHtml}
              </div>
            `;

            // Position tooltip near mouse
            hoverTooltip.style.position = 'fixed';
            hoverTooltip.style.left = (event.clientX + 15) + 'px';
            hoverTooltip.style.top = (event.clientY - 10) + 'px';
            hoverTooltip.style.zIndex = '10000';
            hoverTooltip.style.pointerEvents = 'none';

            document.body.appendChild(hoverTooltip);
          };

          const removeHoverTooltip = () => {
            if (hoverTooltip && document.body.contains(hoverTooltip)) {
              document.body.removeChild(hoverTooltip);
              hoverTooltip = null;
            }
          };

          const handleMouseMove = (event) => {
            // Touch devices fire synthetic mousemove after tap; suppress hover
            // tooltip there — mobile users get the bottom CTA instead, and the
            // floating tooltip would stick around with no mouseleave to clear it.
            if (isTouchRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

            const tableObject = intersects.find(item =>
              item.object?.userData?.isTable ||
              item.object?.parent?.userData?.isTable
            );

            const dateReady = !!dateRef.current && !!timeRef.current;
            const beams = beamsRef.current;

            if (tableObject) {
              const table = tableObject.object.userData?.isTable
                ? tableObject.object
                : tableObject.object.parent;

              const tableId = table.userData.objectId || table.userData.friendlyId || 'Unknown';

              // Change cursor to pointer
              renderer.domElement.style.cursor = 'pointer';

              // Create or update tooltip
              createHoverTooltip(tableId, event, table.userData);

              // Gold spotlight only on available tables once date+time chosen
              if (beams && dateReady) {
                const known = availableTablesRef.current.size > 0;
                const isAvailable = !known || availableTablesRef.current.has(tableId);
                if (isAvailable && known) {
                  beams.setHoverPosition(table);
                } else if (selectedTableRef.current) {
                  beams.setHoverPosition(selectedTableRef.current);
                } else {
                  beams.setHoverPosition(null);
                }
              } else if (beams) {
                beams.setHoverPosition(selectedTableRef.current || null);
              }
            } else {
              // Reset cursor
              renderer.domElement.style.cursor = 'default';

              // Remove tooltip
              removeHoverTooltip();
              if (beams) beams.setHoverPosition(selectedTableRef.current || null);
            }
          };

          const handleMouseLeave = () => {
            if (beamsRef.current) {
              beamsRef.current.setHoverPosition(selectedTableRef.current || null);
            }
          };

          // ── Mobile tap / drag handling ──────────────────────────────────────
          let tapDownX = 0;
          let tapDownY = 0;
          let tapDownT = 0;
          const handlePointerDown = (event) => {
            if (!isTouchRef.current) return;
            tapDownX = event.clientX;
            tapDownY = event.clientY;
            tapDownT = performance.now();
          };
          const handlePointerUp = (event) => {
            if (!isTouchRef.current) return;
            const dx = event.clientX - tapDownX;
            const dy = event.clientY - tapDownY;
            const dt = performance.now() - tapDownT;
            if (dt > 350 || Math.hypot(dx, dy) > 10) return; // drag, not tap

            const rect = containerRef.current.getBoundingClientRect();
            const ndc = new THREE.Vector2(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            const tapRay = new THREE.Raycaster();
            tapRay.setFromCamera(ndc, camera);
            const hits = tapRay.intersectObjects(sceneRef.current.children, true);

            const hit = hits.find((h) =>
              h.object?.userData?.isTable || h.object?.parent?.userData?.isTable
            );
            const tappedTable = hit
              ? (hit.object.userData?.isTable ? hit.object : hit.object.parent)
              : null;

            const dateReady = !!dateRef.current && !!timeRef.current;
            if (!dateReady) return; // existing click-time toast still informs the user

            if (!tappedTable) {
              selectedTableRef.current = null;
              setShowMobileCTA(false);
              setMobileSelectedTableName(null);
              if (beamsRef.current) beamsRef.current.setHoverPosition(null);
              return;
            }

            const tappedId = tappedTable.userData.objectId || tappedTable.userData.friendlyId;
            const known = availableTablesRef.current.size > 0;
            const isAvailable = !known || availableTablesRef.current.has(tappedId);
            if (!isAvailable) return; // reserved — existing tooltip path handles it

            if (selectedTableRef.current === tappedTable) {
              // Tap same selected table again → deselect
              selectedTableRef.current = null;
              setShowMobileCTA(false);
              setMobileSelectedTableName(null);
              if (beamsRef.current) beamsRef.current.setHoverPosition(null);
              return;
            }

            selectedTableRef.current = tappedTable;
            setMobileSelectedTableName(tappedTable.userData.customName || tappedId);
            setShowMobileCTA(true);
            if (beamsRef.current) beamsRef.current.setHoverPosition(tappedTable);
          };

          const handleClick = (event) => {
            // On touch devices the booking dialog is reached via the mobile CTA
            // bar, not by tapping the table directly. The CTA passes a synthetic
            // event with __fromCTA so it can still drive the existing flow.
            if (isTouchRef.current && !event.__fromCTA) return;

            // GUARD: Only block if we're still loading AND don't have any user info yet AND haven't overridden
            const effectiveLoading = authLoading && !authLoadingOverride;
            if (effectiveLoading && !userProfile && !isAuthenticated) {
                console.log('🚫 Blocking table click due to auth loading:', { authLoading, authLoadingOverride, userProfile: !!userProfile, isAuthenticated });
                toast.error("Verifying login status, please wait...");
                return;
            }
            
            console.log('✅ Auth check passed for table click:', { authLoading, authLoadingOverride, userProfile: !!userProfile, isAuthenticated });
            
            // Check authentication after loading is complete
            console.log('🔍 Table click - checking authentication:', {
              isAuthenticated,
              hasUserProfile: !!userProfile,
              firebaseAuth: {
                loading: firebaseAuth.loading,
                isAuthenticated: firebaseAuth.isAuthenticated,
                hasProfile: !!firebaseAuth.userProfile
              },
              lineAuth: {
                loading: lineAuth.loading,
                hasUser: !!lineAuth.user,
                userData: lineAuth.user ? {
                  id: lineAuth.user.id,
                  lineUserId: lineAuth.user.lineUserId,
                  firstName: lineAuth.user.firstName,
                  isLineUser: lineAuth.user.isLineUser
                } : null
              },
              localStorage: {
                hasCustomerUser: !!localStorage.getItem('customerUser'),
                customerUserData: localStorage.getItem('customerUser') ? JSON.parse(localStorage.getItem('customerUser')) : null
              }
            });

            if (!isAuthenticated || !userProfile) {
                console.log('❌ Authentication failed - showing login error');
                console.log('🔍 Detailed auth failure info:', {
                  isAuthenticated,
                  hasUserProfile: !!userProfile,
                  firebaseAuth: {
                    loading: firebaseAuth.loading,
                    isAuthenticated: firebaseAuth.isAuthenticated,
                    hasProfile: !!firebaseAuth.userProfile
                  },
                  lineAuth: {
                    loading: lineAuth.loading,
                    hasUser: !!lineAuth.user,
                    userData: lineAuth.user
                  },
                  localStorage: {
                    hasCustomerUser: !!localStorage.getItem('customerUser'),
                    customerUserData: localStorage.getItem('customerUser') ? JSON.parse(localStorage.getItem('customerUser')) : null
                  }
                });
                toast.error("Please log in to make a booking. Check console for debug info.");
                return;
            }

            console.log('✅ Authentication successful:', {
              userType: userProfile?.isLineUser ? 'LINE' : 'Firebase',
              userId: userProfile?.lineUserId || userProfile?.firebaseUid || userProfile?.uid
            });

            console.log('Click detected');
            console.log('Current state values:', {
              date: dateRef.current,
              time: timeRef.current
            });
            
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
            
            // Debug current state
            console.log('State when clicking:', {
              selectedDate: dateRef.current,
              selectedTime: timeRef.current
            });

            const tableObject = intersects.find(item => 
              item.object?.userData?.isTable || 
              item.object?.parent?.userData?.isTable
            );

            if (!tableObject) return;

            const table = tableObject.object.userData?.isTable 
              ? tableObject.object 
              : tableObject.object.parent;

            console.log('Table clicked:', table.userData);
            const tableId = table.userData.objectId || table.userData.friendlyId;
            const tableName = table.userData.customName || tableId;

            // Check if table is booked using the backend data state
            const isBooked = availableTablesRef.current.size > 0 && !availableTablesRef.current.has(tableId);

            // Use the state values directly and validate time format
            if (!dateRef.current || !timeRef.current) {
              toast.error("Please select a date and time first before choosing a table");
              return;
            }
            
            // Validate time format (accept both HH:MM and time slot formats)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            const timeSlotRegex = /^\d{1,2}:\d{2}\s(AM|PM)\s-\s\d{1,2}:\d{2}\s(AM|PM)$/;
            
            if (!timeRegex.test(timeRef.current) && !timeSlotRegex.test(timeRef.current)) {
              toast.error("Please select a valid time slot before booking");
              console.error('Invalid time format:', timeRef.current);
              return;
            }

            // First click on an available table selects it (beam stays, Book CTA
            // appears). Only the CTA's synthetic event (__fromCTA) is allowed to
            // continue on to actually open the booking dialog.
            if (!event.__fromCTA && !isBooked) {
              if (selectedTableRef.current === table) {
                selectedTableRef.current = null;
                setShowMobileCTA(false);
                setMobileSelectedTableName(null);
                if (beamsRef.current) beamsRef.current.setHoverPosition(null);
              } else {
                selectedTableRef.current = table;
                setMobileSelectedTableName(tableName);
                setShowMobileCTA(true);
                if (beamsRef.current) beamsRef.current.setHoverPosition(table);
              }
              return;
            }

            // If table is booked, show the "Table Not Available" tooltip
            if (isBooked) {
              const unavailableRanges = unavailableByTableRef.current[tableId] || [];
              const bookedRangesText = unavailableRanges.length > 0
                ? unavailableRanges.map(range => `${range.startTime} - ${range.endTime}`).join('<br/>')
                : timeRef.current;

              // Create and show tooltip
              const tooltip = document.createElement('div');
              tooltip.className = 'booking-tooltip';
              tooltip.innerHTML = `
                <div class="booking-tooltip-content">
                  <div class="tooltip-header">
                    <h4 class="text-lg font-bold text-red-600">Table Not Available</h4>
                    <button class="close-tooltip">×</button>
                  </div>
                  <div class="tooltip-body">
                    <p>This table is already booked for:</p>
                    <p class="font-semibold">${new Date(dateRef.current).toLocaleDateString()}</p>
                    <p class="font-semibold">${bookedRangesText}</p>
                  </div>
                </div>
              `;

              // Position the tooltip near the mouse click
              tooltip.style.position = 'fixed';
              tooltip.style.left = event.clientX + 'px';
              tooltip.style.top = event.clientY + 'px';
              
              // Add styles for the tooltip
              const style = document.createElement('style');
              style.textContent = `
                .booking-tooltip {
                  position: fixed;
                  z-index: 1000;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  padding: 16px;
                  max-width: 300px;
                  animation: fadeIn 0.2s ease-in-out;
                }
                .tooltip-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 12px;
                }
                .close-tooltip {
                  background: none;
                  border: none;
                  font-size: 24px;
                  cursor: pointer;
                  color: #666;
                  padding: 0 8px;
                }
                .close-tooltip:hover {
                  color: #000;
                }
                .tooltip-body p {
                  margin: 8px 0;
                  color: #333;
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `;
              document.head.appendChild(style);

              // Add to document
              document.body.appendChild(tooltip);

              // Add close button functionality
              const closeBtn = tooltip.querySelector('.close-tooltip');
              closeBtn.addEventListener('click', () => {
                document.body.removeChild(tooltip);
              });

              // Auto-remove after 3 seconds
              setTimeout(() => {
                if (document.body.contains(tooltip)) {
                  document.body.removeChild(tooltip);
                }
              }, 3000);

              return;
            }

            // Only create booking dialog if table is available
            const guestCountDialog = document.createElement('div');
            guestCountDialog.className = 'booking-dialog';
            guestCountDialog.innerHTML = `
              <div class="booking-dialog-content max-h-[90vh] overflow-y-auto" style="background:#15130f;border-radius:16px;border:1px solid #2a241b;">
                <div style="padding:20px 20px 16px;border-bottom:1px solid #2a241b;margin-bottom:16px;">
                  <h3 style="font-size:1.2rem;font-weight:900;color:#f5efe3;font-family:serif;margin:0;">Complete Booking</h3>
                </div>

                <div style="padding:0 20px;margin-bottom:16px;">
                  <div style="background:#0a0908;border:1px solid #2a241b;border-radius:12px;padding:14px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.85rem;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span>📅</span>
                        <span style="color:#f5efe3;">${new Date(dateRef.current).toLocaleDateString()}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span>🕐</span>
                        <span style="color:#f5efe3;">${timeRef.current}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span>🪑</span>
                        <span style="color:#f5efe3;">Table ${tableName}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span>👥</span>
                        <span style="color:#f5efe3;">Max: ${table.userData.maxCapacity || 4}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style="padding:0 20px;margin-bottom:16px;">
                  <label for="guest-count" style="color:#8b847a;font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:10px;">
                    Number of Guests (Max: ${table.userData.maxCapacity || 4})
                  </label>
                  <input
                    type="number"
                    id="guest-count"
                    min="1"
                    max="${table.userData.maxCapacity || 4}"
                    required
                    style="width:100%;padding:14px;border:1px solid #2a241b;border-radius:10px;background:#0a0908;color:#f5efe3;font-size:1.1rem;font-weight:600;box-sizing:border-box;outline:none;"
                    placeholder="Enter number of guests"
                  >
                  <p style="font-size:0.75rem;color:#8b847a;margin-top:6px;">Enter a number between 1 and ${table.userData.maxCapacity || 4}</p>
                </div>

                <div style="padding:16px 20px 20px;border-top:1px solid #2a241b;display:flex;gap:10px;flex-direction:row-reverse;">
                  <button type="button" id="confirm-booking" style="flex:1;padding:12px;background:#c9a961;color:#0a0908;border:none;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer;min-height:44px;">Confirm Booking</button>
                  <button type="button" id="cancel-booking" style="flex:1;padding:12px;background:#2a241b;color:#8b847a;border:1px solid #2a241b;border-radius:10px;font-weight:600;font-size:0.9rem;cursor:pointer;min-height:44px;">Cancel</button>
                </div>
              </div>
            `;

            document.body.appendChild(guestCountDialog);

            // Add event listeners
            const confirmButton = guestCountDialog.querySelector('#confirm-booking');
            const cancelButton = guestCountDialog.querySelector('#cancel-booking');
            const guestCountInput = guestCountDialog.querySelector('#guest-count');

            cancelButton.addEventListener('click', () => {
              document.body.removeChild(guestCountDialog);
            });

            confirmButton.addEventListener('click', async () => {
              const guestCount = parseInt(guestCountInput.value);
              if (!guestCount) {
                alert('Please enter number of guests');
                return;
              }

              try {
                document.body.removeChild(guestCountDialog); // Remove the dialog first
                await handleBookingSubmission(table, tableId, {
                  date: dateRef.current,
                  time: timeRef.current,
                  guestCount,
                  tableName
                });
              } catch (error) {
                console.error('Booking error:', error);
                toast.error(error.message || 'Failed to create booking');
              }
            });

            // Set default value and focus
            guestCountInput.value = '1';
            guestCountInput.focus();

            // Add input validation
            guestCountInput.addEventListener('input', (e) => {
              const value = parseInt(e.target.value);
              const maxCapacity = table.userData.maxCapacity || 4;
              
              if (value > maxCapacity) {
                e.target.setCustomValidity(`Maximum capacity for this table is ${maxCapacity} guests`);
                confirmButton.disabled = true;
                confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
              } else if (value < 1) {
                e.target.setCustomValidity('Minimum number of guests is 1');
                confirmButton.disabled = true;
                confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
              } else {
                e.target.setCustomValidity('');
                confirmButton.disabled = false;
                confirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
              }
              e.target.reportValidity();
            });
          };

          renderer.domElement.addEventListener('click', handleClick);
          renderer.domElement.addEventListener('mousemove', handleMouseMove);
          renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
          renderer.domElement.addEventListener('pointerdown', handlePointerDown);
          renderer.domElement.addEventListener('pointerup', handlePointerUp);
          handleClickRef.current = handleClick;

          // Clear hover tooltip when the page scrolls — the tooltip is
          // position:fixed and would otherwise "follow" the user as they
          // scroll past the floorplan.
          const handleWindowScroll = () => removeHoverTooltip();
          window.addEventListener('scroll', handleWindowScroll, { passive: true });

          // All scene setup code, event handlers, and input validation must be before this return!
          return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleWindowScroll);
            removeHoverTooltip(); // Clean up hover tooltip
            if (rendererRef.current) {
                rendererRef.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
                rendererRef.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
                rendererRef.current.domElement.removeEventListener('click', handleClick);
                rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
                rendererRef.current.domElement.removeEventListener('mouseleave', handleMouseLeave);
                rendererRef.current.domElement.removeEventListener('pointerdown', handlePointerDown);
                rendererRef.current.domElement.removeEventListener('pointerup', handlePointerUp);
            }
            handleClickRef.current = null;
            cleanup();
          };
        } catch (error) {
          console.error('Error initializing scene:', error);
          // Use enhanced error handling
          const errorResult = handleSceneError(error, 'PublicFloorPlan');
          console.error('Scene error details:', errorResult);
          setSceneLoaded(false);
        }
    };

    initScene();

    // Cleanup function
    return () => {
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
        rendererRef.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      cleanup();
    };
  }, [localFloorplanData]);

  // ── Fetch zones for this floorplan ──────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId || !localFloorplanId) return;
    const fetchZones = async () => {
      try {
        const res = await fetch(`/api/venues/${restaurantId}/zones?floorplanId=${localFloorplanId}`);
        if (res.ok) {
          const data = await res.json();
          setZones(data.zones || []);
        }
      } catch (e) {
        console.warn('Could not fetch zones:', e);
      }
    };
    fetchZones();
  }, [restaurantId, localFloorplanId]);

  useEffect(() => {
    // Fetch restaurant details and set default time slots
    const fetchRestaurantDetails = async () => {
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        if (!response.ok) throw new Error('Failed to fetch restaurant details');
        const data = await response.json();
        setRestaurant(data);

        // Get today's day of week
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        if (data.openingHours && data.openingHours[dayOfWeek]) {
          const dayHours = data.openingHours[dayOfWeek];
          if (!dayHours.isClosed) {
            // Pass today's date to filter out past time slots
            const todayDateString = today.toISOString().split('T')[0];
            const timeSlots = generateTimeSlots(dayHours.open, dayHours.close, todayDateString, selectedDuration);
            setAvailableTimeSlots(timeSlots);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
      }
    };
    fetchRestaurantDetails();
  }, [restaurantId, selectedDuration]);

  const generateTimeSlots = (openTime, closeTime, selectedDate = null, durationMinutes = 120) => {
    const slots = [];
    
    const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const formattedOpenTime = parseTime(openTime);
    const formattedCloseTime = parseTime(closeTime);
    
    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const isToday = selectedDate === today;
    
    // Use selectedDate as base date if provided, otherwise today
    const baseDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    baseDate.setHours(0, 0, 0, 0);

    let current = new Date(baseDate);
    const [openHours, openMinutes] = formattedOpenTime.split(':').map(Number);
    current.setHours(openHours, openMinutes, 0, 0);

    const end = new Date(baseDate);
    const [closeHours, closeMinutes] = formattedCloseTime.split(':').map(Number);
    end.setHours(closeHours, closeMinutes, 0, 0);

    // ── Overnight fix ──────────────────────────────────────────────────────────
    // If close time (in 24h) is less than or equal to open time, the venue closes
    // AFTER midnight on the next calendar day (e.g. open 8 PM → close 2 AM).
    // Advance `end` by one day so that the while loop can generate overnight slots.
    if (closeHours * 60 + closeMinutes <= openHours * 60 + openMinutes) {
      end.setDate(end.getDate() + 1);
    }
    // ───────────────────────────────────────────────────────────────────────────

    const bookingDurationMs = durationMinutes * 60 * 1000;
    const latestStartTime = new Date(end.getTime() - bookingDurationMs);

    // If it's today, ensure we start from current time or opening time, whichever is later
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Round up to next 30-minute interval
      const nextSlotMinute = currentMinute <= 30 ? 30 : 0;
      const nextSlotHour = currentMinute > 30 ? currentHour + 1 : currentHour;
      
      const earliestSlotTime = new Date();
      earliestSlotTime.setHours(nextSlotHour, nextSlotMinute, 0, 0);
      
      // Use the later of opening time or earliest available slot time
      if (earliestSlotTime > current) {
        current = earliestSlotTime;
      }
    }

    while (current <= latestStartTime) {
        const startTime = current.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const endTime = new Date(current.getTime() + bookingDurationMs).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const timeSlot = `${startTime} - ${endTime}`;
        slots.push(timeSlot);
        current.setMinutes(current.getMinutes() + 30);
    }

    return slots;
  };

  const handleDateChange = async (date) => {
    console.log('Changing date to:', date);
    // Ensure consistent timezone handling
    const selectedDate = new Date(date);
    selectedDate.setMinutes(selectedDate.getMinutes() - selectedDate.getTimezoneOffset());
    const formattedDate = selectedDate.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    
    if (!date || !restaurant) return;

    try {
      const dayOfWeek = selectedDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();
      const dayHours = restaurant.openingHours[dayOfWeek];

      if (!dayHours || dayHours.isClosed) {
        setAvailableTimeSlots([]);
        return;
      }

      const timeSlots = generateTimeSlots(dayHours.open, dayHours.close, formattedDate, selectedDuration);
      setAvailableTimeSlots(timeSlots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableTimeSlots([]);
    }
  };

  useEffect(() => {
    if (!selectedDate || !restaurant?.openingHours) return;

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = restaurant.openingHours[dayOfWeek];

    if (!dayHours || dayHours.isClosed) {
      setAvailableTimeSlots([]);
      setSelectedTime('');
      return;
    }

    const slots = generateTimeSlots(dayHours.open, dayHours.close, selectedDate, selectedDuration);
    setAvailableTimeSlots(slots);

    setSelectedTime((previousTime) => {
      if (slots.includes(previousTime)) return previousTime;
      setAvailableTables(new Set());
      return '';
    });
  }, [selectedDate, selectedDuration, restaurant]);

  const handleBookingSubmission = async (table, tableId, bookingDetails) => {
    const tableName = bookingDetails.tableName || tableId;
    // The `userProfile` from the context is now the single source of truth.
    if (!isAuthenticated || !userProfile) {
        throw new Error('Please log in to make a booking');
    }

    // Check table capacity
    const tableMaxCapacity = table.userData.maxCapacity || 4;
    if (bookingDetails.guestCount > tableMaxCapacity) {
        throw new Error(`This table can only accommodate up to ${tableMaxCapacity} guests. Please choose another table or reduce the number of guests.`);
    }

    // Check availability again before submitting
    const isAvailable = availableTables.size === 0 || availableTables.has(tableId);
    if (!isAvailable) {
        throw new Error('This table is no longer available for the selected time slot');
    }

    const customer = userProfile;
    
    const [startTime, endTime] = bookingDetails.time.split(' - ');
    
    const bookingData = {
        tableId,
        date: dateRef.current,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        durationMinutes: selectedDuration,
        guestCount: bookingDetails.guestCount,
        restaurantId,
        customerData: customer
    };

    // Double-check availability with server before proceeding
    const availabilityResponse = await fetch(`/api/scenes/${floorplanId}/availability`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            date: dateRef.current,
            startTime: startTime.trim(),
            endTime: endTime.trim()
        })
    });

    const availabilityData = await availabilityResponse.json();
    
    if (!availabilityResponse.ok) {
        throw new Error(availabilityData.error || 'Failed to verify table availability');
    }

    // Add after availability check but before booking API call
    const availableTableArray = Array.isArray(availabilityData.availableTables) ? availabilityData.availableTables : [];
    if (availableTableArray.length > 0 && !availableTableArray.includes(tableId)) {
        throw new Error('This table has just been booked by someone else');
    }

    // Step 1: Show Payment Dialog first
    const paymentResult = await new Promise((resolve) => {
      const paymentDialog = document.createElement('div');
      paymentDialog.id = 'payment-dialog-container';
      document.body.appendChild(paymentDialog);

      const paymentRoot = createRoot(paymentDialog);
      paymentRoot.render(
        <PaymentDialog
          bookingDetails={{
            restaurantId,
            floorplanId: localFloorplanId,
            date: dateRef.current,
            time: timeRef.current,
            durationMinutes: selectedDuration,
            tableId,
            guestCount: bookingDetails.guestCount,
            tableCapacity: table.userData?.capacity || (bookingDetails.guestCount <= 2 ? 2 : bookingDetails.guestCount <= 4 ? 4 : 6),
            tableLocation: table.userData?.location || 'center'
          }}
          onClose={() => {
            paymentRoot.unmount();
            document.body.removeChild(paymentDialog);
            resolve(false);
          }}
          onSuccess={() => {
            paymentRoot.unmount();
            document.body.removeChild(paymentDialog);
            resolve(true);
          }}
        />
      );
    });

    if (!paymentResult) {
      throw new Error('Payment cancelled');
    }

    // Step 2: After payment success, show booking confirmation dialog
    const confirmationResult = await new Promise((resolve) => {
      const confirmationDialog = document.createElement('div');
      confirmationDialog.id = 'booking-confirmation-container';
      document.body.appendChild(confirmationDialog);

      const root = createRoot(confirmationDialog);
      root.render(
        <BookingConfirmationDialog
          bookingDetails={{
            restaurantId,
            date: dateRef.current,
            time: timeRef.current,
            durationMinutes: selectedDuration,
            tableId,
            tableName,
            guestCount: bookingDetails.guestCount,
            tableCapacity: table.userData?.capacity || (bookingDetails.guestCount <= 2 ? 2 : bookingDetails.guestCount <= 4 ? 4 : 6),
            tableLocation: table.userData?.location || 'center'
          }}
          onClose={() => {
            root.unmount();
            document.body.removeChild(confirmationDialog);
            resolve(false);
          }}
          onConfirm={() => {
            root.unmount();
            document.body.removeChild(confirmationDialog);
            resolve(true);
          }}
        />
      );
    });

    if (!confirmationResult) {
      throw new Error('Booking cancelled after payment');
    }

    // Proceed with booking API call
    const token = await getAuthToken();
    console.log('Sending token:', token ? `${token.substring(0, 20)}...` : 'No token');
    const response = await fetch(`/api/scenes/${localFloorplanId}/book`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book table');
    }

    const result = await response.json();

    // Booking status changed; invalidate cached floorplan JSON (non-sensitive)
    try {
      localStorage.removeItem(`floorplan_${floorplanId}`);
      localStorage.removeItem(`floorplan_${floorplanId}_ts`);
    } catch (e) {
      console.warn('Failed to invalidate floorplan cache:', e);
    }

    // Update local availability immediately
    setAvailableTables(prev => {
        if (prev.size === 0 && Array.isArray(localFloorplanData?.objects)) {
          const allTableIds = localFloorplanData.objects
            .filter(obj => obj.type === 'table' || obj.objectId?.startsWith('t'))
            .map(obj => obj.objectId);
          const next = new Set(allTableIds);
          next.delete(tableId);
          return next;
        }

        const next = new Set(prev);
        next.delete(tableId);
        return next;
    });

    // Re-fetch availability for the same date/time to keep colors/status in sync
    await checkTableAvailability(dateRef.current, timeRef.current);

    // Enhanced success notification
    toast.success('🎉 Booking submitted successfully!', {
      duration: 5000,
      position: 'top-center',
      style: {
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
        padding: '16px 20px',
        fontSize: '15px',
        fontWeight: '500',
      },
    });

    // Show detailed success modal
    const showSuccessModal = () => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div style="background:#15130f;border:1px solid #2a241b;border-radius:20px;max-width:min(95vw,440px);width:100%;margin:auto;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.7);">
          <div style="padding:28px 24px 20px;text-align:center;border-bottom:1px solid #2a241b;">
            <div style="font-size:2.5rem;margin-bottom:10px;">🎉</div>
            <h3 style="font-size:1.3rem;font-weight:900;color:#f5efe3;font-family:serif;margin:0 0 4px;">Booking Submitted!</h3>
            <p style="font-size:0.8rem;color:#8b847a;margin:0;">Your reservation request has been sent</p>
          </div>
          <div style="padding:20px 24px 24px;">
            <div style="background:#0a0908;border:1px solid #2a241b;border-radius:12px;padding:16px;margin-bottom:14px;text-align:center;">
              <p style="font-size:0.75rem;color:#8b847a;margin:0 0 6px;">Booking Reference</p>
              <span style="font-family:monospace;font-size:0.85rem;background:#2a241b;color:#c9a961;padding:4px 10px;border-radius:6px;word-break:break-all;">${result.booking.bookingRef}</span>
              <p style="font-size:0.8rem;color:#8b847a;margin:10px 0 0;">Table ${tableName} · ${bookingDetails.guestCount} guests</p>
            </div>
            <div style="background:rgba(201, 169, 97, 0.06);border:1px solid rgba(201, 169, 97, 0.2);border-radius:12px;padding:14px;margin-bottom:20px;text-align:center;">
              <p style="font-size:0.8rem;color:#c9a961;font-weight:600;margin:0 0 4px;">⏳ Pending Confirmation</p>
              <p style="font-size:0.75rem;color:#8b847a;margin:0;line-height:1.5;">You'll receive a notification once your booking is approved</p>
            </div>
            <button onclick="this.closest('.fixed').remove()"
              style="width:100%;padding:14px;background:#c9a961;color:#0a0908;border:none;border-radius:12px;font-weight:700;font-size:0.95rem;cursor:pointer;min-height:44px;">
              Got it
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.body.contains(modal)) {
          modal.remove();
        }
      }, 10000);
    };

    // Show success modal after a brief delay for better UX
    setTimeout(showSuccessModal, 1200);
  };

  // Add this useEffect to debug state updates
  useEffect(() => {
    console.log('Time state updated:', selectedTime);
  }, [selectedTime]);

  // Add this function to check availability
  const checkTableAvailability = async (date, timeSlot) => {
    if (!date || !timeSlot) {
        console.log('No date or time selected');
        return;
    }

    const [startTime, endTime] = timeSlot.split(' - ');
    setIsAvailabilityLoading(true);

    try {
        console.log('1. Sending availability check:', { 
            date, 
            startTime: startTime.trim(), 
            endTime: endTime.trim() 
        });

        const response = await fetch(`/api/scenes/${localFloorplanId}/availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date,
                startTime: startTime.trim(),
                endTime: endTime.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to check availability');
        }

        console.log('2. Server response:', data);
        console.log('2a. Available tables from server:', data.availableTables);
        console.log('2b. Debug info:', data.debug);

        // If no available tables data, assume all tables are available
        if (!data.availableTables) {
            console.log('3. No availability data, assuming all tables available');
            setAvailableTables(new Set([]));
            setUnavailableByTable({});
            return;
        }

        // Ensure we're working with an array before creating the Set
        const availableTableArray = Array.isArray(data.availableTables) ? data.availableTables : [];
        console.log('3. Available table array:', availableTableArray);

        // Set the available tables
        setAvailableTables(new Set(availableTableArray));
        setUnavailableByTable(data.unavailableByTable || {});
        console.log('4. New available tables set:', new Set(availableTableArray));

    } catch (error) {
        console.error('Error checking availability:', error);
        // In case of error, assume all tables are available
        setAvailableTables(new Set([]));
        setUnavailableByTable({});
        toast.error('Error checking table availability. Assuming all tables are available.');
    } finally {
        setIsAvailabilityLoading(false);
    }
  };

  // Make sure this function exists and is properly handling all furniture types
  const getFurnitureModel = (type) => {
    switch (type) {
        case 'table':
            return table;
        case 'chair':
            return chair;
        case 'sofa':
            return sofa;
        case 'plant01':
            return plant01;
        case 'plant02':
            return plant02;
        default:
            console.warn(`Unknown furniture type: ${type}`);
            return null;
    }
  };

  // Make sure this useEffect is present to trigger availability check when date/time changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDate && selectedTime) {
        checkTableAvailability(selectedDate, selectedTime);
    }
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!sceneLoaded) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bookingPanelRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );

      gsap.fromTo(
        floorplanShellRef.current,
        { opacity: 0, scale: 0.985 },
        { opacity: 1, scale: 1, duration: 0.55, ease: 'power2.out' }
      );
    });

    return () => ctx.revert();
  }, [sceneLoaded]);

  useEffect(() => {
    if (!timeSlotsRef.current || availableTimeSlots.length === 0) return;

    const buttons = timeSlotsRef.current.querySelectorAll('.time-slot-btn');
    gsap.killTweensOf(buttons);
    gsap.fromTo(
      buttons,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.24, stagger: 0.018, ease: 'power2.out' }
    );
  }, [availableTimeSlots, selectedDate, selectedDuration]);

  // Build a quick tableId → zone lookup map whenever zones change
  const tableZoneMap = useMemo(() => {
    const map = {};
    zones.forEach(zone => {
      (zone.tableIds || []).forEach(tid => { map[tid] = zone; });
    });
    return map;
  }, [zones]);

  // Keep ref in sync so Three.js closures always read current zones
  useEffect(() => {
    tableZoneMapRef.current = tableZoneMap;
  }, [tableZoneMap]);

  // Paint each table with its zone color (or leave the asset's default white
  // if it isn't assigned to a zone). Reserved status is shown via the red
  // spotlight beam, NOT a darkened table color, so we never darken here.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.traverse((object) => {
      if (!object.userData?.isTable) return;
      const tableId = object.userData.objectId;
      const zone = tableZoneMap[tableId];
      const hexColor = zone?.color
        ? parseInt(zone.color.replace('#', ''), 16)
        : 0xFFFFFF; // no zone → white default

      object.traverse((child) => {
        if (!child.isMesh) return;
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => { mat.color.setHex(hexColor); mat.needsUpdate = true; });
        } else if (child.material) {
          child.material.color.setHex(hexColor);
          child.material.needsUpdate = true;
        }
      });
    });
  }, [tableZoneMap, sceneLoaded, availableTables]);


  // Add useEffect to monitor state changes
  useEffect(() => {
    console.log('Current state:', {
      selectedDate,
      selectedTime,
      availableTables: Array.from(availableTables)
    });
  }, [selectedDate, selectedTime, availableTables]);

  const handleTimeSlotSelection = (slot) => {
    console.log('Setting time to:', slot);
    setSelectedTime(slot);
  };

  // Adjust the date slider logic
  const dateSliderLogic = () => {
    // Create date in Bangkok timezone
    const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return bangkokDate;
  };

  // Use the adjusted date in your date slider
  const adjustedToday = dateSliderLogic();
  // Update the date slider logic to use adjustedToday
  // ... existing code ...

  // Add or update the CSS styles for the date selection
  const dateSliderStyles = `
    .date-option {
      background: #15130f;
      color: #8b847a;
      border: 1px solid #2a241b;
      transition: all 0.2s ease;
    }

    .date-option:hover {
      background: rgba(201, 169, 97, 0.08);
      border-color: #c9a961;
      transform: translateY(-2px);
    }

    .date-option.selected {
      background: #c9a961;
      color: #0a0908;
      border-color: #c9a961;
      box-shadow: 0 4px 12px rgba(201, 169, 97, 0.25);
    }

    .date-option.today {
      border-color: rgba(201, 169, 97, 0.5);
      position: relative;
    }

    .date-option.today:after {
      content: 'Today';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #c9a961;
      color: #0a0908;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .date-day { color: inherit; font-weight: 600; }
    .date-date { color: inherit; font-size: 1.2rem; font-weight: 700; }
    .date-month { color: inherit; font-weight: 500; }
  `;

  // Add the styles to the document
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = dateSliderStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add or update the styles for time selection
  const timeSlotStyles = `
    .time-slots-container {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scroll-behavior: smooth;
      padding: 0.5rem;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .time-slots-container::-webkit-scrollbar {
      display: none;
    }

    .time-slot-btn {
      padding: 0.75rem 1rem;
      background: #15130f;
      color: #8b847a;
      border: 1px solid #2a241b;
      border-radius: 0.5rem;
      white-space: nowrap;
      transition: all 0.2s;
      font-size: 0.85rem;
      font-weight: 500;
      min-width: 140px;
      height: 45px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .time-slot-btn:hover {
      background: rgba(201, 169, 97, 0.08);
      border-color: #c9a961;
      color: #c9a961;
      transform: translateY(-2px);
    }

    .time-slot-btn.selected {
      background: #c9a961;
      color: #0a0908;
      border-color: #c9a961;
      box-shadow: 0 4px 12px rgba(201, 169, 97, 0.25);
    }

    /* Add a subtle indicator for available slots */
    .time-slot-btn:before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      margin-right: 8px;
      flex-shrink: 0;
    }

    /* Slider arrow styles for both date and time sections */
    .slider-arrow {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background-color: #2a241b;
      color: #c9a961;
      border: 1px solid #2a241b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
      font-weight: bold;
      flex-shrink: 0;
    }

    .slider-arrow:hover {
      background-color: rgba(201, 169, 97, 0.15);
      transform: scale(1.1);
    }

    /* Common styles for both sliders */
    .date-slider,
    .time-slots-slider {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
    }
  `;

  // Add the styles to the document
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = timeSlotStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Table hover tooltip styles
  const tableHoverTooltipStyles = `
    .table-hover-tooltip {
      position: fixed;
      z-index: 10000;
      background: #15130f;
      color: #f5efe3;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      pointer-events: none;
      transform: translateY(-5px);
      animation: tooltipFadeIn 0.2s ease-out;
      border: 1px solid #c9a961;
      backdrop-filter: blur(10px);
    }

    .table-hover-tooltip::before {
      content: '';
      position: absolute;
      top: 100%;
      left: 20px;
      border: 6px solid transparent;
      border-top-color: #c9a961;
      transform: translateX(-50%);
    }

    .table-hover-tooltip .tooltip-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-hover-tooltip .table-number {
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    @keyframes tooltipFadeIn {
      from { 
        opacity: 0; 
        transform: translateY(-10px) scale(0.9); 
      }
      to { 
        opacity: 1; 
        transform: translateY(-5px) scale(1); 
      }
    }
  `;

  // Add table hover tooltip styles to the document
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'public-floorplan-tooltip-styles'; // Add unique ID
    style.textContent = tableHoverTooltipStyles;
    document.head.appendChild(style);

    return () => {
      // More robust cleanup
      const existingStyle = document.getElementById('public-floorplan-tooltip-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
      
      // Also clean up any leftover tooltip elements
      const leftoverTooltips = document.querySelectorAll('.table-hover-tooltip');
      leftoverTooltips.forEach(tooltip => {
        if (document.body.contains(tooltip)) {
          document.body.removeChild(tooltip);
        }
      });
    };
  }, []);

  // ── 360° panorama: pause/resume floorplan render while modal is open ───────
  useEffect(() => {
    if (panoramaTable) {
      // Modal is opening — stop the floorplan render loop to save battery
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      // Modal closed — restart the floorplan render loop
      if (!animationFrameRef.current && animateFnRef.current) {
        animateFnRef.current();
      }
    }
  }, [panoramaTable]);

  // ─── 360° badge overlay (toggleable, per-table floating buttons) ─────────
  useEffect(() => {
    // Tear down any existing badges
    badge360sRef.current.forEach(({ el }) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    badge360sRef.current = [];

    if (!show360Badges || !sceneLoaded || !sceneRef.current || !containerRef.current) return;

    sceneRef.current.traverse((obj) => {
      if (!obj.userData?.isTable) return;
      if (!obj.userData?.realView?.photoUrl) return;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'velvet-360-badge';
      el.innerHTML = '<span style="font-size:13px">👁</span><span>360°</span>';
      el.style.cssText = [
        'position:absolute',
        'transform:translate(-50%,-50%)',
        'display:none',
        'align-items:center',
        'gap:5px',
        'padding:6px 11px',
        'border-radius:999px',
        'background:rgba(201, 169, 97, 0.95)',
        'color:#0a0908',
        'font-size:11px',
        'font-weight:800',
        'letter-spacing:0.04em',
        'border:2px solid rgba(255,255,255,0.55)',
        'box-shadow:0 4px 14px rgba(0,0,0,0.35), 0 0 0 4px rgba(201, 169, 97, 0.18)',
        'cursor:pointer',
        'z-index:25',
        'white-space:nowrap',
        'user-select:none',
        '-webkit-tap-highlight-color:transparent',
      ].join(';');
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        setPanoramaTable(obj.userData);
      });
      containerRef.current.appendChild(el);
      badge360sRef.current.push({ el, tableObject: obj });
    });

    // Position update loop — independent of main animate so we don't risk the existing render path
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cam = cameraRef.current;
      const container = containerRef.current;
      if (!cam || !container) {
        badge360sRef.current.forEach(({ el }) => { el.style.display = 'none'; });
        return;
      }
      const w = container.clientWidth;
      const h = container.clientHeight;
      const wp = new THREE.Vector3();
      for (const { el, tableObject } of badge360sRef.current) {
        tableObject.getWorldPosition(wp);
        wp.y += 1.0; // float above the table
        const ndc = wp.clone().project(cam);
        if (ndc.z >= 1) { el.style.display = 'none'; continue; }
        el.style.display = 'flex';
        el.style.left = ((ndc.x * 0.5 + 0.5) * w) + 'px';
        el.style.top = ((ndc.y * -0.5 + 0.5) * h) + 'px';
      }
    };
    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      badge360sRef.current.forEach(({ el }) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      badge360sRef.current = [];
    };
  }, [show360Badges, sceneLoaded, localFloorplanId, localFloorplanData]);

  // True if at least one table has a 360° photo — controls toggle visibility
  const hasAny360Photos = !!localFloorplanData?.objects?.some(
    (o) => o.userData?.isTable && o.userData?.realView?.photoUrl
  );

  // Skip the basic loading screen entirely - go straight to 3D scene loading
  // The exciting loading experience will be handled within the 3D scene initialization

  return (
    <div className="flex flex-col min-h-0 w-full">
      <style jsx>{`
        .floorplan-container {
          position: relative;
          width: 100%;
          height: 70vh;
          min-height: 380px;
          max-height: calc(100vh - 200px);
          background: #100A0E;
          border-radius: 8px;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .floorplan-container {
            height: calc(100vh - 260px);
          }
        }

        .booking-panel {
          background: #0a0908;
          padding: 1rem;
          border-bottom: 1px solid #2a241b;
        }

        .booking-columns-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .date-container {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 0.5rem;
          scroll-behavior: smooth;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .date-container::-webkit-scrollbar {
          display: none;
        }

        .date-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem;
          min-width: 80px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-slots-container {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 0.5rem;
          scroll-behavior: smooth;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .time-slots-container::-webkit-scrollbar {
          display: none;
        }

        /* Loading animation for objects */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        /* Loading indicator */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 9, 8, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(201, 169, 97, 0.15);
  border-top: 3px solid #c9a961;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
      `}</style>

      <div className="booking-panel" ref={bookingPanelRef}>
        <div className="booking-columns-container">
          {/* Event Banner */}
          <AnimatePresence>
            {activeEvent && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="mb-2 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-900 via-[#15130f] to-[#0a0908] border border-purple-500/30 flex items-center gap-3 sm:gap-4 shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
                  
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/40 relative z-10">
                    <span className="text-xl sm:text-2xl">🎉</span>
                  </div>
                  <div className="flex-1 relative z-10 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-purple-300 mb-0.5">Special Event</p>
                        <h3 className="text-sm sm:text-base font-bold text-[#f5efe3] truncate">{activeEvent.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        {activeEvent.coverCharge > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs text-purple-300/70">Cover Charge</span>
                            <span className="text-xs sm:text-sm font-bold text-[#c9a961]">฿{activeEvent.coverCharge}</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-purple-300/70">Time</span>
                          <span className="text-xs sm:text-sm font-semibold text-[#f5efe3]">{activeEvent.startTime} - {activeEvent.endTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date Selection with Slider */}
          <div className="date-slider">
            <button 
              className="slider-arrow left"
              onClick={() => {
                const container = document.querySelector('.date-container');
                container.scrollBy({ left: -200, behavior: 'smooth' });
              }}
            >
              ←
            </button>
            
            <div className="date-container">
              {[...Array(30)].map((_, index) => {
                // Create date in Bangkok timezone
                const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                bangkokDate.setDate(bangkokDate.getDate() + index);
                
                const dayName = bangkokDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Bangkok' });
                const dayDate = bangkokDate.getDate();
                const month = bangkokDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Bangkok' });
                
                // Fix the date string format to ensure YYYY-MM-DD
                const year = bangkokDate.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Bangkok' });
                const monthNum = String(bangkokDate.getMonth() + 1).padStart(2, '0');
                const dayNum = String(bangkokDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${monthNum}-${dayNum}`;
                
                const isToday = index === 0;
                
                return (
                  <div
                    key={dateString}
                    className={`date-option ${selectedDate === dateString ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => {
                      console.log('Selected date:', dateString);
                      handleDateChange(dateString);
                    }}
                  >
                    <span className="date-day">{dayName}</span>
                    <span className="date-date">{dayDate}</span>
                    <span className="date-month">{month}</span>
                  </div>
                );
              })}
            </div>

            <button 
              className="slider-arrow right"
              onClick={() => {
                const container = document.querySelector('.date-container');
                container.scrollBy({ left: 200, behavior: 'smooth' });
              }}
            >
              →
            </button>
          </div>

          {/* Time Selection with Slider */}
          <div className="booking-column">
            <div className="mb-3">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8b847a' }}>Duration</label>
              <div className="relative inline-flex w-full md:w-auto rounded-xl p-1 overflow-x-auto" style={{ background: '#0a0908', border: '1px solid #2a241b' }}>
                {durationOptions.map((option) => {
                  const isSelected = selectedDuration === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedDuration(option.value)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative z-10 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
                      style={{ color: isSelected ? '#0a0908' : '#8b847a' }}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="duration-pill"
                          className="absolute inset-0 rounded-lg shadow-md"
                          style={{ background: '#c9a961' }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#c9a961' }}>Available Times</h4>
            <div className="time-slots-slider">
              <button 
                className="slider-arrow left"
                onClick={() => {
                  const container = document.querySelector('.time-slots-container');
                  container.scrollBy({ left: -200, behavior: 'smooth' });
                }}
              >
                ←
              </button>
              
              <div className="time-slots-container" ref={timeSlotsRef}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedDate}-${selectedDuration}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2"
                  >
                    {availableTimeSlots.map((slot, index) => (
                      <motion.button
                        key={slot}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTimeSlotSelection(slot)}
                        className={`time-slot-btn ${selectedTime === slot ? 'selected' : ''}`}
                      >
                        {slot}
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button 
                className="slider-arrow right"
                onClick={() => {
                  const container = document.querySelector('.time-slots-container');
                  container.scrollBy({ left: 200, behavior: 'smooth' });
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan Container with Loading State */}
      <div className="floorplan-container" ref={(node) => { containerRef.current = node; floorplanShellRef.current = node; }}>
        <AnimatePresence>
          {isAvailabilityLoading && selectedTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3 z-40"
            >
              <div className="backdrop-blur-md rounded-xl px-3 py-2" style={{ background: 'rgba(21, 19, 15, 0.9)', border: '1px solid rgba(201, 169, 97, 0.25)' }}>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#c9a961' }}>
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#c9a961' }}></span>
                  Syncing table status...
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Scene Container */}
        <div className="scene-container relative w-full h-full">
          <div ref={sceneHostRef} className="absolute inset-0" />
          {!sceneLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="loading-spinner"></div>
            </div>
          )}

          {/* 360° badge toggle — only visible when scene is loaded, not in panorama mode, and at least one table has a photo */}
          {sceneLoaded && !panoramaTable && hasAny360Photos && (
            <button
              type="button"
              onClick={() => setShow360Badges((v) => !v)}
              className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: show360Badges ? 'rgba(201, 169, 97, 0.95)' : 'rgba(10, 9, 8, 0.85)',
                border: `1px solid ${show360Badges ? 'rgba(201, 169, 97, 1)' : 'rgba(201, 169, 97, 0.4)'}`,
                color: show360Badges ? '#0a0908' : '#c9a961',
                backdropFilter: 'blur(8px)',
                boxShadow: show360Badges ? '0 4px 14px rgba(201, 169, 97, 0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
                minHeight: '40px',
              }}
            >
              <span style={{ fontSize: '15px' }}>👁</span>
              <span>{show360Badges ? '360° On' : 'Show 360° Tables'}</span>
            </button>
          )}
        </div>

        {/* ── 360° Panorama Modal (self-contained, mounts as fullscreen overlay) ── */}
        <Panorama360Modal
          isOpen={!!panoramaTable}
          onClose={() => setPanoramaTable(null)}
          photoUrl={panoramaTable?.realView?.photoUrl}
          heading={panoramaTable?.realView?.heading || 0}
          capturePoint={panoramaTable?.realView?.capturePoint}
          tableId={panoramaTable?.objectId}
          tableName={panoramaTable?.customName || panoramaTable?.objectId}
          objects={localFloorplanData?.objects || []}
          availableTables={availableTablesRef.current}
        />

        {/* Instructions Overlay */}
        <AnimatePresence>
          {sceneLoaded && showInstructions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                bg-black/80 text-white px-6 py-4 rounded-xl shadow-xl z-20 text-center"
            >
              {/* Close button */}
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-2 right-2 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>

              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-3"
              >
                👆
              </motion.div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#f5efe3' }}>How to Reserve</h3>
              <p style={{ color: '#8b847a' }}>
                Click on any <span style={{ color: '#c9a961', fontWeight: 600 }}>table</span> to make a reservation
              </p>
              <p className="text-sm mt-2" style={{ color: '#8b847a' }}>
                Tables are color-coded by zone · <span style={{ color: '#FF6B6B', fontWeight: 600 }}>Red spotlight</span> = reserved
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zone Map (contained div below the floorplan, not an overlay) ── */}
      {sceneLoaded && (
        <div
          className="mt-3 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(10, 9, 8, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-between"
            style={{ color: '#c9a961', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span>Zone Map</span>
            <span className="text-[10px] font-medium normal-case tracking-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {zones.length} {zones.length === 1 ? 'zone' : 'zones'}
            </span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-2.5">
            {zones.length === 0 ? (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No zones configured</p>
            ) : (
              zones.map(zone => {
                const basePrice = zone.pricing?.basePrice || 0;
                const minSpend = zone.pricing?.minimumSpend || 0;
                const showMinSpend = minSpend > 0;
                const showFee = basePrice > 0;
                return (
                  <div key={zone._id} className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color || '#888', boxShadow: `0 0 6px ${zone.color || '#888'}88` }}
                    />
                    <div className="min-w-0 leading-tight">
                      <p className="text-xs font-semibold truncate" style={{ color: zone.color || '#eee' }}>
                        {zone.name}
                      </p>
                      {(showFee || showMinSpend) && (
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {showFee && <>฿{basePrice.toLocaleString()} fee</>}
                          {showFee && showMinSpend && <> · </>}
                          {showMinSpend && <>min ฿{minSpend.toLocaleString()}</>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#888888' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Available</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Booked</p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showMobileCTA && mobileSelectedTableName && (
          <motion.div
            key="book-cta"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed left-0 right-0 bottom-0 z-50 flex justify-center pointer-events-none px-4"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <div
              className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full max-w-full"
              style={{
                background: 'rgba(21, 19, 15, 0.85)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(201, 169, 97, 0.35)',
                boxShadow: '0 18px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(201, 169, 97, 0.08), 0 0 24px rgba(201, 169, 97, 0.18)',
              }}
            >
              <div className="flex flex-col leading-tight pr-1">
                <span
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.18em',
                    color: '#c9a961',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Selected
                </span>
                <span
                  style={{
                    fontSize: '0.95rem',
                    color: '#f5efe3',
                    fontWeight: 700,
                    fontFamily: 'serif',
                  }}
                >
                  Table {mobileSelectedTableName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const t = selectedTableRef.current;
                  if (!t || !containerRef.current || !cameraRef.current) return;
                  // Use containerRef rect so the projected screen coords line
                  // up with what handleClick converts back to NDC (it also uses
                  // containerRef.current.getBoundingClientRect()).
                  const vec = new THREE.Vector3();
                  t.getWorldPosition(vec);
                  vec.project(cameraRef.current);
                  const rect = containerRef.current.getBoundingClientRect();
                  const fakeEvent = {
                    clientX: (vec.x * 0.5 + 0.5) * rect.width + rect.left,
                    clientY: (-vec.y * 0.5 + 0.5) * rect.height + rect.top,
                    __fromCTA: true,
                  };
                  selectedTableRef.current = null;
                  setShowMobileCTA(false);
                  setMobileSelectedTableName(null);
                  if (beamsRef.current) beamsRef.current.setHoverPosition(null);
                  if (handleClickRef.current) handleClickRef.current(fakeEvent);
                }}
                style={{
                  padding: '12px 22px',
                  background: 'linear-gradient(135deg, #D9B85C 0%, #c9a961 50%, #A88A36 100%)',
                  color: '#0a0908',
                  border: 'none',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 16px rgba(201, 169, 97, 0.45), inset 0 1px 0 rgba(255,235,170,0.55)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>✦</span>
                Reserve
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
