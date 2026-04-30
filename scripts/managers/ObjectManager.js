import { createRaycaster } from '../utils/ThreeUtils.js';

export class ObjectManager {
    constructor(uiManager) {
        this.ui = uiManager;
    }

    findMovableParent(object) {
        while (object && !object.userData?.isMovable) {
            object = object.parent;
        }
        return object?.userData?.isMovable ? object : null;
    }

    findRemovableParent(object) {
        while (object && 
               !object.userData?.isWall && 
               !object.userData?.isChair &&
               !object.userData?.isFurniture &&
               !object.userData?.isTable &&
               !object.userData?.isSofa &&
               !object.userData?.isPlant &&
               !object.userData?.isFridge &&
               !object.userData?.isFoodStand &&
               !object.userData?.isDrinkStand &&
               !object.userData?.isIceBox &&
               !object.userData?.isIceCreamBox &&
               !object.userData?.isRestaurantEquipment) {
            object = object.parent;
        }
        return object?.userData?.isWall || 
               object?.userData?.isChair || 
               object?.userData?.isFurniture ||
               object?.userData?.isTable ||
               object?.userData?.isSofa ||
               object?.userData?.isPlant ||
               object?.userData?.isFridge ||
               object?.userData?.isFoodStand ||
               object?.userData?.isDrinkStand ||
               object?.userData?.isIceBox ||
               object?.userData?.isIceCreamBox ||
               object?.userData?.isRestaurantEquipment ? object : null;
    }

    handleRemoveObject(event) {
        const raycaster = createRaycaster(event, this.ui.camera, this.ui.renderer.domElement);
        const intersects = raycaster.intersectObjects(this.ui.scene.children, true);
        
        if (intersects.length > 0) {
            const object = this.findRemovableParent(intersects[0].object);
            if (object) {
                this.ui.scene.remove(object);
                if (object.userData.isWall) {
                    this.ui.wallManager.walls = this.ui.wallManager.walls
                        .filter(wall => wall.uuid !== object.uuid);
                }
                this.disposeObject(object);
            }
        }
    }

    disposeObject(object) {
        object.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    // ... other object-related methods
}