"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from 'next/navigation';
import Head from "next/head";
import * as THREE from 'three';
import { createScene, createFloor } from '@/scripts/floor';
import { UIManager } from '@/scripts/managers/UIManager';
import { FaBoxOpen, FaTrash, FaArrowsAltH, FaSave, FaFolderOpen } from "react-icons/fa";
import { RiLayoutGridFill } from "react-icons/ri";
import styles from "@/css/ui.css";
import touchStyles from "@/css/touch-help.css";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function EditFloorplan() {
  const router = useRouter();
  const params = useParams();
  const containerRef = useRef(null);
  const managersRef = useRef(null);
  const sceneRef = useRef(null);
  const uiManagerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = 'loaded';
      window.location.reload();
    }
  }, []);

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

        // Initialize UI Manager first
        const uiManager = new UIManager(
          scene,
          floor,
          2, // gridSize
          camera,
          renderer,
          controls
        );
        uiManagerRef.current = uiManager;

        // Initialize wall preview properly
        uiManager.wallManager.createPreviewWall();
        scene.add(uiManager.wallManager.previewWall);

         // Load the scene data (cached + progressive)
         if (params.id) {
           try {
             const cacheKey = `floorplan_${params.id}`;
             const tsKey = `floorplan_${params.id}_ts`;
             const staleMs = 3 * 60 * 1000;

             let sceneData;
             try {
               const cached = localStorage.getItem(cacheKey);
               const tsRaw = localStorage.getItem(tsKey);
               const ts = tsRaw ? Number(tsRaw) : 0;
               const fresh = cached && ts && (Date.now() - ts) < staleMs;
               if (fresh) {
                 sceneData = JSON.parse(cached);
               }
             } catch (e) {
               console.warn('Failed to read floorplan cache:', e);
             }

             if (!sceneData) {
               const response = await fetch(`/api/scenes/${params.id}`, {
                 headers: {
                   'Authorization': `Bearer ${token}`
                 }
               });

               if (!response.ok) {
                 throw new Error('Failed to load scene');
               }

               sceneData = await response.json();

               try {
                 localStorage.setItem(cacheKey, JSON.stringify(sceneData));
                 localStorage.setItem(tsKey, String(Date.now()));
               } catch (e) {
                 console.warn('Failed to write floorplan cache:', e);
               }
             }

             // Always sync the name from DB so saves preserve the real name
             if (sceneData?.name) {
               localStorage.setItem("currentFloorplanName", sceneData.name);
             }
             
             // Clear existing scene first
             uiManager.fileManager.clearScene();
            
            // Create a map to store walls and their UUIDs
            const wallMap = new Map();
            
            // First pass: Create walls
            const wallObjects = sceneData.data.objects.filter(obj => obj.type === 'wall');
            for (const objData of wallObjects) {
              const wall = await uiManager.fileManager.recreateObject(objData, false, wallMap);
              if (wall) {
                wallMap.set(objData.userData.uuid, wall);
                wall.userData.isWall = true;
                wall.userData.uuid = objData.userData.uuid;
                uiManager.wallManager.walls.push(wall);
              }
            }

             // Second pass: Create doors and windows
             const openingsObjects = sceneData.data.objects.filter(obj => 
               obj.type === 'door' || obj.type === 'window'
             );
             for (const objData of openingsObjects) {
               const opening = await uiManager.fileManager.recreateObject(objData, false, wallMap);
              if (opening) {
                const parentWall = wallMap.get(objData.userData.parentWallId);
                if (parentWall) {
                  parentWall.userData.openings = parentWall.userData.openings || [];
                  parentWall.userData.openings.push(opening);
                  opening.userData.parentWall = parentWall;
                }
              }
             }

             // Third pass: Progressive furniture loading
             const furnitureObjects = sceneData.data.objects.filter(obj => obj.type === 'furniture');

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
                 if (userData.maxCapacity === 2 || userData.is2SeaterTable) return [0.9, 0.8, 0.9];
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

             const placeholders = new Map();
             furnitureObjects.forEach((objData, idx) => {
               const key = objData.objectId || objData.userData?.uuid || objData._id || String(idx);
               const [w, h, d] = getPlaceholderDims(objData.userData);
               const geom = new THREE.BoxGeometry(w, h, d);
               geom.translate(0, h / 2, 0);
               const mesh = new THREE.Mesh(geom, placeholderMaterialTemplate.clone());
               mesh.receiveShadow = true;

               const placeholderGroup = new THREE.Group();
               placeholderGroup.add(mesh);
               placeholderGroup.position.fromArray(objData.position);
               placeholderGroup.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
               placeholderGroup.scale.fromArray(objData.scale);
               placeholderGroup.userData = {
                 ...objData.userData,
                 isMovable: true,
                 isRotatable: true,
                 isInteractable: true,
                 ...(objData.userData?.isTable && {
                   maxCapacity: objData.userData.is2SeaterTable ? 2 : (objData.userData.maxCapacity || 4),
                   bookingStatus: objData.userData.bookingStatus || 'available',
                   currentBooking: objData.userData.currentBooking || null,
                   bookingHistory: objData.userData.bookingHistory || []
                 })
               };

               scene.add(placeholderGroup);
               placeholders.set(key, placeholderGroup);
             });

             // Load real furniture in parallel and swap placeholders as they finish
             const loadPromises = furnitureObjects.map(async (objData, idx) => {
               const key = objData.objectId || objData.userData?.uuid || objData._id || String(idx);
               const placeholder = placeholders.get(key);

               const furniture = await uiManager.fileManager.recreateObject(objData, false, wallMap);
               if (furniture) {
                 // If the user moved the placeholder while loading, preserve its latest transform
                 if (placeholder) {
                   furniture.position.copy(placeholder.position);
                   furniture.rotation.copy(placeholder.rotation);
                   furniture.scale.copy(placeholder.scale);
                 }

                 // Preserve furniture properties
                 const preservedUserData = {
                   ...objData.userData,
                   isMovable: true,
                   isRotatable: true,
                   isInteractable: true,
                   ...(objData.userData?.isTable && {
                     maxCapacity: objData.userData.is2SeaterTable ? 2 : (objData.userData.maxCapacity || 4),
                     bookingStatus: objData.userData.bookingStatus || 'available',
                     currentBooking: objData.userData.currentBooking || null,
                     bookingHistory: objData.userData.bookingHistory || []
                   })
                 };

                 furniture.userData = {
                   ...furniture.userData,
                   ...preservedUserData
                 };

                 // Swap placeholder
                 if (placeholder) {
                   scene.remove(placeholder);
                   placeholder.traverse((o) => {
                     if (o.geometry) o.geometry.dispose();
                     if (o.material) {
                       if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                       else o.material.dispose();
                     }
                   });
                   placeholders.delete(key);
                 }

                 scene.add(furniture);
               }
               return furniture;
             });

             // Keep loading in background; editor is usable with placeholders
             Promise.allSettled(loadPromises).catch(() => {});

           } catch (error) {
             console.error('Error loading scene:', error);
           }
         }

        // Animation loop
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

        // Add to managersRef for cleanup
        managersRef.current = {
          uiManager,
          dragManager: uiManager.dragManager
        };

        setIsLoading(false);

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
  }, [params.id, router]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Edit Floor Plan</title>
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
 
        <aside 
          className="sidebar"
          id="sidebar"
        >
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

        {/* Loading overlay removed: placeholders render immediately */}
      </div>
    </>
  );
}
