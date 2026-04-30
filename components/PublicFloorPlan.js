'use client';

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createScene, createFloor } from '@/scripts/floor';
import { chair, table, roundTable, sofa, create2SeaterTable, create8SeaterTable, plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox } from '@/scripts/asset';
import { DoorManager } from '@/scripts/managers/DoorManager';
import { WindowManager } from '@/scripts/managers/WindowManager';
import '@/css/booking.css';
import '@/css/loading.css';
import { toast } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import RestaurantReservation from '@/components/RestaurantReservation';
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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-md mx-auto overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col my-auto"
      >
        {/* Header - Sticky */}
        <div className="bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] p-4 sm:p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Confirm Booking</h3>
              <p className="text-orange-100 text-xs sm:text-sm mt-1">Review your reservation details</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors text-xl sm:text-2xl font-light p-1 rounded-full hover:bg-white/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Booking Summary */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-3 w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-semibold text-sm sm:text-base">📅</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{formatDate(bookingDetails.date)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-3 w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm sm:text-base">🕐</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Time</p>
                  <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{bookingDetails.time}</p>
                  {bookingDetails.durationMinutes ? (
                    <p className="text-xs text-gray-500 mt-1">Duration: {bookingDetails.durationMinutes} minutes</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm sm:text-base">🪑</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Table</p>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{bookingDetails.tableId}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm sm:text-base">👥</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Guests</p>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{bookingDetails.guestCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs sm:text-sm">ℹ️</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-blue-800 font-medium text-xs sm:text-sm">Booking Confirmation</p>
                <p className="text-blue-700 text-xs sm:text-sm mt-1 leading-relaxed">Your booking will be submitted and is pending restaurant confirmation. You'll receive a notification once approved.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Sticky */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] text-white rounded-lg sm:rounded-xl font-medium hover:from-[#FF4F18]/90 hover:to-[#FF6B35]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <span>Confirm Booking</span>
                  <span className="hidden sm:inline">✨</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function PublicFloorPlan({ floorplanData, floorplanId, restaurantId, allFloorplans = [] }) {
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
  const doorManagerRef = useRef(null);
  const windowManagerRef = useRef(null);
  const availableTablesRef = useRef(new Set());
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Adjust for local timezone
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('');
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

  // ── Fetch events for this venue ─────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/venues/${restaurantId}/events?public=true&upcoming=true`);
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
    if (!selectedDate) return;

    // Find event for selected date
    const eventForDate = venueEvents.find(ev => {
      const evDateObj = new Date(ev.date);
      evDateObj.setMinutes(evDateObj.getMinutes() - evDateObj.getTimezoneOffset());
      return evDateObj.toISOString().split('T')[0] === selectedDate;
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
  }, [selectedDate, venueEvents, floorplanData, floorplanId, allFloorplans, restaurantId]); // exclude localFloorplanId to prevent loops

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
        sceneRef.current = scene;

        console.log('Setting up lights');
        updateLoadingProgress('Setting up lighting...', 30);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        
        if (process.env.NODE_ENV === 'production') {
          directionalLight.castShadow = true;
          directionalLight.shadow.mapSize.width = 1024;
          directionalLight.shadow.mapSize.height = 1024;
        } else {
          directionalLight.castShadow = false;
        }
        
        scene.add(directionalLight);

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

        // Add floor
        console.log('Adding floor');
        updateLoadingProgress('Creating floor plan...', 60);

        const floor = createFloor(20, 20, 2);
        scene.add(floor);

        // Initialize managers
        console.log('Initializing managers');
        doorManagerRef.current = new DoorManager(scene, { walls: [] }, renderer);
        windowManagerRef.current = new WindowManager(scene, { walls: [] }, renderer);

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
              color: 0x808080
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
          renderer.render(scene, camera);
        };
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

          const createHoverTooltip = (tableId, event) => {
            // Remove existing tooltip
            if (hoverTooltip) {
              document.body.removeChild(hoverTooltip);
            }

            // Look up zone info from ref (always current)
            const zone = tableZoneMapRef.current[tableId];
            const zoneHtml = zone
              ? `<div class="tooltip-zone" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.12)">
                   <span class="zone-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${zone.color || '#C9A84C'};margin-right:5px;vertical-align:middle"></span>
                   <span style="color:${zone.color || '#C9A84C'};font-weight:600;font-size:11px">${zone.name}</span>
                   ${zone.pricing?.minimumSpend > 0 ? `<span style="color:rgba(255,255,255,0.45);font-size:10px;margin-left:4px">· min ฿${zone.pricing.minimumSpend.toLocaleString()}</span>` : ''}
                   ${zone.pricing?.basePrice > 0 ? `<span style="color:rgba(255,255,255,0.45);font-size:10px;margin-left:4px">· ฿${zone.pricing.basePrice.toLocaleString()} fee</span>` : ''}
                 </div>`
              : '';

            // Create new tooltip
            hoverTooltip = document.createElement('div');
            hoverTooltip.className = 'table-hover-tooltip';
            hoverTooltip.innerHTML = `
              <div class="tooltip-content" style="background:#161520;border:1px solid rgba(201,168,76,0.25);color:#F5F0E8;padding:8px 12px;border-radius:10px;min-width:120px">
                <span class="table-number" style="font-size:12px;font-weight:700">Table ${tableId}</span>
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
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
            
            const tableObject = intersects.find(item => 
              item.object?.userData?.isTable || 
              item.object?.parent?.userData?.isTable
            );

            if (tableObject) {
              const table = tableObject.object.userData?.isTable 
                ? tableObject.object 
                : tableObject.object.parent;

              const tableId = table.userData.objectId || table.userData.friendlyId || 'Unknown';
              
              // Change cursor to pointer
              renderer.domElement.style.cursor = 'pointer';
              
              // Create or update tooltip
              createHoverTooltip(tableId, event);
            } else {
              // Reset cursor
              renderer.domElement.style.cursor = 'default';
              
              // Remove tooltip
              removeHoverTooltip();
            }
          };

          const handleClick = (event) => {
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
              <div class="booking-dialog-content max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-4">
                  <h3 class="text-xl sm:text-2xl font-bold text-[#141517]">Complete Booking</h3>
                </div>
                
                <div class="booking-details mb-6 space-y-3">
                  <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm sm:text-base">
                      <div class="flex items-center">
                        <span class="font-medium text-gray-600 mr-2">📅</span>
                        <span class="text-[#141517]">${new Date(dateRef.current).toLocaleDateString()}</span>
                      </div>
                      <div class="flex items-center">
                        <span class="font-medium text-gray-600 mr-2">🕐</span>
                        <span class="text-[#141517]">${timeRef.current}</span>
                      </div>
                      <div class="flex items-center">
                        <span class="font-medium text-gray-600 mr-2">🪑</span>
                        <span class="text-[#141517]">Table ${tableId}</span>
                      </div>
                      <div class="flex items-center">
                        <span class="font-medium text-gray-600 mr-2">👥</span>
                        <span class="text-[#141517]">Max: ${table.userData.maxCapacity || 4} guests</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="form-group mb-6">
                  <label for="guest-count" class="text-[#141517] font-medium block mb-3 text-base sm:text-lg">
                    Number of Guests (Max: ${table.userData.maxCapacity || 4})
                  </label>
                  <input 
                    type="number" 
                    id="guest-count" 
                    min="1" 
                    max="${table.userData.maxCapacity || 4}" 
                    required
                    class="w-full p-3 sm:p-4 border-2 rounded-lg focus:ring-2 focus:ring-[#FF4F18] focus:border-[#FF4F18] text-[#141517] font-medium text-lg sm:text-xl"
                    placeholder="Enter number of guests"
                  >
                  <p class="text-xs sm:text-sm text-gray-500 mt-2">Please enter a number between 1 and ${table.userData.maxCapacity || 4}</p>
                </div>
                
                <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200 mt-6">
                  <div class="dialog-buttons flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button type="button" id="cancel-booking" class="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gray-200 text-[#141517] rounded-lg hover:bg-gray-300 transition-all font-medium text-base min-h-[44px] touch-manipulation">Cancel</button>
                    <button type="button" id="confirm-booking" class="w-full sm:w-auto px-4 sm:px-6 py-3 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90 transition-all font-medium text-base min-h-[44px] touch-manipulation">Confirm Booking</button>
                  </div>
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
                  guestCount
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

          // All scene setup code, event handlers, and input validation must be before this return!
          return () => {
            window.removeEventListener('resize', handleResize);
            removeHoverTooltip(); // Clean up hover tooltip
            if (rendererRef.current) {
                rendererRef.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
                rendererRef.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
                rendererRef.current.domElement.removeEventListener('click', handleClick);
                rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
            }
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

    // Immediately update table color to dark grey after successful booking
    if (table && table.children) {
        table.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.color.setHex(0x4a4a4a);
                        mat.needsUpdate = true;
                    });
                } else if (child.material) {
                    child.material.color.setHex(0x4a4a4a);
                    child.material.needsUpdate = true;
                }
            }
        });
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
        <div class="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-md w-full mx-auto overflow-hidden animate-fade-up max-h-[90vh] overflow-y-auto">
          <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-6 text-white text-center">
            <div class="text-3xl sm:text-4xl mb-2 sm:mb-3">🎉</div>
            <h3 class="text-lg sm:text-xl font-bold">Booking Submitted!</h3>
            <p class="text-green-100 text-xs sm:text-sm mt-1">Your reservation request has been sent</p>
          </div>
          <div class="p-4 sm:p-6">
            <div class="text-center mb-4 sm:mb-6">
              <div class="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div class="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 text-gray-700 mb-2">
                  <span class="font-semibold text-sm sm:text-base">Reference:</span>
                  <span class="font-mono text-xs sm:text-sm bg-gray-200 px-2 py-1 rounded break-all">${result.booking.bookingRef}</span>
                </div>
                <p class="text-xs sm:text-sm text-gray-600">
                  <strong>Table ${tableId}</strong> for <strong>${bookingDetails.guestCount} guests</strong>
                </p>
              </div>
              <div class="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div class="flex items-center justify-center space-x-2 text-blue-700 mb-2">
                  <span class="text-base sm:text-lg">⏳</span>
                  <span class="font-medium text-xs sm:text-sm">Pending restaurant confirmation</span>
                </div>
                <p class="text-blue-600 text-xs leading-relaxed">You'll receive a notification once your booking is approved</p>
              </div>
            </div>
            <button onclick="this.closest('.fixed').remove()" 
                    class="w-full px-4 sm:px-6 py-3 bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] text-white rounded-lg sm:rounded-xl font-medium hover:from-[#FF4F18]/90 hover:to-[#FF6B35]/90 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base min-h-[44px] touch-manipulation">
              Got it! ✨
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

        // Update table colors
        updateTableColors();

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

  const updateTableColors = useCallback(() => {
    if (!sceneRef.current) return;

    const darken = (hex, f = 0.28) => {
      const r = Math.floor(((hex >> 16) & 0xFF) * f);
      const g = Math.floor(((hex >> 8)  & 0xFF) * f);
      const b = Math.floor((hex & 0xFF) * f);
      return (r << 16) | (g << 8) | b;
    };

    sceneRef.current.traverse((object) => {
      if (object.userData?.isTable) {
        const tableId = object.userData.objectId;
        const isBooked = availableTables.size > 0 && !availableTables.has(tableId);
        const zone = tableZoneMap[tableId];
        const zoneHex = zone?.color ? parseInt(zone.color.replace('#', ''), 16) : null;

        // Zone color = zone identity (always base color).
        // Booked = darkened zone color, or dark grey if no zone.
        // Available + no zone = neutral grey (not white, avoids conflict with zone whites).
        let hexColor;
        if (isBooked) {
          hexColor = zoneHex !== null ? darken(zoneHex) : 0x2a2a2a;
        } else {
          hexColor = zoneHex !== null ? zoneHex : 0x888888;
        }

        object.traverse((child) => {
          if (child.isMesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => { mat.color.setHex(hexColor); mat.needsUpdate = true; });
            } else if (child.material) {
              child.material.color.setHex(hexColor);
              child.material.needsUpdate = true;
            }
          }
        });
      }
    });
  }, [availableTables, tableZoneMap]);

  // Trigger color updates whenever availability OR zones change
  useEffect(() => {
    updateTableColors();
  }, [updateTableColors, availableTables, zones]);

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
      background: white;
      color: #141517;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
    }

    .date-option:hover {
      background: #fff5f2;
      border-color: #FF4F18;
      transform: translateY(-2px);
    }

    .date-option.selected {
      background: #FF4F18;
      color: white;
      border-color: #FF4F18;
      box-shadow: 0 4px 12px rgba(255, 79, 24, 0.2);
    }

    .date-option.today {
      border-color: #FF4F18;
      position: relative;
    }

    .date-option.today:after {
      content: 'Today';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #FF4F18;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .date-day {
      color: inherit;
      font-weight: 600;
    }

    .date-date {
      color: inherit;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .date-month {
      color: inherit;
      font-weight: 500;
    }
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
      background: white;
      color: #141517;
      border: 2px solid #e5e7eb;
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
      background: #fff5f2;
      border-color: #FF4F18;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 79, 24, 0.1);
    }

    .time-slot-btn.selected {
      background: #FF4F18;
      color: white;
      border-color: #FF4F18;
      box-shadow: 0 4px 12px rgba(255, 79, 24, 0.2);
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
      background-color: #FF4F18;
      color: white;
      border: none;
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
      background-color: #e63900;
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
      background: linear-gradient(135deg, #FF4F18 0%, #FF6B3D 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(255, 79, 24, 0.3);
      pointer-events: none;
      transform: translateY(-5px);
      animation: tooltipFadeIn 0.2s ease-out;
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
    }

    .table-hover-tooltip::before {
      content: '';
      position: absolute;
      top: 100%;
      left: 20px;
      border: 6px solid transparent;
      border-top-color: #FF4F18;
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

  // Skip the basic loading screen entirely - go straight to 3D scene loading
  // The exciting loading experience will be handled within the 3D scene initialization

  return (
    <div className="flex flex-col h-screen">
      <style jsx>{`
        .floorplan-container {
          position: relative;
          width: 100%;
          height: calc(100vh - 200px); /* Adjust based on your header/booking panel height */
          background: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
        }

        .booking-panel {
          background: white;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
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
  background: rgba(255, 255, 255, 0.9);
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
  border: 3px solid #f3f3f3;
  border-top: 3px solid #FF4F18;
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
                <div className="mb-2 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-900 via-[#161520] to-[#0C0B10] border border-purple-500/30 flex items-center gap-3 sm:gap-4 shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
                  
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/40 relative z-10">
                    <span className="text-xl sm:text-2xl">🎉</span>
                  </div>
                  <div className="flex-1 relative z-10 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-purple-300 mb-0.5">Special Event</p>
                        <h3 className="text-sm sm:text-base font-bold text-[#F5F0E8] truncate">{activeEvent.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        {activeEvent.coverCharge > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs text-purple-300/70">Cover Charge</span>
                            <span className="text-xs sm:text-sm font-bold text-[#C9A84C]">฿{activeEvent.coverCharge}</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-purple-300/70">Time</span>
                          <span className="text-xs sm:text-sm font-semibold text-[#F5F0E8]">{activeEvent.startTime} - {activeEvent.endTime}</span>
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
              <label className="block text-sm font-medium text-[#141517] mb-2">Duration</label>
              <div className="relative inline-flex w-full md:w-auto rounded-xl bg-[#fff5f2] p-1 border border-[#ffd8c9] shadow-sm overflow-x-auto">
                {durationOptions.map((option) => {
                  const isSelected = selectedDuration === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedDuration(option.value)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative z-10 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                        isSelected ? 'text-white' : 'text-[#7a341f] hover:text-[#FF4F18]'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="duration-pill"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] shadow-md"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <h4 className="text-lg font-semibold mb-3 text-[#FF4F18]">Available Times</h4>
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
              <div className="bg-white/90 backdrop-blur-md border border-[#FF4F18]/20 rounded-xl px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2 text-[#141517] text-sm font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#FF4F18] animate-pulse"></span>
                  Syncing table status...
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Zone Legend ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {sceneLoaded && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ delay: 0.6, duration: 0.35 }}
              className="absolute bottom-4 left-3 z-30 select-none"
              style={{ maxWidth: '200px' }}
            >
              <div
                className="rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: 'rgba(12, 11, 16, 0.82)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {/* Legend header */}
                <div
                  className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.45)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Zone Map
                </div>

                <div className="px-3 py-2 space-y-2">
                  {/* Zones */}
                  {zones.length === 0 ? (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No zones configured</p>
                  ) : (
                    zones.map(zone => {
                      const basePrice   = zone.pricing?.basePrice   || 0;
                      const minSpend    = zone.pricing?.minimumSpend || 0;
                      const showMinSpend = minSpend > 0;
                      const showFee     = basePrice > 0;

                      return (
                        <div key={zone._id} className="flex items-start gap-2">
                          {/* Color swatch */}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: zone.color || '#888', boxShadow: `0 0 6px ${zone.color || '#888'}88` }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: zone.color || '#eee' }}>
                              {zone.name}
                            </p>
                            {(showFee || showMinSpend) ? (
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {showFee && <>฿{basePrice.toLocaleString()} fee</>}
                                {showFee && showMinSpend && <> · </>}
                                {showMinSpend && <>min ฿{minSpend.toLocaleString()}</>}
                              </p>
                            ) : (
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No charge</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '6px', paddingTop: '6px' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#888888' }} />
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Available (no zone)</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }} />
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Booked</p>
                    </div>
                  </div>
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
        </div>

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
                className="text-[#FF4F18] text-4xl mb-3"
              >
                👆
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">How to Reserve</h3>
              <p className="text-gray-200">
                Click on any <span className="text-[#FF4F18] font-semibold">table</span> to make a reservation
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Tables are color-coded by zone · <span style={{ color: '#888888' }}>Dark Grey</span> = booked
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
};
