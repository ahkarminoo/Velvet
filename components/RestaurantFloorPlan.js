import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useRouter } from 'next/navigation';
import { createScene, createFloor } from '@/scripts/floor';
import { chair, table, roundTable, sofa, create2SeaterTable, create8SeaterTable, plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox } from '@/scripts/asset';
import { DoorManager} from '@/scripts/managers/DoorManager';
import { WindowManager } from '@/scripts/managers/WindowManager';
import FloorplanManager from './FloorplanManager';
import '@/css/loading.css';

export default function RestaurantFloorPlan({ token, restaurantId, isCustomerView = false }) {
  // Restaurant table label styles - professional and clear for staff
  const restaurantTableLabelStyles = `
    .restaurant-table-label {
      position: absolute;
      z-index: 1000;
      background: linear-gradient(135deg, #3A2E2B 0%, #4A3C39 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 3px 8px rgba(58, 46, 43, 0.4);
      pointer-events: none;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(5px);
      min-width: 32px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .restaurant-table-label .table-number {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.5px;
    }

    /* Add a subtle glow effect for better visibility */
    .restaurant-table-label::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, #FF4F18, #3A2E2B);
      border-radius: 10px;
      z-index: -1;
      opacity: 0.7;
    }

    /* Responsive sizing */
    @media (max-width: 768px) {
      .restaurant-table-label {
        font-size: 12px;
        padding: 4px 8px;
      }
      
      .restaurant-table-label .table-number {
        font-size: 11px;
      }
    }
  `;

  // Add restaurant table label styles to the document
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'restaurant-floorplan-label-styles';
    style.textContent = restaurantTableLabelStyles;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('restaurant-floorplan-label-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const controlsRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [floorplanId, setFloorplanId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloorplan, setSelectedFloorplan] = useState(null);
  const [showFloorplanManager, setShowFloorplanManager] = useState(false);
  const router = useRouter();
  const doorManagerRef = useRef(null);
  const windowManagerRef = useRef(null);

  // Cleanup function to properly dispose of Three.js resources
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (window._restaurantFloorplanResizeHandler) {
      window.removeEventListener('resize', window._restaurantFloorplanResizeHandler);
      window._restaurantFloorplanResizeHandler = null;
    }

    // Clean up table labels from this component only
    const existingLabels = document.querySelectorAll('.restaurant-table-label[data-component="restaurant-floorplan"]');
    existingLabels.forEach(label => {
      if (label.parentNode) {
        label.parentNode.removeChild(label);
      }
    });

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
    }

    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }

    if (controlsRef.current) {
      controlsRef.current.dispose();
    }

    // Clear references without using setState
    sceneRef.current = null;
    rendererRef.current = null;
    controlsRef.current = null;
  };

  useEffect(() => {
    const fetchFloorplanId = async () => {
      try {
        console.log('Fetching floorplan ID for restaurant:', restaurantId);
        const response = await fetch(`/api/restaurants/${restaurantId}/floorplan`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.error('Failed to fetch floorplan:', response.status);
          throw new Error('Failed to fetch floorplan');
        }
        
        const data = await response.json();
        console.log('Received restaurant data:', data);
        
        if (data.defaultFloorplanId) {
          console.log('Found default floorplan ID:', data.defaultFloorplanId);
          setFloorplanId(data.defaultFloorplanId);
        }
      } catch (error) {
        console.error('Error fetching floorplan:', error);
      }
    };

    if (restaurantId && token) {
      fetchFloorplanId();
    }
  }, [restaurantId, token]);

  // Handle floorplan selection from manager
  const handleFloorplanSelect = (floorplan) => {
    setSelectedFloorplan(floorplan);
    setFloorplanId(floorplan._id);
    setShowFloorplanManager(false);
  };

  useEffect(() => {
    console.log('Component mounted with floorplanId:', floorplanId);
    if (!containerRef.current || !floorplanId) {
      console.log('Missing requirements:', {
        container: !!containerRef.current,
        floorplanId: floorplanId
      });
      return;
    }
    // If there's already a scene in the container or no floorplanId, don't initialize
    if (!containerRef.current || !floorplanId || containerRef.current.children.length > 0) return;

    const initScene = async () => {
      cleanup();

      try {
        // Initialize Three.js scene
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          powerPreference: "high-performance"
        });
        rendererRef.current = renderer;
        
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);

        // Scene Initialization
        const scene = createScene();
        sceneRef.current = scene;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Add hemisphere light for better color
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.5);
        scene.add(hemisphereLight);
        
        // Camera Setup
        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(8, 8, 8);
        camera.lookAt(0, 0, 0);

        // Initialize OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        
        // Default controls setup
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.minDistance = 3;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2;

        // Enable auto-rotation
        controls.autoRotate = true;
        controls.autoRotateSpeed = 3;

        // Mouse controls
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // Touch controls
        controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        if (isCustomerView) {
            controls.autoRotate = false;
            controls.autoRotateSpeed = 0.5;
            controls.panSpeed = 1.0;
            controls.zoomSpeed = 1.2;
            controls.rotateSpeed = 0.8;
        }

        // Add event listeners for mouse wheel
        renderer.domElement.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (event.deltaY > 0) {
                camera.position.multiplyScalar(1.1);
            } else {
                camera.position.multiplyScalar(0.9);
            }
        }, { passive: false });

        // Add floor
        const floor = createFloor(20, 20, 2);
        scene.add(floor);

        // Initialize managers
        doorManagerRef.current = new DoorManager(scene, { walls: [] }, renderer);
        windowManagerRef.current = new WindowManager(scene, { walls: [] }, renderer);

        // Add this after scene setup but before the animation loop
        const loadFloorplanData = async () => {
          try {
            console.log('Starting to load floorplan with ID:', floorplanId);
            const cacheKey = `floorplan_${floorplanId}`;
            const tsKey = `floorplan_${floorplanId}_ts`;
            const staleMs = 3 * 60 * 1000;

            let floorplanData;
            try {
              const cached = localStorage.getItem(cacheKey);
              const tsRaw = localStorage.getItem(tsKey);
              const ts = tsRaw ? Number(tsRaw) : 0;
              const fresh = cached && ts && (Date.now() - ts) < staleMs;

              if (fresh) {
                floorplanData = JSON.parse(cached);
              }
            } catch (e) {
              console.warn('Failed to read floorplan cache:', e);
            }

            if (!floorplanData) {
              let response;
              if (isCustomerView) {
                response = await fetch(`/api/scenes/${floorplanId}/public`);
              } else {
                const token = localStorage.getItem("restaurantOwnerToken");
                response = await fetch(`/api/scenes/${floorplanId}`, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                });
              }

              if (!response.ok) throw new Error('Failed to load floorplan');

              floorplanData = await response.json();

              try {
                localStorage.setItem(cacheKey, JSON.stringify(floorplanData));
                localStorage.setItem(tsKey, String(Date.now()));
              } catch (e) {
                console.warn('Failed to write floorplan cache:', e);
              }
            }
            
            if (floorplanData.data && floorplanData.data.objects) {
              const wallMap = new Map();

              const placeholderMaterialTemplate = new THREE.MeshPhongMaterial({
                color: 0x8a8a8a,
                transparent: true,
                opacity: 0.45
              });

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

              // First pass: Create walls
              const wallObjects = floorplanData.data.objects.filter(obj => obj.type === 'wall');
              for (const objData of wallObjects) {
                const wallGeometry = new THREE.BoxGeometry(2, 2, 0.2);
                const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
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
                  openings: [] // Initialize openings array
                };
                
                scene.add(wall);
                wallMap.set(objData.userData.uuid, wall);
              }

              // Second pass: Create doors and windows
              const openingsObjects = floorplanData.data.objects.filter(obj => 
                obj.type === 'door' || obj.type === 'window'
              );

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
                    opening.rotation.set(
                      objData.rotation.x,
                      objData.rotation.y,
                      objData.rotation.z
                    );
                    opening.scale.fromArray(objData.scale);
                    
                    // Add to parent wall's openings
                    parentWall.userData.openings.push(opening);
                  }
                }
              }

              // Third pass: progressive furniture loading
              const furnitureObjects = floorplanData.data.objects.filter(obj => !['wall', 'door', 'window'].includes(obj.type));

              // First pass: placeholders
              const placeholders = new Map();
              for (const objData of furnitureObjects) {
                const [w, h, d] = getPlaceholderDims(objData.userData);
                const geom = new THREE.BoxGeometry(w, h, d);
                geom.translate(0, h / 2, 0);
                // Clone material per placeholder so disposing doesn't affect others
                const mesh = new THREE.Mesh(geom, placeholderMaterialTemplate.clone());
                mesh.receiveShadow = true;

                // Booking color logic (red = booked)
                if (objData.userData?.isBooked) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.color.setHex(0xff0000));
                  } else if (mesh.material) {
                    mesh.material.color.setHex(0xff0000);
                  }
                }

                const placeholderGroup = new THREE.Group();
                placeholderGroup.add(mesh);
                placeholderGroup.position.fromArray(objData.position);
                placeholderGroup.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                placeholderGroup.scale.fromArray(objData.scale);
                placeholderGroup.userData = { ...objData.userData };

                scene.add(placeholderGroup);
                placeholders.set(objData, placeholderGroup);
              }

              // Let the scene show immediately
              setIsLoading(false);

              // Second pass: load real models in parallel
              const loadPromises = furnitureObjects.map(async (objData) => {
                let model;

                if (objData.userData.isChair) {
                  model = await chair(scene);
                } else if (objData.userData.isTable) {
                  if (objData.userData.isRoundTable) {
                    model = await roundTable(scene);
                  } else if (objData.userData.maxCapacity === 2) {
                    model = await create2SeaterTable(scene);
                  } else if (objData.userData.maxCapacity === 8) {
                    model = await create8SeaterTable(scene);
                  } else {
                    model = await table(scene);
                  }
                } else if (objData.userData.isSofa) {
                  model = await sofa(scene);
                } else if (objData.userData.isPlant) {
                  if (objData.userData.isPlant01) {
                    model = await plant01(scene);
                  } else if (objData.userData.isPlant02) {
                    model = await plant02(scene);
                  }
                } else if (objData.userData.isFridge) {
                  model = await largeFridge(scene);
                } else if (objData.userData.isFoodStand) {
                  model = await foodStand(scene);
                } else if (objData.userData.isDrinkStand) {
                  model = await drinkStand(scene);
                } else if (objData.userData.isIceBox) {
                  model = await iceBox(scene);
                } else if (objData.userData.isIceCreamBox) {
                  model = await iceCreamBox(scene);
                }

                if (model) {
                  model.position.fromArray(objData.position);
                  model.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                  model.scale.fromArray(objData.scale);
                  model.userData = { ...model.userData, ...objData.userData };

                  // Booking color logic (red = booked)
                  if (objData.userData?.isBooked) {
                    model.traverse((child) => {
                      if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) child.material.forEach((m) => m.color.setHex(0xff0000));
                        else child.material.color.setHex(0xff0000);
                      }
                    });
                  }

                  const placeholder = placeholders.get(objData);
                  if (placeholder) {
                    scene.remove(placeholder);
                    placeholder.traverse((o) => {
                      if (o.geometry) o.geometry.dispose();
                      if (o.material) {
                        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                        else o.material.dispose();
                      }
                    });
                    placeholders.delete(objData);
                  }
                }
                return model;
              });

              await Promise.allSettled(loadPromises);
            }
          } catch (error) {
            console.error('Error loading floorplan:', error);
          } finally {
            setIsLoading(false);
          }
        };

        if (floorplanId) {
          // Load asynchronously so the scene can render placeholders immediately
          const loadPromise = loadFloorplanData();
          loadPromise.then(() => {
            // Create table labels after real models are loaded
            setTimeout(() => {
              try {
                createRestaurantTableLabels();
              } catch (e) {
                console.warn('Failed to create table labels after load:', e);
              }
            }, 100);
          });
        }

        // Table label functionality for restaurant staff
        const tableLabels = [];

        const createRestaurantTableLabels = () => {
          // Clear existing labels
          tableLabels.forEach(label => {
            if (label.parentNode) {
              label.parentNode.removeChild(label);
            }
          });
          tableLabels.length = 0;

          // Track processed table IDs to avoid duplicates
          const processedTableIds = new Set();

          // Create labels for all tables
          sceneRef.current.traverse((object) => {
            if (object.userData?.isTable) {
              // Generate a unique table ID
              let tableId = object.userData.objectId || object.userData.friendlyId || object.userData.id;
              
              // If no ID exists, generate one based on position
              if (!tableId) {
                const pos = object.position;
                tableId = `T${Math.round(pos.x)}${Math.round(pos.z)}`;
              }
              
              // Ensure uniqueness by adding a counter if needed
              let uniqueTableId = tableId;
              let counter = 1;
              while (processedTableIds.has(uniqueTableId)) {
                uniqueTableId = `${tableId}_${counter}`;
                counter++;
              }
              processedTableIds.add(uniqueTableId);
              
              // Create label element with unique identifier for this component
              const label = document.createElement('div');
              label.className = 'restaurant-table-label';
              label.setAttribute('data-table-id', uniqueTableId);
              label.setAttribute('data-component', 'restaurant-floorplan');
              label.innerHTML = `<span class="table-number">${uniqueTableId}</span>`;
              label.style.position = 'absolute';
              label.style.pointerEvents = 'none';
              label.style.zIndex = '1000';
              label.style.transform = 'translate(-50%, -50%)';
              
              // Store reference to the table object for positioning
              label.tableObject = object;
              
              // Append to the container instead of document.body
              if (containerRef.current) {
                containerRef.current.appendChild(label);
              } else {
                document.body.appendChild(label);
              }
              tableLabels.push(label);
            }
          });
        };

        const updateRestaurantTableLabelPositions = () => {
          const container = containerRef.current;
          if (!container) return;
          
          tableLabels.forEach(label => {
            if (label.tableObject) {
              // Get world position of table
              const worldPosition = new THREE.Vector3();
              label.tableObject.getWorldPosition(worldPosition);
              
              // Convert to screen coordinates
              const screenPosition = worldPosition.clone().project(camera);
              
              // Only show labels that are in front of the camera (z < 1)
              if (screenPosition.z < 1) {
                // Convert to pixel coordinates relative to the container
                const x = (screenPosition.x * 0.5 + 0.5) * container.clientWidth;
                const y = (screenPosition.y * -0.5 + 0.5) * container.clientHeight;
                
                // Position label relative to the container
                label.style.position = 'absolute';
                label.style.left = x + 'px';
                label.style.top = (y - 15) + 'px'; // Slightly above table center
                label.style.transform = 'translate(-50%, -50%)';
                label.style.display = 'block';
              } else {
                // Hide labels that are behind the camera
                label.style.display = 'none';
              }
            }
          });
        };

        // Animation Loop
        let frameCount = 0;
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
          
          // Update table label positions every 3rd frame to avoid FPS drops
          frameCount++;
          if (frameCount % 3 === 0) {
            updateRestaurantTableLabelPositions();
          }
        };
        animate();

        // Table labels are created after loadFloorplanData finishes (see above)

        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current || !camera || !renderer) return;
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window._restaurantFloorplanResizeHandler = handleResize;
        window.addEventListener('resize', handleResize);

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing scene:', error);
      }
    };

    initScene();

    return cleanup;
  }, [floorplanId, isCustomerView]);

  return (
    <div className="w-full space-y-6">
      {/* Floorplan Manager */}
      {!isCustomerView && (
        <FloorplanManager
          restaurantId={restaurantId}
          token={token}
          onFloorplanSelect={handleFloorplanSelect}
        />
      )}

      {/* Current Floorplan Display */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#3A2E2B]">
              {selectedFloorplan ? selectedFloorplan.name : 'Restaurant Floor Plan'}
            </h2>
            {selectedFloorplan && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedFloorplan.data?.objects?.length || 0} objects
              </p>
            )}
          </div>
          
          {!isCustomerView && (
            <div className="flex gap-3">
              {floorplanId && (
                <button
                  onClick={() => {
                    const restaurantData = {
                      id: restaurantId,
                      floorplanId: floorplanId
                    };
                    localStorage.setItem("restaurantData", JSON.stringify(restaurantData));
                    router.push(`/floorplan/edit/${floorplanId}`);
                  }}
                  className="px-4 py-2 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90 transition-all duration-200"
                >
                  Edit Floor Plan
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="relative w-full h-[80vh] rounded-lg bg-gradient-to-b from-gray-50 to-gray-100 shadow-lg">
          <div ref={containerRef} className="absolute inset-0 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
