import * as THREE from 'three';

export class TouchManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.touches = new Map(); // Track multiple touches
        this.isDragging = false;
        this.isRotating = false;
        this.isScaling = false;
        this.selectedObject = null;
        this.offset = new THREE.Vector3();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.previousTouchPosition = new THREE.Vector2();
        this.initialScale = 1;
        this.initialDistance = 0;
        this.touchStartTime = 0;
        this.longPressTimeout = null;
        this.tapTimeout = null;
        this.lastTapTime = 0;
        this.touchMoveThreshold = 10; // pixels
        this.longPressDelay = 500; // milliseconds
        this.doubleTapDelay = 300; // milliseconds
        this.lastTouchPosition = null;

        // Touch feedback element
        this.touchFeedback = null;
        this.helpOverlay = null;

        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchCancel = this.handleTouchCancel.bind(this);

        this.initializeTouchEvents();
        this.createTouchHelpOverlay();
        this.initializeDebugger();
        this.startControlsWatchdog();
    }

    initializeTouchEvents() {
        const canvas = this.ui.renderer.domElement;
        
        // Add touch event listeners
        canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

        // Prevent default touch behaviors that interfere with 3D editing
        canvas.addEventListener('gesturestart', (e) => e.preventDefault());
        canvas.addEventListener('gesturechange', (e) => e.preventDefault());
        canvas.addEventListener('gestureend', (e) => e.preventDefault());
    }

    handleTouchStart(event) {
        // Only prevent default for the first touch if we might handle it
        // Let OrbitControls handle multi-touch camera controls
        if (event.touches.length === 1) {
            // We might handle single touches for object interaction
            event.preventDefault();
        }
        
        const touch = event.touches[0];
        this.touchStartTime = Date.now();
        
        // Store touch information
        for (let i = 0; i < event.touches.length; i++) {
            const t = event.touches[i];
            this.touches.set(t.identifier, {
                x: t.clientX,
                y: t.clientY,
                startX: t.clientX,
                startY: t.clientY,
                startTime: this.touchStartTime
            });
        }

        this.showTouchFeedback(touch.clientX, touch.clientY);

        if (event.touches.length === 1) {
            this.handleSingleTouchStart(touch);
        } else if (event.touches.length === 2) {
            this.handleMultiTouchStart(event.touches);
        }
    }

    handleSingleTouchStart(touch) {
        // Check if we're in view-only mode
        if (this.ui.isViewOnly) {
            this.handleBooking(touch);
            return;
        }

        // Start long press timer for rotation mode
        this.longPressTimeout = setTimeout(() => {
            this.startTouchRotationMode(touch);
        }, this.longPressDelay);

        // Handle different modes
        if (this.ui.isRemoveMode) {
            this.handleRemoveObject(touch);
        } else if (this.ui.wallManager.isAddWallMode) {
            // For walls, just update preview on touch start (don't place immediately)
            this.updateWallPreview(touch);
        } else if (this.ui.doorManager.isPlacementMode) {
            this.ui.doorManager.placeDoor(this.ui.camera, this.convertTouchToMouseEvent(touch));
        } else if (this.ui.windowManager.isPlacementMode) {
            this.ui.windowManager.placeWindow(this.ui.camera, this.convertTouchToMouseEvent(touch));
        } else {
            this.handleObjectSelection(touch);
        }
    }

    handleMultiTouchStart(touches) {
        this.clearTimeouts();
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate initial distance for pinch-to-scale
        this.initialDistance = this.getTouchDistance(touch1, touch2);
        
        // Only enter scaling mode if we're touching an object
        // Otherwise let OrbitControls handle the two-finger gesture for camera zoom
        const selectedObject = this.findObjectAtTouch(touch1);
        if (selectedObject && selectedObject.userData.isMovable) {
            this.selectedObject = selectedObject;
            this.initialScale = selectedObject.scale.x;
            this.isScaling = true;
            this.ui.controls.enabled = false;
            this.showScalingFeedback();
            this.highlightObject(selectedObject);
        } else {
            // No object selected - let OrbitControls handle the two-finger gesture
            // Don't set isScaling = true, don't disable controls
        }
    }

    handleTouchMove(event) {
        // Only prevent default if we're actually handling the touch interaction
        // Let OrbitControls handle normal camera movements
        if (this.isDragging || this.isRotating || this.isScaling || 
            this.ui.wallManager.isAddWallMode || this.ui.doorManager.isPlacementMode || 
            this.ui.windowManager.isPlacementMode || this.ui.isRemoveMode) {
            event.preventDefault();
        }

        // Update touch positions
        for (let i = 0; i < event.touches.length; i++) {
            const t = event.touches[i];
            if (this.touches.has(t.identifier)) {
                const touchData = this.touches.get(t.identifier);
                touchData.x = t.clientX;
                touchData.y = t.clientY;
            }
        }

        if (event.touches.length === 1) {
            this.handleSingleTouchMove(event.touches[0]);
        } else if (event.touches.length === 2) {
            this.handleMultiTouchMove(event.touches);
        }
    }

    handleSingleTouchMove(touch) {
        // Clear long press timer on movement
        if (this.longPressTimeout) {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                const moveDistance = Math.sqrt(
                    Math.pow(touch.clientX - touchData.startX, 2) + 
                    Math.pow(touch.clientY - touchData.startY, 2)
                );
                
                if (moveDistance > this.touchMoveThreshold) {
                    this.clearTimeouts();
                }
            }
        }

        // Only disable controls for specific object interactions
        if (this.isDragging || this.isRotating || this.isScaling) {
            // Ensure controls stay disabled during active object interactions
            if (this.ui.controls.enabled) {
                this.ui.controls.enabled = false;
            }
        }

        if (this.ui.wallManager.isAddWallMode) {
            this.updateWallPreview(touch);
        } else if (this.isDragging) {
            this.handleTouchDrag(touch);
        } else if (this.isRotating) {
            this.handleTouchRotation(touch);
        } else if (this.ui.doorManager.isPlacementMode) {
            this.ui.doorManager.updatePreview(this.ui.camera, this.convertTouchToMouseEvent(touch));
        } else if (this.ui.windowManager.isPlacementMode) {
            this.ui.windowManager.updatePreview(this.ui.camera, this.convertTouchToMouseEvent(touch));
        }
    }

    handleMultiTouchMove(touches) {
        // Only handle scaling if we're actually in scaling mode (touching an object)
        if (this.isScaling && touches.length === 2 && this.selectedObject) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = this.getTouchDistance(touch1, touch2);
            
            if (this.initialDistance > 0) {
                const scaleRatio = currentDistance / this.initialDistance;
                const newScale = this.initialScale * scaleRatio;
                
                // Clamp scale between reasonable limits
                const clampedScale = Math.max(0.3, Math.min(3.0, newScale));
                
                this.selectedObject.scale.set(clampedScale, clampedScale, clampedScale);
                this.updateScalingFeedback(clampedScale);
            }
        }
        // If not in scaling mode, let OrbitControls handle the multi-touch gesture for camera zoom
    }

    handleTouchEnd(event) {
        // Only prevent default if we were handling the interaction
        if (this.isDragging || this.isRotating || this.isScaling || 
            this.ui.wallManager.isAddWallMode || this.ui.isRemoveMode) {
            event.preventDefault();
        }
        
        // Store the last touch position before removing it (for wall placement)
        const lastTouch = event.changedTouches[0];
        this.lastTouchPosition = {
            clientX: lastTouch.clientX,
            clientY: lastTouch.clientY
        };
        
        // Remove ended touches
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches.delete(touch.identifier);
        }

        // Handle touch end actions
        if (event.touches.length === 0) {
            this.handleTouchEndComplete();
        }
    }

    handleTouchCancel(event) {
        event.preventDefault();
        this.resetTouchState();
    }

    handleTouchEndComplete() {
        this.clearTimeouts();
        
        // Handle wall placement on touch end (if in wall mode and preview is visible)
        if (this.ui.wallManager.isAddWallMode && this.ui.wallManager.previewWall?.visible) {
            this.handleWallPlacement();
        }
        
        // Check for tap (only if not in any active mode)
        if (!this.isDragging && !this.isRotating && !this.isScaling && !this.ui.wallManager.isAddWallMode) {
            this.handleTap();
        }

        // Only reset specific object interactions
        if (this.isDragging) {
            this.isDragging = false;
            // Re-enable controls only if we had an object interaction
            if (!this.ui.controls.enabled) {
                this.ui.controls.enabled = true;
            }
        }
        
        if (this.isScaling) {
            this.isScaling = false;
            // Re-enable controls only if we had an object interaction
            if (!this.ui.controls.enabled) {
                this.ui.controls.enabled = true;
            }
        }

        // Don't reset rotation mode here - let it stay active until explicitly exited
        if (!this.isRotating) {
            this.selectedObject = null;
        }
        
        this.touches.clear();
    }

    handleTap() {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - this.lastTapTime;
        
        if (timeSinceLastTap < this.doubleTapDelay) {
            // Double tap detected
            this.handleDoubleTap();
        } else {
            // Single tap
            this.tapTimeout = setTimeout(() => {
                this.handleSingleTap();
            }, this.doubleTapDelay);
        }
        
        this.lastTapTime = currentTime;
    }

    handleSingleTap() {
        // If in rotation mode, exit it when tapping elsewhere
        if (this.isRotating) {
            this.exitRotationMode();
        }
        console.log('Single tap detected');
    }

    handleDoubleTap() {
        // Double tap functionality - could be used for quick actions
        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
            this.tapTimeout = null;
        }
        console.log('Double tap detected');
    }

    startTouchRotationMode(touch) {
        const object = this.findObjectAtTouch(touch);
        if (object && object.userData.isMovable && object.userData.isRotatable) {
            this.selectedObject = object;
            this.isRotating = true;
            this.ui.controls.enabled = false;
            this.previousTouchPosition.set(touch.clientX, touch.clientY);
            this.showRotationFeedback();
            this.highlightObject(object);
            this.showRotationModeIndicator();
            // console.log('🔄 Touch rotation mode activated for object:', object.userData);
        } else {
            // console.log('❌ Cannot activate rotation mode - no rotatable object found');
        }
    }

    exitRotationMode() {
        if (this.isRotating) {
            this.isRotating = false;
            this.ui.controls.enabled = true;
            this.resetHighlight();
            this.hideRotationModeIndicator();
            this.selectedObject = null;
            console.log('Exited rotation mode');
        }
    }

    handleObjectSelection(touch) {
        const object = this.findObjectAtTouch(touch);
        
        // If in rotation mode, check if tapping on a different object
        if (this.isRotating) {
            if (object && object !== this.selectedObject && object.userData.isRotatable) {
                // Switch to new object for rotation
                this.resetHighlight();
                this.selectedObject = object;
                this.previousTouchPosition.set(touch.clientX, touch.clientY);
                this.highlightObject(object);
            } else if (!object) {
                // Tapped on empty space, exit rotation mode
                this.exitRotationMode();
            }
            return;
        }
        
        // Normal selection logic
        if (object && object.userData.isMovable) {
            this.startTouchDragging(object, touch);
        }
    }

    startTouchDragging(object, touch) {
        this.isDragging = true;
        this.selectedObject = object;
        this.ui.controls.enabled = false;
        
        // Calculate intersection point on the floor
        const raycaster = this.createTouchRaycaster(touch);
        const intersects = raycaster.intersectObject(this.ui.floor);
        
        if (intersects.length > 0) {
            object.position.y = 0.1;
            this.offset.copy(object.position).sub(intersects[0].point);
        }
    }

    handleTouchDrag(touch) {
        if (!this.isDragging || !this.selectedObject) return;

        const raycaster = this.createTouchRaycaster(touch);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(this.plane, intersection);
        
        if (intersection) {
            const newPosition = intersection.add(this.offset);
            newPosition.y = 0.1;
            this.selectedObject.position.copy(newPosition);
        }
    }

    handleTouchRotation(touch) {
        if (!this.isRotating || !this.selectedObject) return;

        // Calculate delta movement like mouse rotation
        const deltaX = touch.clientX - this.previousTouchPosition.x;
        
        // Apply rotation with same sensitivity as mouse
        this.selectedObject.rotation.y += deltaX * 0.01;
        
        // Optional debug logging (remove in production)
        // if (Math.abs(deltaX) > 2) {
        //     console.log(`🔄 Rotating: deltaX=${deltaX.toFixed(1)}, rotation=${(this.selectedObject.rotation.y).toFixed(2)}`);
        // }
        
        // Update previous position for next calculation
        this.previousTouchPosition.set(touch.clientX, touch.clientY);
    }

    handleWallPlacement() {
        // Handle wall placement using preview position
        if (!this.ui.wallManager.isAddWallMode || !this.ui.wallManager.previewWall?.visible) {
            return;
        }

        try {
            const previewPosition = this.ui.wallManager.previewWall.position.clone();
            const previewRotation = this.ui.wallManager.previewWall.rotation.clone();
            
            const wall = this.ui.wallManager.createWall(previewPosition.x, previewPosition.z);
            wall.rotation.copy(previewRotation);
            
            this.ui.scene.add(wall);
            this.ui.wallManager.walls.push(wall);
            this.ui.wallManager.previewWall.visible = false;
        } catch (error) {
            console.error('❌ Error placing wall:', error);
        }
    }

    updateWallPreview(touch) {
        if (!this.ui.wallManager.isAddWallMode) {
            return;
        }

        const raycaster = this.createTouchRaycaster(touch);
        const intersects = raycaster.intersectObject(this.ui.floor);
        
        if (intersects.length > 0) {
            const worldPosition = intersects[0].point;
            this.ui.wallManager.updatePreviewWall(worldPosition);
        } else {
            // Hide preview if no floor intersection
            if (this.ui.wallManager.previewWall) {
                this.ui.wallManager.previewWall.visible = false;
            }
        }
    }

    handleRemoveObject(touch) {
        // Use the same raycasting approach as the UI manager for consistency
        const raycaster = this.createTouchRaycaster(touch);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        // console.log('🗑️ Touch remove - intersects found:', intersects.length);
        
        if (intersects.length > 0) {
            // Optional debug logging
            // intersects.forEach((intersect, index) => {
            //     const obj = intersect.object;
            //     console.log(`  ${index}: ${obj.constructor.name}`, obj.userData);
            // });
            
            // Use UI manager's remove logic directly
            this.ui.handleRemoveObject(this.convertTouchToMouseEvent(touch));
        } else {
            // No objects found for removal
        }
    }

    handleBooking(touch) {
        const object = this.findObjectAtTouch(touch);
        if (object && !object.userData.isBooked) {
            this.ui.dragManager.bookObject(object);
        }
    }

    findObjectAtTouch(touch) {
        const raycaster = this.createTouchRaycaster(touch);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        if (intersects.length > 0) {
            return this.ui.dragManager.findMovableParent(intersects[0].object);
        }
        return null;
    }

    createTouchRaycaster(touch) {
        const canvas = this.ui.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2(
            ((touch.clientX - rect.left) / rect.width) * 2 - 1,
            -((touch.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.ui.camera);
        return raycaster;
    }

    convertTouchToMouseEvent(touch) {
        const canvas = this.ui.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            target: canvas,
            currentTarget: canvas,
            preventDefault: () => {},
            stopPropagation: () => {},
            // Add relative coordinates for better wall placement
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top
        };
    }

    getTouchDistance(touch1, touch2) {
        return Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
    }

    resetTouchState() {
        this.isDragging = false;
        this.isRotating = false;
        this.isScaling = false;
        this.selectedObject = null;
        
        // Only re-enable controls if we had disabled them for object interactions
        if (this.ui && this.ui.controls && !this.ui.controls.enabled) {
            this.ui.controls.enabled = true;
        }
        
        this.clearTimeouts();
        this.hideAllFeedback();
        this.resetHighlight();
        this.touches.clear();
    }

    clearTimeouts() {
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
            this.tapTimeout = null;
        }
    }

    // Visual feedback methods
    showTouchFeedback(x, y) {
        if (this.touchFeedback) {
            document.body.removeChild(this.touchFeedback);
        }

        this.touchFeedback = document.createElement('div');
        this.touchFeedback.className = 'touch-feedback';
        this.touchFeedback.style.left = x + 'px';
        this.touchFeedback.style.top = y + 'px';
        document.body.appendChild(this.touchFeedback);

        setTimeout(() => {
            if (this.touchFeedback && document.body.contains(this.touchFeedback)) {
                document.body.removeChild(this.touchFeedback);
                this.touchFeedback = null;
            }
        }, 300);
    }

    showRotationFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'rotation-feedback';
        feedback.textContent = 'Rotation Mode Activated';
        document.body.appendChild(feedback);

        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 1500);
    }

    showRotationModeIndicator() {
        // Remove existing indicator first
        this.hideRotationModeIndicator();
        
        this.rotationIndicator = document.createElement('div');
        this.rotationIndicator.className = 'rotation-mode-indicator';
        this.rotationIndicator.innerHTML = `
            <div class="mode-info">
                <strong>🔄 Rotation Mode</strong>
                <small>Drag to rotate • Tap elsewhere to exit</small>
            </div>
        `;
        document.body.appendChild(this.rotationIndicator);
    }

    hideRotationModeIndicator() {
        if (this.rotationIndicator && document.body.contains(this.rotationIndicator)) {
            document.body.removeChild(this.rotationIndicator);
            this.rotationIndicator = null;
        }
    }

    showScalingFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'scaling-feedback';
        feedback.textContent = 'Pinch to Scale';
        document.body.appendChild(feedback);

        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 1500);
    }

    updateScalingFeedback(scale) {
        const feedback = document.querySelector('.scaling-feedback');
        if (feedback) {
            feedback.textContent = `Scale: ${scale.toFixed(1)}x`;
        }
    }

    highlightObject(object) {
        if (!object) return;
        
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

    hideAllFeedback() {
        const feedbackElements = document.querySelectorAll('.rotation-feedback, .scaling-feedback');
        feedbackElements.forEach(el => {
            if (document.body.contains(el)) {
                document.body.removeChild(el);
            }
        });
        this.hideRotationModeIndicator();
    }

    createTouchHelpOverlay() {
        // Only show on touch devices
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
            return;
        }

        this.helpOverlay = document.createElement('div');
        this.helpOverlay.className = 'touch-help-overlay';
        this.helpOverlay.innerHTML = `
            <button class="close-help" aria-label="Close help">&times;</button>
            <h4>📱 Touch Controls</h4>
            <ul>
                <li><strong>Tap:</strong> Select object</li>
                <li><strong>Drag:</strong> Move object</li>
                <li><strong>Long press:</strong> Enter rotation mode</li>
                <li><strong>In rotation:</strong> Drag to rotate</li>
                <li><strong>Two fingers on object:</strong> Scale object</li>
                <li><strong>Two fingers on space:</strong> Zoom camera</li>
                <li><strong>Wall mode:</strong> Touch & drag to preview, release to place</li>
            </ul>
        `;

        this.helpOverlay.querySelector('.close-help').addEventListener('click', () => {
            this.hideHelpOverlay();
        });

        document.body.appendChild(this.helpOverlay);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideHelpOverlay();
        }, 10000);
    }

    hideHelpOverlay() {
        if (this.helpOverlay && document.body.contains(this.helpOverlay)) {
            document.body.removeChild(this.helpOverlay);
            this.helpOverlay = null;
        }
    }

    initializeDebugger() {
        // Check if debug mode is enabled
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'touch') {
            // Dynamically import and initialize TouchDebugger
            import('../TouchDebugger.js').then(module => {
                if (window.TouchDebugger) {
                    window.TouchDebugger.testTouchManager(this);
                    console.log('🔧 Touch debugging enabled for TouchManager');
                }
            }).catch(err => {
                console.warn('TouchDebugger not available:', err);
            });
        }
    }

    startControlsWatchdog() {
        // Periodically check if controls should be managed properly
        this.controlsWatchdog = setInterval(() => {
            if (this.ui && this.ui.controls) {
                // Only disable controls during specific OBJECT interactions
                // Don't disable for general touches (let OrbitControls handle camera movement)
                if (this.isDragging || this.isRotating || this.isScaling) {
                    if (this.ui.controls.enabled) {
                        this.ui.controls.enabled = false;
                    }
                } 
                // Re-enable controls when no object interactions are happening
                else if (!this.isDragging && !this.isRotating && !this.isScaling) {
                    if (!this.ui.controls.enabled) {
                        this.ui.controls.enabled = true;
                    }
                }
                // Note: We don't check this.touches.size anymore - let OrbitControls handle normal camera touches
            }
        }, 200); // Check less frequently to reduce interference
    }

    // Cleanup method
    destroy() {
        const canvas = this.ui.renderer.domElement;
        canvas.removeEventListener('touchstart', this.handleTouchStart);
        canvas.removeEventListener('touchmove', this.handleTouchMove);
        canvas.removeEventListener('touchend', this.handleTouchEnd);
        canvas.removeEventListener('touchcancel', this.handleTouchCancel);
        
        this.clearTimeouts();
        this.hideAllFeedback();
        this.hideHelpOverlay();
        this.resetTouchState();

        // Cleanup debugger if it exists
        if (window.TouchDebugger) {
            window.TouchDebugger.destroy();
        }

        // Stop the controls watchdog
        if (this.controlsWatchdog) {
            clearInterval(this.controlsWatchdog);
            this.controlsWatchdog = null;
        }
    }
}
