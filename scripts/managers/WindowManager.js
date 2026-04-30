import * as THREE from 'three';

export class WindowManager {
    constructor(scene, wallManager, renderer) {
        this.scene = scene;
        this.wallManager = wallManager;
        this.renderer = renderer;
        this.isPlacementMode = false;
        this.previewWindow = this.createPreviewWindow();
    }

    createPreviewWindow() {
        // Create preview frame
        const frameGeometry = new THREE.BoxGeometry(1.4, 1.2, 0.4);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a4a4a,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);

        // Create preview panes (both sides)
        const windowGeometry = new THREE.BoxGeometry(1.2, 1.0, 0.05);
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            depthTest: false
        });
        const frontPane = new THREE.Mesh(windowGeometry, windowMaterial);
        const backPane = new THREE.Mesh(windowGeometry, windowMaterial.clone());

        // Create preview group
        const previewGroup = new THREE.Group();
        previewGroup.add(frame);
        previewGroup.add(frontPane);
        previewGroup.add(backPane);
        
        // Position preview panes
        frontPane.position.z = 0.2;
        backPane.position.z = -0.2;
        
        previewGroup.visible = false;
        this.scene.add(previewGroup);
        return previewGroup;
    }

    updatePreview(camera, event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(
            this.wallManager.walls
        );

        if (intersects.length > 0) {
            const wall = intersects[0].object;
            this.previewWindow.position.copy(intersects[0].point);
            this.previewWindow.quaternion.copy(wall.quaternion);
            this.previewWindow.visible = true;
        } else {
            this.previewWindow.visible = false;
        }
    }

    placeWindow(camera, event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(this.wallManager.walls);

        if (intersects.length > 0) {
            const wall = intersects[0].object;
            const window = this.createWindow(wall, intersects[0].point);
            this.scene.add(window);
            wall.userData.openings = wall.userData.openings || [];
            wall.userData.openings.push(window);
        }
    }

    createWindow(parentWall, position) {
        // Create window frame
        const frameGeometry = new THREE.BoxGeometry(1.4, 1.2, 0.4); // Increased depth to match wall thickness
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a4a4a,
            transparent: false,
            opacity: 1.0 
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);

        // Create window panes (both sides)
        const windowGeometry = new THREE.BoxGeometry(1.2, 1.0, 0.05);
        const windowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.4,
            envMap: null,
            reflectivity: 1.0,
            refractionRatio: 0.98
        });
        const frontPane = new THREE.Mesh(windowGeometry, windowMaterial);
        const backPane = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        
        // Create a group to hold frame and panes
        const windowGroup = new THREE.Group();
        windowGroup.add(frame);
        windowGroup.add(frontPane);
        windowGroup.add(backPane);
        
        // Position panes on both sides
        frontPane.position.z = 0.2;  // Front side
        backPane.position.z = -0.2;  // Back side
        
        // Center the entire group on the wall
        windowGroup.position.copy(position);
        windowGroup.position.y = 1.0; // Center vertically
        windowGroup.quaternion.copy(parentWall.quaternion);
        
        windowGroup.userData = {
            isWindow: true,
            parentWall: parentWall,
            parentWallId: parentWall.userData.uuid,
            isInteractable: true
        };
        
        windowGroup.uuid = THREE.MathUtils.generateUUID();
        this.scene.add(windowGroup);
        return windowGroup;
    }

    createWindowFromSave(wall, position, rotation) {
        const window = this.createWindow(wall, position);
        window.rotation.copy(rotation);
        return window;
    }

    createWindowFromData(position, rotation, parentWall) {
        const window = this.createWindow(parentWall, position);
        window.rotation.set(rotation.x, rotation.y, rotation.z);
        return window;
    }
} 