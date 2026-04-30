import * as THREE from 'three';
import { createRaycaster } from '../utils/ThreeUtils.js';

export class DragManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.isDragging = false;
        this.isRotating = false;
        this.selectedObject = null;
        this.offset = new THREE.Vector3();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.previousMousePosition = new THREE.Vector2();
        this.scaleMode = false;
        this.scaleStartPosition = new THREE.Vector2();
        this.originalScale = new THREE.Vector3();
        this.currentScaledObject = null;
        this.controlsLocked = false;

        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.stopDragging = this.stopDragging.bind(this);
        this.handleScaleStart = this.handleScaleStart.bind(this);
        
        // Add emergency reset handlers
        this.initializeEmergencyResets();
    }

    handleMouseMove(event) {
        if (this.ui.wallManager.isAddWallMode) {
            this.updateWallPreview(event);
        } else if (this.isDragging) {
            event.preventDefault();
            this.handleDrag(event);
        } else if (this.isRotating) {
            event.preventDefault();
            this.handleRotation(event);
        }
    }

    handleMouseDown(event) {
        // Check if we're in view-only mode
        if (this.ui.isViewOnly) {
            // Only handle booking in view-only mode
            this.handleBooking(event);
            return;
        }

        // Normal editing mode
        if (this.ui.isRemoveMode) {
            this.ui.handleRemoveObject(event);
        } else if (this.ui.wallManager.isAddWallMode) {
            this.ui.wallManager.handleMouseDown(event, this.ui.camera);
        } else {
            const isRotation = event.button === 2 || event.shiftKey;
            this.handleObjectSelection(event, isRotation);
        }
    }

    handleBooking(event) {
        const raycaster = createRaycaster(event, this.ui.camera, this.ui.renderer.domElement);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        if (intersects.length > 0) {
            const object = this.findBookableParent(intersects[0].object);
            if (object && !object.userData.isBooked) {
                this.bookObject(object);
            }
        }
    }

    findBookableParent(object) {
        let current = object;
        while (current) {
            if (current.userData && (current.userData.isChair || current.userData.isFurniture)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    bookObject(object) {
        // Mark as booked
        object.userData.isBooked = true;
        object.userData.bookingTime = new Date().toISOString();

        // Change color to red for all child meshes
        const red = new THREE.Color(0xff0000);
        object.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.color = red;
                    });
                } else {
                    child.material.color = red;
                }
            }
        });

        // Show booking confirmation
        this.showBookingConfirmation(object);
    }

    showBookingConfirmation(object) {
        const type = object.userData.isChair ? 'Chair' : 'Table';
        
        const popup = document.createElement('div');
        popup.className = 'booking-confirmation';
        popup.innerHTML = `
            <div class="booking-confirmation-content">
                <i class="bi bi-check-circle"></i>
                <h3>${type} Booked!</h3>
                <p>Your ${type.toLowerCase()} has been successfully booked.</p>
                <button class="close-confirmation">OK</button>
            </div>
        `;

        popup.querySelector('.close-confirmation').addEventListener('click', () => {
            document.body.removeChild(popup);
        });

        document.body.appendChild(popup);

        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 3000);
    }

    findMovableParent(object) {
        console.log('Finding movable parent for:', object); // Debug log
        let current = object;
        while (current) {
            console.log('Checking object:', current.userData); // Debug log
            if (current.userData && (current.userData.isMovable || current.userData.isChair || current.userData.isFurniture)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    updateWallPreview(event) {
        const raycaster = createRaycaster(event, this.ui.camera, this.ui.renderer.domElement);
        const intersects = raycaster.intersectObject(this.ui.floor, true);
        
        if (intersects.length > 0) {
            this.ui.wallManager.updatePreviewWall(intersects[0].point);
        }
    }

    handleObjectSelection(event, isRotation) {
        const raycaster = createRaycaster(event, this.ui.camera, this.ui.renderer.domElement);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        if (intersects.length > 0) {
            const object = this.findMovableParent(intersects[0].object);
            if (object && object.userData.isMovable) {
                // Prevent OrbitControls from processing this event
                event.stopImmediatePropagation();
                event.preventDefault();
                
                if (isRotation && object.userData.isRotatable) {
                    this.startRotation(object, event);
                } else if (!isRotation) {
                    this.startDragging(object, intersects[0].point);
                }
            }
        }
    }

    startDragging(object, intersectPoint) {
        this.isDragging = true;
        this.selectedObject = object;
        this.lockControls();
        
        object.position.y = 0.1;
        this.offset.copy(object.position).sub(intersectPoint);
    }

    handleDrag(event) {
        if (!this.isDragging || !this.selectedObject) return;

        const raycaster = createRaycaster(event, this.ui.camera, this.ui.renderer.domElement);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(this.plane, intersection);
        
        if (intersection) {
            const newPosition = intersection.add(this.offset);
            newPosition.y = 0.1;
            this.selectedObject.position.copy(newPosition);
        }
    }

    startRotation(object, event) {
        this.isRotating = true;
        this.selectedObject = object;
        this.lockControls();
        
        this.previousMousePosition.set(event.clientX, event.clientY);
    }

    handleRotation(event) {
        if (!this.isRotating || !this.selectedObject) return;

        const deltaX = event.clientX - this.previousMousePosition.x;
        this.selectedObject.rotation.y += deltaX * 0.01;
        this.previousMousePosition.set(event.clientX, event.clientY);
    }

    stopDragging() {
        this.isDragging = false;
        this.isRotating = false; // Also stop rotation
        this.selectedObject = null;
        this.unlockControls();
        
        this.ui.wallManager.clearWallPreview();
    }

    // Reset all interaction states
    resetAllStates() {
        this.isDragging = false;
        this.isRotating = false;
        this.selectedObject = null;
        this.scaleMode = false;
        this.currentScaledObject = null;
        this.unlockControls();
    }

    lockControls() {
        if (!this.ui || !this.ui.controls || this.controlsLocked) return;
        this.controlsLocked = true;
        this.ui.controls.enabled = false;
        this.ui.controls.enableRotate = false;
        this.ui.controls.enablePan = false;
        this.ui.controls.enableZoom = false;
    }

    unlockControls() {
        if (!this.ui || !this.ui.controls) return;
        this.controlsLocked = false;
        this.ui.controls.enabled = true;
        this.ui.controls.enableRotate = true;
        this.ui.controls.enablePan = true;
        this.ui.controls.enableZoom = true;
    }

    handleScaleStart(event) {
        console.log('Scale Start Called', this.scaleMode); // Debug log
        if (!this.scaleMode) return;
        
        const raycaster = this.createRaycaster(event);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        console.log('Intersects found:', intersects.length); // Debug log
        console.log('Scene children:', this.ui.scene.children.length); // Debug log
        
        if (intersects.length > 0) {
            const object = this.findMovableParent(intersects[0].object);
            console.log('Found movable object:', object); // Debug log
            if (object) {
                this.selectedObject = object;
                this.showScalePanel();
                this.highlightObject(object);
            }
        }
    }

    createRaycaster(event) {
        const rect = this.ui.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.ui.camera);
        return raycaster;
    }

    showScalePanel() {
        const panel = document.getElementById('scale-panel');
        if (!panel) return;
        
        panel.style.display = 'block';
        
        // Keep reference to current object
        this.currentScaledObject = this.selectedObject;
        
        // Set initial slider value
        const slider = document.getElementById('scale-slider');
        if (slider) {
            slider.value = this.selectedObject.scale.x;
        }
        
        // Add event listeners
        const sizeBtns = panel.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scale = parseFloat(e.target.dataset.scale);
                this.applyScale(scale);
            });
        });

        if (slider) {
            slider.addEventListener('input', (e) => {
                this.applyScale(parseFloat(e.target.value));
            });
        }
    }

    applyScale(scale) {
        if (!this.selectedObject) return;
        
        this.selectedObject.scale.set(scale, scale, scale);
        
        // Update geometry bounds
        this.selectedObject.traverse(child => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
            }
        });
    }

    highlightObject(object) {
        object.traverse(child => {
            if (child.isMesh) {
                if (!child.material.originalEmissive) {
                    child.material.originalEmissive = child.material.emissive.clone();
                }
                child.material.emissive = new THREE.Color(0x007bff);
                child.material.emissiveIntensity = 0.3;
            }
        });
    }

    resetHighlight() {
        if (this.selectedObject) {
            this.selectedObject.traverse(child => {
                if (child.isMesh && child.material.originalEmissive) {
                    child.material.emissive.copy(child.material.originalEmissive);
                    child.material.emissiveIntensity = 0;
                }
            });
        }
    }

    hideScalePanel() {
        const panel = document.getElementById('scale-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        this.resetHighlight();
        this.currentScaledObject = null;
        this.selectedObject = null;
    }

    toggleScaleMode(enable) {
        this.scaleMode = enable;
        this.ui.renderer.domElement.style.cursor = enable ? 'ew-resize' : 'default';
    }

    initializeEmergencyResets() {
        // Handle edge cases that could leave controls disabled
        const canvas = this.ui.renderer.domElement;
        
        // Reset states when mouse leaves canvas during interaction
        canvas.addEventListener('mouseleave', () => {
            if (this.isDragging || this.isRotating) {
                setTimeout(() => this.resetAllStates(), 100);
            }
        });
        
        // Reset on window blur (user switches away from browser)
        window.addEventListener('blur', () => {
            this.resetAllStates();
        });
        
        // Reset on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.resetAllStates();
            }
        });
    }

    destroy() {
        // Final state reset
        this.resetAllStates();
    }
}
