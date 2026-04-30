import * as THREE from 'three';

export class DoorManager {
    constructor(scene, wallManager, renderer) {
        this.scene = scene;
        this.wallManager = wallManager;
        this.renderer = renderer;
        this.isPlacementMode = false;
        this.previewDoor = this.createPreviewDoor();
    }

    createPreviewDoor() {
        // Create preview frame
        const frameGeometry = new THREE.BoxGeometry(1.0, 2.2, 0.4);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a3623,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);

        // Create preview doors (both sides)
        const doorGeometry = new THREE.BoxGeometry(0.8, 2.0, 0.05);
        const doorMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.3,
            depthTest: false
        });
        const frontDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        const backDoor = new THREE.Mesh(doorGeometry, doorMaterial.clone());

        // Create preview group
        const previewGroup = new THREE.Group();
        previewGroup.add(frame);
        previewGroup.add(frontDoor);
        previewGroup.add(backDoor);
        
        // Position preview doors
        frontDoor.position.z = 0.2;
        backDoor.position.z = -0.2;
        
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
            if (wall.userData.isWall) {
                this.previewDoor.position.copy(intersects[0].point);
                this.previewDoor.quaternion.copy(wall.quaternion);
                this.previewDoor.visible = true;
            }
        } else {
            this.previewDoor.visible = false;
        }
    }

    placeDoor(camera, event) {
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
            const door = this.createDoor(wall, intersects[0].point);
            
            wall.userData.openings = wall.userData.openings || [];
            wall.userData.openings.push(door);
        }
    }

    createDoor(parentWall, position) {
        // Create door frame (slightly larger than the door)
        const frameGeometry = new THREE.BoxGeometry(1.0, 2.2, 0.4); // Increased depth to match wall thickness
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a3623,
            transparent: false,
            opacity: 1.0 
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);

        // Create the door itself (two panels for both sides)
        const doorGeometry = new THREE.BoxGeometry(0.8, 2.0, 0.05);
        const doorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.8 
        });
        const frontDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        const backDoor = new THREE.Mesh(doorGeometry, doorMaterial.clone());
        
        // Create a group to hold frame and doors
        const doorGroup = new THREE.Group();
        doorGroup.add(frame);
        doorGroup.add(frontDoor);
        doorGroup.add(backDoor);
        
        // Position doors on both sides of the frame
        frontDoor.position.z = 0.2;  // Front side
        backDoor.position.z = -0.2;  // Back side
        
        // Center the entire group on the wall
        doorGroup.position.copy(position);
        doorGroup.position.y = 1.1; // Center vertically
        doorGroup.quaternion.copy(parentWall.quaternion);
        
        doorGroup.userData = {
            isDoor: true,
            parentWall: parentWall,
            parentWallId: parentWall.userData.uuid,
            isInteractable: true
        };
        
        doorGroup.uuid = THREE.MathUtils.generateUUID();
        this.scene.add(doorGroup);
        return doorGroup;
    }

    createDoorFromSave(wall, position, rotation) {
        const door = this.createDoor(wall, position);
        door.rotation.copy(rotation);
        return door;
    }

    createDoorFromData(position, rotation, parentWall) {
        const door = this.createDoor(parentWall, position);
        door.rotation.set(rotation.x, rotation.y, rotation.z);
        return door;
    }
} 