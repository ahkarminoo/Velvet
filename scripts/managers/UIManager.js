import { WallManager } from '../wallManager.js';
import { SidebarManager } from './SidebarManager.js';
import { FileManager } from './FileManager.js';
import { DragManager } from './DragManager.js';
import { TouchManager } from './TouchManager.js';
import { chair, table, sofa, roundTable, create2SeaterTable, create8SeaterTable, plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox } from '../asset.js';
import * as THREE from 'three';
import { DoorManager } from './DoorManager.js';
import { WindowManager } from './WindowManager.js';

export class UIManager {
    constructor(scene, floor, gridSize, camera, renderer, controls) {
        this.scene = scene;
        this.floor = floor;
        this.gridSize = gridSize;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.isRemoveMode = false;
        this.doorBtn = null;
        this.windowBtn = null;

        // Check if we're in view-only mode from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.isViewOnly = urlParams.get('mode') === 'view';

        // Initialize UI elements
        this.removeButton = document.getElementById('remove-object');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.switchDirectionButton = document.getElementById('switch-direction');

        // Initialize managers
        this.wallManager = new WallManager(scene, floor, gridSize, renderer);
        this.doorManager = new DoorManager(scene, this.wallManager, renderer);
        this.windowManager = new WindowManager(scene, this.wallManager, renderer);
        this.fileManager = new FileManager(this);
        this.sidebarManager = new SidebarManager(this);
        this.dragManager = new DragManager(this);
        this.touchManager = new TouchManager(this);

        // If view-only mode, load the specified scene
        const sceneId = urlParams.get('scene');
        if (sceneId && this.isViewOnly) {
            this.fileManager.loadScene(sceneId, true);
        }

        this.initializeUI();
        this.initializeEventListeners();
        this.initStructureControls();
        this.initScaleControls();

        // Add canvas click handler here instead of in initScaleControls
        this.renderer.domElement.addEventListener('click', (e) => {
            console.log('Canvas clicked, scale mode:', this.dragManager?.scaleMode); // Debug log
            if (this.dragManager?.scaleMode) {
                console.log('Attempting to start scale'); // Debug log
                this.dragManager.handleScaleStart(e);
            }
        });

        // Initialize asset creation methods
        this.createChair = () => chair(scene);
        this.createTable = () => table(scene);
        this.createSofa = () => sofa(scene);
        this.createRoundTable = () => roundTable(scene);
        this.create2SeaterTable = () => create2SeaterTable(scene);
        this.create8SeaterTable = () => create8SeaterTable(scene);
        this.createPlant01 = () => plant01(scene);
        this.createPlant02 = () => plant02(scene);
        
        // Restaurant equipment creation methods
        this.createLargeFridge = () => largeFridge(scene);
        this.createFoodStand = () => foodStand(scene);
        this.createDrinkStand = () => drinkStand(scene);
        this.createIceBox = () => iceBox(scene);
        this.createIceCreamBox = () => iceCreamBox(scene);
    }

    initializeUI() {
        if (this.removeButton) {
            this.removeButton.addEventListener('click', () => {
                this.toggleRemoveMode();
            });
        }

        if (this.switchDirectionButton) {
            this.switchDirectionButton.addEventListener('click', () => {
                this.wallManager.switchDirection();
            });
        }
    }

    initializeEventListeners() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousemove', (event) => {
            // Check for drag/rotation FIRST to prevent camera movement
            if (this.dragManager && (this.dragManager.isDragging || this.dragManager.isRotating)) {
                event.preventDefault();
                event.stopPropagation();
                this.dragManager.handleMouseMove(event);
                return; // Exit early to prevent other handlers
            }
            
            if (this.wallManager.isAddWallMode) {
                const raycaster = this.createRaycaster(event);
                const intersects = raycaster.intersectObject(this.floor);
                if (intersects.length > 0) {
                    this.wallManager.updatePreviewWall(intersects[0].point);
                }
            } else if (this.doorManager.isPlacementMode) {
                this.doorManager.updatePreview(this.camera, event);
            } else if (this.windowManager.isPlacementMode) {
                this.windowManager.updatePreview(this.camera, event);
            } else {
                if (this.dragManager) {
                    this.dragManager.handleMouseMove(event);
                }
            }
        }, true);

        canvas.addEventListener('mousedown', (event) => {
            if (this.isRemoveMode) {
                this.handleRemoveObject(event);
            } else if (this.wallManager.isAddWallMode) {
                this.wallManager.handleMouseDown(event, this.camera);
            } else if (this.doorManager.isPlacementMode) {
                this.doorManager.placeDoor(this.camera, event);
            } else if (this.windowManager.isPlacementMode) {
                this.windowManager.placeWindow(this.camera, event);
            } else {
                if (this.dragManager) {
                    this.dragManager.handleMouseDown(event);
                    if (this.dragManager.isDragging || this.dragManager.isRotating) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
            }
        }, true);

        canvas.addEventListener('mouseup', (event) => {
            if (this.dragManager) {
                this.dragManager.stopDragging();
                event.stopPropagation();
            }
        }, true);

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    createRaycaster(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        return raycaster;
    }

    handleRemoveObject(event) {
        const raycaster = this.createRaycaster(event);
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        for (const intersect of intersects) {
            const object = this.findRemovableParent(intersect.object);
            if (object) {
                if (object.userData.isWall) {
                    const index = this.wallManager.walls.indexOf(object);
                    if (index !== -1) {
                        this.wallManager.walls.splice(index, 1);
                    }
                }
                this.scene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
                break;
            }
        }
    }

    findRemovableParent(object) {
        let current = object;
        while (current) {
            if (current.userData && 
                (current.userData.isWall || 
                 current.userData.isChair ||
                 current.userData.isFurniture ||
                 current.userData.isDoor ||
                 current.userData.isWindow ||
                 current.userData.isSofa ||
                 current.userData.isTable ||
                 current.userData.isPlant)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    async createChair() {
        const chairModel = await chair(this.scene);
        if (chairModel) {
            chairModel.userData = {
                isChair: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return chairModel;
    }

    async createTable() {
        const tableModel = await table(this.scene);
        if (tableModel) {
            tableModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isTable: true,
                isRoundTable: false,
                maxCapacity: 4
            };
        }
        return tableModel;
    }

    async createSofa() {
        const sofaModel = await sofa(this.scene);
        if (sofaModel) {
            sofaModel.userData = {
                isSofa: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return sofaModel;
    }

    async createRoundTable() {
        const tableModel = await roundTable(this.scene);
        if (tableModel) {
            tableModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isTable: true,
                isRoundTable: true,
                maxCapacity: 4
            };
        }
        return tableModel;
    }

    async create2SeaterTable() {
        const tableModel = await create2SeaterTable(this.scene);
        if (tableModel) {
            tableModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isTable: true,
                is2SeaterTable: true,
                maxCapacity: 2
            };
        }
        return tableModel;
    }

    async create8SeaterTable() {
        const tableModel = await create8SeaterTable(this.scene);
        if (tableModel) {
            tableModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isTable: true,
                is8SeaterTable: true,
                maxCapacity: 8
            };
        }
        return tableModel;
    }

    async createPlant01() {
        const plantModel = await plant01(this.scene);
        if (plantModel) {
            plantModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isPlant: true,
                isPlant01: true
            };
        }
        return plantModel;
    }

    async createPlant02() {
        const plantModel = await plant02(this.scene);
        if (plantModel) {
            plantModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true,
                isPlant: true,
                isPlant02: true
            };
        }
        return plantModel;
    }

    toggleRemoveMode() {
        this.isRemoveMode = !this.isRemoveMode;
        this.removeButton.classList.toggle('active');
        document.body.classList.toggle('remove-mode');
        
        if (this.isRemoveMode) {
            this.wallManager.toggleAddWallMode(false);
        }
    }

    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.toggle('active', show);
        }
    }

    initScaleControls() {
        const scaleBtn = document.createElement('button');
        scaleBtn.className = 'toolbar-btn';
        scaleBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i> Size';
        scaleBtn.setAttribute('data-tooltip', 'Adjust Size');
        
        scaleBtn.addEventListener('click', () => {
            this.dragManager.scaleMode = !this.dragManager.scaleMode;
            scaleBtn.classList.toggle('active', this.dragManager.scaleMode);
            this.renderer.domElement.style.cursor = this.dragManager.scaleMode ? 'crosshair' : 'default';
            
            // Reset any existing selection when toggling mode off
            if (!this.dragManager.scaleMode) {
                this.dragManager.hideScalePanel();
            }
        });

        document.querySelector('.toolbar').appendChild(scaleBtn);
    }

    toggleScaleMode(enable) {
        this.dragManager.scaleMode = enable;
        const scaleBtn = document.querySelector('.toolbar-btn[data-tooltip="Adjust Size"]');
        if (scaleBtn) {
            scaleBtn.classList.toggle('active', enable);
        }
        this.renderer.domElement.classList.toggle('scale-mode', enable);
    }

    initStructureControls() {
        // Door Button
        this.doorBtn = document.createElement('button');
        this.doorBtn.className = 'toolbar-btn';
        this.doorBtn.innerHTML = '<i class="bi bi-door-open"></i> Door';
        this.doorBtn.addEventListener('click', () => {
            this.toggleDoorMode(!this.doorManager.isPlacementMode);
        });

        // Window Button
        this.windowBtn = document.createElement('button');
        this.windowBtn.className = 'toolbar-btn';
        this.windowBtn.innerHTML = '<i class="bi bi-window"></i> Window';
        this.windowBtn.addEventListener('click', () => {
            this.toggleWindowMode(!this.windowManager.isPlacementMode);
        });

        document.querySelector('.toolbar').appendChild(this.doorBtn);
        document.querySelector('.toolbar').appendChild(this.windowBtn);
    }

    toggleDoorMode(enable) {
        this.doorManager.isPlacementMode = enable;
        this.windowManager.isPlacementMode = false;
        this.wallManager.toggleAddWallMode(false);
        this.renderer.domElement.style.cursor = enable ? 'crosshair' : 'default';
        this.doorBtn.classList.toggle('active-door', enable);
        
        if (!enable) {
            this.doorManager.previewDoor.visible = false;
        }
    }

    toggleWindowMode(enable) {
        this.windowManager.isPlacementMode = enable;
        this.doorManager.isPlacementMode = false;
        this.wallManager.toggleAddWallMode(false);
        this.renderer.domElement.style.cursor = enable ? 'crosshair' : 'default';
        this.windowBtn.classList.toggle('active-window', enable);
        
        if (!enable) {
            this.windowManager.previewWindow.visible = false;
        }
    }


} 
