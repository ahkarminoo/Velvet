import * as THREE from 'three';
import { create2SeaterTable, create8SeaterTable } from '../asset.js';

export class FileManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.API_URL = this.getApiUrl();
        this.initFileHandlers();
    }

    getApiUrl() {
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
            // Get the current origin (protocol + hostname + port)
            const origin = window.location.origin;
            return `${origin}/api/scenes`;
        }
        return '/api/scenes';
    }

    initFileHandlers() {
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const fileInput = document.getElementById('file-input');

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveScene();
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSceneList();
            });
        }
    }

    async saveScene() {
        try {
            this.ui.showLoading(true);
            const token = localStorage.getItem("restaurantOwnerToken");
            const restaurantData = JSON.parse(localStorage.getItem("restaurantData"));
            
            if (!token || !restaurantData?.id) {
                throw new Error('No authentication token or restaurant ID found');
            }

            // Initialize counters for different types of objects
            const counters = {
                table: 1,
                chair: 1,
                sofa: 1,
                wall: 1,
                door: 1,
                window: 1,
                equipment: 1
            };

            const currentFloorplanName = localStorage.getItem("currentFloorplanName") || "Restaurant Floor Plan";

            const sceneData = {
                name: currentFloorplanName,
                restaurantId: restaurantData.id,
                data: {
                    objects: [],
                    version: 2
                }
            };

            // Collect scene data with sanitized objects
            this.ui.scene.traverse(obj => {
                if (obj.userData?.isMovable || obj.userData?.isWall || 
                    obj.userData?.isDoor || obj.userData?.isWindow) {
                    
                    // Generate user-friendly ID based on object type
                    let friendlyId;
                    if (obj.userData.isTable) {
                        friendlyId = `t${counters.table++}`;
                    } else if (obj.userData.isChair) {
                        friendlyId = `c${counters.chair++}`;
                    } else if (obj.userData.isSofa) {
                        friendlyId = `s${counters.sofa++}`;
                    } else if (obj.userData.isWall) {
                        friendlyId = `w${counters.wall++}`;
                    } else if (obj.userData.isDoor) {
                        friendlyId = `d${counters.door++}`;
                    } else if (obj.userData.isWindow) {
                        friendlyId = `win${counters.window++}`;
                    } else if (obj.userData.isFridge) {
                        friendlyId = `fridge${counters.equipment++}`;
                    } else if (obj.userData.isFoodStand) {
                        friendlyId = `foodstand${counters.equipment++}`;
                    } else if (obj.userData.isDrinkStand) {
                        friendlyId = `drinkstand${counters.equipment++}`;
                    } else if (obj.userData.isIceBox) {
                        friendlyId = `icebox${counters.equipment++}`;
                    } else if (obj.userData.isIceCreamBox) {
                        friendlyId = `icecream${counters.equipment++}`;
                    } else if (obj.userData.isPlant) {
                        friendlyId = `plant${counters.equipment++}`;
                    } else {
                        friendlyId = `obj${THREE.MathUtils.generateUUID().slice(0, 4)}`;
                    }

                    // Create a clean object without circular references
                    const cleanObject = {
                        type: obj.userData.isWall ? 'wall' : 
                              obj.userData.isDoor ? 'door' :
                              obj.userData.isWindow ? 'window' : 'furniture',
                        objectId: friendlyId,
                        position: obj.position.toArray(),
                        rotation: {
                            x: obj.rotation.x,
                            y: obj.rotation.y,
                            z: obj.rotation.z
                        },
                        scale: obj.scale.toArray(),
                        userData: { 
                            ...obj.userData,
                            friendlyId, // Store the friendly ID in userData as well
                            maxCapacity: obj.userData.isTable ? (obj.userData.maxCapacity || 4) : undefined
                        }
                    };

                    // Preserve the original _id if it exists
                    if (obj.userData._id) {
                        cleanObject._id = obj.userData._id;
                    }

                    // Ensure wall has UUID
                    if (obj.userData.isWall) {
                        if (!obj.userData.uuid) {
                            obj.userData.uuid = THREE.MathUtils.generateUUID();
                        }
                        cleanObject.userData.uuid = obj.userData.uuid;
                        
                        // Store opening UUIDs
                        if (obj.userData.openings) {
                            cleanObject.userData.openingIds = obj.userData.openings.map(opening => opening.uuid);
                        }
                        delete cleanObject.userData.openings;
                    }

                    // Handle doors and windows
                    if (obj.userData.isDoor || obj.userData.isWindow) {
                        if (!obj.uuid) {
                            obj.uuid = THREE.MathUtils.generateUUID();
                        }
                        if (obj.userData.parentWall) {
                            cleanObject.userData.parentWallId = obj.userData.parentWall.userData.uuid;
                        }
                        delete cleanObject.userData.parentWall;
                    }

                    sceneData.data.objects.push(cleanObject);
                }
            });

            // Determine if we're updating an existing floorplan or creating a new one
            const existingFloorplanId = restaurantData.floorplanId;
            const endpoint = existingFloorplanId 
                ? `/api/scenes/${existingFloorplanId}` 
                : '/api/scenes';
            const method = existingFloorplanId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(sceneData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save floorplan');
            }

            const result = await response.json();
            console.log('Save successful:', result);

            // Capture and upload screenshot
            const floorplanId = existingFloorplanId || result.floorplan._id;

            // Floorplan data changed; invalidate cached floorplan JSON (non-sensitive)
            try {
                localStorage.removeItem(`floorplan_${floorplanId}`);
                localStorage.removeItem(`floorplan_${floorplanId}_ts`);
            } catch (e) {
                console.warn('Failed to invalidate floorplan cache:', e);
            }
            await this.captureAndUploadScreenshot(floorplanId, token, existingFloorplanId ? true : false);

            // Only update restaurantData if we're creating a new floorplan
            if (!existingFloorplanId) {
                restaurantData.floorplanId = result.floorplan._id;
                localStorage.setItem("restaurantData", JSON.stringify(restaurantData));
            }

            alert('Floor plan saved successfully!');
            window.location.href = '/restaurant-owner/setup/dashboard';
            
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Save failed: ${error.message}`);
        } finally {
            this.ui.showLoading(false);
        }
    }

    async captureAndUploadScreenshot(floorplanId, token, isEditing = false) {
        try {
            console.log('Capturing screenshot for floorplan:', floorplanId);
            
            // Check if we're in production environment
            const isProduction = process.env.NODE_ENV === 'production' || 
                                window.location.hostname !== 'localhost';
            
            if (isProduction) {
                console.log('Production environment detected - using enhanced screenshot capture');
            }
            
            // Hide UI elements temporarily for clean screenshot
            const elementsToHide = [
                document.querySelector('.sidebar'),
                document.querySelector('.toolbar'),
                document.querySelector('.file-controls'),
                document.getElementById('scale-panel')
            ];
            
            const originalDisplayValues = elementsToHide.map(el => {
                if (el) {
                    const display = el.style.display;
                    el.style.display = 'none';
                    return display;
                }
                return null;
            });

            // Wait a frame for UI to hide
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Position camera for better screenshot angle
            const originalCameraPosition = this.ui.camera.position.clone();
            const originalCameraRotation = this.ui.camera.rotation.clone();
            const originalCameraUp = this.ui.camera.up.clone();
            
            // Set optimal camera position for top-down view
            this.ui.camera.position.set(0, 15, 0);
            // Keep a stable top-down orientation.
            // Using the default up vector (0, 1, 0) while looking straight down can cause camera roll.
            this.ui.camera.up.set(0, 0, -1);
            this.ui.camera.lookAt(0, 0, 0);
            this.ui.camera.updateMatrixWorld();
            
            // CREATE TEMPORARY TABLE LABELS FOR SCREENSHOT
            const tableLabels = [];
            
            // Create simple black text labels directly on table surfaces
            let tableCounter = 1;
            const processedTables = new Set(); // Avoid duplicate labels
            console.log('Debug: Starting table label creation for screenshot');
            
            // First pass: find all table objects in the scene
            const tableObjects = [];
            this.ui.scene.traverse((object) => {
                // Check for tables more thoroughly
                if (object.userData?.isTable || 
                    object.userData?.type === 'furniture' && object.userData?.isTable ||
                    object.name?.toLowerCase().includes('table') ||
                    (object.parent && object.parent.userData?.isTable)) {
                    
                    // Use the parent object if this is a child of a table group
                    const tableObject = object.userData?.isTable ? object : 
                                       (object.parent?.userData?.isTable ? object.parent : object);
                    
                    // Avoid duplicates
                    const tableKey = `${tableObject.position.x}_${tableObject.position.y}_${tableObject.position.z}`;
                    if (!processedTables.has(tableKey)) {
                        processedTables.add(tableKey);
                        tableObjects.push(tableObject);
                        console.log('Debug: Found table object at:', tableObject.position, 'userData:', tableObject.userData);
                    }
                }
            });
            
            console.log('Debug: Total unique tables found:', tableObjects.length);
            
            // Second pass: create labels for all found tables
            tableObjects.forEach((tableObject) => {
                // Try multiple ID sources, fallback to counter-based ID
                const tableId = tableObject.userData?.objectId || 
                               tableObject.userData?.friendlyId || 
                               tableObject.userData?.id || 
                               tableObject.userData?.name ||
                               tableObject.userData?._id ||
                               `T${tableCounter++}`;
                
                console.log('Debug: Creating label for table ID:', tableId, 'at position:', tableObject.position);
                
                // Create a small canvas for just the text
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 64;
                
                // Make background transparent
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Add black text only - make it bigger and bolder
                context.fillStyle = 'black';
                context.font = 'bold 32px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(tableId, canvas.width / 2, canvas.height / 2);
                
                // Create 3D sprite from canvas
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                const spriteMaterial = new THREE.SpriteMaterial({ 
                    map: texture,
                    transparent: true,
                    alphaTest: 0.01,
                    depthTest: false, // Ensure labels are always visible
                    depthWrite: false
                });
                const sprite = new THREE.Sprite(spriteMaterial);
                
                // Position sprite directly on the table surface
                sprite.position.copy(tableObject.position);
                sprite.position.y += 1.0; // Raise higher to ensure visibility
                sprite.scale.set(3, 1.5, 1); // Make even bigger for better visibility
                
                console.log('Debug: Created label sprite at position:', sprite.position);
                
                // Add to scene and track for cleanup
                this.ui.scene.add(sprite);
                tableLabels.push(sprite);
            });
            
            console.log('Debug: Created', tableLabels.length, 'table labels');
            
            // Give time for sprites to be properly rendered
            // Render multiple frames to ensure all sprites are loaded and visible
            for (let i = 0; i < 10; i++) {
                this.ui.renderer.render(this.ui.scene, this.ui.camera);
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            // Wait additional time for GPU to process all sprites
            // Reduced delay for production performance
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            
            // Force renderer to flush any pending operations
            this.ui.renderer.info.reset();
            
            // Final render before screenshot with explicit flush
            this.ui.renderer.render(this.ui.scene, this.ui.camera);
            
            // Ensure WebGL context is ready for screenshot
            const gl = this.ui.renderer.getContext();
            if (gl) {
                gl.finish(); // Force GPU to complete all operations
            }
            
            // Capture screenshot as blob with production fallback
            const canvas = this.ui.renderer.domElement;
            let blob;
            
            try {
                // Try the standard method first
                blob = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Screenshot capture timeout'));
                    }, 5000);
                    
                    canvas.toBlob((result) => {
                        clearTimeout(timeout);
                        if (result) {
                            resolve(result);
                        } else {
                            reject(new Error('Failed to capture screenshot'));
                        }
                    }, 'image/png', 0.9);
                });
            } catch (error) {
                console.error('Canvas toBlob failed, trying alternative method:', error);
                
                // Fallback: Convert canvas to data URL then to blob
                try {
                    const dataURL = canvas.toDataURL('image/png', 0.9);
                    const response = await fetch(dataURL);
                    blob = await response.blob();
                } catch (fallbackError) {
                    console.error('Fallback screenshot method failed:', fallbackError);
                    throw new Error('Screenshot capture failed in production environment');
                }
            }
            
            // Clean up temporary table labels immediately
            tableLabels.forEach(label => {
                this.ui.scene.remove(label);
                if (label.material.map) {
                    label.material.map.dispose();
                }
                label.material.dispose();
            });
            
            // Restore camera position
            this.ui.camera.position.copy(originalCameraPosition);
            this.ui.camera.rotation.copy(originalCameraRotation);
            this.ui.camera.up.copy(originalCameraUp);
            this.ui.camera.updateMatrixWorld();
            
            // Restore UI elements
            elementsToHide.forEach((el, index) => {
                if (el && originalDisplayValues[index] !== null) {
                    el.style.display = originalDisplayValues[index];
                }
            });
            
            // Upload screenshot with retry logic
            if (blob) {
                console.log('Screenshot blob created, size:', blob.size, 'bytes');
                
                const formData = new FormData();
                formData.append('screenshot', blob, `floorplan_${floorplanId}.png`);
                formData.append('floorplanId', floorplanId);
                formData.append('isEditing', isEditing.toString());
                
                // Retry logic for production reliability
                let uploadSuccess = false;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (!uploadSuccess && retryCount < maxRetries) {
                    try {
                        console.log(`Uploading screenshot (attempt ${retryCount + 1}/${maxRetries})`);
                        
                        const uploadResponse = await fetch('/api/floorplan-screenshot', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const uploadResult = await uploadResponse.json();
                            console.log('Screenshot uploaded successfully:', uploadResult.imageUrl);
                            
                            // Update floorplan with screenshot URL
                            await this.updateFloorplanScreenshot(floorplanId, uploadResult.imageUrl, token);
                            uploadSuccess = true;
                        } else {
                            const errorText = await uploadResponse.text();
                            console.error(`Upload failed (attempt ${retryCount + 1}):`, uploadResponse.status, errorText);
                            
                            if (retryCount < maxRetries - 1) {
                                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                            }
                        }
                    } catch (uploadError) {
                        console.error(`Upload error (attempt ${retryCount + 1}):`, uploadError);
                        
                        if (retryCount < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                        }
                    }
                    
                    retryCount++;
                }
                
                if (!uploadSuccess) {
                    console.error('Screenshot upload failed after all retries');
                    // Don't throw error - let the save continue without screenshot
                }
            } else {
                console.error('No screenshot blob created');
            }
            
        } catch (error) {
            console.error('Error capturing screenshot:', error);
        }
    }

    async updateFloorplanScreenshot(floorplanId, screenshotUrl, token) {
        try {
            const response = await fetch(`/api/scenes/${floorplanId}/screenshot`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ screenshotUrl })
            });
            
            if (response.ok) {
                console.log('Floorplan screenshot URL updated successfully');
            } else {
                console.error('Failed to update floorplan screenshot URL');
            }
        } catch (error) {
            console.error('Error updating floorplan screenshot URL:', error);
        }
    }

    async loadSceneList() {
        try {
            this.ui.showLoading(true);
            const response = await fetch(this.API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch scenes');
            }

            const scenes = await response.json();
            if (scenes.length === 0) {
                alert('No saved scenes found');
                return;
            }

            // Create and show scene selection modal
            this.showSceneSelectionModal(scenes);

        } catch (error) {
            console.error('Load failed:', error);
            alert(`Load failed: ${error.message}`);
        } finally {
            this.ui.showLoading(false);
        }
    }

    showSceneSelectionModal(scenes) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Load Scene</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group bg-dark">
                            ${scenes.map(scene => `
                                <button class="list-group-item list-group-item-action bg-dark text-light scene-item" 
                                        data-scene-id="${scene._id}">
                                    ${scene.name}
                                    <small class="text-muted d-block">
                                        Created: ${new Date(scene.createdAt).toLocaleString()}
                                    </small>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.btn-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelectorAll('.scene-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadScene(item.dataset.sceneId);
                document.body.removeChild(modal);
            });
        });

        document.body.appendChild(modal);
    }

    async loadScene(sceneId, isViewOnly = false) {
        try {
            this.ui.showLoading(true);
            const response = await fetch(`${this.API_URL}/${sceneId}`);
            const sceneData = await response.json();
            
            this.clearScene();
            const wallMap = new Map();

            // First pass - create walls
            const wallData = sceneData.data.objects.filter(o => o.type === 'wall');
            for (const objectData of wallData) {
                const wall = await this.recreateObject(objectData, isViewOnly, wallMap);
                if (wall) {
                    wallMap.set(objectData.userData.uuid, wall);
                    this.ui.wallManager.walls.push(wall);
                }
            }

            // Second pass - doors/windows render immediately (no OBJ loading)
            const openingData = sceneData.data.objects.filter(o => o.type === 'door' || o.type === 'window');
            for (const objectData of openingData) {
                await this.recreateObject(objectData, isViewOnly, wallMap);
            }

            // Third pass - progressive furniture loading
            const furnitureData = sceneData.data.objects.filter(o => !['wall', 'door', 'window'].includes(o.type));

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

            const placeholderMap = new Map();
            for (const objectData of furnitureData) {
                const [w, h, d] = getPlaceholderDims(objectData.userData);
                const geom = new THREE.BoxGeometry(w, h, d);
                geom.translate(0, h / 2, 0);
                // Clone material per placeholder so disposing doesn't affect others
                const mesh = new THREE.Mesh(geom, placeholderMaterialTemplate.clone());
                mesh.castShadow = false;
                mesh.receiveShadow = true;

                const group = new THREE.Group();
                group.add(mesh);
                group.position.fromArray(objectData.position);
                group.rotation.set(objectData.rotation.x, objectData.rotation.y, objectData.rotation.z);
                group.scale.fromArray(objectData.scale);
                group.userData = {
                    ...objectData.userData,
                    _id: objectData._id,
                    isInteractable: !isViewOnly,
                    maxCapacity: objectData.userData?.maxCapacity || 4
                };

                this.ui.scene.add(group);
                placeholderMap.set(objectData, group);
            }

            // Load real furniture in parallel and swap placeholders as they finish
            const loadPromises = furnitureData.map(async (objectData) => {
                const model = await this.recreateObject(objectData, isViewOnly, wallMap);
                if (model) {
                    const placeholder = placeholderMap.get(objectData);
                    if (placeholder) {
                        this.ui.scene.remove(placeholder);
                        placeholder.traverse((o) => {
                            if (o.geometry) o.geometry.dispose();
                            if (o.material) {
                                if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                                else o.material.dispose();
                            }
                        });
                        placeholderMap.delete(objectData);
                    }
                }
                return model;
            });

            await Promise.allSettled(loadPromises);

            // Reset wall manager state if not in view-only mode
            if (!isViewOnly) {
                // Reset wall manager state
                this.ui.wallManager.isAddWallMode = false;
                this.ui.wallManager.direction = 'horizontal';
                
                // Recreate preview wall if needed
                this.ui.wallManager.createPreviewWall();
                
                // Reset wall building state
                this.ui.wallManager.wallStartPosition = null;
            }

            if (isViewOnly) this.setupViewOnlyMode();
            console.log('Scene loaded with', sceneData.data.objects.length, 'objects');
        } catch (error) {
            console.error('Load failed:', error);
            alert(`Load failed: ${error.message}`);
        } finally {
            this.ui.showLoading(false);
        }
    }

    setupViewOnlyMode() {
        // Disable orbit controls dragging/zooming
        this.ui.controls.enableRotate = false;
        this.ui.controls.enableZoom = true;  // Allow zoom for better viewing
        this.ui.controls.enablePan = false;

        // Hide UI elements that shouldn't be available in view mode
        const elementsToHide = [
            document.getElementById('remove-object'),
            document.getElementById('switch-direction'),
            document.getElementById('save-btn'),
            document.getElementById('load-btn'),
            document.getElementById('sidebar-toggle')
        ];

        elementsToHide.forEach(element => {
            if (element) element.style.display = 'none';
        });

        // Hide the sidebar if it's open
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }

        // Add view-only mode indicator
        const viewModeIndicator = document.createElement('div');
        viewModeIndicator.className = 'view-mode-indicator';
        viewModeIndicator.innerHTML = `
            <i class="bi bi-eye"></i>
            <span>View Only Mode</span>
        `;
        document.body.appendChild(viewModeIndicator);
    }

    async recreateObject(data, isViewOnly = false, wallMap = new Map()) {
        try {
            let model;
            if (data.type === 'wall') {
                const geometry = new THREE.BoxGeometry(this.ui.gridSize, 2, 0.2);
                const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
                
                model = new THREE.Mesh(geometry, material);
                model.userData = {
                    isWall: true,
                    isMovable: false,
                    isInteractable: !isViewOnly,
                    uuid: data.userData.uuid,
                    openings: [],
                    type: 'wall'
                };

                model.position.fromArray(data.position);
                model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                model.scale.fromArray(data.scale);

                this.ui.scene.add(model);
                wallMap.set(data.userData.uuid, model);
                this.ui.wallManager.walls.push(model);

            } else if (data.type === 'door') {
                const parentWall = wallMap.get(data.userData.parentWallId);
                if (parentWall) {
                    model = this.ui.doorManager.createDoor(parentWall, new THREE.Vector3().fromArray(data.position));
                    
                    if (model) {
                        model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                        model.scale.fromArray(data.scale);
                        model.userData = {
                            ...data.userData,
                            isDoor: true,
                            parentWall: parentWall,
                            parentWallId: parentWall.userData.uuid,
                            isInteractable: !isViewOnly,
                            type: 'door'
                        };
                        parentWall.userData.openings.push(model);
                    }
                }

            } else if (data.type === 'window') {
                const parentWall = wallMap.get(data.userData.parentWallId);
                if (parentWall) {
                    model = this.ui.windowManager.createWindow(parentWall, new THREE.Vector3().fromArray(data.position));
                    
                    if (model) {
                        model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                        model.scale.fromArray(data.scale);
                        model.userData = {
                            ...data.userData,
                            isWindow: true,
                            parentWall: parentWall,
                            parentWallId: parentWall.userData.uuid,
                            isInteractable: !isViewOnly,
                            type: 'window'
                        };
                        parentWall.userData.openings.push(model);
                    }
                }

            } else {
                if (data.userData.isChair) {
                    model = await this.ui.createChair();
                } else if (data.userData.isTable) {
                    if (data.userData.isRoundTable) {
                        model = await this.ui.createRoundTable();
                    } else if (data.userData.maxCapacity === 2) {
                        model = await this.ui.create2SeaterTable();
                    } else if (data.userData.maxCapacity === 8) {
                        model = await this.ui.create8SeaterTable();
                    } else {
                        model = await this.ui.createTable();
                    }
                } else if (data.userData.isSofa) {
                    model = await this.ui.createSofa();
                } else if (data.userData.isPlant) {
                    if (data.userData.isPlant01) {
                        model = await this.ui.createPlant01();
                    } else if (data.userData.isPlant02) {
                        model = await this.ui.createPlant02();
                    }
                } else if (data.userData.isFridge) {
                    model = await this.ui.createLargeFridge();
                } else if (data.userData.isFoodStand) {
                    model = await this.ui.createFoodStand();
                } else if (data.userData.isDrinkStand) {
                    model = await this.ui.createDrinkStand();
                } else if (data.userData.isIceBox) {
                    model = await this.ui.createIceBox();
                } else if (data.userData.isIceCreamBox) {
                    model = await this.ui.createIceCreamBox();
                }

                if (model) {
                    model.position.fromArray(data.position);
                    model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                    model.scale.fromArray(data.scale);
                    model.userData = {
                        ...data.userData,
                        _id: data._id,
                        isInteractable: !isViewOnly,
                        maxCapacity: data.userData.maxCapacity || 4
                    };
                }
            }

            return model;
        } catch (error) {
            console.error('Error recreating object:', error);
            throw error;
        }
    }

    clearScene() {
        // Store reference to preview wall
        const previewWall = this.ui.wallManager.previewWall;
        
        // Remove all objects except floor
        const objectsToRemove = [];
        this.ui.scene.traverse((object) => {
            // Skip the floor, preview wall, and non-mesh objects
            if (object === this.ui.floor || object === previewWall || !object.isMesh) return;
            
            objectsToRemove.push(object);
        });

        // Remove objects and dispose of resources
        objectsToRemove.forEach(object => {
            this.ui.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear walls array in WallManager
        if (this.ui.wallManager) {
            this.ui.wallManager.walls = [];
            
            // Ensure preview wall exists and is in scene
            if (!previewWall || !this.ui.scene.children.includes(previewWall)) {
                this.ui.wallManager.createPreviewWall();
            }
        }
    }
}
