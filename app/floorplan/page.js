"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Head from "next/head";
import * as THREE from 'three';
import { createScene, createFloor } from '@/scripts/floor';
import { UIManager } from '@/scripts/managers/UIManager';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FaBoxOpen, FaTrash, FaArrowsAltH, FaSave } from "react-icons/fa";
import styles from "@/css/ui.css";
import touchStyles from "@/css/touch-help.css";
import { chair, table, sofa, roundTable, create2SeaterTable } from '@/scripts/asset';

function FloorplanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef(null);
  const managersRef = useRef(null);
  const sceneRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const token = localStorage.getItem("restaurantOwnerToken");
    const storedRestaurantData = localStorage.getItem("restaurantData");

    if (!token || !storedRestaurantData) {
      console.error('Missing token or restaurant data');
      router.push('/restaurant-owner');
      return;
    }

    const restaurantData = JSON.parse(storedRestaurantData);
    console.log('Restaurant Data:', restaurantData);

    const initScene = async () => {
      try {
        setIsLoading(true);
        
        // Initialize Three.js scene
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          powerPreference: "high-performance"
        });
        
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
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;
        
        // Ensure zoom is explicitly enabled
        controls.enableZoom = true;
        controls.zoomSpeed = 1.0;
        controls.minDistance = 1;
        controls.maxDistance = 50;

        // Add floor
        const floor = createFloor(20, 20, 2);
        scene.add(floor);

        // Initialize UI Manager with save callback
        const handleSave = async (sceneData) => {
          try {
            console.log('Creating new floorplan:', sceneData);
            const restaurantData = JSON.parse(localStorage.getItem("restaurantData"));

            // Transform the objects to include objectId and booking properties
            const objectsWithIds = sceneData.objects.map(obj => {
              const baseObject = {
                ...obj,
                objectId: THREE.MathUtils.generateUUID()
              };

              // Add additional properties for tables
              if (obj.userData && obj.userData.isTable) {
                return {
                  ...baseObject,
                  userData: {
                    ...obj.userData,
                    isTable: true,
                    maxCapacity: obj.userData.is2SeaterTable ? 2 : (obj.userData.maxCapacity || 4),
                    bookingStatus: obj.userData.bookingStatus || 'available',
                    currentBooking: obj.userData.currentBooking || null,
                    bookingHistory: obj.userData.bookingHistory || []
                  }
                };
              }

              return baseObject;
            });

            // Create floorplan using new multiple floorplan API
            const response = await fetch(`/api/restaurants/${restaurantData.id}/floorplans`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Make sure token is properly formatted
              },
              body: JSON.stringify({
                name: 'Restaurant Floor Plan',
                data: {
                  objects: objectsWithIds,
                  version: 2
                }
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create scene');
            }

            const responseData = await response.json();
            console.log('API Response:', responseData);

            // Update localStorage with the new floorplan
            const updatedRestaurantData = {
              id: restaurantData.id,
              floorplanId: responseData.floorplan._id
            };
            localStorage.setItem("restaurantData", JSON.stringify(updatedRestaurantData));

            alert('New floor plan created successfully!');
            router.push('/restaurant-owner/setup/dashboard');
          } catch (error) {
            console.error('Error details:', error);
            if (error.message.includes('Unauthorized')) {
              // Handle token expiration
              localStorage.removeItem('restaurantOwnerToken');
              router.push('/restaurant-owner');
            } else {
              alert('Failed to create floor plan: ' + error.message);
            }
          }
        };

        // Initialize UI Manager with all required managers
        const uiManager = new UIManager(
          scene,
          floor,
          2, // gridSize
          camera,
          renderer,
          controls
        );
        uiManager.onSave = handleSave;
        uiManager.restaurantData = restaurantData;

        // Ensure wall mode starts as false
        uiManager.wallManager.isAddWallMode = false;
        uiManager.wallManager.previewWall.visible = false;

        // Add to managersRef for cleanup
        managersRef.current = {
          uiManager,
          dragManager: uiManager.dragManager
        };

        // Animation Loop
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current) return;
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        setIsLoading(false);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
            containerRef.current.removeChild(renderer.domElement);
          }
          renderer.dispose();
          if (sceneRef.current) {
            sceneRef.current.traverse((object) => {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(material => material.dispose());
                } else {
                  object.material.dispose();
                }
              }
            });
            sceneRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error initializing scene:', error);
        setIsLoading(false);
      }
    };

    initScene();
  }, [searchParams, router]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Create Floor Plan</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css" />
        <link rel="stylesheet" href={styles} />
        <link rel="stylesheet" href={touchStyles} />
      </Head>
      <div>
        <button
          className="sidebar-toggle"
          id="sidebar-toggle"
          data-tooltip="Toggle Library"
        >
          <i className="bi bi-layout-sidebar"></i>
        </button>
 
        <aside className="sidebar" id="sidebar">
          <h2 className="sidebar-title">
            <FaBoxOpen size={22} style={{ marginRight: "8px" }} />
            Object Library
          </h2>
          <div className="library-content" id="library-items"></div>
        </aside>
 
        <main className="main-content">
          <div 
            ref={containerRef} 
            className="scene-container w-full h-[calc(100vh-120px)] border-2 border-gray-200 rounded-lg bg-gray-50"
          />
 
          <div className="toolbar">
            <button
              className="toolbar-btn"
              id="remove-object"
              data-tooltip="Remove Object"
            >
              <FaTrash size={20} color="#de350b" style={{ marginRight: "4px" }} />
              <span>Remove</span>
            </button>
            <button
              className="toolbar-btn"
              id="switch-direction"
              data-tooltip="Switch Direction"
            >
              <FaArrowsAltH size={20} style={{ marginRight: "4px" }} />
              <span>Direction</span>
            </button>
          </div>
 
          <div className="file-controls">
            <button
              className="toolbar-btn"
              id="save-btn"
              data-tooltip="Save Scene"
            >
              <FaSave size={20} style={{ marginRight: "4px" }} />
              <span>Save</span>
            </button>
          </div>
        </main>
 
        <div id="scale-panel" className="tool-panel">
          <div className="preset-sizes">
            <button className="size-btn small" data-scale="0.5">S</button>
            <button className="size-btn medium" data-scale="1">M</button>
            <button className="size-btn large" data-scale="1.5">L</button>
          </div>
          <div className="size-slider">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              defaultValue="1"
              id="scale-slider"
            />
            <label htmlFor="scale-slider">Size Adjust</label>
          </div>
        </div>
 
        {/* Loading overlay removed */}
      </div>
    </>
  );
}

export default function FloorplanEditor() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF4F18]"></div>
      </div>
    }>
      <FloorplanContent />
    </Suspense>
  );
}
