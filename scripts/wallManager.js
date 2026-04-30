import * as THREE from 'three';

export class WallManager {
    constructor(scene, floor, gridSize, renderer) {
        this.scene = scene;
        this.floor = floor;
        this.gridSize = gridSize;
        this.renderer = renderer;
        this.walls = [];
        this.isAddWallMode = false;
        this.direction = 'horizontal';
        
        // Preview wall properties
        this.previewWall = null;
        this.isPreviewActive = false;

        // Initialize preview wall
        this.createPreviewWall();
        this.initPreviews();
    }

    toggleAddWallMode(enable) {  // Modified to accept parameter
        if (typeof enable !== 'undefined') {
            this.isAddWallMode = enable;
        } else {
            this.isAddWallMode = !this.isAddWallMode;
        }
        // Only show preview wall when we have a valid position from mouse/touch movement
        // Don't show it immediately when entering wall mode
        if (!this.isAddWallMode) {
            this.previewWall.visible = false;
        }
        return this.isAddWallMode;
    }

    switchDirection() {
        this.direction = this.direction === 'horizontal' ? 'vertical' : 'horizontal';
        // Only update preview if it's currently visible and positioned properly
        if (this.previewWall.visible && this.previewWall.position.x < 500) {
            this.updatePreviewWall(this.previewWall.position); // Update rotation
        }
    }

    createPreviewWall() {
        if (this.previewWall) return;

        const geometry = new THREE.BoxGeometry(this.gridSize, 2, 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        
        this.previewWall = new THREE.Mesh(geometry, material);
        this.previewWall.visible = false;
        // Position preview wall off-screen initially to prevent accidental placement
        this.previewWall.position.set(1000, 1000, 1000);
        this.scene.add(this.previewWall);
    }

    updatePreviewWall(mousePosition) {
        if (!this.previewWall || !this.isAddWallMode) return;

        // Snap to grid logic
        const snappedX = Math.round(mousePosition.x / this.gridSize) * this.gridSize;
        const snappedZ = Math.round(mousePosition.z / this.gridSize) * this.gridSize;

        // Calculate position based on direction for proper wall connections
        let position, rotation;
        
        if (this.direction === 'horizontal') {
            // Horizontal walls extend along X-axis, centered between grid points
            position = new THREE.Vector3(snappedX + this.gridSize / 2, 1, snappedZ);
            rotation = 0;
        } else {
            // Vertical walls extend along Z-axis, centered between grid points
            position = new THREE.Vector3(snappedX, 1, snappedZ + this.gridSize / 2);
            rotation = Math.PI / 2;
        }

        // Check for existing walls with same position AND orientation
        if (!this.wallExists(position.x, position.z, this.direction)) {
            this.previewWall.position.copy(position);
            this.previewWall.rotation.y = rotation;
            this.previewWall.visible = true;
            
            // Change preview color if this wall will connect to existing walls
            if (this.canWallsConnect(position.x, position.z, this.direction)) {
                this.previewWall.material.color.setHex(0x00ffff); // Cyan for connections
            } else {
                this.previewWall.material.color.setHex(0x00ff00); // Green for normal placement
            }
        } else {
            this.previewWall.visible = false;
        }
    }

    handleMouseDown(event, camera) {
        if (event.button !== 0 || !this.isAddWallMode || !this.previewWall.visible) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(this.floor, true);

        if (intersects.length > 0) {
            const wall = this.createWall(
                this.previewWall.position.x,
                this.previewWall.position.z
            );
            
            this.scene.add(wall);
            this.walls.push(wall);
            this.previewWall.visible = false;
        }
    }

    createWall(x, z) {
        const wallGeometry = new THREE.BoxGeometry(this.gridSize, 2, 0.2);
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x8b8b8b });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);

        wall.position.set(x, 1, z);
        wall.rotation.copy(this.previewWall.rotation);
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Ensure wall has UUID, direction, and openings array
        wall.userData = {
            isWall: true,
            uuid: THREE.MathUtils.generateUUID(),
            direction: this.direction,
            openings: []
        };

        return wall;
    }

    reset() {
        this.walls.forEach(wall => {
            this.scene.remove(wall);
            this.disposeObject(wall);
        });
        this.walls = [];
        this.previewWall.visible = false; // Add this line
        this.isAddWallMode = false; // Add this line
    }

    createWallFromData(data) {
        if (!data.start || !data.end) {
            console.error('Missing wall data:', data);
            return null;
        }

        const start = new THREE.Vector3().copy(data.start);
        const end = new THREE.Vector3().copy(data.end);
        
        // Create wall mesh
        const wall = this.createWallMesh(start, end);
        
        // Determine direction if not provided
        const direction = data.userData.direction || this.determineDirectionFromPosition(start, end);
        
        // Update position to use new positioning system if needed
        if (!data.userData.direction) {
            // This is an old wall, update its position to new system
            const midX = (start.x + end.x) / 2;
            const midZ = (start.z + end.z) / 2;
            wall.position.set(midX, 1, midZ);
        }
        
        wall.userData = {
            ...data.userData,
            start: start,
            end: end,
            direction: direction
        };

        return wall;
    }

    determineDirectionFromPosition(start, end) {
        const deltaX = Math.abs(end.x - start.x);
        const deltaZ = Math.abs(end.z - start.z);
        
        // If the wall extends more along X-axis, it's horizontal
        // If it extends more along Z-axis, it's vertical
        return deltaX > deltaZ ? 'horizontal' : 'vertical';
    }

    wallExists(x, z, direction) {
        return this.walls.some(wall => {
            const positionMatch = Math.abs(wall.position.x - x) < 0.1 && 
                                Math.abs(wall.position.z - z) < 0.1;
            
            if (!positionMatch) return false;
            
            // Check if the wall has the same orientation using userData
            const existingWallDirection = wall.userData.direction || 'horizontal';
            
            // Only prevent placement if same position AND same orientation
            return existingWallDirection === direction;
        });
    }

    // Helper method to check if walls can connect at their edges
    canWallsConnect(x, z, direction) {
        // Check if there are walls that this new wall can connect to at its edges
        const gridSize = this.gridSize;
        
        if (direction === 'horizontal') {
            // Check for vertical walls at the ends of this horizontal wall
            const leftEnd = { x: x - gridSize / 2, z: z };
            const rightEnd = { x: x + gridSize / 2, z: z };
            
            return this.walls.some(wall => {
                if (wall.userData.direction !== 'vertical') return false;
                return (Math.abs(wall.position.x - leftEnd.x) < 0.1 && Math.abs(wall.position.z - leftEnd.z) < 0.1) ||
                       (Math.abs(wall.position.x - rightEnd.x) < 0.1 && Math.abs(wall.position.z - rightEnd.z) < 0.1);
            });
        } else {
            // Check for horizontal walls at the ends of this vertical wall
            const topEnd = { x: x, z: z + gridSize / 2 };
            const bottomEnd = { x: x, z: z - gridSize / 2 };
            
            return this.walls.some(wall => {
                if (wall.userData.direction !== 'horizontal') return false;
                return (Math.abs(wall.position.x - topEnd.x) < 0.1 && Math.abs(wall.position.z - topEnd.z) < 0.1) ||
                       (Math.abs(wall.position.x - bottomEnd.x) < 0.1 && Math.abs(wall.position.z - bottomEnd.z) < 0.1);
            });
        }
    }

    disposeObject(object) {
        if (object === this.previewWall) return; // Prevent disposing preview wall
        object.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    Array.isArray(child.material) 
                        ? child.material.forEach(m => m.dispose())
                        : child.material.dispose();
                }
            }
        });
    }

    initPreviews() {
        // Door preview
        const doorGeometry = new THREE.BoxGeometry(1.2, 2.4, 0.2);
        const doorMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            renderOrder: 1
        });
        this.previewDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        this.previewDoor.renderOrder = 1;
        this.previewDoor.visible = false;

        // Window preview
        const windowGeometry = new THREE.BoxGeometry(1.5, 1.2, 0.2);
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            renderOrder: 1
        });
        this.previewWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        this.previewWindow.renderOrder = 1;
        this.previewWindow.visible = false;

        this.scene.add(this.previewDoor);
        this.scene.add(this.previewWindow);
    }

    updateStructuralPreviews(camera) {
        return (e) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            
            const intersects = raycaster.intersectObjects(
                this.scene.children.filter(obj => obj.userData.isWall)
            );

            if (intersects.length > 0) {
                const wall = intersects[0].object;
                const point = intersects[0].point;
                
                if (this.isDoorPlacementMode) {
                    this.previewDoor.visible = true;
                    this.previewDoor.position.copy(point);
                    this.previewDoor.quaternion.copy(wall.quaternion);
                } else if (this.isWindowPlacementMode) {
                    this.previewWindow.visible = true;
                    this.previewWindow.position.copy(point);
                    this.previewWindow.quaternion.copy(wall.quaternion);
                }
            } else {
                this.previewDoor.visible = false;
                this.previewWindow.visible = false;
            }
        };
    }

    clearWallPreview() {
        if (this.previewWall) {
            this.previewWall.visible = false;
        }
    }

    addDoorToWall(wall, position) {
        const door = this.ui.doorManager.createDoor(wall, position);
        
        // Ensure door has UUID
        door.uuid = THREE.MathUtils.generateUUID();
        door.userData.parentWall = wall;
        door.userData.parentWallId = wall.userData.uuid;
        
        wall.userData.openings = wall.userData.openings || [];
        wall.userData.openings.push(door);
    }

    addWindowToWall(wall, position) {
        const window = this.ui.windowManager.createWindow(wall, position);
        
        // Ensure window has UUID
        window.uuid = THREE.MathUtils.generateUUID();
        window.userData.parentWall = wall;
        window.userData.parentWallId = wall.userData.uuid;
        
        wall.userData.openings = wall.userData.openings || [];
        wall.userData.openings.push(window);
    }
}

